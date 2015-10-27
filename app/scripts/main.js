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

var ref = new Firebase('https://gpsdatababoons.firebaseio.com/timestamps');
var filter;


ref.orderByKey().startAt('0').endAt('80000').on('value', function (snapshot) {

    if( snapshot.val() !== undefined ) {



        //remove the last object
        updateDataFromDB(snapshot.val() );
    }

}, function (errorObject) {
    console.log('The read failed: ' + errorObject.code);
});

initMapLeaflet();

//initMapSVG();

//setup resize
//d3.select(window).on('resize', resize);


/*** functions ******/

/**
 * updates when firebase returns
 *
 * @param items
 */
function updateDataFromDB(items) {

    //there is no timeline available create one
    if (gpsDataset === undefined || gpsDataset[0] === undefined) {

        gpsDataset = items;

        //create map
        initLeafletOverlays();
        //create timeline
        createMainTimeline();
        //createCrossFilter();
       // createLabelTimeLine();
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

    var firstPoint = gpsDataset[0];


    if (firstPoint.items !== undefined) {
        drawDataPointOverlay(firstPoint);
    } else {
        //this point doesn't have subjects
    }
}

function drawDataPointOverlay(dataPoint) {


    var subjects = dataPoint.items;


    var i = 0;
    subjects.forEach(function (d) {

        d.LatLng = new L.LatLng(d.lat, d.lon);

        if (i === 0) {
            map.setZoom(19, {animate: true});

           map.panTo(d.LatLng, {animate: true});
        }

        i++;

    });


    var circles = mapContainer.selectAll('circle').data(subjects);

    circles.exit().remove();

    circles.enter()
        .append('circle')
        .attr('class', 'node')
        .attr('id', function (d) {
            return d.id;
        })
        .attr('r', 10)
        .style('stroke-width','1px')
        .style('fill', function (d) {
            return nodeColorMap(d.id);
        })
        .style('fill-opacity', 0.7)
        .on('click', function (d) {
            window.alert(d);
        });

    //remove old ones
    map.on('viewreset', update);


    update();




    function update() {
        d3.transition(circles)
            .attr('transform',
                function (d) {
                    return 'translate(' +
                        map.latLngToLayerPoint(d.LatLng).x + ',' +
                        map.latLngToLayerPoint(d.LatLng).y + ')';
                }
            );
    }
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
    //map.doubleClickZoom.disable();
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

    //create control shutoff vectors


    var countryOverlayControl = L.control({position: 'topleft'});

    countryOverlayControl.onAdd = function (map) {
        if (debug) {
            console.log('country overlay', map);
        }
        var div = L.DomUtil.create('div', 'countryOverlayControl');

        div.innerHTML = '<form><input id="countryOverlayControl" type="checkbox" checked="checked"/>OVERLAY</form>';
        return div;
    };

    countryOverlayControl.addTo(map);

    // create the control
    document.getElementById('countryOverlayControl').addEventListener('click', handleCountryOverlayControl, false);


    // Add an SVG element to Leaflet’s overlay pane
//    mapSVG = d3.select('#map').select('svg');

    //mapSVG = d3.select(map.getPanes().overlayPane)
    mapSVG = d3.select('#map').select('svg');
    //.attr('width', width + margin.left + margin.right);
    //.attr('height', mapLeafletHeight)
    //.style('background-color', 'red');

    mapContainer = mapSVG.append('g');

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
 */
function createMainTimeline() {

    var customTimeFormat = d3.time.format.multi([
        ['.%L', function(d) { return d.getMilliseconds(); }],
        [':%S', function(d) { return d.getSeconds(); }],
        ['%I:%M', function(d) { return d.getMinutes(); }],
        ['%I %p', function(d) { return d.getHours(); }],
        ['%a %d', function(d) { return d.getDay() && d.getDate() !== 1; }],
        ['%b %d', function(d) { return d.getDate() !== 1; }],
        ['%B', function(d) { return d.getMonth(); }],
        ['%Y', function() { return true; }]
    ]);

    var margin = {top: 10, left: 15, bottom: 20, right: 20},
        width = wWidth - margin.left - margin.right,
        height = 60 - margin.top - margin.bottom;

    var timeDomain = d3.extent(gpsDataset, function (d) {
        return d.timestamp;
    });

    var subjectsDomain = d3.extent(gpsDataset, function (d) {

        try {

        if ( d.items !== null || d.items !== undefined || d.items[0] !== undefined && d.items[0] !== null) {
            if( isNaN(+d.items.length) === true ) {
                return 0;
            } else {
                return +d.items.length;
            }
        } else {
            return 0;
        }
        } catch (e) {
            if (e instanceof TypeError) {
                console.info('datum TypeError Exception timestamp: ', d.timestamp);
                return 0;
            }
        }
    });


    console.log('timedomain', JSON.stringify(timeDomain));

    var tStart = moment(timeDomain[0]).toDate();
    var tEnd = moment(timeDomain[1]).toDate();
    var t15 = moment(timeDomain[0]).add(10, 'm').toDate();


    var x = d3.time.scale()
        .domain([tStart, tEnd])
        .range([0, width]);

    var xAxis = d3.svg.axis()
        .scale(x)
        .tickFormat(customTimeFormat);


    var timelineSVG = d3.select('#timeline').append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .append('g')
        .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');


    timelineSVG.append('g')
        .attr('class', 'x axis')
        .style('stroke-width', '1px')
        .attr('transform', 'translate(0,' + height + ')')
        .call(xAxis);


    //create the mini grap

    var parseDate =
        d3.time.format('%Y-%m-%d %H:%M:%S').parse;

    gpsDataset.forEach(function(d) {
        try {
            if(d.timestamp === undefined ) {
                debugger;
            } else {
                d.date = parseDate(d.timestamp);
            }
            if ( d.items !== null || d.items !== undefined || d.items[0] !== undefined && d.items[0] !== null) {
                if( isNaN(+d.items.length) === true ) {
                    d.count = 0;
                } else {
                    d.count = +d.items.length;
                }
            } else {
                d.count = 0;
            }
        } catch (e) {
            if (e instanceof TypeError) {
                console.info('datum TypeError Exception timestamp: ', d.timestamp);
                d.count = 0;
            }
        }
    });

    //population graph


    var yPadding = subjectsDomain[1] + 3;
    var y = d3.scale.linear()
        .domain([0, yPadding])
        .range([height, 0]);

    var yAxis = d3.svg.axis()
        .scale(y).orient('left').tickValues([yPadding]);

        var line = d3.svg.line()
        .x(function(d) {
            return x(d.date);
        })
        .y(function(d) {
            return y(d.count);
        });



    var area = d3.svg.area()
        .interpolate("monotone")
        .x(function(d) { return x(d.date); })
        .y0(height)
        .y1(function(d) { return y(d.count); });


    var gPopulationGraph = timelineSVG.append('g');

    gPopulationGraph
        .append("clipPath")
        .attr('id', 'clip')
        .append('rect')
        .attr('width', width)
        .attr('height', height);


    gPopulationGraph.append('path')
        .attr('class', 'area')
        .attr("clip-path", "url(#clip)")
        .attr('d', area(gpsDataset));

    gPopulationGraph.append("path")
        .attr("class", "line")
        .attr("clip-path", "url(#clip)")
        .attr("d", line(gpsDataset));

    gPopulationGraph.append('g')
        .attr('class', 'y axis')
        .style('stroke-width','1px')
        .attr("transform", "translate(" + width + " ,0)")
        .call(yAxis);

    //finally make the brush

    //create the brush

    brush = d3.svg.brush()
        .x(x)
        .extent([tStart, t15])
        .on('brushend', brushended);

    var gBrush = timelineSVG.append('g')
        .attr('class', 'brush')
        .call(brush)
        .call(brush.event);

    gBrush.selectAll('rect')
        .attr('height', height);



    if(moment(t15).isAfter(tEnd)) {
        zoomToDateRange(tStart, tEnd);
    } else {
        zoomToDateRange(tStart, t15);
    }
}


function brushended() {
    // only transition after input
    if (!d3.event.sourceEvent) {
        return;
    }
    var extent0 = brush.extent();
    var extent1 = extent0.map(d3.time.minute.utc.round);

    // if empty when rounded, use floor & ceil instead
    if (extent1[0] >= extent1[1]) {
        extent1[0] = d3.time.minute.utc.floor(extent0[0]);
        extent1[1] = d3.time.minute.utc.ceil(extent0[1]);
    }

    d3.select(this).transition()
        .call(brush.extent(extent1))
        .call(brush.event);
    //console.log('brush dates', JSON.stringify(extent1), moment(extent1[0]).toDate(), moment(extent1[1]).toDate());

    if (extent1[0] !== undefined && extent1[1] !== undefined) {
        var tStart = moment(extent1[0]);
        var tEnd = moment(extent1[1]);
        zoomToDateRange(tStart, tEnd);
    }

}

function zoomToDateRange(tStart, tEnd) {
    var foundDates = findDatesInRange(tStart, tEnd);

    //grab the first one and zoom to that
    if (foundDates !== undefined || foundDates[0] !== undefined) {

        //find the first one with points
        var found = false;
        foundDates.some(function (d) {

            if (found === false && d.items !== undefined) {
                drawDataPointOverlay(d);
                found = true;
                return found;
            }

        });
        //var firstDataPoint = foundDates[0];
        //
        //drawDataPointOverlay(firstDataPoint);
        //map.panTo(new L.LatLng(40.737, -73.923));
        //
    }

}

function findDatesInRange(tStart, tEnd) {

    var foundDates = [];

    for (var i = 0; i < gpsDataset.length; i++) {
        var dataItem = gpsDataset[i];
        //var t1 = tStart.valueOf();
        //var t2 = tEnd.valueOf();
        //var tFind = moment(dataItem.timestamp).toDate().valuOf();
        if (moment(dataItem.timestamp).isBetween(tStart, tEnd, 'minute')) {
            foundDates.push(dataItem);
        }
    }

    if (foundDates !== undefined && foundDates[0] !== undefined) {
        for (var k = 0; k < foundDates.length; k++) {
            //console.log('found date: ', JSON.stringify(foundDates[k]) +'\n');
        }

        updateDataFromDB(foundDates[0]);
    }

    currentTimeRange = foundDates;
    return foundDates;
}

function playSelection() {
    //find the first one with points
    var found = false;

    for( var i = 0; i < currentTimeRange.length; i++) {
        var d = currentTimeRange[i];
        if (d.items !== undefined) {
            //setInterval(function () {
                //console.log('playing...', d.items);
                drawDataPointOverlay(d);

                    //}, 250);


        }

    }
    console.log('done');
    //currentTimeRange.forEach(function (d) {
    //
    //    setInterval(function () {
    //
    //
    //    }, 500);
    //
    //});
}

/**
 * lookup for node colors
 */
function nodeColorMap(index) {
    var colors = ['Red', 'Purple', 'Deep Purple', 'Ingio', 'Light Blue', 'Cyan', 'Green', 'Teal', 'Lime', 'Yellow', 'Orange', 'Deep Orange', 'Brown', 'Grey', 'Blue Grey'];

    var c = colors[index];

    return palette.get(c, '400');

}

