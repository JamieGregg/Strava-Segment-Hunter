//Setting up modules
const express = require('express')
const bodyParser = require('body-parser')
const stravaAPI = require('strava-v3')
require('dotenv').config();



//Strava client
//var defaultClient = stravaAPI.ApiClient.instance;

// Configure OAuth2 access token for authorization: strava_oauth
//var strava_oauth = defaultClient.authentications['strava_oauth'];
//strava_oauth.accessToken = "YOUR ACCESS TOKEN"

const app = express();
app.use(bodyParser.urlencoded({extended: false}))

app.get('/', (req, res) => {
  res.send('Hello World!')
});

app.listen(8000, () => {
  console.log("server is now running")
  console.log(process.env)
});
