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

var segmentResults = new Array();

//902447 Scarva Drag
//55274 DCC leaderboard

app.use(express.static(__dirname + '/public'));

app.get('/', (req, res) => {
  res.sendFile('public/index.html', {root: __dirname })
});

app.listen(8000, () => {
  console.log("server is now running")
  findDailyRecords(902447, 0, 0)
  //findSegmentInfo(902447)
});

//Find information the person with the key (Me)
function findAthlete(){
  strava.athlete.get(function(err, res) {
        console.log(res);
  });
}

//CLUB INFORMATION

//Finding information on a club
function findClub(clubId){
  strava.clubs.get(clubId, function(err,res){
    console.log(res);
  })
}

//Finding all the members in a club
function findClubMembers(clubId, totalMembership){
  var params = {
    "id": clubId,
    "page" : 1,
    "per_page": totalMembership
  }

  strava.clubs.members.get(clubId, params, function(err,data){
    var objJSON = JSON.parse(JSON.stringify(data));
    console.log(objJSON);
  });
}

//Finds how many people are in a club
function findClubTotalMembership(clubId){
  strava.clubs.get(clubId, function(err,res){
    var objJSON = JSON.parse(JSON.stringify(res.member_count))
    return objJSON
  })
}


//SEGMENT INFORMATION

//Finding the information on any segment
function findSegmentInfo(segId) {
  strava.segments.get(segId, function(err,data) {
    var objJSON = JSON.parse(JSON.stringify(data))
    var segmentInformation = {
      "name" : objJSON.name,
      "distance": convertingMetersToMiles(objJSON.distance),
      "average_grade": objJSON.average_grade,
    }
    console.log(segmentInformation)
  })
}

//Finding the total results of the day
function findDailyRecords(segId, segTotal, clubId){
  var objJSON = [];
  var segmentResults = [,,,];
  var amount = segTotal;
  let total = 0;
  var input = {
    "date_range" : "today"
  }
  strava.segments.leaderboard.get(segId, input, function(err,data){
  total = JSON.parse(JSON.stringify(data.effort_count))
  })
  if(clubId != 0) {
    var paramsClub = {
      "date_range" : "today",
      "per_page" : total,
      "club_id" : clubId
    }
    strava.segments.leaderboard.get(segId, paramsClub, function(err,data){
      objJSON = JSON.parse(JSON.stringify(data))
      return objJSON
    })
  } else {
    var paramsNoClub = {
      "date_range" : "today",
      "per_page" : 100
    }
    strava.segments.leaderboard.get(segId, paramsNoClub, function(err,data){
      objJSON = JSON.parse(JSON.stringify(data))
      return objJSON
    })
  }
}

//Returning the anount of times a segment has been done that day.
function amountOfEfforts(segId){
  let total = 0;
  var params = {
    "date_range" : "today"
  }

  strava.segments.leaderboard.get(segId, params, function(err,data){
    total = JSON.parse(JSON.stringify(data.effort_count))
    console.log("Amount of times completed today: " + total)
    return total;
  })
}

function convertingMetersToMiles(meters){
  return (meters * 0.000621371).toFixed(3)
}

function convertingMilesToKM(miles){
  return (miles * 1.60934).toFixed(3)
}
