/*global L, Firebase, d3, moment, topojson*/

//var tooltip;
//var svg;
//var colors;
//var projection;
//var path;

var debug = true;

var mapContainer;
//var zoom;

var brush;
var gpsDataset;
var currentTimeRange = [];

//dimensions
var wHeight = 'innerHeight' in window ? window.innerHeight : document.documentElement.offsetHeight;
var wWidth = 'innerWidth' in window ? window.innerWidth : document.documentElement.offsetWidth;

//var mainOffset = 15;

var margin = {top: 10, left: 15, bottom: 20, right: 20};


var mapSVG;
var map;

var timestampsDB = new Firebase('https://baboons.firebaseio.com/timestamps');
var labelsDB = new Firebase('https://baboons.firebaseio.com/labels/0/labels');
var dictionaryDB = new Firebase('https://baboons.firebaseio.com/labels/0/dictionary');
var xFilter;
var dateDimension;
var populationCountsFilter;
var networkFilter;

var dateFormat = '%Y-%m-%d %H:%M:%S';
var parseDate =
    d3.time.format(dateFormat).parse;

var num = 1000;

var labels;
var dictionary;
var timeOverlay;
var timeOverlayProps = {};
var brushFilteredDates;

var m = '800';

dictionaryDB.on('value', function (snapshot) {

    if (snapshot.val() !== undefined) {
        //remove the last object
        console.log('VAL', snapshot.val());
        updateDictionaryFromDB(snapshot.val());
        labelsDB.orderByKey().startAt('0').endAt(m).on('value', function (snapshot) {

            if (snapshot.val() !== undefined) {
                //remove the last object
                updateLabelsFromDB(snapshot.val());
            }

            timestampsDB.orderByKey().startAt('0').endAt(m).on('value', function (snapshot) {

                if (snapshot.val() !== undefined) {
                    //remove the last object
                    updateDataFromDB(snapshot.val());

                }

            }, function (errorObject) {
                console.log('The read failed: ' + errorObject.code);
            });

        }, function (errorObject) {
            console.log('The read failed: ' + errorObject.code);
        });
    }
}, function (errorObject) {
    console.log('The read failed: ' + errorObject.code);
});


initMapLeaflet();

//var k = 1;
//readStartEndValue();
//popolateLabel(k);
//popolateLabelNameMap(k);

//initMapSVG();

//setup resize
//d3.select(window).on('resize', resize);


/*** functions ******/

function updateDictionaryFromDB(d) {
    dictionary = d;
    console.log('ALL DICT', d);
}

function updateLabelsFromDB(l) {
    labels = l;
    //console.log('ALL LABELS',labels);
}


/**
 * updates when firebase returns
 *
 * @param items
 */
function updateDataFromDB(items) {

    var i = 0;

    //there is no timeline available create one
    if (gpsDataset === undefined || gpsDataset[0] === undefined) {
        gpsDataset = items;
        async.each(gpsDataset, function (d, callback) {
            try {
                if (d.timestamp === undefined) {
                } else {

                    //finds the label that matches the timestamp
                    var foundTimestamps = labels.filter(function (l) {
                        if (l.timestamp === d.timestamp) {
                            return true;
                        }
                        return false;

                    });

                    //if we found a matching timestamp
                    if (foundTimestamps[0] !== undefined) {
                        //finds the dictionary l
                        var foundDictionary = dictionary.filter(function (k) {

                            if (foundTimestamps[0].label === k.code) {

                               // console.log('FOUND label ', k.code, k);
                                return true;
                            }

                            return false;

                        });
                        //if we found a dictionary entry
                        if (foundDictionary[0] !== undefined) {
                            d.labels = foundDictionary[0];
                        }
                    } else {
                        d.labels = -1;
                    }
                    d.date = parseDate(d.timestamp);
                }
                if (d.items !== null || d.items !== undefined || d.items[0] !== undefined && d.items[0] !== null) {
                    if (isNaN(+d.items.length) === true) {
                        d.items = [];
                        d.count = 0;
                    } else {
                        d.count = +d.items.length;
                    }
                } else {
                    d.items = [];
                    d.count = 0;
                    ///d.label
                }

                if (d.edges === null || d.edges === undefined || d.edges[0] === undefined && d.edges[0] === null) {
                    d.edges = [];
                }
            } catch (e) {
                if (e instanceof TypeError) {
                    d.items = [];
                    //console.info('datum TypeError Exception timestamp: ', d.timestamp);
                    d.count = 0;
                }
            }
            callback();
        }, function (err) {

            // if any of the file processing produced an error, err would equal that error
            xFilter = crossfilter(gpsDataset);

            allSubjects = xFilter.groupAll();

            dateDimension = xFilter.dimension(function (d) {
                return d.date;
            });


            //create map
            initLeafletOverlays();
            //create timeline
            createMainTimeline();
        });
    } else {
        //update timeline
        //update map
    }

}


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

    var firstPoint = dateDimension.bottom(1)[0];


    if (firstPoint.items !== undefined) {
        drawDataPointOverlay(firstPoint);
    } else {
        //this point doesn't have subjects
    }
}

function drawDataPointOverlay(dataPoint) {


    if (_.isUndefined(dataPoint) || _.isUndefined(dataPoint.items)) {
        console.log('undefined datapoint');
        return;
    }

    var links = [];
    if (dataPoint.nets !== undefined) {
        dataPoint.nets.forEach(function (net) {

            var s = dataPoint.items.filter(function (d) {
                return d.id === net[0];
            });


            var t = dataPoint.items.filter(function (d) {
                return d.id === net[1];
            });

            var p1 = createLineJSON(s[0]);
            //s.LatLng = new L.LatLng(s[0].lat, s[0].lon);
            //t.LatLng = new L.LatLng(t[0].lat, t[0].lon);

            //links.push(p1);
            var p2 = createLineJSON(t[0]);
            //s.LatLng = new L.LatLng(s[0].lat, s[0].lon);
            //t.LatLng = new L.LatLng(t[0].lat, t[0].lon);


            var link = [{x: p1.lon, y: p1.lat}, {x: p2.lon, y: p2.lat}];
            links.push(link);

        });
    }


    var targets = dataPoint.items;


    var i = 0;
    targets.forEach(function (d) {

        d.LatLng = new L.LatLng(d.lat, d.lon);

        if (i === 0) {
            map.setZoom(19, {animate: true});
            map.panTo(d.LatLng, {animate: true});
        }

        i++;

    });


    // Define the div for the tooltip
    var div = d3.select('#tooltip').append('div')
        .attr('class', 'tooltip')
        .style('opacity', 0);

    var container = mapContainer.selectAll('circle').data(targets);

    container.exit().remove();

    var circles = container.enter();

    circles.append('circle')
        .attr('class', 'node')
        .attr('id', function (d) {
            return 'circle' + d.id;
        })
        .attr('lon', function (d) {
            return d.lon;
        })
        .attr('lat', function (d) {
            return d.lat;
        })
        .attr('r', 10)
        .style('stroke-width', function (d) {
            if (dataPoint.labels === -1) {
                return 1;
            } else {
                return 3;
            }
        })
        .style('stroke', function (d) {
            if (dataPoint.labels === -1) {
                return '#03A9F4';
            } else {
                return '#E040FB';
            }
        })
        .style('fill', function (d) {
            return nodeColorMap(d.id);
        })
        .style('fill-opacity', 0.5)
        .on('mouseover', function (d) {
            div.transition()
                .duration(100)
                .style('opacity', 0.9);
            div.html(d.id + '<br/>' + d3.format('.4g')(d.lat) + ',' + d3.format('.4g')(d.lon))
                .style('left', (d3.event.pageX) + 'px')
                .style('top', (d3.event.pageY - 28) + 'px');
        })
        .on('mouseout', function (d) {
            div.transition()
                .duration(500)
                .style('opacity', 0);
        })
        .transition()
        .delay(3000)
        .duration(3000);

    var lineContainer;


    //NET [{"p1":{"lon":36.922608,"lat":0.3513041},"p2":{"lon":36.922675,"lat":0.3513414}}]

    //lon-lat
    var data = [[36.922608, 0.3513041], [36.922675, 0.3513414]];


    var lineData = [{x: 36.922608, y: 0.3513041}, {x: 36.922675, y: 0.3513414}];

    var toLine = d3.svg.line()
        .interpolate('linear')
        .x(function (d) {
            return applyLatLngToLayer3(d).x;
        })
        .y(function (d) {
            return applyLatLngToLayer3(d).y;
        });

    if (links[0] !== undefined) {

        mapContainer.selectAll('path').remove();
        links.forEach(function (link) {
            lineContainer = mapContainer.append("path") // <-E
                .attr('d', toLine(link))
                .attr('stroke', 'blue')
                .attr('stroke-width', 2)
                .attr('fill', 'none');

            console.log('NET', JSON.stringify(link));
        });
    }

    //remove old ones
    map.on('viewreset', update);


    update();

    function applyLatLngToLayer3(d) {
        var x = d.x;
        var y = d.y;
        return map.latLngToLayerPoint(new L.LatLng(y, x));
    }


    function applyLatLngToLayer2(d) {
        var y = d[1];
        var x = d[0];
        return map.latLngToLayerPoint(new L.LatLng(y, x));
    }

    function applyLatLngToLayer(d) {
        var y = d.geometry.coordinates[1]
        var x = d.geometry.coordinates[0]
        return map.latLngToLayerPoint(new L.LatLng(y, x));
    }

    function createLineJSON(source) {
        var geoLine = {lon: source.lon, lat: source.lat};

        return geoLine;
    }


    function update() {




        //d3.transition(textContainer)
        //    .attr('transform',
        //        function (d) {
        //            return 'translate(' +
        //                map.latLngToLayerPoint(d.LatLng).x + ',' +
        //                map.latLngToLayerPoint(d.LatLng).y + ')';
        //        }
        //    );

        // linePath.attr("d", toLine)

        //d3.transition(lineContainer)
        //    .attr('transform',
        //        function (d) {
        //            return 'translate(' +
        //                map.latLngToLayerPoint(new L.LatLng(d.y, d.x)).x + ',' +
        //                map.latLngToLayerPoint(new L.LatLng(d.y, d.x)).y + ')';
        //        }
        //    );

        d3.transition(container)
            .attr('transform',
                function (d) {
                    return 'translate(' +
                        map.latLngToLayerPoint(d.LatLng).x + ',' +
                        map.latLngToLayerPoint(d.LatLng).y + ')';
                }
            );
    }

//     if (lineContainer !== undefined) {
//         lineContainer.attr("d", toLine);

//     }
}


/**
 * Init the leaflet portion
 */
function initMapLeaflet() {

    var m = document.getElementById('map');

    var width = wWidth - margin.right - margin.left;
    var height = wHeight * 0.6;


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

    L.tileLayer('http://{s}.tiles.wmflabs.org/bw-mapnik/{z}/{x}/{y}.png', {
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




    timeOverlay = L.control({position: 'topright'});

    timeOverlay.onAdd = function (map) {
        timeOverlayDIV = L.DomUtil.create('div', 'timeOverlay');

        timeOverlay.update();
        return timeOverlayDIV;
    };

    timeOverlay.update = function() {

        if( !_.isUndefined(timeOverlayProps.startTime) || !_.isUndefined(timeOverlayProps.endTime) ) {
            var t1 = timeOverlayProps.startTime.format('LTS M/D/YY');
            var t2 = timeOverlayProps.endTime.format('LTS M/D/YY');

            var div = document.getElementById('control-panel');
            document.getElementById('start-time').innerHTML = 'Start:&nbsp&nbsp' + t1;
            document.getElementById('end-time').innerHTML = 'End:&nbsp&nbsp&nbsp&nbsp' + t2;

            var playButton = document.getElementById('play');
            playButton.onclick = function(){
                playSelection();
                console.log('play buttonClicked');
            };
            var timeButton = document.getElementById('time');
            timeButton.onclick = function(){
                console.log('time buttonClicked');
            };
            div.style.display = 'block';
            timeOverlayDIV.appendChild(div);
        }

    }

    timeOverlay.addTo(map);


    // create the control
    //document.getElementById('countryOverlayControl').addEventListener('click', handleCountryOverlayControl, false);

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
function createMainTimeline() {

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

    var margin = {top: 10, left: 15, bottom: 20, right: 20},
        width = wWidth - margin.left - margin.right,
        height = 100 - margin.top - margin.bottom;


    var t2 = dateDimension.top(1)[0];
    var t1 = dateDimension.bottom(1)[0];

    var tStart = moment(t1.timestamp).toDate();
    var tEnd = moment(t2.timestamp).toDate();
    var t5 = moment(t1.timestamp).add(5, 'm').toDate();

    //update the props

    timeOverlayProps.startTime = moment(t1.timestamp);
    timeOverlayProps.endTime = moment(t1.timestamp).add(5, 'm');
    timeOverlay.update();


    var byDate = xFilter.dimension(function (d) {
        return d.date;
    });


    var countGroup = byDate.group().reduceSum(function (d) {
        return d.count;
    });

    var labelGroup = byDate.group().reduceSum(function (d) {
        if (d.labels === -1) {
            return 0;
        } else {
            return 3;
        }
        ;
    });

    var netsGroup = byDate.group().reduceSum(function (d) {
        if (d.edges === undefined) {
            return 0;
        } else {
            return d.edges.length;
        }
    });

    var countMax = countGroup.top(1)[0].value;
    var netsMax = netsGroup.top(1)[0].value;
    var labelMax = labelGroup.top(1)[0].value;

    Array.prototype.max = function () {
        return Math.max.apply(null, this);
    };

    var yMax = [countMax, netsMax, labelMax].max();

    var combined = dc.compositeChart("#timeline2");

    var stackCharts = dc.lineChart(combined)
        .ordinalColors(['#56B2EA', '#E064CD', '#F8B700', '#78CC00', '#7B71C5'])

        .renderArea(true)
        .group(labelGroup)
        .stack(countGroup)
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
        .x(d3.time.scale().domain([tStart, tEnd]))

    combined.compose([stackCharts]).rightYAxis().tickValues([stackCharts.yAxisMax()]);

    combined.filter(dc.filters.RangedFilter(tStart, t5));

    //combined.on('filtered', brushing);


    dc.renderAll();

    function brushing(chart, filter) {
        console.log('we are brushing', _.isNull(filter), _.isNull(chart));

        if (_.isNull(filter)) {
        } else {

            var t1 = filter[0];
            var t2 = filter[1];
            brushFilteredDates = dateDimension.filterRange([t1, t2]);

            var point = brushFilteredDates.bottom(1)[0];

            timeOverlayProps.startTime = moment(t1);
            timeOverlayProps.endTime = moment(t2);
            timeOverlay.update();
            drawDataPointOverlay(point);
        }


    }
}



function playSelection() {
    //find the first one with points
    var found = false;

    var ranged = brushFilteredDates.bottom(Infinity);

    for (var i = 0; i < ranged.length; i++) {
        var d = ranged[i];
        if (d.items !== undefined) {
            drawDataPointOverlay(d);
            console.log('playing...');
        }

    }
    console.log('done');
}

/**
 * lookup for node colors
 */
function nodeColorMap(index) {
    var colors = ['Red', 'Purple', 'Deep Purple', 'Ingio', 'Light Blue', 'Cyan', 'Green', 'Teal', 'Lime', 'Yellow', 'Orange', 'Deep Orange', 'Brown', 'Grey', 'Blue Grey'];

    var c = colors[index];

    return palette.get('Purple', 'A200');

}

