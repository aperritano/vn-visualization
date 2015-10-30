/*************************************************
 *              UPLOAD FILE.
 *************************************************/
var labelFile = $('#label');
var labelNameFile = $('#labelName');

var uploadLabelButton = $('#uploadLabel');
var uploadLabelNameButton = $('#uploadNameLabel');

var sessionNameText = $('#sessionName');

var sessionId = null;

/*************************************************
 *              BUTTONS ACTIONS.
 *************************************************/

/**
 * Manage the upload of the label names.
 */
uploadLabelNameButton.on('click', function() {

    var sessionName = sessionNameText.val();
    var ref = new Firebase('https://baboons.firebaseio.com/sessions/');

    if (sessionName == '') {
        alert('Insert a Session Name')
        return;
    }

    ref.orderByKey().once('value', function (snapshot) {

        var values = snapshot.exportVal();
        if( values !== undefined ) {

            /**
             * Find the session.
             */
            for(var k in values){

                /**
                 * Upload the data.
                 */
                if(values[k].name == sessionName){
                    sessionId = k;
                    readDictionaryFile();
                }

            }

        }

    }, function (errorObject) {
        console.log('The read failed: ' + errorObject.code);
    });

});

/**
 * Manage the upload of the label for each timestamp.
 */
uploadLabelButton.on('click', function() {

    var sessionName = sessionNameText.val();
    var ref = new Firebase('https://baboons.firebaseio.com/sessions/');

    if (sessionName == '') {
        alert('Insert a Session Name')
        return;
    }

    ref.orderByKey().once('value', function (snapshot) {

        var values = snapshot.exportVal();
        if( values !== undefined ) {

            /**
             * Find the session.
             */
            for(var k in values){

                /**
                 * Upload the data.
                 */
                if(values[k].name == sessionName){
                    sessionId = k;
                    readLabelFile();
                }

            }

        }

    }, function (errorObject) {
        console.log('The read failed: ' + errorObject.code);
    });

});

/*************************************************
 *              UPLOAD NAME DICTIONARY.
 *************************************************/

/**
 * File analyser.
 */
function readDictionaryFile(){

     if (!window.FileReader) {
        alert('Your browser is not supported')
     }

     var labelNameInput = labelNameFile.get(0);

     if (labelNameInput.files.length) {

         var labelNameContent = labelNameInput.files[0];

         var reader = new FileReader();
         reader.readAsText(labelNameContent);
         $(reader).on('load', uploadDictionary);

     } else {
        alert('Please upload a file before continuing')
     }

}

/**
 * Parse the file and upload the label dictionary on firebase.
 * @param e, file content.
 */
function uploadDictionary(e){

    var firebase = new Firebase('https://baboons.firebaseio.com/sessions/' + sessionId);
    firebase.child('labelDictionary').set(null);
    var labelMap = {};

    var file = e.target.result;
    if (file && file.length) {

        results = file.split("\n");
        for(var i = 0; i < results.length; i++){

            var value = results[i].split(",");
            labelMap[parseInt(value[0])] = {
                'code': parseInt(value[0]),
                'label': value[1],
                'color': value[2].replace('\r', '')
            };

        }

    }

    firebase.child('labelDictionary').set(labelMap);

}

/*************************************************
 *              UPLOAD LABELS.
 *************************************************/
/**
 * File analyser.
 */
function readLabelFile(){

    if (!window.FileReader) {
        alert('Your browser is not supported')
    }

    var labelInput = labelFile.get(0);

    if (labelInput.files.length) {

        var labelContent = labelInput.files[0];

        var reader = new FileReader();
        reader.readAsText(labelContent);
        $(reader).on('load', uploadLabel);

    } else {
        alert('Please upload a file before continuing')
    }

}

/**
 * Parse the file and upload the label on firebase.
 * @param e, file content.
 */
function uploadLabel(e){

    var firebase = new Firebase('https://baboons.firebaseio.com/sessions/' + sessionId);
    firebase.child('labels').set(null);
    var labelMap = {};

    var file = e.target.result;
    if (file && file.length) {

        results = file.split("\n");
        for(var i = 0; i < results.length; i++){

            var value = results[i].split(",");
            if (value[1] == undefined)
                continue;

            labelMap[parseInt(value[0])] = {
                'timestampNumber': parseInt(value[0]),
                'label': parseInt(value[1].replace('\r', ''))
            };

        }

    }

    firebase.child('labels').set(labelMap);

}