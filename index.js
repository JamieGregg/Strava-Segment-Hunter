//Setting up modules
const express = require('express')
const bodyParser = require('body-parser')
const app = express();
let segment = []
let clubId =0;
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

//902447 Scarva Drag
//55274 DCC leaderboard


app.use(express.static(__dirname + '/public-updated'));

app.post('/', function(req,res){
  var clubName = req.body.clubs
  switch (clubName){
    case 'dromore': clubId = 55274; break;
    case 'dromara': clubId = 2885; break;
    case 'wdw': clubId = 12013; break;
    case 'everyone': clubId = 0; break;
  }
  console.log(clubId);
  loadLeaderboard(902447, clubId, req, res)
})

app.get('/', (req, res) => {
  loadLeaderboard(902447, clubId, req, res)
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
  return (meters * 0.000621371).toFixed(2) + " miles"
}

function convertingMilesToKM(miles) {
  return (miles * 1.60934).toFixed(2)
}

function convertSecondsToMinutes(seconds){
  var minutes = Math.floor(seconds / 60);
  var seconds = ((seconds % 60)/100).toFixed(2);
  return minutes + ":" + seconds.slice(-2);
}

function loadLeaderboard(segmentId, clubId, req, res){
  var segmentId = segmentId;
  var totalNumber = 0;
  var clubId = clubId;
  console.log(clubId);
  var timeFrame = "this_year"
  var params = {
    "date_range": timeFrame
  }
  var segment = []
  var segmentInfo = []

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
        "per_page": 100,
        "club_id": clubId
      }
      strava.segments.leaderboard.get(segmentId, paramsClub, function(err, data) {
        var numberOfEntry = data.entries.length

        for(let i =0; i < numberOfEntry; i++){
          segment.push([data.entries[i].athlete_name, convertSecondsToMinutes(data.entries[i].elapsed_time), data.entries[i].rank])
        }
        res.render('home', {data: segment, segmentInfo: segmentInfo, clubId:clubId});
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

        res.render('home', {data: segment,  segmentInfo: segmentInfo, clubId:clubId});
      })
    }
  })
}
