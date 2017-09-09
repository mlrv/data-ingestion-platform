const database = require('../../config/db');
const twilioConfig = require('../../config/twilio');
const sensorThreshold = require('../../config/sensor-threshold');
var twilio = require('twilio');

module.exports = function (app, db) {

  /*
  Data point structure example
  dataPoint = {
    sensorId: 'abc',
    time: 12,
    value: 33.5
  };
  */

  // GET DATA
  app.get('/data', (req, res) => {

    // Extract headers to construct query
    var sensorId = req.headers['sensorid'];
    var since = Number(req.headers['since']);
    var until = Number(req.headers['until']);

    // Make sure the request is properly formatted
    var badRequest = false;
    var triggerBadRequest = function (message) {
      badRequest = true;
      res.status(400).send(message);
    };

    if (!sensorId || !since || !until) {
      triggerBadRequest("Request must contain 'sensorId', 'since' and 'until' as headers")
    }

    else if (since < 0 || until < 0 || since > until) {
      triggerBadRequest("Make sure your time limits are properly formatted");
    };

    // If request is OK, go ahead and query database
    if (!badRequest) {
      // Query DB with the following parameters
      var query = {
        sensorId: sensorId,
        time: { "$gte": since, "$lte": until }
      };

      // Look for documents by sensorId and withing time limits
      db.collection(database.collection).find(query).toArray((err, result) => {

        // Generic MongoDB error handling, in case anything fails from the DB side
        if (err) {
          res.send({
            error: 'An error has occurred',
            details: err
          })
        } else {
          // If document exists, send it back to the user, otherwise return an error
          let response = (result.length > 0) ? result : { message: 'No documents found' };
          res.send(response);
        };
      });
    };

  });

  // PUT DATA
  app.put('/data', (req, res) => {

    // Check that sensorId exists and is a string
    if (!req.body.sensorId || typeof (req.body.sensorId) != 'string') {
      res.status(400).send('Packet does not contain sensorId or sensorId is not of type string');
    }

    // Check that time exists and is a number
    else if (!req.body.time || typeof (req.body.time) != 'number') {
      res.status(400).send('Packet does not contain time or time is not of type number')
    }

    else if (req.body.sensorId && req.body.time && req.body.value) {

      // Function that checks for duplicates. {sensorId, time} must be unique
      var checkForDuplicates = function (sensorIdFilter, timeFilter) {
        var count = db.collection(database.collection).find({ $and: [{ sensorId: sensorIdFilter, time: timeFilter }] }).limit(1).count(true);
        return Promise.resolve(count);
      };

      // Function that checks for thresholds on a specific value (passed as input to this function)
      var checkForthresholds = function (monitoredValue) {
        var threshold = sensorThreshold.value;
        var isOverThreshold = (monitoredValue > threshold) ? true : false;
        return isOverThreshold;
      };

      // If monitoredValue is over threshold, send an alert
      if (checkForthresholds(req.body.value)) {
        var alertText = 'Value passed the threshold!';

        // Send alert SMS to selected number
        var client = new twilio(twilioConfig.accountSid, twilioConfig.authToken);
        client.messages.create({
          body: alertText,
          to: twilioConfig.emergencyNumber,
          from: twilioConfig.twiloNumber
        }).then((message) => console.log(message.sid));

        res.status(500).send({ alert: alertText });
      }

      // If monitoredValue is NOT over the threshold, verify that the document is not a duplicate and insert it
      else {
        // If {sensorId, time} pair already exists, throw 409, otherwise insert document
        checkForDuplicates(req.body.sensorId, req.body.time).then(function (numberOfElements) {
          if (numberOfElements != 0) {
            res.status(409).send({ error: 'Package is a duplicate' });
          } else {
            db.collection(database.collection).insert(req.body, (err, result) => {
              // Generic MongoDB error handling, in case anything fails from the DB side
              if (err) {
                res.status(500).send({
                  error: 'An error has occurred',
                  details: err
                });
              }
              // Happy path, document has been inserted, return 204 and a smile :)
              // NB when returning a 204, express passes an empty content by default
              else {
                res.status(200).send({
                  message: 'Document inserted',
                  details: result
                });
              };
            });
          };
        });
      };
    }

    // Internal error - anything else that could have gone wrong (internet is dead?)
    else {
      res.status(500).send({ error: 'Something has gone wrong' });
    };
  });
};
