/*************************************************
 *              FILE UPLOAD.
 *************************************************/
var results = null;

/**
 * Label name map.
 */
var start = 0;
var end = 0;

var brushNew;

/*************************************************
 *              DRAW TIMELINE
 *************************************************/
/**
 * Function caled when the user wnat to the label timelines.
 */
function drawLabelTimeline(data){

    setData(data);
}

/*************************************************
 *              GET DATA FROM DB
 *************************************************/

/**
 * Function used to extract all the lanes (groups) and the items of each group.
 * @param values, data that come from the DB.
 */
function setData(values){

    /**
     * Structure used to create the lanes and the items.
     */
    var gantGroupMap = {};
    var gantGroupList = [];

    var gantMap = {};
    var gantList = [];

    /**
     * Iterate over each timestamp.
     */
    for (var vKey in values) {

        var ts = values[vKey];

        // Skip missing data
        if (ts == undefined)
            return;

        /**
         * If there are nets analyze them.
         */
        if (ts.items != undefined) {

            /**
             * Go into all the nets.
             */
            for (var iKey in ts.items) {

                var item = ts.items[iKey];

                // Compose the key
                var key = item.id;

                /**
                 * If the individual doesn't exist create the structure related to the individual.
                 */
                if (gantMap[key] == undefined) {

                    var value = {};
                    value['class'] = key.toString();
                    value['label'] = 'Individual ' + key;
                    value['times'] = [];
                    value['actual'] = null;

                    gantMap[key] = value;

                }

                /**
                 * Groups.
                 */

                if(gantGroupMap['class'] == undefined){

                    gantGroupMap['class'] = key.toString();
                    gantGroupMap['label'] = 'Group Activity';
                    gantGroupMap['times'] = [];
                    gantGroupMap['actual'] = null;

                }

                var label = ts.labels.label;

                /**
                 * If the label of the current TS is different from undefined create an item for the current group.
                 */
                if (label != undefined){

                    /**
                     * Groups.
                     */

                    // Take the last gantt rect
                    var actual = gantGroupMap['actual'];

                    //The group is created if it not exist already.
                    if (actual == null) {

                        // If the last rectangle has been finished
                        var value = {};
                        value['starting_time'] = (ts.milliseconds * 1000);
                        value['ending_time'] = (ts.milliseconds * 1000);
                        value['color'] = ts.labels.color;
                        value['name'] = ts.labels.label;
                        gantGroupMap['actual'] = value;

                    }else{

                        gantGroupMap['actual']['ending_time'] = (ts.milliseconds * 1000);

                    }

                    /**
                     * Individuals
                     */

                    // Take the last gantt rect
                    var actual = gantMap[key]['actual'];

                    //The group is created if it not exist already.
                    if (actual == null) {

                        // If the last rectangle has been finished
                        var value = {};
                        value['starting_time'] = (ts.milliseconds * 1000);
                        value['ending_time'] = (ts.milliseconds * 1000);
                        value['color'] = ts.labels.color;
                        value['name'] = ts.labels.label;
                        gantMap[key]['actual'] = value;

                    }else{

                        gantMap[key]['actual']['ending_time'] = (ts.milliseconds * 1000);

                        }

                }else{

                    /**
                     * Groups.
                     */
                    var value = gantGroupMap['actual'];
                    if(value != null){

                        gantGroupMap['times'].push(value);
                        gantGroupMap['actual'] = null;

                    }

                    /**
                     * Individuals.
                     */

                    //The label is undefined, end all the items.
                    for(var k in gantMap){

                        var value = gantMap[k]['actual'];
                        if(value != null){

                            gantMap[k]['times'].push(value);
                            gantMap[k]['actual'] = null;

                        }

                    }

                }

            } // End for for each INDIVIDUAL

        }

    } // End for on TIMESTAMPS

    /**
     * Groups;
     */
    value = gantGroupMap['actual'];
    if(value != null){

        gantGroupMap['times'].push(value);
        gantGroupMap['actual'] = null;

    }

    /**
     * All the remaining data in the startTIme should create an item.
     */
    for (var k in gantMap) {

        var value = gantMap[k]['actual'];
        if(value != null){

            gantMap[k]['times'].push(value);
            gantMap[k]['actual'] = null;

        }

    }

    delete gantGroupMap['actual'];
    gantGroupList.push(gantGroupMap);

    // Convert MAP into LIST
    for(var k in gantMap){
        delete gantMap[k]['actual'];
        gantList.push(gantMap[k]);
    }

    var startTimestamp = (values[0].milliseconds * 1000);
    var endTimestamp = (values[values.length - 1].milliseconds * 1000);

    console.log(gantList);

    setUpTimelineGroup(gantGroupList, startTimestamp, endTimestamp);
    setUpTimelineIndividuals(gantList, startTimestamp, endTimestamp);

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
function setUpTimelineGroup(data, start, end){

    var div = d3.select('#tooltipLabel').append('div').attr('class', 'tooltipLabel').style('opacity', 0);

    var label = d3.select('#labelsGroup');
    var svgLabel = label.select('svg');
    if (svgLabel != undefined)
        svgLabel.remove();

    // Chart
    var chart = d3.timeline()
        .beginning(start)
        .ending(end)
        .stack()
        .showTimeAxisTick()
        .rotateTicks(30)
        .tickFormat(
        {format: d3.time.format("%I:%M %p"),
            tickTime: d3.time.minutes,
            tickInterval: 1,
            tickSize: 20})
        .mouseover(function (d, i, datum) {
            div.transition()
                .duration(100)
                .style('opacity', 0.9);
            div.html(datum['label'] + '<br>' + datum['times'][0]['name'])
                .style('left', (d3.event.pageX) + 'px')
                .style('top', (d3.event.pageY - 28) + 'px');

            console.log(datum)

        })
        .mouseout(function (d, i, datum) {
            div.transition()
                .duration(500)
                .style('opacity', 0);
        })
        .margin({left:70, right:30, top:0, bottom:0});

    // Draw it
    var svg = label.append("svg").attr("width", 1200).datum(data).call(chart);

}

function setUpTimelineIndividuals(data, start, end){

    var div = d3.select('#tooltipLabel').append('div').attr('class', 'tooltipLabel').style('opacity', 0);

    var label = d3.select('#labelsIndividuals');
    var svgLabel = label.select('svg');
    if (svgLabel != undefined)
        svgLabel.remove();

    // Chart
    var chart = d3.timeline()
        .beginning(start)
        .ending(end)
        .stack()
        .showTimeAxisTick()
        .rotateTicks(30)
        .tickFormat(
        {format: d3.time.format("%I:%M %p"),
            tickTime: d3.time.minutes,
            tickInterval: 1,
            tickSize: 20})
        .mouseover(function (d, i, datum) {
            div.transition()
                .duration(100)
                .style('opacity', 0.9);
            div.html(datum['label'] + '<br>' + datum['times'][0]['name'])
                .style('left', (d3.event.pageX) + 'px')
                .style('top', (d3.event.pageY - 28) + 'px');

        })
        .mouseout(function (d, i, datum) {
            div.transition()
                .duration(500)
                .style('opacity', 0);
        })
        .click(function (d, i, datum) {

            console.log(d)
            console.log(i)
            console.log(d3.event.pageX)
            console.log(d3.event.pageY)

        })
        .margin({left:70, right:30, top:0, bottom:0});

    // Draw it
    var svg = label.append("svg").attr("width", 1200).datum(data).call(chart);

    var tStart = moment(start).toDate();
    var tEnd = moment(end).toDate();
    /*
    var x = d3.time.scale().domain([tStart, tEnd]).range([0, 1200]);

    brushNew = d3.svg.brush().x(x).extent([tStart, tEnd]).on('brushend', brushendedNew);
    var gBrushNew = svg.append('g').attr('class', 'brush').call(brushNew).call(brushNew.event);

    gBrushNew.selectAll('rect').attr('height', 100);
    */
}
/*************************************************
 *              UTILITY FUNCTIONS
 *************************************************/

function brushendedNew() {
    if (!d3.event.sourceEvent) return; // only transition after input
    var extent0 = brushNew.extent(),
        extent1 = extent0.map(d3.time.day.round);

    // if empty when rounded, use floor & ceil instead
    if (extent1[0] >= extent1[1]) {
        extent1[0] = d3.time.day.floor(extent0[0]);
        extent1[1] = d3.time.day.ceil(extent0[1]);
    }

    d3.select(this).transition()
        .call(brushNew.extent(extent1))
        .call(brushNew.event);
}