//Setting up modules
const express = require('express')
const bodyParser = require('body-parser')
const app = express();
let segment = []

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

function SegmentData() {
  this.segmentInfo = []
}
SegmentData.prototype.setSegmentInfo = function(segmentInfo){
  this.segmentInfo = segmentInfo
}
SegmentData.prototype.printDetails = function(){
  console.log(this.segmentInfo)
}

let details = new SegmentData();

//902447 Scarva Drag
//55274 DCC leaderboard

app.use(express.static(__dirname + '/public'));

app.get('/', (req, res) => {

  var segmentId = 902447;
  var totalNumber = 0;
  var clubId = 55274;
  var timeFrame = "this_year"
  var params = {
    "date_range": timeFrame
  }
  var segment = []

  strava.segments.leaderboard.get(segmentId, params, function(err, data) {
    total = JSON.parse(JSON.stringify(data.effort_count))
    if (clubId != 0) {
      var paramsClub = {
        "date_range": timeFrame,
        "per_page": 100,
        "club_id": clubId
      }
      strava.segments.leaderboard.get(segmentId, paramsClub, function(err, data) {
        var numberOfEntry = data.entries.length

        for(let i =0; i < numberOfEntry; i++){
          segment.push([data.entries[i].athlete_name, convertSecondsToMinutes(data.entries[i].elapsed_time), data.entries[i].rank])
        }
        res.render('index', {data: segment});
      })

    } else {
      var paramsNoClub = {
        "date_range": timeFrame,
        "per_page": 100
      }
      strava.segments.leaderboard.get(segmentId, paramsNoClub, function(err, data) {
        var numberOfEntry = data.entries.length


        for(let i =0; i < numberOfEntry; i++){
          segment.push([data.entries[i].athlete_name, convertSecondsToMinutes(data.entries[i].elapsed_time), data.entries[i].rank])
        }
        console.log(segment.length)
        res.render('index', {data: segment});
      })
    }
  })
});

app.listen(8000, () => {
  console.log("server is now running")
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

function convertSecondsToMinutes(seconds){
  var minutes = Math.floor(seconds / 60);
  var seconds = ((seconds % 60)/100).toFixed(2);
  return minutes + ":" + seconds.slice(-2);
}
