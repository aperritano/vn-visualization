/*global L, Firebase, timer, d3, oboe, Parallel, moment, dc, _, crossfilter, async, topojson*/


var mapContainer;



//dimensions
var wHeight = 'innerHeight' in window ? window.innerHeight : document.documentElement.offsetHeight;
var wWidth = 'innerWidth' in window ? window.innerWidth : document.documentElement.offsetWidth;

//var mainOffset = 15;

var margin = {top: 10, left: 15, bottom: 20, right: 20};


var mapSVG;
var map;

// var infoDB = new Firebase('https://baboons.firebaseio.com/info');
// var timestampsDB = new Firebase('https://baboons.firebaseio.com/timestamps');
// var labelsDB = new Firebase('https://baboons.firebaseio.com/labels/0/labels');
// var dictionaryDB = new Firebase('https://baboons.firebaseio.com/labels/0/dictionary');

var dateFormat = '%Y-%m-%d %H:%M:%S';
var parseDate =
    d3.time.format(dateFormat).parse;

var allSubjects;
var xFilter;
var byDate;
var brushFilteredDates;

var labels = []
var dictionary = [];
var gpsDataset = [];

//overlays for leaflet
var timeOverlay;
var timeOverlayProps = {};
var buttonOverlay;
var animateOverlay;

var currentDataPoint;

var byDate;

var countGroup;

var labelGroup;

var netsGroup;

var m = '500';

var startTime;
var endTime;

var pgress = 0;
var isPlaying = false;

var pbar = new ProgressBar.Line('#pbar', {color: '#BCD7E9'});
//pbar.setValue(0);
//pbar.animate(1.0, {
//    duration: 40000
//});
//

function getDictionary() {
    oboe('https://baboons.firebaseio.com/labels/0/dictionary.json')
        .node('!.*', function (dict) {


            if (dict !== undefined) {
                var index = dict.code - 1;
                dict.color = nodeColorMap(index);
                dictionary.push(dict);
            }


            return oboe.drop;
        })
        .done(function (finaljson) {
            //console.log('dictionary',dictionary);
            pgress = pgress + .1;
            pbar.animate(pgress);
            console.log('done with dict, starting timestamps');
        });
}

function getLabels() {
    oboe('https://baboons.firebaseio.com/labels/0/labels.json')
        .node('!.*', function (label) {
            labels.push(label);
            return oboe.drop;
        })
        .done(function (finaljson) {
            //console.log('labels',labels);
            console.log('done with labels, starting timestamps');
            pgress = pgress + .1;
            pbar.animate(pgress);
            doTimestampFetch();
        });
}

var max = 500;
var counter = 0;

function doTimestampFetch() {


    oboe('https://baboons.firebaseio.com/timestamps.json')
        .node('!.*', function (t) {

            counter++;
            console.log(counter);
            if( counter === max) {


                doneTimestamps();
                this.abort();
                return;
            }
            if (t.timestamp === undefined) {
            } else {

                pgress = pgress + .000042;
                console.log(pgress);
                pbar.animate(pgress);
                try {             
                    if (t.items !== null || t.items !== undefined || t.items[0] !== undefined && t.items[0] !== null) {
                        if (isNaN(+t.items.length) === true) {
                            t.items = [];
                            t.count = 0;
                            t.edges = [];
                            t.labels = {};
                        } else {
                            t.count = +t.items.length;
                            var found = FindItemBinarySearch(labels, t.timestamp);
                            if( found !== -1 ) {
                                var label = labels[found];
                                t.labels = label;
                                var index = t.labels.label - 1;
                                var dictionaryLabel = dictionary[index];
                                //merge
                                t.labels.code = dictionaryLabel.code;
                                t.labels.color = dictionaryLabel.color;
                                t.labels.label = dictionaryLabel.label;
                            }  else {
                                t.labels = {};
                            }
                            if( _.isUndefined(t.edges) || _.isEmpty(t.edges) ) {
                                t.edges = [];
                            }                                       
                        }
                    } else {
                        t.items = [];
                        t.count = 0;
                        t.labels = {};
                        t.edges = [];
                    }
                                        
                    t.timestamp = parseDate(t.timestamp);

                    gpsDataset.push(t);
                    //console.log(t);
                } catch (e) {
                    if (e instanceof TypeError) {
                        t.count = 0;
                        t.items = [];
                        t.labels = {};
                        t.edges = [];
                        gpsDataset.push(t);
                        //console.log(t);
                        //console.info('datum TypeError Exception timestamp: ', d.timestamp);
                    }
                }
            }

            return oboe.drop;
        })
        .done(function (finaljson) {

            doneTimestamps();
        });
}

function doneTimestamps() {
    pbar.animate(1);
    pbar.destroy();
    console.log('all done');
    xFilter = crossfilter(gpsDataset);


    allSubjects = xFilter.groupAll();

    byDate = xFilter.dimension(function (d) {

        return d.timestamp;
    });

    countGroup = byDate.group().reduceSum(function (d) {
        return d.count;
    });

    labelsGroup = byDate.group().reduceSum(function (d) {
        if( !_.isEmpty(d.labels)) {
            return 5;
        }
        return 0;
    });


    netsGroup = byDate.group().reduceSum(function (d) {
        if(d.edges.length !== 0) {
            return d.edges.length/2;
        }
        return 0;
    });



    initMapLeaflet();
    createMainTimeline('init');

}

function FindItemBinarySearch(items, value) {
    var startIndex  = 0,
        stopIndex   = items.length - 1,
        middle      = Math.floor((stopIndex + startIndex)/2);

    while(items[middle].timestamp != value && startIndex < stopIndex){

        //adjust search area
        if (value < items[middle].timestamp){
            stopIndex = middle - 1;
        } else if (value > items[middle].timestamp){
            startIndex = middle + 1;
        }

        //recalculate middle
        middle = Math.floor((stopIndex + startIndex)/2);
    }

    //make sure it's the right value
    return (items[middle].timestamp != value) ? -1 : middle;

}

getDictionary();
getLabels();

//var k = 1;
//readStartEndValue();
//popolateLabel(k);
//popolateLabelNameMap(k);

//initMapSVG();

//setup resize
//d3.select(window).on('resize', resize);


/*** functions ******/




/**
 * Creates the Leaflet with the first datapoint
 *
 * @param dataPoint
 */
function initLeafletOverlays() {
    //addCountryOverlay();
    initDataPointOverlay();
}

function initDataPointOverlay() {

    var firstPoint = byDate.bottom(1)[0];


    if (firstPoint.items !== undefined) {
        drawDataPointOverlay(firstPoint);
    } else {
        //this point doesn't have subjects
    }
}

function drawDataPointOverlay(dataPoint) {
    currentDataPoint = dataPoint;
    animateOverlay.update();

    if (_.isUndefined(currentDataPoint) || _.isUndefined(currentDataPoint.items)) {
        console.log('undefined datapoint');
        return;
    }

    var links = [];
    if (currentDataPoint.edges !== undefined) {
        currentDataPoint.edges.forEach(function (net) {

            var s = currentDataPoint.items.filter(function (d) {
                return d.id === net[0];
            });

            var t = currentDataPoint.items.filter(function (d) {
                return d.id === net[1];
            });

            var p1 = createLineJSON(s[0]);

            //links.push(p1);
            var p2 = createLineJSON(t[0]);

            var link = [{x: p1.lon, y: p1.lat}, {x: p2.lon, y: p2.lat}];
            links.push(link);

            function createLineJSON(source) {
                var geoLine = {lon: source.lon, lat: source.lat};

                return geoLine;
            }

        });
    }


    var targets = currentDataPoint.items;

    targets.forEach(function (d, i) {
        d.labels = currentDataPoint.labels;
        d.LatLng = new L.LatLng(d.lat, d.lon);
    });


    var toLine = d3.svg.line()
        .interpolate('linear')
        .x(function (d) {
            return applyLatLngToLayer(d).x;
        })
        .y(function (d) {
            return applyLatLngToLayer(d).y;
        });


    // Define the div for the tooltip


    //remove old ones
    map.on('viewreset', update);


    update();

    function applyLatLngToLayer(d) {
        var x = d.x;
        var y = d.y;
        return map.latLngToLayerPoint(new L.LatLng(y, x));
    }


    function update() {

        var paths = mapContainer.selectAll('path');
        paths.remove();

        if (links[0] !== undefined) {
            //paths.remove();
            links.forEach(function (link) {
                paths = mapContainer.append('path') // <-E
                    .attr('d', toLine(link))
                    .attr('stroke', 'blue')
                    .attr('stroke-width', 2)
                    .attr('fill', 'none');
            });
        }

        mapContainer.selectAll('circle').remove();

        var circles = mapContainer.selectAll('circle').data(targets);

        circles.enter().append('circle')
            .attr('class', 'node')
            .attr('id', function (d) {
                return d.id;
            })
            .attr('lon', function (d) {
                return d.lon;
            })
            .attr('lat', function (d) {
                return d.lat;
            })
            .attr('r', 6)
            .style('stroke-width', function (d) {
                if (_.isEmpty(d.labels)) {
                    return 2;
                } else {
                    return 4;
                }
            })
            .style('stroke', function (d, i) {
                if (_.isEmpty(d.labels)) {
                    return nodeColorMap(i);
                } else {
                    return d.labels.color;
                }

            })
            .style('fill', function (d, i) {
                return nodeColorMap(i);
            })
            .style('fill-opacity', 1.0)
            .on('mouseover', function (d) {

                var div = d3.select('#tooltip').append('div')
                    .attr('class', 'tooltip')
                    .style('opacity', 0);

                div.transition()
                    .duration(100)
                    .style('opacity', 1.0);
                div.html(d.id + '<br/>' + d3.format('.4g')(d.lat) + ',' + d3.format('.4g')(d.lon))
                    .style('left', (d3.event.pageX) + 'px')
                    .style('top', (d3.event.pageY - 28) + 'px');
            })
            .on('mouseout', function (d) {
                div.transition()
                    .duration(500)
                    .style('opacity', 0);
            });

        //.transition()
        //.duration(500);


        d3.transition(circles)
            .attr('transform',
                function (d) {
                    return 'translate(' +
                        map.latLngToLayerPoint(d.LatLng).x + ',' +
                        map.latLngToLayerPoint(d.LatLng).y + ')';
                }
            );


        //function transition(path) {
        //    linePath.transition()
        //        .duration(7500)
        //        .attrTween("stroke-dasharray", tweenDash)
        //        .each("end", function() {
        //            d3.select(this).call(transition);// infinite loop
        //            ptFeatures.style("opacity", 0)
        //        });
        //
        //
        //}


    }

}


/**
 * Init the leaflet portion
 */
function initMapLeaflet() {

    var m = document.getElementById('map');
    m.style.display = 'block';

    var width = wWidth - margin.right - margin.left;
    var height = wHeight * 0.5;


    var mapLeafletWidth = width;
    var mapLeafletHeight = height;

    m.style.width = mapLeafletWidth + 'px';
    m.style.height = mapLeafletHeight + 'px';
    m.style.margin = '0px 0px 0px 15px';

    map = L.map('map', {
        zoomControl: true,
        maxNativeZoom: 18,
        maxZoom: 50,
        attributionControl: false
    }).setView([0.3509073, 36.9229031], 5);
    //map.touchZoom.disable();
    map.doubleClickZoom.disable();
    //map.scrollWheelZoom.disable();
    //map.boxZoom.disable();
    //map.keyboard.disable();
    //map.dragging.disable();

    //var Esri_WorldImagery = L.tileLayer('http://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    //    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
    //});

    L.tileLayer('http://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 18,
        attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(map);

//    //var Esri_WorldGrayCanvas =
//    L.tileLayer('http://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
////            attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ',
//        maxZoom: 16
//    }).addTo(map);

    // Initialize the SVG layer
    map._initPathRoot();

    // Add an SVG element to Leaflet’s overlay pane
    mapSVG = d3.select('#map').select('svg');

    mapContainer = mapSVG.append('g');

    /**
     * Overlays
     */

    var timeOverlayDIV;

    timeOverlay = L.control({position: 'bottomleft'});

    timeOverlay.onAdd = function () {
        timeOverlayDIV = L.DomUtil.create('div', 'timeOverlay');

        timeOverlay.update();
        return timeOverlayDIV;
    };

    timeOverlay.update = function () {

        if (!_.isUndefined(timeOverlayProps.startTime) || !_.isUndefined(timeOverlayProps.endTime)) {
            var t1 = timeOverlayProps.startTime.format('LTS M/D/YY');
            var t2 = timeOverlayProps.endTime.format('LTS M/D/YY');

            var div = document.getElementById('control-panel');
            document.getElementById('start-time').innerHTML = 'Start:&nbsp&nbsp' + t1;
            document.getElementById('end-time').innerHTML = 'End:&nbsp&nbsp&nbsp&nbsp' + t2;
            div.style.display = 'block';
            timeOverlayDIV.appendChild(div);
        }

    };

    timeOverlay.addTo(map);

    var buttonDIV;

    buttonOverlay = L.control({position: 'topleft'});

    buttonOverlay.onAdd = function () {
        buttonDIV = L.DomUtil.create('div', 'buttonOverlay');
        L.DomEvent.disableClickPropagation(buttonDIV);

        buttonOverlay.update();
        return buttonDIV;
    };

    buttonOverlay.update = function () {


        var div = document.getElementById('zoom-panel');
        var zoomButton = document.getElementById('zoom-point');
        zoomButton.onclick = function () {
            zoomCurrentPoint();
        };
        div.style.display = 'block';
        buttonDIV.appendChild(div);

    };

    buttonOverlay.addTo(map);

    var animateOverlayDIV;

    animateOverlay = L.control({position: 'bottomright'});

    animateOverlay.onAdd = function () {
        animateOverlayDIV = L.DomUtil.create('div', 'animateOverlay');

        L.DomEvent.disableClickPropagation(animateOverlayDIV);
        //animateOverlay.update();
        return animateOverlayDIV;
    };

    animateOverlay.update = function () {

        if (!_.isUndefined(currentDataPoint)) {
            var t1 = moment(currentDataPoint.timestamp).format('LTS M/D/YY');

            var div = document.getElementById('animate-panel');
            document.getElementById('current-time').innerHTML = 'Current Time:&nbsp&nbsp' + t1;


            //var icon = $('.play');
            //icon.click(function() {
            //    icon.toggleClass('active');
            //    return false;
            //});
            //
            var playButton = document.getElementById('play');
            playButton.onclick = function () {
                playButton.classList.toggle('active');
                console.log('PLAY');
                playSelection();
            };





            div.style.display = 'block';
            animateOverlayDIV.appendChild(div);
        }

    };

    animateOverlay.addTo(map);

}


/**
 * Uses d3 to add counties to the overlay
 */
function addCountryOverlay() {
    d3.json('KEN.topojson', function (error, collection) {

        //unknown error, check the console
        if (error) {
            return console.log(error);
        }


        var bounds = d3.geo.bounds(topojson.feature(collection, collection.objects.KEN));

        var path = d3.geo.path().projection(projectPoint);


        //generate mapContainer from TopoJSON

        var feature = mapContainer.selectAll('path')
            .data(topojson.feature(collection, collection.objects.KEN).features)
            .enter()
            .append('path')
            .attr('d', path);


        map.on('viewreset', reset);
        reset();

        // Reposition the SVG to cover the features.
        function reset() {
            var bottomLeft = projectPoint(bounds[0]),
                topRight = projectPoint(bounds[1]);

            mapSVG.attr('width', topRight[0] - bottomLeft[0])
                .attr('height', bottomLeft[1] - topRight[1])
                .style('margin-left', bottomLeft[0] + 'px')
                .style('margin-top', topRight[1] + 'px');

            mapContainer.attr('transform', 'translate(' + -bottomLeft[0] + ',' + -topRight[1] + ')');

            feature.attr('d', path);
        }


        // Use Leaflet to implement a D3 geographic projection. SVG does not use
        // the same coordinate system as a globe,
        // the latitude and longitude coordinates will need to be transformed.
        function projectPoint(x) {
            var point = map.latLngToLayerPoint(new L.LatLng(x[1], x[0]));
            return [point.x, point.y];
        }
    });
}


/**
 * Creates Overlay for turning the main layover on-off
 */
function handleCountryOverlayControl() {

    if (this.checked) {
        //turn it on
        addCountryOverlay();
    } else {
        //unchecked turn it off
        mapSVG.selectAll('path').remove();
    }
}

/**
 * Create the main time line
 *
 * @param items - that complete dataset
 3 */
function createMainTimeline(flag) {

    if (flag === 'init') {
        var margin = {top: 10, left: 15, bottom: 20, right: 20};
        //width = wWidth - margin.left - margin.right,
        var height = 100 - margin.top - margin.bottom;


        var t2 = byDate.top(1)[0];
        var t1 = byDate.bottom(1)[0];

        //init
        brushFilteredDates = byDate.filterRange([t1, t2]);


        var tStart = moment(t1.timestamp).toDate();
        var tEnd = moment(t2.timestamp).toDate();
        var t5 = moment(t1.timestamp).add(2, 'm').toDate();

        //update the props

        timeOverlayProps.startTime = moment(tStart);
        timeOverlayProps.endTime = moment(tEnd).add(5, 'm');
        timeOverlay.update();

        var combined = dc.compositeChart('#main-timeline');

        var stackCharts = dc.lineChart(combined)
            .ordinalColors([generalColorMap(0),generalColorMap(4),generalColorMap(6)])
            .renderArea(true)
            .group(countGroup)            
            .stack(labelsGroup)
            .stack(netsGroup)
            .elasticX(true)
            .elasticY(true)
            .useRightYAxis(true)
            .on('filtered', brushing);

        combined
            .width(wWidth)
            .height(height)
            .margins(margin)
            .dimension(byDate)
            .brushOn(true)
            .x(d3.time.scale().domain([tStart, tEnd]));

        combined.compose([stackCharts]);

        //console.log('stackCharts.yAxisMax()',stackCharts.yAxisMax());
        combined.compose([stackCharts]).rightYAxis().tickValues([stackCharts.yAxisMax()]);

        combined.filter(dc.filters.RangedFilter(tStart, t5));

        combined.on('filtered', brushing);

        dc.renderAll();

        updateLabelTimeline(tStart, t5);
        drawDataPointOverlay(t1);


    } else if (flag === 'update') {

    }


    


    function brushing(chart, filter) {
        // console.log('we are brushing', _.isNull(filter), _.isNull(chart));

        if (_.isNull(filter)) {
        } else {

            var p = new Parallel(filter);

            // Spawn a remote job (we'll see more on how to use then later)

            var t1 = filter[0];
            var t2 = filter[1];

            brushFilteredDates = byDate.filterRange([t1, t2]);

            var dataPoint = brushFilteredDates.bottom(1)[0];

            timeOverlayProps.startTime = moment(t1);
            timeOverlayProps.endTime = moment(t2);
            timeOverlay.update();

            drawDataPointOverlay(dataPoint);
            zoomCurrentPoint();
            updateLabelTimeline(t1, t2);
        }


    }
}

function updateLabelTimeline(tStart, tEnd) {

    //get data for timeline

    var defaultRangeFilter = byDate.filterRange([tStart, tEnd]);
    var allDefaultRangeDates = defaultRangeFilter.bottom(Infinity);

    var labelsTuple = getLabelsInRange(allDefaultRangeDates);

    //do the group timeline

    var sDate = moment(tStart).valueOf();
    var eDate = moment(tEnd).valueOf();
    var minutes = (eDate - sDate) / 1000 / 60;

    var minutesTick = 1;
    if (minutes > LIMIT_TICK && minutes <= LIMIT_TICK * 2) {
        minutesTick = 5;
    }
    if (minutes > LIMIT_TICK * 2 && minutes <= LIMIT_TICK * 4) {
        minutesTick = 15;
    }
    if (minutes > LIMIT_TICK * 4 && minutes <= LIMIT_TICK * 8) {
        minutesTick = 30;
    }
    if (minutes > LIMIT_TICK * 8) {
        minutesTick = 60;
    }


    var groupLabels = labelsTuple[0];
    var customTimeFormat = d3.time.format.multi([
        ['.%L', function (d) {
            return d.getMilliseconds();
        }],
        [':%S', function (d) {
            return d.getSeconds();
        }],
        ['%I:%M', function (d) {
            return d.getMinutes();
        }],
        ['%I %p', function (d) {
            return d.getHours();
        }],
        ['%a %d', function (d) {
            return d.getDay() && d.getDate() !== 1;
        }],
        ['%b %d', function (d) {
            return d.getDate() !== 1;
        }],
        ['%B', function (d) {
            return d.getMonth();
        }],
        ['%Y', function () {
            return true;
        }]
    ]);

    var svgLabel = d3.select('#grouplabels').select('svg');
    if (svgLabel !== undefined) {
        svgLabel.remove();
    }

    var groupLabelMargin = {top: 10, left: 10, bottom: 0, right: 15};
    var width = wWidth - margin.left - margin.right;
    var tooltip = d3.select('#tooltipLabel').append('div').attr('class', 'tooltipLabel').style('opacity', 0);

    // Chart
    var chart = d3.timeline()
        .beginning(sDate)
        .ending(eDate)
        .orient('bottom')
        .showTimeAxisTick()
        .rowSeperators('#d9d9d9')
        .stack()
        .tickFormat(
            {
                format: customTimeFormat,
                tickTime: d3.time.minutes,
                tickInterval: minutesTick,
                tickSize: 20
            })
        .margin({top: 10, left: 10, bottom: 0, right: 15})
        .mouseover(function (d, i, datum) {

            if (minutes < LIMIT_LABEL)
                return;

            tooltip.transition()
                .duration(100)
                .style('opacity', 0.9);
            tooltip.html(datum['times'][i]['name'])
                .style('left', (d3.event.pageX) + 'px')
                .style('top', (d3.event.pageY - 28) + 'px');
        })
        .mouseout(function (d, i, datum) {

            if (minutes < LIMIT_LABEL)
                return;

            tooltip.transition()
                .duration(500)
                .style('opacity', 0);
        });

    //d3.selectAll('.timeline-label').attr('transform', 'translate(2px,0px)');

    d3.select('#grouplabels').append('svg')
        .attr('width', width + groupLabelMargin.right)
        .style('margin-left', 5)
        .style('margin-right', 0)
        .datum(groupLabels).call(chart);

}

function zoomCurrentPoint() {
    console.log('zoomCurrentPoint');

    if (!_.isUndefined(currentDataPoint) && !_.isUndefined(currentDataPoint.items)) {
        if (!_.isUndefined(currentDataPoint.items[0])) {
            var item = currentDataPoint.items[0];
            if( !_.isUndefined(item)) {
                map.setZoom(19, {animate: true});
                map.panTo(item.LatLng, {animate: true});
            }
        }
    }
}

function playSelection() {
    //find the first one with points
    var ranged = brushFilteredDates.bottom(Infinity);
    var interval = 175; // one second in milliseconds

    var i = 0;
    var makeCallback = function () {
        // note that we're returning a new callback function each time
        return function () {
            if (i < ranged.length) {
                var d = ranged[i];
                if (d.items !== undefined) {
                    drawDataPointOverlay(d);
                }
                i++;
                d3.timer(makeCallback(), interval);
                return true;
            }
            return false;

        }
    };

    d3.timer(makeCallback(), interval);
    console.log('done');
}

/**
 * lookup for node colors
 */
function generalColorMap(index) {
    // var colors = ['Red', 'Purple', 'Deep Purple', 'Ingio', 'Light Blue', 'Cyan', 'Green', 'Teal', 'Lime', 'Yellow', 'Orange', 'Deep Orange', 'Brown', 'Grey', 'Blue Grey'];

    var brewer = ['#1f78b4', '#a6cee3', '#ccebc5', '#33a02c', '#fb8072', '#fb9a99', '#fdbf6f', '#ff7f00', '#cab2d6', '#6a3d9a', '#ffff99', '#b15928', '#F8B700'];
    //var c = colors[index];

    if (index > brewer.length) {
        index = 0;
    }

    return brewer[index];

}

function nodeColorMap(index) {
    // var colors = ['Red', 'Purple', 'Deep Purple', 'Ingio', 'Light Blue', 'Cyan', 'Green', 'Teal', 'Lime', 'Yellow', 'Orange', 'Deep Orange', 'Brown', 'Grey', 'Blue Grey'];

    var brewer = ['#33a02c', '#ffffb3', '#e31a1c', '#fb8072', '#80b1d3', '#fdb462', '#b3de69', '#fccde5', '#b15928', '#bc80bd', '#ccebc5', '#ffed6f', '#b15928', '#6a3d9a'];
    ;
    //var c = colors[index];

    if (index > brewer.length) {
        index = 0;
    }

    return brewer[index];

}



