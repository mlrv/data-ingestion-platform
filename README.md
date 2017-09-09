# Data Ingestion Service - NodeJS
This application is a prototype of a data ingestion service which provides the following functionalities:
- Ability to submit data through an API call, including data validation
- Ability to retrieve data from a database 
- Ability to define a threshold for a specific data type. If the threshold is tripped, an alert SMS will be sent to a predefined phone number.

## Run locally
To run this locally, clone it on your machine and install all the dependencies with `npm install`. Then simply run it with `node server.js`
In the config folder create the required configuration files for the mongodb database and the SMS alert service, as they are gitignored.

Structure:

config/db.js
```javascript
module.exports = {
  url : '<DB CONNECTION STRING>',
  collection: '<COLLECTION NAME>'
};
```

and

config/twilio.js
```javascript
module.exports = {
    twiloNumber: '+000000000000',
    accountSid : 'aaaaaaaaaaaaaaaaaa',
    authToken: 'bbbbbbbbbbbbbbbbbbbbbbbb',
    emergencyNumber: '+0000000000'
  };
```

## Endpoints

### Submit new data points
New data points can be submitted with a *PUT* API call to `/data/`, the structure needs to be as follows.
```json
{
	"sensorId": "string",
	"time": 12,
	"value": 137
}
```

### Retrieve data points
A *GET* API call to `/data/` is used to retrieve data from the database, the following headers are required:
- sensorId: Id of the sensor you want to get data from 
- since: initial time
- until: final time

For example, a call with the following headers:
```json
{
	"sensorId": "abc",
	"since": 12,
	"until": 18
}
```
would return all the data points collected by the sensor with sensorId = 'abc' from time 12 to time 18.

