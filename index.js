//Setting up modules
const express = require('express')
const bodyParser = require('body-parser')
//let ejs = require('ejs')
const app = express();

require('dotenv').config();
app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({
  extended: false
}))

var strava = new require("strava")({
  "access_token": process.env.ACCESS_TOKEN,
  "client_id": process.env.CLIENT_ID,
  "client_secret": process.env.CLIENT_SECRET,
  "redirect_url": "www.google.com"
});


//902447 Scarva Drag
//55274 DCC leaderboard

app.use(express.static(__dirname + '/public'));

app.get('/', (req, res) => {
  res.render('index');
});

app.listen(8000, () => {
  console.log("server is now running")
  amountOfEfforts(902447, 0)

  //findDailyRecords(902447, 0, 0)
  //findSegmentInfo(902447)
});

//Find information the person with the key (Me)
function findAthlete() {
  strava.athlete.get(function(err, res) {
    console.log(res);
  });
}

//CLUB INFORMATION

//Finding information on a club
function findClub(clubId) {
  strava.clubs.get(clubId, function(err, res) {
    console.log(res);
  })
}

//Finding all the members in a club
function findClubMembers(clubId, totalMembership) {
  var params = {
    "id": clubId,
    "page": 1,
    "per_page": totalMembership
  }

  strava.clubs.members.get(clubId, params, function(err, data) {
    var objJSON = JSON.parse(JSON.stringify(data));
    console.log(objJSON);
  });
}

//Finds how many people are in a club
function findClubTotalMembership(clubId) {
  var objJSON = ""
  strava.clubs.get(clubId, function(err, res) {
    objJSON = JSON.parse(JSON.stringify(res.member_count))
  })
  return objJSON
}


//SEGMENT INFORMATION

//Returning the anount of times a segment has been done that day.
function amountOfEfforts(segId, clubId) {
  var params = {
    "date_range": "this_year"
  }

  strava.segments.leaderboard.get(segId, params, function(err, data) {
    var total = JSON.parse(JSON.stringify(data.effort_count))
    console.log("Amount of efforts method: " + total)
    findDailyRecords(segId,total,clubId)
  })
}


//Finding the total results of the day
function findDailyRecords(segId, segTotal, clubId) {

  if (clubId != 0) {
    var paramsClub = {
      "date_range": "this_year",
      "per_page": 100,
      "club_id": clubId
    }
    strava.segments.leaderboard.get(segId, paramsClub, function(err, data) {
      refineDailyRecords(data)
    })

  } else {
    var paramsNoClub = {
      "date_range": "this_year",
      "per_page": 100
    }

    strava.segments.leaderboard.get(segId, paramsNoClub, function(err, data) {
      refineDailyRecords(data)
    })
  }
}

function refineDailyRecords(data){
    var segment = []
    var numberOfEntry = data.entries.length

    for(let i =0; i < numberOfEntry; i++){
      segment.push([data.entries[i].athlete_name, data.entries[i].elapsed_time, data.entries[i].rank])
    }

    console.log(segment)
}

//Finding the information on any segment
function findSegmentInfo(segId) {
  strava.segments.get(segId, function(err, data) {
    var objJSON = JSON.parse(JSON.stringify(data))
    var segmentInformation = {
      "name": objJSON.name,
      "distance": convertingMetersToMiles(objJSON.distance),
      "average_grade": objJSON.average_grade }
    return segmentInformation
  })
}

function convertingMetersToMiles(meters) {
  return (meters * 0.000621371).toFixed(3)
}

function convertingMilesToKM(miles) {
  return (miles * 1.60934).toFixed(3)
}
