/*************************************************
 *              FILE UPLOAD.
 *************************************************/
var labelFile = $('#label');
var labelNameFile = $('#labelName');

var uploadLabelButton = $('#uploadLabel');
var uploadLabelNameButton = $('#uploadNameLabel');

var results = null;

/**
 * Label name map.
 */
var labelNameMap = {};
var labelNameColor = {};

/*************************************************
 *              BUTTON CLICK EVENT
 *************************************************/

/**
 * Manage the upload of the label names.
 */
uploadLabelNameButton.on('click', function() {

    if (!window.FileReader) {
        alert('Your browser is not supported')
    }

    var labelNameInput = labelNameFile.get(0);

    if (labelNameInput.files.length) {

        var labelNameContent = labelNameInput.files[0];

        var reader = new FileReader();
        reader.readAsText(labelNameContent);
        $(reader).on('load', createMapLabelName);

    } else {
        alert('Please upload a file before continuing')
    }
});

/**
 * Manage the upload of the label for each timestamp.
 */
uploadLabelButton.on('click', function() {

    if (!window.FileReader) {
        alert('Your browser is not supported')
    }

    var labelInput = labelFile.get(0);

    if (labelInput.files.length) {

        var labelContent = labelInput.files[0];

        var reader = new FileReader();
        reader.readAsText(labelContent);
        $(reader).on('load', processFile);

    } else {
        alert('Please upload a file before continuing')
    }
});

/**
 * Function caled when the user wnat to the label timelines.
 */
function drawLabelTimeline(initialTime, tStart,tEnd){

    getData(initialTime, tStart,tEnd);

}

/*************************************************
 *              FILE READERS.
 *************************************************/

/**
 * Function that popolate the map with label and name.
 * @param e, the file content.
 */
function createMapLabelName(e){

    var file = e.target.result;
    if (file && file.length) {

        results = file.split("\n");
        for(var i = 0; i < results.length; i++){

            // Add to the map the label assigned to the TS i.
            var value = results[i].split(",");
            labelNameMap[parseInt(value[0])] = value[1];
            labelNameColor[parseInt(value[0])] = value[2];

        }

    }

    console.log(labelNameMap);
    console.log(labelNameColor);

}

/**
 * Function that process the file.
 * @param e, the file content.
 */
function processFile(e) {

    var file = e.target.result;
    if (file && file.length) {

        results = file.split("\n");
        popolateLabel(results);

    }
}



/*************************************************
 *              LABEL CONSTRUCTION.
 *************************************************/
var labelMap = {};

/**
 * Function that create the structure with the labels.
 * @param labels, the content of the file with the labels.
 */
function popolateLabel(labels){

    for(var i = 0; i < labels.length; i++){

        // Add to the map the label assigned to the TS i.
        var value = labels[i].split(",");
        labelMap[parseInt(value[0])] = parseInt(value[1]);

    }

    console.log(labelMap);

}

/*************************************************
 *              GET DATA FROM DB
 *************************************************/

/**
 * Function used to get the data from the DB.
 * @param start, starting time intrval.
 * @param end, ending time interval.
 */
function getData(initialTime, start, end){

    // Get data from DB.
    var firebase = new Firebase('https://labeldatababoons.firebaseio.com/timestamps');

    firebase.orderByKey().startAt(start.toString()).endAt(end.toString()).on("value", function (snapshot) {

        // Set the data retrieved from the DB.
        setData(snapshot.exportVal(), initialTime, start, end);

    }, function (errorObject) {
        console.log("The read failed: " + errorObject.code);
    });

}

/**
 * Function used to extract all the lanes (groups) and the items of each group.
 * @param values, data that come from the DB.
 */
function setData(values, initialTime, start, end){

    var lanes = {};
    var lanesList = [];
    var items = [];
    var startTime = {};

    var groupCounter = 0;
    var itemCounter = 0;

    var minMillisec = values[start].millisec;

    // Iterate over each line retrieved
    for (var vKey in values) {

        var item = values[vKey];

        // Skip missing data
        if (item == undefined)
            return;

        //Skip item without nets
        if (item.nets != undefined) {

            for (var nKey in item.nets) {

                var net = item.nets[nKey];

                // Take the IDs of the two baboons.
                var idOne = net.idOne;
                var idTwo = net.idTwo;

                // Compose the key
                var key = idOne + '' + idTwo;

                // If the group (net) doesn't exist add to the lanes structure.
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

                // If the current net doesn't have a starting tme add it.
                if (!groupAlreadyExist(startTime, idOne, idTwo)) {

                    startTime[key] = item.millisec;

                }

            }

            // When all the net are added now I check which ones already started are not in this timestamp anymore.
            for (var k in startTime) {

                var found = false;

                // Loop on the nets and find the ones that are not present anymore.
                for (var nKey in item.nets) {

                    var net = item.nets[nKey];

                    // Compose the key
                    var key = net.idOne + '' + net.idTwo;

                    if (key == k)
                        found = true;
                }

                // Delete the one not present anymore from start and create the item.
                if (!found) {

                    // Skip the ite that don't have a label.
                    if (labelMap[vKey] == undefined)
                        continue;

                    var value = {};
                    value['label'] = labelNameMap[labelMap[vKey]];
                    value['lanePos'] = lanes[k].id;
                    value['id'] = itemCounter;
                    value['lane'] = k;
                    value['start'] = startTime[k];
                    value['end'] = item.millisec;
                    value['class'] = labelMap[vKey].toString();

                    items.push(value);
                    itemCounter += 1;

                    delete startTime[k];

                }

            }

        }

    }

    // All the label that are still alive are ended with the ent time
    for (var k in startTime) {

        // Skip the ite that don't have a label.
        if (labelMap[end] == undefined)
            continue;

        var value = {};
        value['label'] = labelNameMap[labelMap[end]];
        value['lanePos'] = lanes[k].id;
        value['id'] = itemCounter;
        value['lane'] = k;
        value['start'] = startTime[k];
        value['end'] = values[end].millisec;
        value['class'] = labelMap[end].toString();

        items.push(value);
        itemCounter += 1;

    }

    var startTimestamp = values[start].millisec;
    var endTimestamp = values[end].millisec;

    console.log(lanesList);
    console.log(items);

    setUpTimeline(startTimestamp, endTimestamp, lanesList, items, Object.keys(lanes).length);

}

/*************************************************
 *              BUILT THE TIMELINES
 *************************************************/

function setUpTimeline(startTimestamp, endTimestamp, lanes, items, laneLength){

    //console.log(startTimestamp);
    //console.log(endTimestamp);

    var m = [20, 15, 15, 120], //top right bottom left
        w = 1600 - m[1] - m[3],
        h = 600 - m[0] - m[2],
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

    var chart = label.append("svg")
        .attr("width", w + m[1] + m[3])
        .attr("height", h + m[0] + m[2])
        .attr("class", "chart");

    var mini = chart.append("g")
        .attr("transform", "translate(" + m[3] + "," + (mainHeight + m[0]) + ")")
        .attr("width", w)
        .attr("height", miniHeight)
        .attr("class", "mini");

    /**
     * Draw the lines
     */
    mini.append("g").selectAll(".laneLines")
        .data(lanes)
        .enter().append("line")
        .attr("x1", m[1])
        .attr("y1", function(d, i) {return y(d.id);})
        .attr("x2", w)
        .attr("y2", function(d, i) {return y(d.id);})
        .attr("stroke", "lightgray");

    /**
     * Draw the label
     */
    mini.append("g").selectAll(".laneText")
        .data(lanes)
        .enter().append("text")
        .text(function(d) {return d.label;})
        .attr("x", -m[1])
        .attr("y", function(d, i) {return y(i + .5);})
        .attr("dy", ".5ex")
        .attr("text-anchor", "end")
        .attr("class", "laneText");


    /**
     * Draw the label foreach lane.
     */
    mini.append("g").selectAll("miniItems")
        .data(items)
        .enter().append("rect")
        .attr("class", function(d) {return "miniItem" + d.lane;})
        .attr("x", function(d) {return x(d.start);})
        .attr("y", function(d) {return y(d.lanePos + .5) - 5;})
        .attr("width", function(d) {return (x(d.end) - x(d.start));})
        .attr("height", 10)
        .style("fill", function(d){return labelNameColor[parseInt(d.class)].toString();});

    /**
     * Draw the label name in the item.
     */
    mini.append("g").selectAll(".miniLabels")
        .data(items)
        .enter().append("text")
        .text(function(d) {return d.label;})
        .attr("x", function(d) {return x(d.start);})
        .attr("y", function(d) {return y(d.lanePos + .5);})
        .attr("dy", ".5ex");

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