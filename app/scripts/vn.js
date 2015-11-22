/*global L, d3, oboe, Parallel, moment, dc, _, crossfilter, topojson*/


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

var sessionInfo = {};
var sessions = [];
var labels = [];
var dictionary = [];
var gpsDataset = [];

//overlays for leaflet
var timeOverlay;
var timeOverlayProps = {};
var buttonOverlay;
var animateOverlay;



//crossfilter
var byDate;
var countGroup;
var labelGroup;
var netsGroup;
var allSubjects;
var xFilter;
var brushFilteredDates;

var startTime;
var endTime;

var isPlaying = false;
var currentDataPoint;
var animateTimer;

var pBar = document.querySelector('#progressBar');

function getSessionInfo() {
  oboe('https://baboons.firebaseio.com/sessions_info.json')
    .node('!.*', function (sess) {
      if (sess !== undefined) {
        sessions.push(sess);
      }
      return oboe.drop;
    })
    .done(function (finaljson) {
      console.log('done with sessionInfos');

      //update the textbox
      if (sessions.length > 0) {
        var tableBodyRef = document.getElementById('sessions-body');

        for (var i = 0; i < sessions.length; i++) {

          var sess = sessions[i];
          var rowRef = tableBodyRef.insertRow(i);
          var cellOption = rowRef.insertCell(0);
          cellOption.className = 'custom-row';

          //option button
          var labelRef = document.createElement('label');
          labelRef.className = 'mdl-radio mdl-js-radio mdl-js-ripple-effect';

          labelRef.setAttribute('for', 'option-' + i);
          cellOption.appendChild(labelRef);


          var inputRef = document.createElement('input');
          inputRef.className = 'mdl-radio__button';

          inputRef.setAttribute('type', 'radio');
          inputRef.setAttribute('id', 'option-' + i);
          inputRef.setAttribute('name', 'options');
          inputRef.setAttribute('value', sess.id);

          if (i === 0) {
            inputRef.checked = true;
          } else {
            inputRef.checked = false;
          }

          labelRef.appendChild(inputRef);

          var spanRef = document.createElement('span');
          spanRef.className = 'mdl-radio__label';
          spanRef.innerHTML = ' Session ' + (i + 1);

          labelRef.appendChild(spanRef);

          //componentHandler.upgradeElement(rowRef);
          //componentHandler.upgradeElement(inputRef);
          //componentHandler.upgradeElement(spanRef);


          var cellAuthor = rowRef.insertCell(1);
          cellAuthor.className = 'custom-row2';
          var authorText = document.createTextNode(sess.name);
          cellAuthor.appendChild(authorText);

          var cellDate = rowRef.insertCell(2);
          cellDate.className = 'custom-row2';

          var dateText = document.createTextNode(sess.date);
          cellDate.appendChild(dateText);

          componentHandler.upgradeElement(labelRef);
          componentHandler.upgradeElement(inputRef);
          componentHandler.upgradeElement(spanRef);


          var selectButtonTouchTarget = "buttonTwoTouchTarget";
          var selectButton = "buttonTwo";


          // Declare function to manage mouse over event.
          var modalSelectButton = document.getElementById(selectButtonTouchTarget);
          modalSelectButton.onclick = function () {
            document.getElementById(selectButton).style.backgroundColor = 'rgba(99,99,99,0.2)';
            document.getElementById('main-body').style.backgroundColor = 'white';
            document.getElementById('dialog').style.display = 'none';
            //which was checked

            var inputs = document.getElementsByTagName("input");

            if (!_.isUndefined(inputs)) {

              for (var k = 0; k < inputs.length; k++) {
                var input = inputs[k];
                if (input.checked) {
                  var value = input.value;
                  fetchSession(value);
                }
              }
            }
          };

        }
      }
    });
}

function fetchSession(value) {
  console.log('fetching session', value);
  pBar.style.display = 'block';

  oboe('https://baboons.firebaseio.com/sessions/' + value + '/dictionary.json')
    .node('!.*', function (dict) {


      if (dict !== undefined) {
        dictionary.push(dict);
      }

      return oboe.drop;
    })
    .done(function (finaljson) {
      console.log('done with dicts');
      doneDictionary();
    });

  oboe('https://baboons.firebaseio.com/sessions/' + value + '/session_info.json')
    .node('!.*', function (sessionInfo) {


      console.log('sessionInfo', sessionInfo);


      return oboe.drop;
    })
    .done(function (finaljson) {
      console.log('done with sessionInfo');
    });

  var recordProgressText = document.querySelector('#progressText');

  var recordCount = 0;


  oboe('https://baboons.firebaseio.com/sessions/' + value + '/timestamps.json')
    .node('!.*', function (t) {

      if (recordCount === 0) {
        recordProgressText.style.display = 'block';
      }

      if (t.timestamp === undefined) {
      } else {
        try {
          if (t.items !== null || t.items !== undefined || t.items[0] !== undefined && t.items[0] !== null) {
            if (isNaN(+t.items.length) === true) {
              t.items = [];
              t.count = 0;
              t.edges = [];
              t.labels = {};
            } else {
              t.count = +t.items.length;
              if (_.isUndefined(t.edges) || _.isEmpty(t.edges)) {
                t.edges = [];
              }
            }
          } else {
            t.items = [];
            t.count = 0;
            t.edges = [];
          }
          t.timestamp = parseDate(t.timestamp);
          gpsDataset.push(t);

        } catch (e) {
          if (e instanceof TypeError) {
            t.count = 0;
            t.items = [];
            t.edges = [];
            t.timestamp = parseDate(t.timestamp);
            gpsDataset.push(t);
          }
        }

      }
      recordCount++;
      recordProgressText.innerHTML = 'Retrieving Record ' + recordCount + ' of 21600';
      return oboe.drop;
    })
    .done(function (finaljson) {
      console.log('done with timestamps, starting timestamps', gpsDataset.length);
      recordProgressText.innerHTML = 'Retrieving Record 21600 of 21600';
      var pBar = document.querySelector('#progressBar');
      recordProgressText.style.display = 'none';
      pBar.style.display = 'none';
      doneTimestamps();
    });
}

function doneDictionary() {

  var drawerIcon = document.querySelector('.custom-header .material-icons');
  drawerIcon.style.color = '#616161';


  //update the textbox
  if (dictionary.length > 0) {
    var dictBodyRef = document.getElementById('dict-body');

    var newDictionary = _.filter(dictionary, function (val) {
      return val !== null;
    });
    for (var i = 0; i < newDictionary.length; i++) {

      var dict = newDictionary[i];
      if (!_.isNull(dict)) {
        var rowDictRef = dictBodyRef.insertRow(i);

        componentHandler.upgradeElement(rowDictRef);

        var nameCell = rowDictRef.insertCell(0);
        nameCell.className = 'dict-row';
        nameCell.style.paddingLeft = '24px';
        nameCell.style.textAlign = 'left';

        var dictName = document.createTextNode(dict.name);
        nameCell.appendChild(dictName);

        componentHandler.upgradeElement(nameCell);

        var codeCell = rowDictRef.insertCell(1);
        codeCell.className = 'dict-row';
        codeCell.style.paddingLeft = '0px';


        var dictCode = document.createTextNode(dict.code);
        codeCell.appendChild(dictCode);

        componentHandler.upgradeElement(codeCell);

        var colorCell = rowDictRef.insertCell(2);
        colorCell.className = 'dict-row';
        colorCell.style.paddingLeft = '0px';

        var div = document.createElement('div');
        div.id = 'code-' + dict.code;
        div.className = 'filler';
        div.style.background = dict.color;

        colorCell.appendChild(div);

        componentHandler.upgradeElement(colorCell);

        var tooltip = document.createElement('div');
        tooltip.setAttribute('for', 'code-' + dict.code);
        tooltip.className = 'mdl-tooltip mdl-tooltip--large';
        var toolText = document.createTextNode(dict.color);
        tooltip.appendChild(toolText);
        colorCell.appendChild(tooltip);

        componentHandler.upgradeElement(tooltip);
      }

    }
  }
}

function doneTimestamps() {
  console.log('all done');
  xFilter = crossfilter(gpsDataset);
  allSubjects = xFilter.groupAll();
  byDate = xFilter.dimension(function (d) {
    return d.timestamp;
  });

  countGroup = byDate.group().reduceSum(function (d) {
    return d.count;
  });

  //labelsGroup = byDate.group().reduceSum(function (d) {
  //  if (!_.isEmpty(d.labels)) {
  //    return 5;
  //  }
  //  return 0;
  //});

  netsGroup = byDate.group().reduceSum(function (d) {
    if (d.edges.length !== 0) {
      return d.edges.length / 2;
    }
    return 0;
  });


  initMapLeaflet();
  createMainTimeline('init');

}

getSessionInfo();

//setup resize
//d3.select(window).on('resize', resize);

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
    // d.labels = currentDataPoint.labels;
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

      var playButton = document.getElementById('play');
      playButton.onclick = function (e) {

        isPlaying = !isPlaying;
        if (isPlaying) {
          document.getElementById('play-icon').innerHTML = 'radio_button_checked';

        } else {
          document.getElementById('play-icon').innerHTML = 'play_circle_outline';

        }


        //var timeInterval = document.getElementById('interval').value;
        //
        //var i = parseInt(timeInterval);
        //if (_.isNaN(i) || i === 0) {
        //  document.getElementById('play-icon').innerHTML = 'radio_button_checked';
        //
        //  Toast.defaults.displayDuration=3000;
        //    Toast.error('Input must be a number great than zero.','Invalid Time Interval.');
        //    document.getElementById('interval').value = 1;
        //} else {
        //  document.getElementById('play-icon').innerHTML = 'radio_button_checked';
        //
        //
        //    console.log('PLAY');
        //    playSelection(i);
        //}

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
      .ordinalColors([generalColorMap(0), generalColorMap(4), generalColorMap(6)])
      .renderArea(true)
      .group(countGroup)
      //.stack(labelsGroup)
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

    //updateLabelTimeline(tStart, t5);
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
      //updateLabelTimeline(t1, t2);
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
      if (!_.isUndefined(item)) {
        map.setZoom(19, {animate: true});
        map.panTo(item.LatLng, {animate: true});
      }
    }
  }
}

function playSelection(seconds) {
  //find the first one with points

  isPlaying = !isPlaying;

  if (isPlaying) {
    var ranged = brushFilteredDates.bottom(Infinity);
    var speed = 175; // animatation speed

    var i = 0;

    var r1 = ranged[0];
    var hasZoomedToFirstPoint = false;

    animateTimer = setInterval(function () {
      if (i >= ranged.length) {
        document.getElementById('play-icon').innerHTML = 'radio_button_checked';

        isPlaying = false;
        clearInterval(animateTimer);
      }

      var d = ranged[i];
      if (!_.isUndefined(d) && !_.isUndefined(d.items)) {
        if (d.items !== undefined) {
          console.log('actual' + d.timestamp);
          drawDataPointOverlay(d);
          if (hasZoomedToFirstPoint === false) {
            zoomCurrentPoint();
            hasZoomedToFirstPoint = true;
          }

          //increase interval
          i = i + seconds;
          //t1 = t1.add('i', i);
          console.log('moment ' + i);
          isPlaying = true;
        }

      }

    }, speed);
  } else {
    clearInterval(animateTimer);
//         var playButton = document.getElementById('play');
//         playButton.classList.toggle('active');
  }
}

function updateAnimation() {
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
  //var c = colors[index];

  if (index > brewer.length) {
    index = 0;
  }

  return brewer[index];

}



