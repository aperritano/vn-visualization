/* eslint-env browser */
(function() {
  'use strict';
/* global L, d3, oboe, Parallel,moment, dc, _, crossfilter */





  var mapContainer;


//  dimensions
  var wHeight = 'innerHeight' in window ? window.innerHeight : document.documentElement.offsetHeight;
  var wWidth = 'innerWidth' in window ? window.innerWidth : document.documentElement.offsetWidth;

// var mainOffset = 15;

  var margin = {top: 50, left: 20, bottom: 20, right: 20};


  var mapSVG;
  var map;

  var dateFormat = '%Y-%m-%d %H:%M:%S';
  var parseDate =
    d3.time.format(dateFormat).parse;

  var sessionInfo = {};
  var sessions = [];
  var labels = [];
  var dictionary = [];
  var gpsDataset = [];

//  overlays for leaflet
  var timeOverlay;
  var timeOverlayProps = { color: '#000000'};
  var buttonOverlay;
  var animateOverlay;


//  crossfilter
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

//  var pBar = document.querySelector('#progressBar');

  function getSessionInfo() {
    oboe('https://baboons.firebaseio.com/sessions_info.json')
      .node('!.*', function (sess) {
        if (!_.isUndefined(sess) || !_.isNull(sess)) {
          sessions.push(sess);
        }
        return oboe.drop;
      })
      .done(function (finaljson) {
        console.log('done with sessionInfos');

        //  update the textbox
        if (sessions.length > 0) {
          var tableBodyRef = document.getElementById('sessions-body');

          for (var i = 0; i < sessions.length; i++) {

            var sess = sessions[i];
            var rowRef = tableBodyRef.insertRow(i);
            var cellOption = rowRef.insertCell(0);
            cellOption.className = 'custom-row';

            //  option button
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

            // componentHandler.upgradeElement(rowRef);
            // componentHandler.upgradeElement(inputRef);
            // componentHandler.upgradeElement(spanRef);


            var cellAuthor = rowRef.insertCell(1);
            cellAuthor.className = 'custom-row2';
            var authorText = document.createTextNode(sess.name);
            cellAuthor.appendChild(authorText);

            var cellDate = rowRef.insertCell(2);
            cellDate.className = 'custom-row2';

            var dateText = document.createTextNode(moment(sess.date).toDate());
            cellDate.appendChild(dateText);

            componentHandler.upgradeElement(labelRef);
            componentHandler.upgradeElement(inputRef);
            componentHandler.upgradeElement(spanRef);


            var selectButtonTouchTarget = "buttonTwoTouchTarget";
            var selectButton = "buttonTwo";


            //  Declare function to manage mouse over event.
            var modalSelectButton = document.getElementById(selectButtonTouchTarget);
            modalSelectButton.onclick = function () {
              document.getElementById(selectButton).style.backgroundColor = 'rgba(99,99,99,0.2)';
              document.getElementById('main-body').className = 'mdl-layout__content mdl-color--white';
              document.getElementById('dialog').style.display = 'none';
              // which was checked

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

    // pBar.style.display = 'block';

    document.querySelector('#vn-progress-section').style.display = 'block';

    var recordProgressText = document.querySelector('#progressText');
    recordProgressText.innerHTML = 'Connecting...';

    oboe('https://baboons.firebaseio.com/sessions/' + value + '/dictionary.json')
      .node('!.*', function (dict) {
        if (!_.isUndefined(dict) || !_.isNull(dict)) {
          dictionary.push(dict);
        }
        return oboe.drop;
      })
      .done(function (finaljson) {
        console.log('done with dicts');
        recordProgressText.innerHTML = 'Dictionary fetched...';

        dictionary.push({code: 'm', color: '#a6cee3', name: 'Male'});
        dictionary.push({code: 'f', color: '#fb9a99', name: 'Female'});
        doneDictionary();

      });

    oboe('https://baboons.firebaseio.com/sessions/' + value + '/session_info.json')
      .node('session_info.*', function (session_info) {

        if (!_.isUndefined(session_info) || !_.isNull(session_info)) {
          sessionInfo = session_info;
        }
        console.log('sessionInfo', session_info);
        return oboe.drop;
      })
      .done(function (finaljson) {
        sessionInfo = finaljson;
        doneSessionInfo();
      });

    var recordCount = 0;

    // oboe('https://baboons.firebaseio.com/sessions/' + value + '/timestamps.json')
    oboe('https://baboons.firebaseio.com/sessions/'+value +'/timestamps.json?orderBy=%22$key%22&limitToFirst=500')
      .node('!.*', function (t) {

        if (_.isUndefined(t) || _.isNull(t)) {
          return oboe.drop;
        }

        if (_.isUndefined(t.timestamp) || _.isNull(t.timestamp)) {
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
        recordProgressText.innerHTML = 'Retrieving Record ' + recordCount;
        return oboe.drop;
      })
      .done(function (finaljson) {
        doneTimestamps();
      });
  }

  function doneSessionInfo() {
    console.log('done with sessionInfo');
    var recordProgressText = document.querySelector('#progressText');
    recordProgressText.innerHTML = 'Session Info fetched...';

    var sessionTitle = document.querySelector('#session-title');
    sessionTitle.innerHTML = sessionTitle.innerHTML + ' #' + sessionInfo.name + '-' + moment(sessionInfo.timestamp).format('MMMM Do YYYY, h:mm:ss a');

  }


  function doneDictionary() {

    //var drawerIcon = document.querySelector('.custom-header .material-icons');
    //drawerIcon.style.color = '#616161';


    // update the textbox
    if (dictionary.length > 0) {
      var dictBodyRef = document.querySelector('#tl-body');

      var newDictionary = _.filter(dictionary, function (val) {
        return val !== null;
      });
      for (var i = 0; i < newDictionary.length; i++) {

        var dict = newDictionary[i];

        if (!_.isNull(dict) && !_.isUndefined(dict.name)) {
          var rowDictRef = dictBodyRef.insertRow(i);

          componentHandler.upgradeElement(rowDictRef);

          // color
          var colorCell = rowDictRef.insertCell(0);


          var div = document.createElement('div');
          div.id = 'code-' + dict.code;
          div.className = 'filler';
          div.style.background = dict.color;

          colorCell.appendChild(div);

          componentHandler.upgradeElement(colorCell);

          var nameCell = rowDictRef.insertCell(1);

          var dictName = document.createTextNode(dict.name);
          nameCell.appendChild(dictName);

          componentHandler.upgradeElement(nameCell);

          // var codeCell = rowDictRef.insertCell(1);
          // codeCell.className = 'dict-row';
          // codeCell.style.paddingLeft = '0px';
          //
          //
          // var dictCode = document.createTextNode(dict.code);
          // codeCell.appendChild(dictCode);
          //
          // componentHandler.upgradeElement(codeCell);


          var tooltip = document.createElement('div');
          tooltip.setAttribute('for', 'code-' + dict.code);
          tooltip.className = 'mdl-tooltip mdl-tooltip--large';
          var c = 'code: ' + dict.code + ' color: ' + dict.color;
          var toolText = document.createTextNode(c);
          tooltip.appendChild(toolText);
          colorCell.appendChild(tooltip);

          componentHandler.upgradeElement(tooltip);
        }

      }
    }
  }

  function doneTimestamps() {
    console.log('all done');
    console.log('done with timestamps, starting timestamps', gpsDataset.length);
    document.querySelector('#vn-progress-section').style.display = 'none';

    xFilter = crossfilter(gpsDataset);
    allSubjects = xFilter.groupAll();
    byDate = xFilter.dimension(function (d) {
      return d.timestamp;
    });

    countGroup = byDate.group().reduceSum(function (d) {
      return d.count;
    });

    // labelsGroup = byDate.group().reduceSum(function (d) {
    //   if (!_.isEmpty(d.labels)) {
    //     return 5;
    //   }
    //   return 0;
    // });

    netsGroup = byDate.group().reduceSum(function (d) {
      if (d.edges.length !== 0) {
        return d.edges.length / 2;
      }
      return 0;
    });

    document.querySelector('#vn-main-section').style.display = 'block';


    initMapLeaflet();
    createMainTimeline('init');

  }

  getSessionInfo();

// setup resize
// d3.select(window).on('resize', resize);

  /**
   * Creates the Leaflet with the first datapoint
   *
   * @param dataPoint
   */
  function initLeafletOverlays() {
    // addCountryOverlay();
    initDataPointOverlay();
  }

  function initDataPointOverlay() {

    var firstPoint = byDate.bottom(1)[0];


    if (firstPoint.items !== undefined) {
      drawDataPointOverlay(firstPoint);
    } else {
      // this point doesn't have subjects
    }
  }

  function drawDataPointOverlay(dataPoint) {
    currentDataPoint = dataPoint;
    animateOverlay.update();

    if (_.isUndefined(currentDataPoint) || _.isEmpty(currentDataPoint.items)) {
      console.log('undefined datapoint');
      return;
    }

    var links = [];
    if (!_.isEmpty(currentDataPoint.edges)) {
      currentDataPoint.edges.forEach(function (net) {

        var s = currentDataPoint.items.filter(function (d) {
          return d.id === net[0];
        });

        var t = currentDataPoint.items.filter(function (d) {
          return d.id === net[1];
        });

        var p1 = createLineJSON(s[0]);

        // links.push(p1);
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


    //  Define the div for the tooltip


    // remove old ones
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
        // paths.remove();
        links.forEach(function (link) {
          paths = mapContainer.append('path') //  <-E
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

          var tooltip = document.createElement('div');
          tooltip.setAttribute('for', 'node-' + d.id);
          tooltip.className = 'mdl-tooltip mdl-tooltip--large';
          var toolText = document.createTextNode(d.id + '<br/>' + d3.format('.4g')(d.lat) + ',' + d3.format('.4g')(d.lon));
          tooltip.appendChild(toolText);

          componentHandler.upgradeElement(tooltip);


          return 'node' + d.id;
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

          if (d.baboon_info.animal_sex === 'm') {
            return '#1f78b4';
          } else {
            return '#fb9a99';
          }


          return nodeColorMap(i);
        })
        .style('fill-opacity', 1.0)
        .on('mouseout', function (d) {
          // div.transition()
          //   .duration(500)
          //   .style('opacity', 0);
        })
        .on('mouseover', function (d) {
          var id = d.id;
          var counter = 0;
          d3.selectAll('.timeline-label').each(function (d, i) {


            var txt = d[i].label.split(" ");

            if (txt[1] == id) {

              var svg = d3.select("#grouplabels").select("svg");
              // var rect = svg.select("rect #highlight").remove();

              var itemHeight = 20;
              var itemMargin = 5;

              var base = margin.top + itemHeight + itemMargin;
              var lineHeight = itemHeight + itemMargin;
              var x = base + lineHeight * counter;

              svg.select('#highlight')
                .attr('height', itemHeight)
                .attr('width', svg.attr("width"))
                .attr('opacity', 0.3)
                .attr('transform', 'translate(' + margin.left + ',' + x + ')');

            }
            counter++;

          })

        })
        .on('mouseleave', function (d, i) {

          d3.select('#highlight')
            .attr('opacity', 0);

        })
        .on('click', function (d, i) {

          var id = d.id;
          var counter = 0;
          d3.selectAll('.timeline-label').each(function (d, i) {


            var txt = d[i].label.split(" ");

            if (txt[1] == id) {

              var svg = d3.select("#grouplabels").select("svg");
              var opacity = svg.select('#highlight' + id).attr('opacity');

              var itemHeight = 20;
              var itemMargin = 5;

              var base = margin.top + itemHeight + itemMargin;
              var lineHeight = itemHeight + itemMargin;
              var x = base + lineHeight * counter;

              if (opacity > 0) {

                svg.select('#highlight' + id)
                  .attr('height', itemHeight)
                  .attr('width', svg.attr("width"))
                  .attr('opacity', 0)
                  .attr('transform', 'translate(' + margin.left + ',' + x + ')');

              } else {

                svg.select('#highlight' + id)
                  .attr('height', itemHeight)
                  .attr('width', svg.attr("width"))
                  .attr('opacity', 0.3)
                  .attr('transform', 'translate(' + margin.left + ',' + x + ')');

              }


            }
            counter++;

          })

        });

      // .transition()
      // .duration(500);


      d3.transition(circles)
        .attr('transform',
          function (d) {
            return 'translate(' +
              map.latLngToLayerPoint(d.LatLng).x + ',' +
              map.latLngToLayerPoint(d.LatLng).y + ')';
          }
        );


      // function transition(path) {
      //     linePath.transition()
      //         .duration(7500)
      //         .attrTween("stroke-dasharray", tweenDash)
      //         .each("end", function() {
      //             d3.select(this).call(transition);//  infinite loop
      //             ptFeatures.style("opacity", 0)
      //         });
      //
      //
      // }


    }

  }


  /**
   * Init the leaflet portion
   */
  function initMapLeaflet() {

    var m = document.querySelector('#map');
    m.style.display = 'block';

    var width = wWidth - margin.right - margin.left;
    var height = wHeight * 0.5;


    var mapLeafletWidth = width;
    var mapLeafletHeight = height;

    // m.style.width = mapLeafletWidth + 'px';
    //m.style.width = '99%';
    m.style.height = mapLeafletHeight + 'px';
    //m.style.margin = '0px 0px 0px 0px';

    map = L.map('map', {
      zoomControl: true,
      maxNativeZoom: 18,
      maxZoom: 50,
      attributionControl: false
    }).setView([0.3509073, 36.9229031], 5);
    // map.touchZoom.disable();
    map.doubleClickZoom.disable();
    // map.scrollWheelZoom.disable();
    // map.boxZoom.disable();
    // map.keyboard.disable();
    // map.dragging.disable();

    // var Esri_WorldImagery = L.tileLayer('http:// server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    //     attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
    // });

    L.tileLayer('http:// server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 18,
      attribution: '&copy; <a href="http:// www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(map);

//     // var Esri_WorldGrayCanvas =
//     L.tileLayer('http:// server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
// //             attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ',
//         maxZoom: 16
//     }).addTo(map);

    //  Initialize the SVG layer
    map._initPathRoot();

    //  Add an SVG element to Leaflet’s overlay pane
    mapSVG = d3.select('#map').select('svg');

    mapContainer = mapSVG.append('g');

    //  legend
    var legendDIV;

    var legendOverlay = L.control({position: 'topright'});

    legendOverlay.onAdd = function () {
      legendDIV = L.DomUtil.create('div', 'legendOverlay');
      L.DomEvent.disableClickPropagation(legendDIV);
      legendOverlay.update();
      return legendDIV;
    };

    legendOverlay.update = function () {
      var div = document.getElementById('legend-panel');
      div.style.display = 'block';
      legendDIV.appendChild(div);
    };

    legendOverlay.addTo(map);


    // animate
    var animateOverlayDIV;


    animateOverlay = L.control({position: 'bottomright'});

    animateOverlay.onAdd = function () {
      animateOverlayDIV = L.DomUtil.create('div', 'animateOverlay');

      L.DomEvent.disableClickPropagation(animateOverlayDIV);
      //animateOverlay.update();
      return animateOverlayDIV;
    };

    animateOverlay.update = function () {


        if (!_.isUndefined(timeOverlayProps.startTime) || !_.isUndefined(timeOverlayProps.endTime)) {
          var t1 = timeOverlayProps.startTime.format('LTS M/D/YY');
          var t2 = timeOverlayProps.endTime.format('LTS M/D/YY');

          document.querySelector('#start-time').innerHTML = 'Start:&nbsp&nbsp' + t1;
          //document.querySelector('#start-time').style.color = timeOverlayProps.color;
          document.querySelector('#end-time').innerHTML = 'End:&nbsp&nbsp&nbsp&nbsp' + t2;
          //document.querySelector('#end-time').style.color = timeOverlayProps.color;
        }

      if (!_.isUndefined(currentDataPoint)) {
        var t1 = moment(currentDataPoint.timestamp).format('LTS M/D/YY');

        var div = document.getElementById('animate-panel');
        document.querySelector('#current-time').innerHTML = 'Current:&nbsp&nbsp' + t1;
        document.querySelector('#current-time').style.color = timeOverlayProps.color;

        var playButton = document.getElementById('play');
        playButton.onclick = function (e) {

          isPlaying = !isPlaying;

          if (isPlaying) {
            var timeInterval = document.getElementById('time-step').value;

            var i = parseInt(timeInterval);
            if (_.isNaN(i) || i === 0) {
              document.getElementById('play-icon').innerHTML = 'radio_button_checked';

              Toast.defaults.displayDuration = 3000;
              Toast.error('Input must be a number great than zero.', 'Invalid Time Interval.');
              document.getElementById('time-step').value = 1;
            } else {
              document.getElementById('play-icon').innerHTML = 'radio_button_checked';


              console.log('PLAY');
              playSelection(i);
            }
          } else {
            document.getElementById('play-icon').innerHTML = 'play_circle_outline';
            if (!_.isNull(animateTimer) || !_.isUndefined(animateTimer)) {
              clearInterval(animateTimer);
              document.getElementById('play-icon').innerHTML = 'play_circle_outline';
            }

          }


        };


        div.style.display = 'block';
        animateOverlayDIV.appendChild(div);
      }

    };

    animateOverlay.addTo(map);

  }

  function updateSelectedTimeRange(t1, t2, isBrushing) {
    timeOverlayProps.startTime = t1;
    timeOverlayProps.endTime = t2;
    if( isBrushing ) {
      timeOverlayProps.color = '#3F51B5'
    } else {
      timeOverlayProps.color = '#000000'

    }
    animateOverlay.update();
  }

  /**
   * Uses d3 to add counties to the overlay
   */
// function addCountryOverlay() {
//   d3.json('KEN.topojson', function (error, collection) {
//
//     // unknown error, check the console
//     if (error) {
//       return console.log(error);
//     }
//
//
//     var bounds = d3.geo.bounds(topojson.feature(collection, collection.objects.KEN));
//
//     var path = d3.geo.path().projection(projectPoint);
//
//
//     // generate mapContainer from TopoJSON
//
//     var feature = mapContainer.selectAll('path')
//       .data(topojson.feature(collection, collection.objects.KEN).features)
//       .enter()
//       .append('path')
//       .attr('d', path);
//
//
//     map.on('viewreset', reset);
//     reset();
//
//     //  Reposition the SVG to cover the features.
//     function reset() {
//       var bottomLeft = projectPoint(bounds[0]),
//         topRight = projectPoint(bounds[1]);
//
//       mapSVG.attr('width', topRight[0] - bottomLeft[0])
//         .attr('height', bottomLeft[1] - topRight[1])
//         .style('margin-left', bottomLeft[0] + 'px')
//         .style('margin-top', topRight[1] + 'px');
//
//       mapContainer.attr('transform', 'translate(' + -bottomLeft[0] + ',' + -topRight[1] + ')');
//
//       feature.attr('d', path);
//     }
//
//
//     //  Use Leaflet to implement a D3 geographic projection. SVG does not use
//     //  the same coordinate system as a globe,
//     //  the latitude and longitude coordinates will need to be transformed.
//     function projectPoint(x) {
//       var point = map.latLngToLayerPoint(new L.LatLng(x[1], x[0]));
//       return [point.x, point.y];
//     }
//   });
// }


// /**
//  * Creates Overlay for turning the main layover on-off
//  */
// function handleCountryOverlayControl() {
//
//   if (this.checked) {
//     // turn it on
//     addCountryOverlay();
//   } else {
//     // unchecked turn it off
//     mapSVG.selectAll('path').remove();
//   }
// }

  /**
   * Create the main time line
   *
   * @param items - that complete dataset
   */
  function createMainTimeline(flag) {

    if (flag === 'init') {

      var outMargin = {top: 10, left: 10, bottom: 10, right: 10};
      var width = wWidth - outMargin.left - outMargin.right;
      var height = 80 - outMargin.top - outMargin.bottom;

      var inMargin = {top: 10, left: 0, bottom: 20, right: 20};

      // var mt = document.querySelector('#main-timeline');
      // mt.style.height = height + 'px';


      var t2 = byDate.top(1)[0];
      var t1 = byDate.bottom(1)[0];

      // init
      brushFilteredDates = byDate.filterRange([t1, t2]);


      var tStart = moment(t1.timestamp).toDate();
      var tEnd = moment(t2.timestamp).toDate();
      var t10 = moment(t1.timestamp).add(5, 'm').toDate();

      // update the props

      updateSelectedTimeRange(moment(tStart),moment(tEnd).add(5, 'm'));



      var combined = dc.compositeChart('#main-timeline');

      var stackCharts = dc.lineChart(combined)
        .ordinalColors([generalColorMap(0), generalColorMap(1), generalColorMap(3)])
        .renderArea(true)
        .group(countGroup)
        // .stack(labelsGroup)
        .stack(netsGroup)
        .elasticX(true)
        .elasticY(true)
        .useRightYAxis(true)
        .on('filtered', brushing);

      //var rfh = stackCharts.resetFilterHandler();

      //stackCharts.resetFilterHandler(function (filters) {
      //  console.log('stopped', filters);
      //  return brushFilteredDates;
      //});




      combined
        .width(width)
        .height(height)
        .margins(inMargin)
        .dimension(byDate)
        .brushOn(true)
        .x(d3.time.scale().domain([tStart, tEnd]));


      combined.on('renderlet', function(chart){
        // mix of dc API and d3 manipulation
        chart.selectAll('g.x text').style('text-anchor', 'start');


        //chart.select('g.y').style('display', 'none');
        //// its a closure so you can also access other chart variable available in the closure scope
        //moveChart.filter(chart.filter());
      });


      //dc.baseMixin.brush.on('brushend', brushingEnded);


      combined.compose([stackCharts]);

      // console.log('stackCharts.yAxisMax()',stackCharts.yAxisMax());
      combined.compose([stackCharts]).rightYAxis().tickValues([0, stackCharts.yAxisMax()]);

      combined.filter(dc.filters.RangedFilter(tStart, t10));

      combined.on('filtered', brushing);

      dc.renderAll();

      updateLabelTimeline(tStart, t10);
      drawDataPointOverlay(t1);


    } else if (flag === 'update') {

    }


    function brushing(chart, filter) {
      //  console.log('we are brushing', _.isNull(filter), _.isNull(chart));

      if (_.isNull(filter)) {
      } else {

        var p = new Parallel(filter);

        //  Spawn a remote job (we'll see more on how to use then later)

        var t1 = filter[0];
        var t2 = filter[1];

        console.log(t1)

        brushFilteredDates = byDate.filterRange([t1, t2]);

        var dataPoint = brushFilteredDates.bottom(1)[0];

        updateSelectedTimeRange(moment(t1), moment(t2), true);
        drawDataPointOverlay(dataPoint);
        zoomCurrentPoint();
        updateLabelTimeline(t1, t2);
      }


    }
  }

  function updateLabelTimeline(tStart, tEnd) {

    // get data for timeline

    var defaultRangeFilter = byDate.filterRange([tStart, tEnd]);
    var allDefaultRangeDates = defaultRangeFilter.bottom(Infinity);

    var labelsTuple = getLabelsInRange(allDefaultRangeDates);

    // do the group timeline


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

    var outMargin = {top: 10, left: 18, bottom: 10, right: 2};

    var width = wWidth - outMargin.left - outMargin.right;

    var groupLabelMargin = {top: 35, left: 25, bottom: 0, right: 0};


    var tooltip = d3.select('#tooltipLabel').append('div').attr('class', 'tooltipLabel').style('opacity', 0);

    //  Chart
    var chart = d3.timeline()
      .beginning(sDate)
      .ending(eDate)
      .orient('top')
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
      .margin(groupLabelMargin)
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
      })
      .click(function (d, i, datum) {
        var txt = datum.label.split(" ");
        var id = txt[1];

        if (id !== '') {

          var timer = setInterval(function () {
            var circle = d3.select('#node' + id);
            circle.transition()
              .duration(500)
              .attr("stroke-width", 12)
              .attr("r", 20)
              .transition()
              .duration(500)
              .attr('stroke-width', 0.5)
              .attr("r", 6)
              .ease('sine');
            clearInterval(timer);
          }, 1000);

        }

      });

    // d3.selectAll('.timeline-label').attr('transform', 'translate(2px,0px)');
    // debugger;

    var labelSvg = d3.select('#grouplabels').append('svg')
      .attr('width', width)
      .style('fill','blue')
      .style('background','white')
      .style('margin-left',0)
      //.style('margin-right', 5)
      .datum(groupLabels).call(chart)
      .on('click', function (d, i) {
        var x = d3.mouse(this)[0] - margin.left;
        var y = d3.mouse(this)[1] - margin.top;

        //  CHeck if positive
        if (x < 0 || y < 0)
          return;

        var ranged = brushFilteredDates.bottom(Infinity);
        var sDate = moment(ranged[0].timestamp).valueOf();
        var eDate = moment(ranged[ranged.length - 1].timestamp).valueOf();

        var svgWidth = this.width.animVal.value;

        var seconds = (eDate - sDate) / 1000;
        var width = (svgWidth - margin.left - margin.right) / seconds;

        var cSecond = Math.floor(x / width) * 1000;

        var cDate = sDate + cSecond;
        var fDate = moment(cDate);

        for (i = 0; i < ranged.length; i++) {
          if (fDate.isSame(ranged[i].timestamp)) {
            drawDataPointOverlay(ranged[i]);
            zoomCurrentPoint();
          }
        }

        d3.select("#labelbrush")
          .attr('transform', 'translate(' + (margin.left + (Math.floor(x / width) * width)) + ',' + margin.top + ')');

      })
      .on('mousemove', function (d, i) {

        var itemHeight = 20;
        var itemMargin = 5;

        var y = d3.mouse(this)[1] - margin.top - itemHeight - itemMargin;

        var base = margin.top + itemHeight + itemMargin;
        var lineHeight = itemHeight + itemMargin;
        var lineNumber = Math.floor(y / lineHeight);

        if (lineNumber < 0)
          return;

        d3.select('#highlight')
          .attr('height', itemHeight)
          .attr('width', this.getBBox().width)
          .attr('opacity', 0.3)
          .attr('transform', 'translate(' + margin.left + ',' + (base + lineNumber * itemHeight + lineNumber * itemMargin) + ')');

        var counter = 0;
        d3.selectAll('.timeline-label').each(function (d, i) {

          var txt = d[i].label.split(" ");

          if (counter == lineNumber) {

            var id = txt[1];

            d3.selectAll('.node').attr("r", 6);
            d3.select('#node' + id).attr("r", 15);

          }

          counter++;

        })

      })
      .on('mouseleave', function (d, i) {

        d3.select('#highlight')
          .attr('opacity', 0);

        d3.selectAll('.node').attr("r", 6);

      });

    var gBrush = labelSvg.append('g');

    var seconds = (eDate - sDate) / 1000;
    var width = (labelSvg.attr("width") - chart.margin().left - chart.margin().right) / seconds;

    gBrush.append('rect')
      .attr('height', labelSvg.attr("height"))
      .attr('width', '1px')
      .attr('fill', '#F57F17')
      .attr('opacity', 1)
      .attr('transform', 'translate(' + chart.margin().left + ',' + chart.margin().top + ')')
      .attr("id", "labelbrush");

    gBrush.append('rect')
      .attr('fill', 'grey')
      .attr('opacity', 0.0)
      .attr("id", "highlight");

    for (var j = 0; j < labelsTuple[0].length; j++) {

      gBrush.append('rect')
        .attr('fill', 'grey')
        .attr('opacity', 0.0)
        .attr("id", "highlight" + labelsTuple[0][j].class);

    }

  }

  function updateLabelBrush(tStart, tEnd, dataPoint) {

    var sDate = moment(tStart).valueOf();
    var eDate = moment(tEnd).valueOf();
    var cDate = moment(dataPoint.timestamp).valueOf();

    var svg = d3.select("#grouplabels").select("svg");
    var rect = svg.select("#labelbrush");

    var seconds = (eDate - sDate) / 1000;
    var width = (svg.attr("width") - margin.left - margin.right) / seconds;
    var delta = ((cDate - sDate) / 1000) * width;

    rect.attr('transform', 'translate(' + (margin.left + delta) + ',' + margin.top + ')');

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
    // find the first one with points


    if (isPlaying) {
      var ranged = brushFilteredDates.bottom(Infinity);
      var speed = 175; //  animatation speed
      var sDate = ranged[0].timestamp;
      var eDate = ranged[ranged.length - 1].timestamp;

      var i = 0;

      var r1 = ranged[0];
      var hasZoomedToFirstPoint = false;

      animateTimer = setInterval(function () {
        if (i >= ranged.length) {
          document.getElementById('play-icon').innerHTML = 'play_circle_outline';

          isPlaying = false;
          clearInterval(animateTimer);
        }

        var d = ranged[i];

        if (!_.isUndefined(d) && d.count > 0) {

          console.log('actual' + d.timestamp);
          drawDataPointOverlay(d);
          updateLabelBrush(sDate, eDate, d);
          if (hasZoomedToFirstPoint === false) {
            zoomCurrentPoint();
            hasZoomedToFirstPoint = true;
          }


        }

        // increase interval
        i = i + seconds;
        // t1 = t1.add('i', i);
        console.log('moment ' + i);
      }, speed);
    } else {


    }
  }

  function updateAnimation() {
  }

  /**
   * lookup for node colors
   */
  function generalColorMap(index) {
    //  var colors = ['Red', 'Purple', 'Deep Purple', 'Ingio', 'Light Blue', 'Cyan', 'Green', 'Teal', 'Lime', 'Yellow', 'Orange', 'Deep Orange', 'Brown', 'Grey', 'Blue Grey'];

    var brewer = ['#1f78b4', '#b15928', '#ccebc5', '#33a02c', '#fb8072', '#fb9a99', '#fdbf6f', '#ff7f00', '#cab2d6', '#6a3d9a', '#ffff99', '#b15928', '#F8B700'];
    // var c = colors[index];

    if (index > brewer.length) {
      index = 0;
    }

    return brewer[index];

  }

  function nodeColorMap(index) {
    //  var colors = ['Red', 'Purple', 'Deep Purple', 'Ingio', 'Light Blue', 'Cyan', 'Green', 'Teal', 'Lime', 'Yellow', 'Orange', 'Deep Orange', 'Brown', 'Grey', 'Blue Grey'];

    var brewer = ['#33a02c', '#ffffb3', '#e31a1c', '#fb8072', '#80b1d3', '#fdb462', '#b3de69', '#fccde5', '#b15928', '#bc80bd', '#ccebc5', '#ffed6f', '#b15928', '#6a3d9a'];
    // var c = colors[index];

    if (index > brewer.length) {
      index = 0;
    }

    return brewer[index];

  }
})();


