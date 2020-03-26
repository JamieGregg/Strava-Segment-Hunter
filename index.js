//Setting up modules
const express = require('express')
const bodyParser = require('body-parser')
require('dotenv').config();
const app = express();
app.use(bodyParser.urlencoded({extended: false}))
var strava = new require("strava")({
  "access_token"  : process.env.ACCESS_TOKEN,
  "client_id"     : process.env.CLIENT_ID,
  "client_secret" : process.env.CLIENT_SECRET,
  "redirect_url"  : "www.google.com"
});

app.get('/', (req, res) => {
  strava.athlete.get(function(err, res) {
        console.log(res);
    });
});

app.listen(8000, () => {
  console.log("server is now running")
});
