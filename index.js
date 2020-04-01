require('dotenv').config();
const express = require('express')
const bodyParser = require('body-parser')
const fetch = require('node-fetch')
const mongoose = require('mongoose')
const schedule = require('node-schedule')
const nodemailer = require('nodemailer')
const app = express();

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended: false}))

mongoose.connect('mongodb+srv://admin-jamie:' + process.env.DB_PASSWORD + '@cluster0-tnkii.mongodb.net/segLeaderboard', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then (()=> console.log('Connected to MongoDB...'))
  .catch(err => console.error('Could not connect to mongoDB', err));

const segLeaderboardSchema = new mongoose.Schema({
  points: Number,
  name: String,
})

const segCodeSchema = new mongoose.Schema({
  counterId: Number,
  segmentId: Number
})

const segLeaderboard = mongoose.model("Everyone", segLeaderboardSchema)
const segDromore = mongoose.model("DromoreCC", segLeaderboardSchema)
const segWDW = mongoose.model("WDW", segLeaderboardSchema)
const segDromara = mongoose.model("DromaraCC", segLeaderboardSchema)
const segmentCodes = mongoose.model("Segment", segCodeSchema)

var implClubs = [
  ['dromore', 55274],
  ['dromara', 2885],
  ['wdw', 12013],
  ['everyone', 0]
]

let segment = []
let clubId = 0
let segmentId;
let timeFrame = "today"
let clubName = "Public"

app.use(express.static(__dirname + '/public-updated'));

app.post('/', function(req, res) {
  loadLeaderboard(segmentId, clubIdFinder(req), true, req, res)
})

app.get('/', (req, res) => {
  loadLeaderboard(segmentId, clubIdFinder(req), false, req, res)
});

let port = process.env.PORT;
if (port == null || port == ""){
  port = 8000;
}
app.listen(port, () => {
  console.log("server is now running on port 8000")
  refreshTokensNow()
  findSegmentCodes()
});

saveDataEvening();
refreshTokens();

//SEGMENT FUNCTIONS
//Finding the information on any segment
function loadLeaderboard(segmentId, clubId, reload, req, res) {
  var segmentId = segmentId;
  var clubId = clubId;
  var params = {
    "date_range": timeFrame
  }
  var noOfResults = 20
  var numberOfEntry = 0;
  var segment = []
  var segmentInfo = []
  var tomorrowsSegmentInfo = []
  var databaseLeaderboard = []
  var dayOne =[];
  var dayTwo =[];
  var dayThree = [];
  var dayFour = [];

  if(req.body.clubs != undefined){
    clubName = req.body.clubs
  } else {
    clubName = "Public"
  }

  var strava = new require("strava")({
    "client_id": process.env.CLIENT_ID,
    "access_token": process.env.ACCESS_TOKEN,
    "client_secret": process.env.CLIENT_SECRET,
    "redirect_url": "https://www.stravasegmenthunter.com/"
  });

  findSegmentCodes()

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

  segmentCodes.find(function(err, data){
    if(err){
      console.log(err)
    } else {
      for(let i = 1; i < 5; i ++) {
        strava.segments.get(data[i].segmentId, function(err, data) {
          if(i == 1){
            dayOne = [data.name, "https://www.strava.com/segments/" + data.id]
          } else if (i == 2){
            dayTwo = [data.name, "https://www.strava.com/segments/" + data.id]
          } else if (i == 3){
            dayThree = [data.name, "https://www.strava.com/segments/" + data.id]
          } else if (i == 4){
            dayFour = [data.name, "https://www.strava.com/segments/" + data.id]
          }
        })
      }
    }
  }).sort({
    counterId: 1
  }).exec(function(err, docs) {
    console.log(err);
  });

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

        if (implClubs[0][1] == clubId) {
          segDromore.find(function(err, person) {
            databaseLeaderboard = person

            res.render('home', {
              data: segment,
              segmentInfo: segmentInfo,
              dayOne: dayOne,
              dayTwo: dayTwo,
              dayThree: dayThree,
              dayFour: dayFour,
              clubId: clubId,
              reload: reload,
              db: databaseLeaderboard,
              clubName: clubName
            });
          }).sort({
            points: -1
          }).exec(function(err, docs) {
            console.log(err);
          });
        }

        if (implClubs[2][1] == clubId) {
          segWDW.find(function(err, person) {
            databaseLeaderboard = person

            res.render('home', {
              data: segment,
              segmentInfo: segmentInfo,
              dayOne: dayOne,
              dayTwo: dayTwo,
              dayThree: dayThree,
              dayFour: dayFour,
              clubId: clubId,
              reload: reload,
              db: databaseLeaderboard,
              clubName: clubName
            });
          }).sort({
            points: -1
          }).exec(function(err, docs) {
            console.log(err);
          });
        }

        if (implClubs[1][1] == clubId) {
          segDromara.find(function(err, person) {
            databaseLeaderboard = person

            res.render('home', {
              data: segment,
              segmentInfo: segmentInfo,
              dayOne: dayOne,
              dayTwo: dayTwo,
              dayThree: dayThree,
              dayFour: dayFour,
              clubId: clubId,
              reload: reload,
              db: databaseLeaderboard,
              clubName: clubName
            });
          }).sort({
            points: -1
          }).exec(function(err, docs) {
            console.log(err);
          });
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

        segLeaderboard.find(function(err, person) {
          databaseLeaderboard = person
          res.render('home', {
            data: segment,
            segmentInfo: segmentInfo,
            dayOne: dayOne,
            dayTwo: dayTwo,
            dayThree: dayThree,
            dayFour: dayFour,
            clubId: clubId,
            reload: reload,
            db: databaseLeaderboard,
            clubName: clubName
          });
        }).sort({
          points: -1
        }).exec(function(err, docs) {
          console.log(err);
        });
      })
    }
  })
}

//TOKEN REFRESH FUNCTIONS
function refreshTokens() {
  var rule = new schedule.RecurrenceRule()
  rule.minute = 05
  var j = schedule.scheduleJob(rule, function() {
    console.log("Automatic Token Refresh Complete")

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
}


//DATABASE FUNCTIONS
function populateSchema(results, club) {
  let transport = nodemailer.createTransport({
    host: 'smtp.mailtrap.io',
    port: 2525,
    auth: {
       user: process.env.MAIL_USER,
       pass: process.env.MAIL_PASS
    }
  });

  var mailOptions = {
    from: 'segment@stravasegmenthunter.com',
    to: process.env.EMAIL_ADDRESS,
    subject: 'Results for ' + club,
    text: 'Results are as follows: ' + results
  }

  transport.sendMail(mailOptions, function(error, info){
    if (error) {
      console.log(error);
    } else {
      console.log('Email sent: ' + info.response);
    }
  });

  if (club == implClubs[3][1]) {
    for (let i = 0; i < results.length; i++) {
      var currentName = results[i][0]
      var query = {
        name: currentName
      };
      var update = {
        $inc: {
          points: scoringSystem(i)
        }
      }
      var options = {
        upsert: true,
        'new': true,
        'useFindAndModify': true
      };
      segLeaderboard.update(query, update, options, function(err, doc) {
        console.log(doc);
      });

    }
  } else if (club == implClubs[0][1]) {
    for (let i = 0; i < results.length; i++) {
      var currentName = results[i][0]
      var query = {
        name: currentName
      };
      var update = {
        $inc: {
          points: scoringSystem(i)
        }
      }
      var options = {
        upsert: true,
        'new': true,
        'useFindAndModify': true
      };
      segDromore.update(query, update, options, function(err, doc) {
        console.log(doc);
      });
    }
  } else if (club == implClubs[1][1]) {
    for (let i = 0; i < results.length; i++) {
      var currentName = results[i][0]
      var query = {
        name: currentName
      };
      var update = {
        $inc: {
          points: scoringSystem(i)
        }
      }
      var options = {
        upsert: true,
        'new': true,
        'useFindAndModify': true
      };
      segDromara.update(query, update, options, function(err, doc) {
        console.log(doc);
      });
    }
  } else if (club == implClubs[2][1]) {
    for (let i = 0; i < results.length; i++) {
      var currentName = results[i][0]
      var query = {
        name: currentName
      };
      var update = {
        $inc: {
          points: scoringSystem(i)
        }
      }
      var options = {
        upsert: true,
        'new': true,
        'useFindAndModify': true
      };
      segWDW.update(query, update, options, function(err, doc) {
        console.log(doc);
      });
    }
  }
}

function saveDataEvening() {
  var rule = new schedule.RecurrenceRule()
  rule.hour = 00
  rule.minute = 07
  rule.second = 30


  var j = schedule.scheduleJob(rule, function() {
    findSegmentCodes()
    var params = {
      "date_range": timeFrame
    }
    var noOfResults = 20
    var numberOfEntry = 0;
    var segmentInfo = []

    var strava = new require("strava")({
      "client_id": process.env.CLIENT_ID,
      "access_token": process.env.ACCESS_TOKEN,
      "client_secret": process.env.CLIENT_SECRET,
      "redirect_url": "https://www.stravasegmenthunter.com/"
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
    for (let i = 0; i < implClubs.length; i++) {
      var segment = [];

      if (implClubs[i][1] != 0) {
        strava.segments.leaderboard.get(segmentId, params, function(err, data) {
            total = JSON.parse(JSON.stringify(data.effort_count))
            var paramsClub = {
              "date_range": timeFrame,
              "per_page": noOfResults,
              "club_id": implClubs[i][1]
            }
            strava.segments.leaderboard.get(segmentId, paramsClub, function(err, data) {
              if (data != "") {
                numberOfEntry = data.entries.length

                for (let i = 0; i < numberOfEntry; i++) {
                  segment.push([data.entries[i].athlete_name, convertSecondsToMinutes(data.entries[i].elapsed_time), data.entries[i].rank])
                }
                populateSchema(segment, implClubs[i][1])
                segment.length = 0;
              }
            })
        })
      } else {
        strava.segments.leaderboard.get(segmentId, params, function(err, data) {
          if (data != "") {
            total = JSON.parse(JSON.stringify(data.effort_count))
            var paramsClub = {
              "date_range": timeFrame,
              "per_page": noOfResults,
            }
            strava.segments.leaderboard.get(segmentId, paramsClub, function(err, data) {
              if (data != "") {
                numberOfEntry = data.entries.length

                for (let i = 0; i < numberOfEntry; i++) {
                  segment.push([data.entries[i].athlete_name, convertSecondsToMinutes(data.entries[i].elapsed_time), data.entries[i].rank])
                }
                populateSchema(segment, implClubs[i][1])
                segment.length = 0;
              }
            })
          }
        })
      }
    }
    deleteUsedSegment();
    findSegmentCodes()

    let transport = nodemailer.createTransport({
      host: 'smtp.mailtrap.io',
      port: 2525,
      auth: {
         user: process.env.MAIL_USER,
         pass: process.env.MAIL_PASS
      }
    });

    var mailOptions = {
      from: 'segment@stravasegmenthunter.com',
      to: process.env.EMAIL_ADDRESS,
      subject: 'Segment Refresh',
      text: 'Todays segment has been updated to https://www.strava.com/segments/' + segmentId
    }

    transport.sendMail(mailOptions, function(error, info){
      if (error) {
        console.log(error);
      } else {
        console.log('Email sent: ' + info.response);
      }
    });
    //}
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
    case 'Dromore':
      clubId = 55274;
      break;
    case 'Dromara':
      clubId = 2885;
      break;
    case 'WDW':
      clubId = 12013;
      break;
    case 'Public':
      clubId = 0;
      break;
  }
  return clubId
}

function scoringSystem(placing) {
  switch (placing) {
    case 0:
      return 15;
      break
    case 1:
      return 10;
      break
    case 2:
      return 8;
      break;
    case 3:
      return 6;
      break;
    case 4:
      return 4;
      break;
    case 5:
      return 2;
      break;
    default:
      return 1;
  }
}

function findSegmentCodes(){

  segmentCodes.find(function(err, data){
    if(err){
      console.log(err)
    } else {
      //returning segment id of smallest reocord
      segmentId = data[0].segmentId
    }
  }).sort({
    counterId: 1
  }).exec(function(err, docs) {
    console.log(err);
  });
}

function deleteUsedSegment(){
  var smallestSegmentId = 0;
  segmentCodes.find(function(err, data){
    if(err){
      console.log(err)
    } else {
      smallestSegmentId = data[0].segmentId

      segmentCodes.deleteMany(
        {
          segmentId:{
            $in: [
              smallestSegmentId
            ]
          }
        },
        function(err, results){
         if(err){
           console.log(err)
         } else {
           console.log(results)
         }
      })
    }
  }).sort({
    counterId: 1
  }).exec(function(err, docs) {
    console.log(err);
  });
}
