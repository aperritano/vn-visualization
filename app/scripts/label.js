/*************************************************
 *              VARIABLES
 *************************************************/
var LIMIT_LABEL = 45;
var LIMIT_TICK = 15;

/*************************************************
 *              COMPUTE DATA
 *************************************************/

/**
 * Function used to extract all the lanes (groups) and the items of each group.
 * @param dataPoints, data that come from the DB.
 */
function getLabelsInRange(dataPoints) {

  var startTimestamp =  moment(dataPoints[0].timestamp).valueOf()/1000;
  var endTimestamp = moment(dataPoints[dataPoints.length - 1].timestamp).valueOf()/1000;
  var minutes = (endTimestamp - startTimestamp) / 60;

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
     * Groups Labels.
     */
    if (gantGroupMap.class === undefined) {
      gantGroupMap.class = 'Class';
      //Lets short this
      gantGroupMap.label = 'G ';
      gantGroupMap.times = [];
      gantGroupMap.actual = null;

    }

    // Take the group label
    var label = ts.group_label;
    if (label !== undefined) {

      // Take the last gantt rect
      var actual = gantGroupMap.actual;

      //The group is created if it not exist already.
      if (actual === null) {
        // If the last rectangle has been finished
        var gantGroupMapValue = {};
        //moment.js valueOf does a better unix time conversion
        gantGroupMapValue.starting_time = moment(ts.timestamp).valueOf();
        gantGroupMapValue.ending_time = moment(ts.timestamp).valueOf();
        gantGroupMapValue.color = label.color;
        if (minutes < LIMIT_LABEL) {
          gantGroupMapValue.label = label.name;
        } else {
          gantGroupMapValue.name = label.name;
        }

        gantGroupMap.actual = gantGroupMapValue;

      } else {

        gantGroupMap.actual.ending_time = moment(ts.timestamp).valueOf();

      }

    } else {

      var actualValue = gantGroupMap.actual;
      if (actualValue !== null) {
        gantGroupMap.times.push(actualValue);
        gantGroupMap.actual = null;

      }

    }

    /**
     * End Group Labels.
     */

    /**
     * If there are nets analyze them.
     */
    if (ts.items !== undefined) {

      /**
       * Go into all the nets.
       */
      for (var iKey = 0; iKey < ts.items.length; iKey++) {

        var item = ts.items[iKey];

        if (item === null){
          continue;
        }

        // Compose the key
        var key = item.id;

        /**
         * If the individual doesn't exist create the structure related to the individual.
         */
        if (gantMap[key] === undefined) {
          var gantMapValue = {};
          gantMapValue.class = key.toString();
          //s for subject
          gantMapValue.label = 'S ' + key.toString();
          gantMapValue.times = [];
          gantMapValue.actual = null;
          gantMap[key] = gantMapValue;

        }

        /**
         * If the label of the current TS is different from undefined create an item for the current group.
         */
        var label = item.individual_label;
        if (label !== undefined) {

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
            groupValue.color = label.color;
            if (minutes < LIMIT_LABEL)
              groupValue.label = label.name;
            else
              groupValue.name = label.name;
            gantMap[key].actual = groupValue;
          } else {
            gantMap[key].actual.ending_time = moment(ts.timestamp).valueOf();
          }

        } else {

          /**
           * Individuals.
           */

          var actualLast = gantMap[key].actual;
          if (actualLast != null){
            gantMap[key].times.push(actualLast);
            gantMap[key].actual = null;
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

  return [gantGroupList.concat(gantIndividualList)];

}
