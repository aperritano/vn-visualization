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
var filter;
var subjectsFilter;
var populationCountsFilter;
var networkFilter;

var dateFormat = '%Y-%m-%d %H:%M:%S';
var parseDate =
    d3.time.format(dateFormat).parse;

var num = 1000;

var labels;
var dictionary;

var labelFilter;

dictionaryDB.on('value', function (snapshot) {

    if (snapshot.val() !== undefined) {
        //remove the last object
        updateDictionaryFromDB(snapshot.val());
        labelsDB.orderByKey().startAt('0').endAt('10000').on('value', function (snapshot) {

            if (snapshot.val() !== undefined) {

                //remove the last object
                updateLabelsFromDB(snapshot.val());
            }

            timestampsDB.orderByKey().startAt('0').endAt('10000').on('value', function (snapshot) {

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
}

function updateLabelsFromDB(l) {
    labels = l;
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
                        if( l.timestamp === d.timestamp ) {
                            return true;
                        }
                        return false;

                    });

                    //if we found a matching timestamp
                    if( foundTimestamps[0] !== undefined ) {
                        //finds the dictionary l
                        var foundDictionary = dictionary.filter(function (k) {

                            if( foundTimestamps[0].label === k.code ) {
                                return true;
                            }

                            return false;

                        });

                        //if we found a dictionary entry
                        if(foundDictionary[0] !== undefined) {
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
            filter = crossfilter(gpsDataset);

            //subjects = filter.groupAll();

            subjectsFilter = filter.dimension(function (d) {
                return d.date;
            });
            populationCountsFilter = filter.dimension(function (d) {
                return d.count;
            });

            labelFilter = filter.dimension(function (d) {
                return d.labels;
            });

            networkFilter = filter.dimension(function (d) {
                return d.nets;
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

    var firstPoint = subjectsFilter.bottom(1)[0];


    if (firstPoint.items !== undefined) {
        drawDataPointOverlay(firstPoint);
    } else {
        //this point doesn't have subjects
    }
}

function drawDataPointOverlay(dataPoint) {


    if (dataPoint.items[0] === undefined) {
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

            var link = {p1: p1, p2: p2};
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
            return d.lon
        })
        .attr('lat', function (d) {
            return d.lat
        })
        .attr('r', 10)
        .style('stroke-width', function(d) {
            if (dataPoint.labels === -1) {
                return 1;
            } else {
                return 3;
            }
        })
        .style('stroke', function(d) {
            if(dataPoint.labels === -1) {
                return '#03A9F4';
            } else {
                return '#E040FB';
            }
        })
        //.style(' stroke-opacity', function(d) {
        //    if(d.labels === -1) {
        //        return '#03A9F4';
        //    } else {
        //        return '#E040FB';
        //    }
        //})
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
        });

    var lineContainer;


    //NET [{"p1":{"lon":36.922608,"lat":0.3513041},"p2":{"lon":36.922675,"lat":0.3513414}}]

    //lon-lat
    var data = [ [36.922608, 0.3513041], [36.922675, 0.3513414]];


    var lineData = [ {  x : 36.922608,    y : 0.3513041},  {  x : 36.922675,   y : 0.3513414}];

    if (links[0] !== undefined) {

        var toLine = d3.svg.line()
            .interpolate('linear')
            .x(function (d) {
                return applyLatLngToLayer3(d).x;
            })
            .y(function (d) {
                return applyLatLngToLayer3(d).y;
            });

        lineContainer = mapContainer.append("path") // <-E
            .attr("d", toLine(lineData))
            .attr('stroke', 'blue')
            .attr('stroke-width', 2)
            .attr('fill', 'none');

        //links.forEach(function(l) {
        //
        //    var polyline = L.polyline([
        //            [l.p1.lat, l.p1.lon],
        //            [l.p2.lat, l.p2.lon]],
        //        {
        //            color: 'black',
        //            weight: 2,
        //            opacity: 1
        //        }
        //    ).addTo(map);
        //});
        //
        //
        //
        //svg.selectAll("path.line")
        //    .data(data)
        //    .enter()
        //    .append("path") // <-E
        //    .attr("class", "line")
        //    .attr("d", function(d){return line(d);});


        //var lineContainer = mapSVG.append('g');
        //
        //
        //linePath = mapContainer.selectAll(".lineConnect").data(links[0])
        //    .enter()
        //    .append('path')
        //    .attr("stroke", "blue")
        //    .attr("stroke-width", 2)
        //    .attr("fill", "none");


    }


    //var toLine = d3.svg.line()
    //    .interpolate("linear")
    //    .x(function(d) { return map.latLngToLayerPoint(d[0].LatLng).x; })
    //    .y(function(d) { return map.latLngToLayerPoint(d.LatLng).y; });
    //
    //mapContainer.selectAll('.route').data(links).enter().append('path')
    //    .attr('class', 'line')
    //    .style('stroke','black')
    //    .style('stroke-width','1px')
    //    .attr("d", function(d) { return path1(d.geometry.coordinates); });
    //
    //
    //


    //var toLine = d3.svg.line()
    //    .interpolate('linear')
    //    .x(function(d) {
    //        var t = applyLatLngToLayer3(d).x;
    //        return t;
    //    })
    //    .y(function(d) {
    //        var t = applyLatLngToLayer3(d).y;
    //        return t;
    //    });
    //


    //remove old ones
    map.on('viewreset', update);


    update();

    function applyLatLngToLayer3(d) {
        var x = d.x;
        var y = d.y;
        return map.latLngToLayerPoint(new L.LatLng(y, x))
    }


    function applyLatLngToLayer2(d) {
        var y = d[1];
        var x = d[0];
        return map.latLngToLayerPoint(new L.LatLng(y, x))
    }

    function applyLatLngToLayer(d) {
        var y = d.geometry.coordinates[1]
        var x = d.geometry.coordinates[0]
        return map.latLngToLayerPoint(new L.LatLng(y, x))
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
        height = 60 - margin.top - margin.bottom;


    var t2 = subjectsFilter.top(1)[0];
    var t1 = subjectsFilter.bottom(1)[0];

    var tStart = moment(t1.timestamp).toDate();
    var tEnd = moment(t2.timestamp).toDate();
    var t15 = moment(t1.timestamp).add(5, 'm').toDate();


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

    //population graph

    var s1 = subjectsFilter.top(1)[0];


    var yPadding = s1.count + 3;
    var y = d3.scale.linear()
        .domain([0, yPadding])
        .range([height, 0]);

    var yAxis = d3.svg.axis()
        .scale(y).orient('left').tickValues([yPadding]);

    var line = d3.svg.line()
        .x(function (d) {
            return x(d.date);
        })
        .y(function (d) {
            return y(d.count);
        });


    var area = d3.svg.area()
        .interpolate('monotone')
        .x(function (d) {
            return x(d.date);
        })
        .y0(height)
        .y1(function (d) {
            return y(d.count);
        });


    var gPopulationGraph = timelineSVG.append('g');

    gPopulationGraph
        .append('clipPath')
        .attr('id', 'clip')
        .append('rect')
        .attr('width', width)
        .attr('height', height);


    gPopulationGraph.append('path')
        .attr('class', 'area_population')
        .attr('clip-path', 'url(#clip)')
        .attr('d', area(gpsDataset));

    gPopulationGraph.append('path')
        .attr('class', 'line_population')
        .attr('clip-path', 'url(#clip)')
        .attr('d', line(gpsDataset));

    gPopulationGraph.append('g')
        .attr('class', 'y axis')
        .style('stroke-width', '1px')
        .attr('transform', 'translate(' + width + ' ,0)')
        .call(yAxis);

    //label graph

    var l1 = labelFilter.top(1)[0];


    var yPadding = l1.count + 3;
    var y = d3.scale.linear()
        .domain([0, yPadding])
        .range([height, 0]);

    var yAxis = d3.svg.axis()
        .scale(y).orient('left').tickValues([yPadding]);

    var line = d3.svg.line()
        .x(function (d) {
            return x(d.date);
        })
        .y(function (d) {
            if(d.labels === -1) {
                return y(0);
            } else {
                return y(1);
            }
        });


    var area = d3.svg.area()
        .interpolate('monotone')
        .x(function (d) {
            return x(d.date);
        })
        .y0(height)
        .y1(function (d) {
            if(d.labels === -1) {
                return y(0);
            } else {
                return y(1);
            }
        });



    var gLabelGraph = timelineSVG.append('g');

    gLabelGraph
        .append('clipPath')
        .attr('id', 'clip')
        .append('rect')
        .attr('width', width)
        .attr('height', height);


    gLabelGraph.append('path')
        .attr('class', 'area_label')
        .attr('clip-path', 'url(#clip)')
        .attr('d', area(gpsDataset));

    gLabelGraph.append('path')
        .attr('class', 'line_label')
        .attr('clip-path', 'url(#clip)')
        .attr('d', line(gpsDataset));

    gLabelGraph.append('g')
        .attr('class', 'y axis')
        .style('stroke-width', '1px')
        .attr('transform', 'translate(' + width + ' ,0)')
        .call(yAxis);

    //network graph

    var n1 = networkFilter.top(1)[0];


    var yPadding = n1.count + 3;
    var y = d3.scale.linear()
        .domain([0, yPadding])
        .range([height, 0]);

    var yAxis = d3.svg.axis()
        .scale(y).orient('left').tickValues([yPadding]);

    var line = d3.svg.line()
        .x(function (d) {
            return x(d.date);
        })
        .y(function (d) {
            if(d.nets === undefined) {
                return y(0);
            } else {
                return y(d.nets.length);
            }
        });


    var area = d3.svg.area()
        .interpolate('monotone')
        .x(function (d) {
            return x(d.date);
        })
        .y0(height)
        .y1(function (d) {
            if(d.nets === undefined) {
                return y(0);
            } else {
                return y(d.nets.length);
            }
        });


    var gNetworkGraph = timelineSVG.append('g');

    gNetworkGraph
        .append('clipPath')
        .attr('id', 'clip')
        .append('rect')
        .attr('width', width)
        .attr('height', height);


    gNetworkGraph.append('path')
        .attr('class', 'area_label')
        .attr('clip-path', 'url(#clip)')
        .attr('d', area(gpsDataset));

    gNetworkGraph.append('path')
        .attr('class', 'line_label')
        .attr('clip-path', 'url(#clip)')
        .attr('d', line(gpsDataset));

    gNetworkGraph.append('g')
        .attr('class', 'y axis')
        .style('stroke-width', '1px')
        .attr('transform', 'translate(' + width + ' ,0)')
        .call(yAxis);

    //finally make the brush

    //create the brush

    if (moment(t15).isAfter(tEnd)) {

        var vEnd = moment(tEnd).valueOf();
        var vStart = moment(tStart).valueOf();

        var diff = vEnd - vStart;

        vEnd = vStart + (diff / 2);


        tEnd = moment(vEnd);
    } else {
        tEnd = t15;
    }

    brush = d3.svg.brush()
        .x(x)
        .extent([tStart, tEnd])
        .on('brushend', brushended);

    var gBrush = timelineSVG.append('g')
        .attr('class', 'brush')
        .call(brush)
        .call(brush.event);

    gBrush.selectAll('rect')
        .attr('height', height);

    updateDataFromDB(t1);
}

var brushFilteredDates;
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


    //filter range
    if (extent1[0] !== undefined && extent1[1] !== undefined) {

        brushFilteredDates = subjectsFilter.filterRange(extent1);

        var b = brushFilteredDates.bottom(Infinity);

        //console.log(JSON.stringify(b));
        //grab the first one
        drawDataPointOverlay(b[0]);
        drawLabelTimeline(b);
        //var tStart = moment(extent1[0]);
        //var tEnd = moment(extent1[1]);
        ////zoomToDateRange(tStart, tEnd);
    }

}

/***
 * PUT YOUR CREATE LABEL
 */

function playSelection() {
    //find the first one with points
    var found = false;

    for (var i = 0; i < currentTimeRange.length; i++) {
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

    return palette.get('Purple', 'A200');

}

