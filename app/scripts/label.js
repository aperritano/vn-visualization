

/**
 * Label name map.
 */
//var start = 0;
//var end = 0;

//var brushNew;

/*************************************************
 *              DRAW TIMELINE
 *************************************************/
/**
 * Function caled when the user wnat to the label timelines.
 */
//function getLabelsInRange(dataPoint) {
//    processLabelData(dataPoint);
//}

/*************************************************
 *              GET DATA FROM DB
 *************************************************/

/**
 * Function used to extract all the lanes (groups) and the items of each group.
 * @param dataPoints, data that come from the DB.
 */
function getLabelsInRange(dataPoints) {

    /**
     * Structure used to create the lanes and the items.
     */
    var gantGroupMap = {};
    var gantGroupList = [];

    var gantMap = {};
    var gantIndividualList = [];

    /**
     * Iterate over each timestamp.
     */
    for (var vKey in dataPoints) {

        var ts = dataPoints[vKey];

        // Skip missing data
        if (ts === undefined) {
            return;
        }


        /**
         * If there are nets analyze them.
         */
        if (ts.items !== undefined) {

            /**
             * Go into all the nets.
             */
            for (var iKey = 0; iKey < ts.items.length; iKey++) {

                var item = ts.items[iKey];

                // Compose the key
                var key = item.id;


                //[
                //    {label: "person a", times: [{"color":"green", "label":"Weeee", "starting_time": 1355752800000, "ending_time": 1355759900000},
                //        {"color":"blue", "label":"Weeee", "starting_time": 1355767900000, "ending_time": 1355774400000}]},
                //    {label: "person b", times: [{"color":"pink", "label":"Weeee", "starting_time": 1355759910000, "ending_time": 1355761900000}, ]},
                //    {label: "person c", times: [{"color":"yellow", "label":"Weeee", "starting_time": 1355761910000, "ending_time": 1355763910000}]},
                //];
                /**
                 * If the individual doesn't exist create the structure related to the individual.
                 */
                if (gantMap[key] === undefined) {
                    var gantMapValue = {};
                    gantMapValue.class = key.toString();
                    //s for subject
                    //gantMapValue.label = 'Individual ' + key;
                    gantMapValue.label = 'S ' + key;
                    gantMapValue.times = [];
                    gantMapValue.actual = null;
                    gantMap[key] = gantMapValue;

                }

                /**
                 * Groups.
                 */
                if (gantGroupMap.class === undefined) {
                    gantGroupMap.class = key.toString();
                    //Lets short this
                    //gantGroupMap.label = 'Group ' + key.toString();
                    gantGroupMap.label = 'G ' + key.toString();
                    gantGroupMap.times = [];
                    gantGroupMap.actual = null;

                }

                var label = ts.labels.label;

                /**
                 * If the label of the current TS is different from undefined create an item for the current group.
                 */
                if (label !== undefined) {

                    /**
                     * Groups.
                     */

                    // Take the last gantt rect
                    var actual = gantGroupMap.actual;

                    //The group is created if it not exist already.
                    if (actual === null) {
                        // If the last rectangle has been finished
                        var gantGroupMapValue = {};
                        //moment.js valueOf does a better unix time conversion
                        gantGroupMapValue.starting_time = moment(ts.timestamp).valueOf();
                        gantGroupMapValue.ending_time = moment(ts.timestamp).valueOf();
                        gantGroupMapValue.color = ts.labels.color;
                        gantGroupMapValue.label = ts.labels.label;
                        gantGroupMap.actual = gantGroupMapValue;

                    } else {

                        gantGroupMap.actual.ending_time = moment(ts.timestamp).valueOf();

                    }

                    /**
                     * Individuals
                     */

                    // Take the last gantt rect
                    var actualLast = gantMap[key].actual;

                    //The group is created if it not exist already.
                    if (actualLast === null) {
                        // If the last rectangle has been finished
                        var groupValue = {};
                        groupValue.starting_time = moment(ts.timestamp).valueOf();
                        groupValue.ending_time = moment(ts.timestamp).valueOf();
                        groupValue.color = ts.labels.color;
                        groupValue.label = ts.labels.label;
                        gantMap[key].actual = groupValue;
                    } else {
                        gantMap[key].actual.ending_time = moment(ts.timestamp).valueOf();
                    }

                } else {

                    /**
                     * Groups.
                     */
                    var actualValue = gantGroupMap.actual;
                    if (actualValue !== null) {
                        gantGroupMap.times.push(actualValue);
                        gantGroupMap.actual = null;

                    }

                    /**
                     * Individuals.
                     */

                    //The label is undefined, end all the items.
                    for (var i in gantMap) {

                        var endValue = gantMap[i].actual;
                        if (endValue !== null) {
                            gantMap[i].times.push(endValue);
                            gantMap[i].actual = null;

                        }

                    }

                }

            } // End for for each INDIVIDUAL

        }

    } // End for on TIMESTAMPS

    /**
     * Groups;
     */
    var gValue = gantGroupMap.actual;
    if (gValue !== null) {

        gantGroupMap.times.push(gValue);
        gantGroupMap.actual = null;

    }

    /**
     * All the remaining data in the startTIme should create an item.
     */
    for (var k in gantMap) {

        var sValue = gantMap[k].actual;
        if (sValue !== null) {

            gantMap[k].times.push(sValue);
            gantMap[k].actual = null;

        }

    }

    delete gantGroupMap.actual;
    gantGroupList.push(gantGroupMap);

    // Convert MAP into LIST
    for (var j in gantMap) {
        delete gantMap[j].actual;
        gantIndividualList.push(gantMap[j]);
    }

    //var startTimestamp = (dataPoints[0].milliseconds * 1000);
    //var endTimestamp = (dataPoints[dataPoints.length - 1].milliseconds * 1000);

    return [gantGroupList.concat(gantIndividualList)];
    //setUpTimelineGroup(gantGroupList, startTimestamp, endTimestamp);
    //setUpTimelineIndividuals(gantList, startTimestamp, endTimestamp);

}

/*************************************************
 *              BUILT THE TIMELINES
 *************************************************/

/**
 * Function that create the gantt-chart.
 * @param data
 * @param start, start milliseconds
 * @param end, end milliseconds
 */
//function setUpTimelineGroup(data, start, end) {
//
//    var div = d3.select('#tooltipLabel').append('div').attr('class', 'tooltipLabel').style('opacity', 0);
//
//    var label = d3.select('#labelsGroup');
//    var svgLabel = label.select('svg');
//    if (svgLabel !== undefined)
//        svgLabel.remove();
//
//    // Chart
//    var chart = d3.timeline()
//        .beginning(start)
//        .ending(end)
//        .stack()
//        .showTimeAxisTick()
//        .rotateTicks(30)
//        .tickFormat(
//            {
//                format: d3.time.format("%I:%M %p"),
//                tickTime: d3.time.minutes,
//                tickInterval: 1,
//                tickSize: 20
//            })
//        /*.mouseover(function (d, i, datum) {
//         div.transition()
//         .duration(100)
//         .style('opacity', 0.9);
//         div.html(datum['label'] + '<br>' + datum['times'][0]['name'])
//         .style('left', (d3.event.pageX) + 'px')
//         .style('top', (d3.event.pageY - 28) + 'px');
//
//         })
//         .mouseout(function (d, i, datum) {
//         div.transition()
//         .duration(500)
//         .style('opacity', 0);
//         })*/
//        .margin({left: 70, right: 30, top: 0, bottom: 0});
//
//    // Draw it
//    var svg = label.append("svg").attr("width", 1200).datum(data).call(chart);
//
//}

//function setUpTimelineIndividuals(data, start, end) {
//
//    var div = d3.select('#tooltipLabel').append('div').attr('class', 'tooltipLabel').style('opacity', 0);
//
//    var label = d3.select('#labelsIndividuals');
//    var svgLabel = label.select('svg');
//    if (svgLabel !== undefined) {
//        svgLabel.remove();
//    }
//
//
//    // Chart
//    var chart = d3.timeline()
//        .beginning(start)
//        .ending(end)
//        .stack()
//        .showTimeAxisTick()
//        .rotateTicks(30)
//        .tickFormat(
//            {
//                format: d3.time.format("%I:%M %p"),
//                tickTime: d3.time.minutes,
//                tickInterval: 1,
//                tickSize: 20
//            })
//        /*.mouseover(function (d, i, datum) {
//         div.transition()
//         .duration(100)
//         .style('opacity', 0.9);
//         div.html(datum['label'] + '<br>' + datum['times'][0]['name'])
//         .style('left', (d3.event.pageX) + 'px')
//         .style('top', (d3.event.pageY - 28) + 'px');
//
//         })
//         .mouseout(function (d, i, datum) {
//         div.transition()
//         .duration(500)
//         .style('opacity', 0);
//         })*/
//        .click(function (d, i, datum) {
//
//            console.log(d)
//            console.log(i)
//            console.log(d3.event.pageX)
//            console.log(d3.event.pageY)
//
//        })
//        .margin({left: 70, right: 30, top: 0, bottom: 0});
//
//    // Draw it
//    var svg = label.append("svg").attr("width", 1200).datum(data).call(chart);
//
//    var tStart = moment(start).toDate();
//    var tEnd = moment(end).toDate();
//    /*
//     var x = d3.time.scale().domain([tStart, tEnd]).range([0, 1200]);
//
//     brushNew = d3.svg.brush().x(x).extent([tStart, tEnd]).on('brushend', brushendedNew);
//     var gBrushNew = svg.append('g').attr('class', 'brush').call(brushNew).call(brushNew.event);
//
//     gBrushNew.selectAll('rect').attr('height', 100);
//     */
//}
/*************************************************
 *              UTILITY FUNCTIONS
 *************************************************/

//function brushendedNew() {
//    if (!d3.event.sourceEvent) {
//        return; // only transition after input
//    }
//    var extent0 = brushNew.extent(),
//        extent1 = extent0.map(d3.time.day.round);
//
//    // if empty when rounded, use floor & ceil instead
//    if (extent1[0] >= extent1[1]) {
//        extent1[0] = d3.time.day.floor(extent0[0]);
//        extent1[1] = d3.time.day.ceil(extent0[1]);
//    }
//
//    d3.select(this).transition()
//        .call(brushNew.extent(extent1))
//        .call(brushNew.event);
//}