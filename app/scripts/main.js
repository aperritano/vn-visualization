
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

//var mainOffset = 15;

var margin = {top: 100, right: 10, bottom: 150, left: 10};
//var mainTimelineWidth = window.innerWidth - margin.left - margin.right;
var mainTimelineInnerWidth = window.innerWidth - margin.left - margin.right - 10;
var mainTimelineHeight = 45;
var mainTimelineInnerHeight = mainTimelineHeight - 15;
//var mainTimelinePostionY = window.innerHeight - (mainTimelineHeight + mainOffset);


var mapSVG;
var timelineSVG;
var mainTimelineRect;
var map;

var ref = new Firebase('https://gpsdatababoons.firebaseio.com/timestamps');



ref.orderByKey().startAt('0').endAt('100').on('value', function (snapshot) {
    var v = snapshot.val();
    updateDataFromDB(v);
}, function (errorObject) {
    console.log('The read failed: ' + errorObject.code);
});

initMapLeaflet();

//initMapSVG();

//setup resize
//d3.select(window).on('resize', resize);


/*** functions ******/

function initMapLeaflet() {

    var m = document.getElementById('map');

    var mapLeafletWidth = mainTimelineInnerWidth + (margin.left + 1 );
    var mapLeafletHeight = wHeight / 2;

    m.style.width = mapLeafletWidth + 'px';
    m.style.height = mapLeafletHeight + 'px';

    map = L.map('map', {zoomControl: true, attributionControl: false}).setView([0.3509073, 36.9229031], 5);
    map.touchZoom.disable();
    map.doubleClickZoom.disable();
    map.scrollWheelZoom.disable();
    map.boxZoom.disable();
    map.keyboard.disable();
    map.dragging.disable();

    //create control shutoff vectors
    // create the control
    var countryOverlayControl = L.control({position: 'topleft'});

    countryOverlayControl.onAdd = function (map) {
        if( debug ) {
            console.log('countery overlay', map);
        }
        var div = L.DomUtil.create('div', 'countryOverlayControl');

        div.innerHTML = '<form><input id="countryOverlayControl" type="checkbox" checked="checked"/>OVERLAY</form>';
        return div;
    };

    countryOverlayControl.addTo(map);


    document.getElementById('countryOverlayControl').addEventListener('click', handleCountryOverlayControl, false);

    //var Esri_WorldGrayCanvas =
    L.tileLayer('http://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
//            attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ',
        maxZoom: 16
    }).addTo(map);

    // Initialize the SVG layer
    map._initPathRoot();


        // Add an SVG element to Leaflet’s overlay pane
//    mapSVG = d3.select('#map').select('svg');

    //mapSVG = d3.select(map.getPanes().overlayPane)
    mapSVG = d3.select('#map').select('svg');
        //.attr('width', mapLeafletWidth)
        //.attr('height', mapLeafletHeight)
        //.style('background-color', 'red');

    mapContainer = mapSVG.append('g');

}

function handleCountryOverlayControl() {

    if (this.checked) {
        addCountryOverlay();
    } else {
        mapSVG.selectAll('path').remove();
    }
}

function addCountryOverlay() {


    d3.json('KEN.topojson', function (error, collection) {

        //unknown error, check the console
        if(error){
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


        // Use Leaflet to implement a D3 geographic projection.
        function projectPoint(x) {
            var point = map.latLngToLayerPoint(new L.LatLng(x[1], x[0]));
            return [point.x, point.y];
        }
    });
}

function addDataPoints(dataPoint) {
    var subjects = dataPoint.items;

    subjects.forEach(function(d) {
        d.LatLng = new L.LatLng(d.lat, d.lon);
    });

    var circles = mapContainer.selectAll('circle')
        .data(subjects)
        .enter().append('circle')
        .style('fill', 'orange')
        .style('fill-opacity',0.7)
        .attr('r', 10)
        .on('click', function(d){
            window.alert(d);
        });

    map.on('viewreset', update);

    update();

    function update(){
        circles.attr('transform',
            function(d) {
                return 'translate('+
                    map.latLngToLayerPoint(d.LatLng).x +','+
                    map.latLngToLayerPoint(d.LatLng).y +')';
            }
        );
    }

}

function createLeafletMapOverlay(dataPoint) {
    //addCountryOverlay();
    addDataPoints(dataPoint);
}


//function initMapSVG() {
//    //create the entire window area
//    mapSVG = d3.select('#map').append('svg')
//        .attr('width', mainTimelineInnerWidth + margin.left)
//        .attr('height', wHeight / 2)
//        .style('background-color', 'lightgray');
//}

/**
 * Setup the map for pure SVG
 **/
//function createMap(dataPoint) {
//
////        var margin = {top: 10, left: 10, bottom: 10, right: 10}
////                , width = parseInt(d3.select('#map').style('width'))
////                , width = width - margin.left - margin.right
////                , mapRatio = .5
////                , height = width * mapRatio;
//
//
//    //Map projection
//    var subjects = dataPoint.items;
//
//
////        projection = d3.geo.mercator()
////                .scale(1000)
////                .center([36.922895, 0.3508943]) //projection center
////                .translate([mapWidth, mapHeight]) //translate to center the map in view
//    if (dataPoint === undefined) {
//        projection = d3.geo.mercator()
//            .scale(1000)
//            .center([36.922895, 0.3508943]) //projection center
//            .translate([mapWidth, mapHeight]); //translate to center the map in view
//    } else {
//        projection = d3.geo.mercator()
//            .scale(10000)
//            .center([subjects[0].lon, subjects[0].lat]) //projection center
//            .translate([mapWidth / 2, mapHeight / 2]); //translate to center the map in view
//    }
//
//
//    //Generate paths based on projection
//    path = d3.geo.path()
//        .projection(projection);
//
//
//    //Group for the map mapContainer
//    mapContainer = mapSVG.append('g');
//
//    //Create a tooltip, hidden at the start
////        tooltip = d3.select('body').append('div').attr('class', 'tooltip');
//
//
//    //create the map
//    d3.json('KEN.topojson', function (error, geodata) {
//
//        //unknown error, check the console
//        if(error) {
//            return console.log(error);
//        }
//
//
//        mapContainer.selectAll('path')
//            .data(topojson.feature(geodata, geodata.objects.KEN).features) //generate mapContainer from TopoJSON
//            .enter()
//            .append('path')
//            .attr('d', path);
//
//        mapContainer.selectAll('circle')
//            .data(subjects)
//            .enter()
//            .append('circle')
//            .attr('r', 5)
//            .style('fill', 'red')
////                    .attr('cx', function (d) {
////                        return projection([+d.lon, +d.lat])[0];
////                    })
////                    .attr('cy', function (d) {
////                        return projection([+d.lon, +d.lat])[1];
////                    });
//            .attr('transform', function (d) {
//                return 'translate(' + projection([+d.lon, +d.lat]) + ')'; //plus sign converts to ints
//            });
//    });
//
//    //Create zoom/pan listener
//    //Change [1,Infinity] to adjust the min/max zoom scale
//    // zoom and pan
//    zoom = d3.behavior.zoom()
//        .on('zoom', function () {
//            mapContainer.attr('transform', 'translate(' +
//                d3.event.translate.join(',') + ')scale(' + d3.event.scale + ')');
//            mapContainer.selectAll('circle')
//                .attr('d', path.projection(projection));
//            mapContainer.selectAll('path')
//                .attr('d', path.projection(projection));
//
//        });
//
//    mapSVG.call(zoom);
//
//    //plot the first point from the inital position on the brush
//    //updatePointsPosition(dataPoint);
//}

//function updatePointsPosition(dataPoints) {
//
//    //are often given in the real world in the order of “latitude, longitude.” Because latitude corresponds to the
//    // y-axis and longitude corresponds to the x-axis, you have to flip them to provide the x, y coordinates
//    // necessary for GeoJSON and D3.
//    if (dataPoints !== undefined) {
//        mapContainer.selectAll('circle')
//            .data(dataPoints)
//            .enter()
//            .append('circle')
//            .attr('r', 5)
//            .style('fill', 'red')
//            .attr('cx', function (d) {
//                return projection([d.lon, d.lat])[0];
//            })
//            .attr('cy', function (d) {
//                return projection([d.lon, d.lat])[1];
//            });
//    }
//
//
//}

function updateDataFromDB(items) {

    //there is no timeline available create one
    if (gpsDataset === undefined || gpsDataset[0] === undefined) {

        gpsDataset = items;

        var first = gpsDataset[0];
        //create map
        createLeafletMapOverlay(first);
        //create timeline
        createTimeLine();
    } else {
        //update timeline
        //update map
    }


}

/**
 * Create the main time line
 *
 * @param items - that complete dataset
 */
function createTimeLine() {
    var timeDomain = d3.extent(gpsDataset, function (d) {
        return d.timestamp;
    });


    console.log('timedomain', JSON.stringify(timeDomain));

    var x = d3.time.scale()
        .domain([moment(timeDomain[0]).toDate(), moment(timeDomain[1]).toDate()])
        .range([0, mainTimelineInnerWidth]);

    var t1 = moment(timeDomain[0]).toDate();
    var t2 = moment(timeDomain[0]).add(15, 'm').toDate();

    currentTimeRange = findDatesInRange(t1, t2);

    currentTimeRange.push(t1, t2);
    brush = d3.svg.brush()
        .x(x)
        .extent([t1, t2])
        .on('brushend', brushended);


    timelineSVG = d3.select('#timeline').append('svg')
        .attr('fill', 'blue')
        .attr('width', mainTimelineInnerWidth + margin.left)
        .attr('height', mainTimelineHeight)
        .attr('transform', 'translate(' + 0 + ',' + 0 + ')');


    //80% of the total svg height
    mainTimelineInnerHeight = 0.7 * mainTimelineHeight;
    var brushAreaHeight = mainTimelineInnerHeight;

    //create the mainTimeLine area and position it on screen
    var mainTimelineContainer = timelineSVG
        .append('g')
        .attr('transform', 'translate(' + 0 + ',' + 0 + ')');

    //draw its overall rect
    mainTimelineRect = mainTimelineContainer.append('rect');
    mainTimelineRect
        .attr('fill', 'none')
        .attr('width', '100%')
        .attr('height', mainTimelineHeight);


    //draw the grid background
    mainTimelineContainer
        .append('g')
        .append('rect')
        .attr('class', 'grid-background')
        .attr('width', '100%')
        .attr('height', brushAreaHeight)
        .attr('transform', 'translate(' + 0 + ',' + 0 + ')');

    var ga = d3.svg.axis()
        .scale(x)
        .orient('bottom')
        .ticks(d3.time.minutes.utc, 15)
        .tickSize(mainTimelineInnerHeight)
        .tickFormat('');

//        //create grid axis
    mainTimelineContainer
        .append('g')
        .attr('class', 'x grid')
        .attr('height', 5)
        .attr('transform', 'translate(15,' + 0 + ')')
        .call(ga)
        .selectAll('.tick')
        .classed('minor', function (d) {
            return d.getUTCMinutes();
        });

    var xa = d3.svg.axis()
        .scale(x)
        .orient('bottom')
        .ticks(d3.time.minutes.utc, 15)
        .tickPadding(0);
//
    mainTimelineContainer.append('g')
        .attr('class', 'x axis')
        .attr('transform', 'translate(15,' + brushAreaHeight + ')')
        .call(xa)
        .selectAll('text')
        .attr('x', -12)
        .style('text-anchor', null);


    var gBrush = mainTimelineContainer.append('g')
        .attr('class', 'brush')
        .call(brush)
        .call(brush.event);
//
    gBrush.selectAll('rect')
        .attr('height', mainTimelineInnerHeight);


}


function brushended() {
    // only transition after input
    if(!d3.event.sourceEvent) {
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
    console.log('brush dates', JSON.stringify(extent1), moment(extent1[0]).toDate(), moment(extent1[1]).toDate());

    if (extent1[0] !== undefined && extent1[1] !== undefined) {
        findDatesInRange(moment(extent1[0]), moment(extent1[1]));
    }

}

function findDatesInRange(date1, date2) {

    var foundDates = [];

    for (var i = 0; i < gpsDataset.length; i++) {
        var dataItem = gpsDataset[i];
        if (moment(dataItem.timestamp).isBetween(date1, date2, 'minute')) {
            foundDates.push(dataItem);
        }
    }

    if (foundDates !== undefined && foundDates[0] !== undefined) {
        for (var k = 0; k < foundDates.length; k++) {
            console.log('found date: ', JSON.stringify(foundDates[k]));
        }

        updateDataFromDB(foundDates[0]);
    }

    return foundDates;
}

//function playPointRange() {
//    console.log('Play Point Range');
//
//    //gpsDataset[1].items[0]
//
////        mapContainer.transition()
////                .duration(750)
////                .style('stroke-width', 1.5 / scale + 'px')
////                .attr('transform', 'translate(' + translate + ')scale(' + scale + ')');
//
//
//    if (currentTimeRange !== undefined && currentTimeRange[0] !== undefined) {
//
//
//        for (var i = 0; i < currentTimeRange.length; i++) {
//            //console.log('found date: ', JSON.stringify(foundDates[i]));
//            var d = currentTimeRange[i];
//            updatePointsPosition(d);
//        }
//    }
//
//}


//function zoomTo() {
//    console.log('zoomTo');
//    var point = gpsDataset[1].items[0];
//    var p = projection([-point.lon, -point.lat]);
//
//    zoom.scale(20000);
//    zoom.translate(p);
//
//    //mapContainer.call(zoom);
//
////        mapContainer.transition().duration(750).call(zoomTo(point, 4));
//    mapContainer.transition()
//        .duration(750)
//        .attr('transform', 'translate(' +
//        d3.event.translate.join(',') + ')scale(' + 4 + ')')
//        .selectAll('circle')
//        .selectAll('path')
//        .attr('d', path.projection(projection))
//        .attr('transform', 'translate(' + p + ')scale(' + 22 + ')');
//
//
//}


// Add optional onClick events for mapContainer here
// d.properties contains the attributes (e.g. d.properties.name, d.properties.population)
//var active = d3.select(null);
//function clicked(d, i) {
//    if(active.node() === this) {
//        return reset();
//    }
//    active.classed('active', false);
//    active = d3.select(this).classed('active', true);
//
//    var bounds = path.bounds(d),
//        dx = bounds[1][0] - bounds[0][0],
//        dy = bounds[1][1] - bounds[0][1],
//        x = (bounds[0][0] + bounds[1][0]) / 2,
//        y = (bounds[0][1] + bounds[1][1]) / 2,
//        scale = 0.9 / Math.max(dx / mapWidth, dy / mapHeight),
//        translate = [mapWidth / 2 - scale * x, mapHeight / 2 - scale * y];
//
//    mapContainer.transition()
//        .duration(750)
//        .style('stroke-width', 1.5 / scale + 'px')
//        .attr('transform', 'translate(' + translate + ')scale(' + scale + ')');
//
//}


//Update map on zoom/pan
//    function zoomed() {
//        console.log('t s', zoom.translate, zoom.scale());
//        mapContainer.attr('transform', 'translate(' + zoom.translate() + ')scale(' + zoom.scale() + ')')
//                .selectAll('path').style('stroke-width', 1 / zoom.scale() + 'px');
//    }


//Position of the tooltip relative to the cursor
//var tooltipOffset = {x: 5, y: -25};
//
////Create a tooltip, hidden at the start
//function showTooltip(d) {
//    moveTooltip();
//
//    tooltip.style('display', 'block')
//        .text(d.properties.ID);
//}
//
////Move the tooltip to track the mouse
//function moveTooltip() {
//    tooltip.style('top', (d3.event.pageY + tooltipOffset.y) + 'px')
//        .style('left', (d3.event.pageX + tooltipOffset.x) + 'px');
//}
//
////Create a tooltip, hidden at the start
//function hideTooltip() {
//    tooltip.style('display', 'none');
//}

//    var w = window,
//            d = document,
//            e = d.documentElement,
//            g = d.getElementsByTagName('body')[0],
//            x = w.innerWidth || e.clientWidth || g.clientWidth;
//
//    function resize() {
//        x = w.innerWidth || e.clientWidth || g.clientWidth;
//        y = w.innerHeight|| e.clientHeight|| g.clientHeight;
//
//        svgContainer.attr('width', x - mainOffset).attr('height', y - mainOffset);
////        mainTimeLineRect.attr('width', x);
//        console.log('we resized width/height', window.innerWidth, window.innerHeight);
//    }