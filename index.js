//Setting up modules
const express = require('express')
const bodyParser = require('body-parser')
const fetch = require('node-fetch')
const mongoose = require('mongoose')
const schedule = require('node-schedule')
const app = express();
let segment = []
let clubId = 0;
let segmentId = 902447;
require('dotenv').config();
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({
  extended: false
}))

mongoose.connect('mongodb://localhost:27017/segLeaderboard', {
  useNewUrlParser: true
})

app.use(express.static(__dirname + '/public-updated'));

app.post('/', function(req, res) {
  loadLeaderboard(segmentId, clubIdFinder(req), true, req, res)
})

app.get('/', (req, res) => {
  saveDataEvening(0, segmentId);
  loadLeaderboard(segmentId, clubIdFinder(req), false, req, res)
});

app.listen(8000, () => {
  console.log("server is now running")
  refreshTokensNow()
});

refreshTokens();


//SEGMENT INFORMATION
//Finding the information on any segment
function loadLeaderboard(segmentId, clubId, reload, req, res) {
  var segmentId = segmentId;
  var clubId = clubId;
  var timeFrame = "today"
  var params = {
    "date_range": timeFrame
  }
  var noOfResults = 30
  var numberOfEntry = 0;
  var segment = []
  var segmentInfo = []

  var strava = new require("strava")({
    "client_id": process.env.CLIENT_ID,
    "access_token": process.env.ACCESS_TOKEN,
    "client_secret": process.env.CLIENT_SECRET,
    "redirect_url": "www.google.com"
  });

  strava.segments.get(segmentId, function(err, data) {
    var objJSON = JSON.parse(JSON.stringify(data))
    segmentInfo = {
      "name": objJSON.name,
      "distance": convertingMetersToMiles(objJSON.distance),
      "average_grade": objJSON.average_grade,
      "link": "https://www.strava.com/segments/" + objJSON.id,
      "efforts": objJSON.effort_count,
      "location": objJSON.state
    }
  })

  strava.segments.leaderboard.get(segmentId, params, function(err, data) {
    total = JSON.parse(JSON.stringify(data.effort_count))
    if (clubId != 0) {
      var paramsClub = {
        "date_range": timeFrame,
        "per_page": noOfResults,
        "club_id": clubId
      }
      strava.segments.leaderboard.get(segmentId, paramsClub, function(err, data) {
        numberOfEntry = data.entries.length

        for (let i = 0; i < numberOfEntry; i++) {
          segment.push([data.entries[i].athlete_name, convertSecondsToMinutes(data.entries[i].elapsed_time), data.entries[i].rank])
        }
        res.render('home', {
          data: segment,
          segmentInfo: segmentInfo,
          clubId: clubId,
          reload: reload
        });
      })

    } else {
      var paramsNoClub = {
        "date_range": timeFrame,
        "per_page": noOfResults
      }
      strava.segments.leaderboard.get(segmentId, paramsNoClub, function(err, data) {
        numberOfEntry = data.entries.length

        for (let i = 0; i < numberOfEntry; i++) {
          segment.push([data.entries[i].athlete_name, convertSecondsToMinutes(data.entries[i].elapsed_time), data.entries[i].rank])
        }

        res.render('home', {
          data: segment,
          segmentInfo: segmentInfo,
          clubId: clubId,
          reload: reload
        });
      })
    }
  })
}



//TOKEN REFRESH FUNCTIONS
//Automatic token refresh
function refreshTokens() {
  var rule = new schedule.RecurrenceRule()
  rule.minute = 11
  var j = schedule.scheduleJob(rule, function() {
    console.log("Automatic Token Refresh")

    var authLink = 'https://www.strava.com/oauth/token'
    fetch(authLink, {
        method: 'post',
        headers: {
          'Accept': 'application/json, text/plain, */*',
          'Content-Type': 'application/json'
        },

        body: JSON.stringify({
          client_id: process.env.CLIENT_ID,
          client_secret: process.env.CLIENT_SECRET,
          refresh_token: process.env.REFRESH_TOKEN,
          grant_type: 'refresh_token'
        })
      }).then(res => res.json())
      .then(res => assignEnvVariable(res))
  })
}

//Refresh the tokens when the server first loads up
function refreshTokensNow() {
  console.log("Tokens beginning refresh on server load")

  var authLink = 'https://www.strava.com/oauth/token'
  fetch(authLink, {
      method: 'post',
      headers: {
        'Accept': 'application/json, text/plain, */*',
        'Content-Type': 'application/json'
      },

      body: JSON.stringify({
        client_id: process.env.CLIENT_ID,
        client_secret: process.env.CLIENT_SECRET,
        refresh_token: process.env.REFRESH_TOKEN,
        grant_type: 'refresh_token'
      })
    }).then(res => res.json())
    .then(res => assignEnvVariable(res))
}

function assignEnvVariable(res) {
  process.env.ACCESS_TOKEN = res.access_token
  console.log("Access Token is " + res.access_token)
}


//DATABASE
function createSchema() {
  const segLeaderboardSchema = new mongoose.Schema({
    rank: Number,
    name: String
  })
}

function populateSchema() {
  const segLeaderboard = mongoose.model("Everyone", segLeaderboardSchema)
  const everyone = new segLeaderboard({
    rank: 1,
    name: "Test Data"
  })
}

function saveDataEvening(clubId, segmentId) {
  /*var rule = new schedule.RecurrenceRule()
  rule.hour = 19
  rule.minute = 33
  rule.second = 0

  var j = schedule.scheduleJob(rule, function() {
    */
  console.log("Starting the Database method.")

  var timeFrame = "today"
  var params = {
    "date_range": timeFrame
  }
  var noOfResults = 5
  var numberOfEntry = 0;
  var segment = []
  var segmentInfo = []

  var strava = new require("strava")({
    "client_id": process.env.CLIENT_ID,
    "access_token": process.env.ACCESS_TOKEN,
    "client_secret": process.env.CLIENT_SECRET,
    "redirect_url": "localhost:8000/"
  });

  strava.segments.get(segmentId, function(err, data) {
    var objJSON = JSON.parse(JSON.stringify(data))
    segmentInfo = {
      "name": objJSON.name,
      "distance": convertingMetersToMiles(objJSON.distance),
      "average_grade": objJSON.average_grade,
      "link": "https://www.strava.com/segments/" + objJSON.id,
      "efforts": objJSON.effort_count,
      "location": objJSON.state
    }
  })

  console.log(segmentInfo)

  strava.segments.leaderboard.get(segmentId, params, function(err, data) {
    total = JSON.parse(JSON.stringify(data.effort_count))
    //Everyone League Table
    if (clubId == 0) {
      var paramsClub = {
        "date_range": timeFrame,
        "per_page": noOfResults,
      }
      strava.segments.leaderboard.get(segmentId, paramsClub, function(err, data) {
        console.log(data)
        numberOfEntry = data.entries.length

        for (let i = 0; i < numberOfEntry; i++) {
          segment.push([data.entries[i].athlete_name, convertSecondsToMinutes(data.entries[i].elapsed_time), data.entries[i].rank])
        }
        console.log(segment)
      })
    }
  })
  //})
}


//DATA CONVERSION
function convertingMetersToMiles(meters) {
  return (meters * 0.000621371).toFixed(2) + " miles"
}

function convertingMilesToKM(miles) {
  return (miles * 1.60934).toFixed(2)
}

function convertSecondsToMinutes(seconds) {
  var minutes = Math.floor(seconds / 60);
  var seconds = ((seconds % 60) / 100).toFixed(2);
  return minutes + ":" + seconds.slice(-2);
}



//DATA HANDLING
function clubIdFinder(req) {
  var clubName = req.body.clubs

  switch (clubName) {
    case 'dromore':
      clubId = 55274;
      break;
    case 'dromara':
      clubId = 2885;
      break;
    case 'wdw':
      clubId = 12013;
      break;
    case 'everyone':
      clubId = 0;
      break;
  }
  return clubId
}
