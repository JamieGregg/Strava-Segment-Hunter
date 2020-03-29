//Setting up modules
const express = require('express')
const bodyParser = require('body-parser')
const fetch = require('node-fetch')
const mongoose = require('mongoose')
const schedule = require('node-schedule')
var async = require("async");
const app = express();

let segment = []
let clubId = 0;
let segmentId = 3353720;
require('dotenv').config();

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({
  extended: false
}))

mongoose.connect('mongodb://localhost:27017/segLeaderboard', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})

const segLeaderboardSchema = new mongoose.Schema({
  points: Number,
  name: String,
})

const segLeaderboard = mongoose.model("Everyone", segLeaderboardSchema)


var implClubs = [
  ['dromore', 55274],
  ['dromara', 2885],
  ['wdw', 12013],
  ['everyone', 0]
]
app.use(express.static(__dirname + '/public-updated'));

app.post('/', function(req, res) {
  loadLeaderboard(segmentId, clubIdFinder(req), true, req, res)
})

app.get('/', (req, res) => {
  //saveDataEvening(0, segmentId);
  loadLeaderboard(segmentId, clubIdFinder(req), false, req, res)
});

app.listen(8000, () => {
  console.log("server is now running")
  refreshTokensNow()
});

//Runs at 23:55 every-night
saveDataEvening(0, segmentId);

//Runs at 11 minutes past-the-hour
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
  var noOfResults = 20
  var numberOfEntry = 0;
  var segment = []
  var segmentInfo = []
  var databaseLeaderboard = []

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

        const segDromore = mongoose.model("DromoreCC", segLeaderboardSchema)
        const segWDW = mongoose.model("WDW", segLeaderboardSchema)
        const segDromara = mongoose.model("DromaraCC", segLeaderboardSchema)

        if(implClubs[0][1] == clubId){
          segDromore.find(function(err, person){
            databaseLeaderboard = person

            res.render('home', {
              data: segment,
              segmentInfo: segmentInfo,
              clubId: clubId,
              reload: reload,
              db: databaseLeaderboard
            });
          })
        }

        if(implClubs[2][1] == clubId){
          segWDW.find(function(err, person){
            databaseLeaderboard = person

            res.render('home', {
              data: segment,
              segmentInfo: segmentInfo,
              clubId: clubId,
              reload: reload,
              db: databaseLeaderboard
            });
          })
        }

        if(implClubs[1][1] == clubId){
          segDromara.find(function(err, person){
            databaseLeaderboard = person

            res.render('home', {
              data: segment,
              segmentInfo: segmentInfo,
              clubId: clubId,
              reload: reload,
              db: databaseLeaderboard
            });
          })
        }
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

        segLeaderboard.find(function(err, person){
          databaseLeaderboard = person
          res.render('home', {
            data: segment,
            segmentInfo: segmentInfo,
            clubId: clubId,
            reload: reload,
            db: databaseLeaderboard
          });
        }).sort({points : -1}).exec(function(err,docs){
          console.log(err);
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

async function populateSchema(results, club) {

  //console.log("db club is:" + club)
  if (club == implClubs[3][1]){
      for(let i = 0; i < results.length; i ++){
        var currentScore = 0;
        var currentName = results[i][0]
        const segLeaderboard = mongoose.model("Everyone", segLeaderboardSchema)

        var query = {name: currentName};
        var update = {$inc: {points: scoringSystem(i)}}
        var options = {upsert: true, 'new': true, 'useFindAndModify':true};
        segLeaderboard.update(query, update, options, function (err, doc) {
          console.log(doc); // is undefined
        });

      }//for loop
    } else if (club == implClubs[0][1]){
      for(let i = 0; i < results.length; i ++){
        var currentScore = 0;
        var currentName = results[i][0]
        const segDromore = mongoose.model("DromoreCC", segLeaderboardSchema)

        var query = {name: currentName};
        var update = {$inc: {points: scoringSystem(i)}}
        var options = {upsert: true, 'new': true, 'useFindAndModify':true};
        segDromore.update(query, update, options, function (err, doc) {
          console.log(doc); // is undefined
        });
      }//for loop
    } else if (club == implClubs[1][1]){
      for(let i = 0; i < results.length; i ++){
        var currentScore = 0;
        var currentName = results[i][0]
        const segDromara = mongoose.model("DromaraCC", segLeaderboardSchema)

        var query = {name: currentName};
        var update = {$inc: {points: scoringSystem(i)}}
        var options = {upsert: true, 'new': true, 'useFindAndModify':true};
        segDromara.update(query, update, options, function (err, doc) {
          console.log(doc); // is undefined
        });
      }//for loop
    } else if (club == implClubs[2][1]){
      for(let i = 0; i < results.length; i ++){
        var currentScore = 0;
        var currentName = results[i][0]
        const segWDW = mongoose.model("WDW", segLeaderboardSchema)

        var query = {name: currentName};
        var update = {$inc: {points: scoringSystem(i)}}
        var options = {upsert: true, 'new': true, 'useFindAndModify':true};
        segWDW.update(query, update, options, function (err, doc) {
          console.log(doc); // is undefined
        });
      }//for loop
    }//if statment
} //function

function saveDataEvening(clubId, segmentId) {
  var rule = new schedule.RecurrenceRule()
  rule.hour = 00
  rule.minute = 1
  rule.second = 5

  var j = schedule.scheduleJob(rule, function() {

    console.log("Starting the Database method.")

      var timeFrame = "today"
      var params = {"date_range": timeFrame}
      var noOfResults = 20
      var numberOfEntry = 0;
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
      for(let i = 0; i < implClubs.length; i++)
      {
        var segment = [];

        if(implClubs[i][1] != 0){
          strava.segments.leaderboard.get(segmentId, params, function(err, data) {
            total = JSON.parse(JSON.stringify(data.effort_count))
              var paramsClub = {
                "date_range": timeFrame,
                "per_page": noOfResults,
                "club_id": implClubs[i][1]
              }
              strava.segments.leaderboard.get(segmentId, paramsClub, function(err, data) {
                if(data != ""){
                  numberOfEntry = data.entries.length

                  for (let i = 0; i < numberOfEntry; i++) {
                    segment.push([data.entries[i].athlete_name, convertSecondsToMinutes(data.entries[i].elapsed_time), data.entries[i].rank])
                  }

                  //console.log(implClubs[i][0] + " " + implClubs[i][1])
                  //console.log(segment)
                  populateSchema(segment, implClubs[i][1])
                  segment.length = 0;
                }
              })
            })
          } else {
            strava.segments.leaderboard.get(segmentId, params, function(err, data) {
              total = JSON.parse(JSON.stringify(data.effort_count))
                var paramsClub = {
                  "date_range": timeFrame,
                  "per_page": noOfResults,
                }
                strava.segments.leaderboard.get(segmentId, paramsClub, function(err, data) {
                  if(data != ""){
                    numberOfEntry = data.entries.length

                    for (let i = 0; i < numberOfEntry; i++) {
                      segment.push([data.entries[i].athlete_name, convertSecondsToMinutes(data.entries[i].elapsed_time), data.entries[i].rank])
                    }
                    //console.log(implClubs[i][0] + " " + implClubs[i][1])
                    //console.log(segment)
                    populateSchema(segment, implClubs[i][1])
                    segment.length = 0;
                  }
                })
              })
          }
        } // For loop
      })
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

function scoringSystem(placing){
  switch(placing){
    case 0: return 15; break
    case 1: return 10; break
    case 2: return 8; break;
    case 3: return 6; break;
    case 4: return 4; break;
    case 5: return 2; break;
    default: return 1;
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/* async function populateSchema(results, club) {

  //console.log("db club is:" + club)
  if (club == 0){
      for(let i = 0; i < results.length; i ++){
        var currentScore = 0;
        //await sleep(1000);

        var currentName = results[i][0]
        const segLeaderboard = mongoose.model("Everyone", segLeaderboardSchema)

        //segLeaderboard.findOne({name : results[i][0]}, function(err, data){
        //  if(data == null){
              var info = new segLeaderboard({
                name: currentName,
                points: scoringSystem(i)
              }) //object

              //console.log("here: " + i)
              var upsertData = info.toObject();

              delete upsertData._id;

              segLeaderboard.update({name : currentName}, upsertData, {upsert:true}, function(err){
                console.log(err);
              })//update object
              //} else {
              //var infos = new segLeaderboard({
                //name: currentName,
                //points: (data.points + scoringSystem(i))
              //}) //object

              //console.log("here: " + i)
              //var upsertData = infos.toObject();

              //delete upsertData._id;

              //segLeaderboard.update({name : currentName}, upsertData, {upsert:true}, function(err){
                //console.log(err);
              //})//update object
          //}//end if
        //})//find FUNCTION
      }//for loop
    }//if statment
} //function
*/
