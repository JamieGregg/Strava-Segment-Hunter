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

var segmentId = 902447 //Scarva leaderboard
var clubId = 55274 //DCC leaderboard

app.use(express.static(__dirname + '/public'));

app.get('/', (req, res) => {
  res.sendFile('public/index.html', {root: __dirname })
});

app.listen(8000, () => {
  console.log("server is now running")
  amountOfEfforts()
});

function findAthlete(){
  strava.athlete.get(function(err, res) {
        console.log(res);
    });
}

function findClub(){
  strava.clubs.get(clubId, function(err,res){
    console.log(res);
  })
}

function findClubMembers(){
  var params = {
    "id": clubId,
    "page" : 1,
    "per_page": findClubMembership
  }

  strava.clubs.members.get(55274, params, function(err,data){
    var objJSON = JSON.parse(JSON.stringify(data));
    console.log(objJSON);
  });
}

function findSegmentInfo() {
  strava.segments.get(segmentId, function(err,data) {
    var objJSON = JSON.parse(JSON.stringify(data))
    console.log(objJSON)
  })
}

function findDailyRecords(){
  var params = {
    "date_range" : "today"
  }
  strava.segments.leaderboard.get(segmentId, params, function(err,data){
    var objJSON = JSON.parse(JSON.stringify(data))
    console.log(objJSON)
  })
}

function amountOfEfforts(){
  var params = {
    "date_range" : "today"
  }

  strava.segments.leaderboard.get(segmentId, params, function(err,data){
    var objJSON = JSON.parse(JSON.stringify(data.effort_count))
    console.log("Amount of times completed today: " + objJSON)
  })
}


function findClubMembership(){
  strava.clubs.get(clubId, function(err,res){
    var objJSON = JSON.parse(JSON.stringify(res.member_count))
    return objJSON
  })
}
