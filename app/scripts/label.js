/*************************************************
 *              FILE UPLOAD.
 *************************************************/
var results = null;

/**
 * Label name map.
 */
var start = 0;
var end = 0;

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
    var lanes = {};
    var lanesList = [];
    var itemsList = [];
    var items = {};

    /**
     * Counters.
     */
    var groupCounter = 0;
    var itemCounter = 0;

    /**
     * Iterate over each timestamp.
     */
    for (var vKey in values) {

        var item = values[vKey];

        // Skip missing data
        if (item == undefined)
            return;

        /**
         * If there are nets analyze them.
         */
        if (item.nets != undefined) {

            /**
             * Go into all the nets.
             */
            for (var nKey in item.nets) {

                var net = item.nets[nKey];

                // Take the IDs of the two baboons.
                var idOne = net[0];
                var idTwo = net[1];

                // Compose the key
                var key = idOne + '' + idTwo;

                /**
                 * If the group (net) doesn't exist add to the lanes structure.
                 */
                if (!groupAlreadyExist(lanes, idOne, idTwo)) {

                    var value = {};
                    value['id'] = groupCounter;
                    value['label'] = 'Group ' + idOne + ' ' + idTwo;
                    value['idOne'] = idOne;
                    value['idTwo'] = idTwo;

                    lanes[key] = value;
                    lanesList.push(value);
                    groupCounter += 1;

                }

                var label = item.labels.label;

                //console.log(label)

                /**
                 * If the label of the current TS is different from undefined create an item for the current group.
                 */
                if (label != undefined){

                    /**
                     * The group is created if it not exist already.
                     */
                    if (!groupAlreadyExist(items, idOne, idTwo)) {

                        var value = {};
                        value['label'] = item.labels.label;
                        value['lanePos'] = lanes[key].id;
                        value['id'] = itemCounter;
                        value['lane'] = key;
                        value['start'] = item.milliseconds;
                        value['end'] = 0;
                        value['class'] = item.labels.code;
                        value['color'] = item.labels.color;

                        items[key] = value;
                        itemCounter += 1;

                    }else{

                        /**
                         * If it already exist check if the label is the same.
                         */
                        var oldValue = items[key];

                        if(oldValue['label'] != label){

                            /**
                             * If the label is different create a new one with new label.
                             */
                            oldValue['end'] = item.millisec - 1;
                            itemsList.push(oldValue);

                            var value = {};
                            value['label'] = item.labels.label;
                            value['lanePos'] = lanes[key].id;
                            value['id'] = itemCounter;
                            value['lane'] = key;
                            value['start'] = item.milliseconds;
                            value['end'] = 0;
                            value['class'] = item.labels.code;
                            value['color'] = item.labels.color;

                            items[key] = value;
                            itemCounter += 1;

                        }

                    }

                }else{

                    /**
                     * The label is undefined, end all the items.
                     */
                    for(var k in items){

                        var value = items[k];
                        console.log(value['label'])
                        value['end'] = item.milliseconds - 1;

                        itemsList.push(value);
                        itemCounter += 1;

                    }

                    items = {};

                }

            } // End for for each NET

        }

    } // End for on TIMESTAMPS

    /**
     * All the remaining data in the startTIme should create an item.
     */
    for (var k in items) {

        // Skip the ite that don't have a label.
        if (item.labels == -1)
            continue;

        var value = items[k];
        value['end'] = values[values.length - 1].milliseconds;

        itemsList.push(value);
        itemCounter += 1;

    }

    var startTimestamp = values[0].milliseconds;
    var endTimestamp = values[values.length - 1].milliseconds;

    setUpTimeline(startTimestamp, endTimestamp, lanesList, itemsList, Object.keys(lanes).length);

}

/*************************************************
 *              BUILT THE TIMELINES
 *************************************************/

function setUpTimeline(startTimestamp, endTimestamp, lanes, items, laneLength){

    //console.log(startTimestamp);
    //console.log(endTimestamp);

    var m = [20, 15, 15, 120], //top right bottom left
        w = 1600 - m[1] - m[3],
        h = (15 * lanes.length) - m[0] - m[2],
        miniHeight = laneLength * 12 + 50,
        mainHeight = h - miniHeight - 50;

    /**
     * Create the scales
     */
    var x = d3.time.scale().domain([startTimestamp,endTimestamp]).range([0, w]);
    var y = d3.scale.linear().domain([0, laneLength]).range([0, miniHeight]);


    var label = d3.select('#labels');

    // Reset the SVG with th pat labels
    var svgLabel = label.select('svg');
    if (svgLabel != undefined)
        svgLabel.remove();

    var chart = label.append('svg')
        .attr('width', w + m[1] + m[3])
        .attr('height', h + m[0] + m[2])
        .attr('class', 'chart');

    var mini = chart.append('g')
        .attr('transform', 'translate(' + m[3] + ',' + (mainHeight + m[0]) + ')')
        .attr('width', w)
        .attr('height', miniHeight)
        .attr('class', 'mini');

    /**
     * Draw the lines
     */
    mini.append('g').selectAll('.laneLines')
        .data(lanes)
        .enter().append('line')
        .attr('x1', m[1])
        .attr('y1', function(d, i) {return y(d.id);})
        .attr('x2', w)
        .attr('y2', function(d, i) {return y(d.id);})
        .attr('stroke', 'lightgray');

    /**
     * Draw the label
     */
    mini.append('g').selectAll('.laneText')
        .data(lanes)
        .enter().append('text')
        .text(function(d) {return d.label;})
        .attr('x', -m[1])
        .attr('y', function(d, i) {return y(i + .5);})
        .attr('dy', '.5ex')
        .attr('text-anchor', 'end')
        .attr('class', 'laneText');


    /**
     * Draw the label foreach lane.
     */
    mini.append('g').selectAll('miniItems')
        .data(items)
        .enter().append('rect')
        .attr('class', function(d) {return 'miniItem' + d.lane;})
        .attr('x', function(d) {return x(d.start);})
        .attr('y', function(d) {return y(d.lanePos + .5) - 5;})
        .attr('width', function(d) {return (x(d.end) - x(d.start));})
        .attr('height', 10)
        .style('fill', function(d){return d['color'];});

    /**
     * Draw the label name in the item.
     *//*
    mini.append('g').selectAll('.miniLabels')
        .data(items)
        .enter().append('text')
        .text(function(d) {return d.label;})
        .attr('x', function(d) {return x(d.start);})
        .attr('y', function(d) {return y(d.lanePos + .5);})
        .attr('dy', '.5ex');
    */
}


/*************************************************
 *              UTILITY FUNCTIONS
 *************************************************/

/**
 * Function used to check if a group is already inserted in the dictionary.
 */
function groupAlreadyExist(dictionary, idOne, idTwo){

    var key = idOne + '' + idTwo;
    if(key in dictionary)
        return true;

    key = idTwo + '' + idOne;
    if(key in dictionary)
        return true;

    return false;
}