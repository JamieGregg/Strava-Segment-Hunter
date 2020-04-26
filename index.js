require('dotenv').config();
const express = require('express')
const bodyParser = require('body-parser')
const fetch = require('node-fetch')
const async = require('async')
const crypto = require ('crypto')
const mongoose = require('mongoose')
const schedule = require('node-schedule')
const nodemailer = require('nodemailer')
const session = require('express-session')
const passport = require('passport')
const User = require("./models/user")
const ClubData = require("./models/clubdata")
const resultsSchema = require("./models/results")
const segSchema = require("./models/segmentSchema")
const app = express();

app.use(express.static(__dirname + '/public-updated'));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({
  extended: false
}))

app.use(session({
  secret: process.env.HASH_KEY,
  resave: false,
  saveUninitialized: false
}))

var login = require("./routes/login"),
    register = require("./routes/register"),
    homescreen = require("./routes/home"),
    admins = require("./routes/admin"),
    savingResults = require("./routes/savingresults")

app.use(login);
app.use(register);
//app.use(homescreen);
app.use(admins);
//app.use(savingResults)

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect('mongodb+srv://' + process.env.DB_USERNAME + ':' + process.env.DB_PASSWORD + '@cluster0-tnkii.mongodb.net/segLeaderboard', {
    useNewUrlParser: true,
    useUnifiedTopology: true
  }).then(() => console.log('Connected to MongoDB...'))
  .catch(err => console.error('Could not connect to mongoDB', err))
mongoose.set('useCreateIndex', true)

passport.use(User.createStrategy())
passport.serializeUser(User.serializeUser())
passport.deserializeUser(User.deserializeUser())

let segmentId;
let timeFrame = "this_week"

app.post('/test', function(req, res) {
  loadLeaderboard('POST', segmentId, req.body.clubs, true, req.body.masters, req.body.gender, res, req)
})

app.get('/', (req, res) => {
  loadLeaderboard('GET', segmentId, 55274, false, 'false', '', res, req)
});

let port = process.env.PORT;
if (port == null || port == "") {
  port = 8000;
}
app.listen(port, () => {
  console.log("server is now running on port 8000")
  refreshTokensNow()
});

refreshTokens();
saveDataEvening();

async function loadLeaderboard(type, segmentId, clubId, reload, ageFilter, gender, res, req) {
  var params = {
    "date_range": timeFrame
  }
  var params64 = {}
  var noOfResults = 30
  var segment = []
  var segmentInfo = []
  var implClubs = []
  var databaseLeaderboard = []
  var dayOne = [];
  var dayTwo = [];
  var dayThree = [];
  var dayFour = [];
  var dayZero = [];

  if (req.body.clubs != undefined) {
    clubName = "Public"
  }

  var strava = new require("strava")({
    "client_id": process.env.CLIENT_ID,
    "access_token": process.env.ACCESS_TOKEN,
    "client_secret": process.env.CLIENT_SECRET,
    "redirect_url": "https://www.stravasegmenthunter.com/"
  });

  findSegmentCodes(clubId)

  //Gathering Club Data
  ClubData.find(async function (err, clubInfo) {
    if (err) {
      console.log(err)
    } else {
      for (let i = 0; i < clubInfo.length; i++) {
        implClubs.push([clubInfo[i].clubName, clubInfo[i].clubId, clubInfo[i].alais])
      }
    }

    SegmentData = mongoose.model(clubId + "segment", segSchema)


    //Finding upcoming segments
    SegmentData.find(async function(err, data) {
      if (err) {
        console.log(err)
      } else {
        for (let i = 0; i < 5; i++) {
          if (err) {
            console.log(err)
          } else {
            if (i == 1) {
              dayOne = [data[1].name, "https://www.strava.com/segments/" + data[1].segmentId]
            } else if (i == 2) {
              dayTwo = [data[2].name, "https://www.strava.com/segments/" + data[2].segmentId]
            } else if (i == 3) {
              dayThree = [data[3].name, "https://www.strava.com/segments/" + data[3].segmentId]
            } else if (i == 4) {
              dayFour = [data[4].name, "https://www.strava.com/segments/" + data[4].segmentId]
            }
          }
        }
      }
    }).sort({
      counterId: 1
    }).exec(function(err, docs) {
      console.log(err);
    });

    SegmentData.find(async function(err, data) {
      if (err) {
        console.log(err)
      } else {
        segmentInfo = {
          "name": data[0].name,
          "distance": data[0].distance,
          "average_grade": data[0].grade,
          "link": "https://www.strava.com/segments/" + data[0].segmentId,
          "efforts": data[0].efforts,
        }
      }
    }).sort({
      counterId: 1
    }).exec(function(err, docs) {
      console.log(err);
    }); //Upcoming Segments

    if ((ageFilter === 'false') && (gender === '')) {
      //no age no gender
      params = {
        "date_range": timeFrame,
        "per_page": noOfResults,
        "club_id": clubId
      }

     strava.segments.leaderboard.get(segmentId, params, async function(err, data) {
        numberOfEntry = data.entries.length

        for (let i = 0; i < numberOfEntry; i++) {
          segment.push([data.entries[i].athlete_name, convertSecondsToMinutes(data.entries[i].elapsed_time), data.entries[i].rank])
        }

        for (let i = 0; i < implClubs.length; i++) {
          if (clubId == implClubs[i][1]) {
            const collection = mongoose.model(implClubs[i][0], resultsSchema)
            if (type === 'POST') {
              collection.find(function(err, people) {
                databaseLeaderboard = people

                res.send({
                  data: segment,
                  segmentInfo: segmentInfo,
                  dayOne: dayOne,
                  dayTwo: dayTwo,
                  dayThree: dayThree,
                  dayFour: dayFour,
                  clubId: clubId,
                  reload: reload,
                  masters: false,
                  gender: gender,
                  db: databaseLeaderboard,
                  clubName: implClubs[i][2],
                  clubInfo: implClubs
                })
              }).sort({
                points: -1
              }).exec(function(err, docs) {
                console.log(err);
              }); //collection
            } else if (type === 'GET') {
              collection.find(function(err, people) {
                databaseLeaderboard = people

                res.render('home', {
                  data: segment,
                  segmentInfo: segmentInfo,
                  dayOne: dayOne,
                  dayTwo: dayTwo,
                  dayThree: dayThree,
                  dayFour: dayFour,
                  clubId: clubId,
                  reload: reload,
                  masters: false,
                  gender: gender,
                  db: databaseLeaderboard,
                  clubName: implClubs[i][2],
                  clubInfo: implClubs
                })
              }).sort({
                points: -1
              }).exec(function(err, docs) {
                console.log(err);
              }); //collection
            } //Type Check
          } //Club Check
        } //For
      }) //Api call
    } else if ((ageFilter === 'false') && (gender != '')) {
      //no age but gender
      params = {
        "date_range": timeFrame,
        "per_page": noOfResults,
        "club_id": clubId,
        "gender": gender
      }

      strava.segments.leaderboard.get(segmentId, params, async function(err, data) {
        numberOfEntry = data.entries.length

        for (let i = 0; i < numberOfEntry; i++) {
          segment.push([data.entries[i].athlete_name, convertSecondsToMinutes(data.entries[i].elapsed_time), data.entries[i].rank])
        }

        for (let i = 0; i < implClubs.length; i++) {
          if (clubId == implClubs[i][1]) {
            const collection = mongoose.model(implClubs[i][0] + gender, resultsSchema)
            if (type === 'POST') {
              collection.find(function(err, people) {
                databaseLeaderboard = people

                res.send({
                  data: segment,
                  segmentInfo: segmentInfo,
                  dayOne: dayOne,
                  dayTwo: dayTwo,
                  dayThree: dayThree,
                  dayFour: dayFour,
                  clubId: clubId,
                  reload: reload,
                  masters: false,
                  gender: gender,
                  db: databaseLeaderboard,
                  clubName: implClubs[i][2],
                  clubInfo: implClubs
                })
              }).sort({
                points: -1
              }).exec(function(err, docs) {
                console.log(err);
              }); //collection
            } else if (type === 'GET') {
              collection.find(function(err, people) {
                databaseLeaderboard = people

                res.render('home', {
                  data: segment,
                  segmentInfo: segmentInfo,
                  dayOne: dayOne,
                  dayTwo: dayTwo,
                  dayThree: dayThree,
                  dayFour: dayFour,
                  clubId: clubId,
                  reload: reload,
                  masters: false,
                  gender: gender,
                  db: databaseLeaderboard,
                  clubName: implClubs[i][2],
                  clubInfo: implClubs
                })
              }).sort({
                points: -1
              }).exec(function(err, docs) {
                console.log(err);
              }); //collection
            } //Type Check
          } //Club Check
        } //For
      }) //Api call
    } else if ((ageFilter === 'true') && (gender === '')) {
      //age but no gender
      params = {
        "date_range": timeFrame,
        "per_page": noOfResults,
        "club_id": clubId,
        "age_group": "45_54"
      }

      params64 = {
        "date_range": timeFrame,
        "per_page": noOfResults,
        "club_id": clubId,
        "age_group": "55_64"
      }

      strava.segments.leaderboard.get(segmentId, params, async function(err, data) {
        numberOfEntry = data.entries.length

        for (let i = 0; i < numberOfEntry; i++) {
          segment.push([data.entries[i].athlete_name, data.entries[i].elapsed_time, data.entries[i].rank])
        }

        strava.segments.leaderboard.get(segmentId, params64, async function(err, data) {
          numberOfEntry = data.entries.length

          for (let i = 0; i < numberOfEntry; i++) {
            segment.push([data.entries[i].athlete_name, data.entries[i].elapsed_time, data.entries[i].rank])
          }

          segment.sort(sortFunctionClub);
          for(let i = 0; i < segment.length; i++){
            segment[i][2] = i + 1
            segment[i][1] = convertSecondsToMinutes(segment[i][1])
          }

          for (let i = 0; i < implClubs.length; i++) {
            if (clubId == implClubs[i][1]) {
              const collection = mongoose.model(implClubs[i][0] + "master", resultsSchema)
              if (type === 'POST') {
                collection.find(function(err, people) {
                  databaseLeaderboard = people

                  res.send({
                    data: segment,
                    segmentInfo: segmentInfo,
                    dayOne: dayOne,
                    dayTwo: dayTwo,
                    dayThree: dayThree,
                    dayFour: dayFour,
                    clubId: clubId,
                    reload: reload,
                    masters: false,
                    gender: gender,
                    db: databaseLeaderboard,
                    clubName: implClubs[i][2],
                    clubInfo: implClubs
                  })
                }).sort({
                  points: -1
                }).exec(function(err, docs) {
                  console.log(err);
                }); //collection
              } else if (type === 'GET') {
                collection.find(function(err, people) {
                  databaseLeaderboard = people

                  res.render('home', {
                    data: segment,
                    segmentInfo: segmentInfo,
                    dayOne: dayOne,
                    dayTwo: dayTwo,
                    dayThree: dayThree,
                    dayFour: dayFour,
                    clubId: clubId,
                    reload: reload,
                    masters: false,
                    gender: gender,
                    db: databaseLeaderboard,
                    clubName: implClubs[i][2],
                    clubInfo: implClubs
                  })
                }).sort({
                  points: -1
                }).exec(function(err, docs) {
                  console.log(err);
                }); //collection
              } //Type Check
            } //Club Check
          } //For
        }) //Api call 54
      }) //Api call 64
    } else if ((ageFilter === 'true') && (gender != '')) {
      //age and gender
      //age but no gender
      params = {
        "date_range": timeFrame,
        "per_page": noOfResults,
        "club_id": clubId,
        "age_group": "45_54",
        "gender": gender
      }

      params64 = {
        "date_range": timeFrame,
        "per_page": noOfResults,
        "club_id": clubId,
        "age_group": "55_64",
        "gender": gender
      }

      strava.segments.leaderboard.get(segmentId, params, async function(err, data) {
        numberOfEntry = data.entries.length

        for (let i = 0; i < numberOfEntry; i++) {
          segment.push([data.entries[i].athlete_name, data.entries[i].elapsed_time, data.entries[i].rank])
        }

        strava.segments.leaderboard.get(segmentId, params64, async function(err, data) {
          numberOfEntry = data.entries.length

          for (let i = 0; i < numberOfEntry; i++) {
            segment.push([data.entries[i].athlete_name, data.entries[i].elapsed_time, data.entries[i].rank])
          }

          segment.sort(sortFunctionClub);
          for(let i = 0; i < segment.length; i++){
            segment[i][2] = i + 1
            segment[i][1] = convertSecondsToMinutes(segment[i][1])
          }

          for (let i = 0; i < implClubs.length; i++) {
            if (clubId == implClubs[i][1]) {
              const collection = mongoose.model(implClubs[i][0] + "master" + gender, resultsSchema)
              if (type === 'POST') {
                collection.find(function(err, people) {
                  databaseLeaderboard = people

                  res.send({
                    data: segment,
                    segmentInfo: segmentInfo,
                    dayOne: dayOne,
                    dayTwo: dayTwo,
                    dayThree: dayThree,
                    dayFour: dayFour,
                    clubId: clubId,
                    reload: reload,
                    masters: false,
                    gender: gender,
                    db: databaseLeaderboard,
                    clubName: implClubs[i][2],
                    clubInfo: implClubs
                  })
                }).sort({
                  points: -1
                }).exec(function(err, docs) {
                  console.log(err);
                }); //collection
              } else if (type === 'GET') {
                collection.find(function(err, people) {
                  databaseLeaderboard = people

                  res.render('home', {
                    data: segment,
                    segmentInfo: segmentInfo,
                    dayOne: dayOne,
                    dayTwo: dayTwo,
                    dayThree: dayThree,
                    dayFour: dayFour,
                    clubId: clubId,
                    reload: reload,
                    masters: false,
                    gender: gender,
                    db: databaseLeaderboard,
                    clubName: implClubs[i][2],
                    clubInfo: implClubs
                  })
                }).sort({
                  points: -1
                }).exec(function(err, docs) {
                  console.log(err);
                }); //collection
              } //Type Check
            } //Club Check
          } //For
        }) //Api call 54
      }) // Api call 64
    } //over looking if
  }) //club data
} // function

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
function populateSchema(results, club, clubName) {
  var implClubs = []
  var rank = 0;
  var lastTime = -1;

  for (let z = 0; z < results.length; z++) {
    var currentName = results[z][0]

    if(results[z][1] != lastTime) {
      rank++
      lastTime = results[z][1]
    }

    var query = {
      name: currentName
    };
    var update = {
      $inc: {
        points: scoringSystem(rank)
      }
    }
    var options = {
      upsert: true,
      'new': true,
      'useFindAndModify': true
    };

    const collection = mongoose.model(clubName, resultsSchema)
    collection.update(query, update, options, function(err, doc) {
      console.log(doc);
    });
  }
}

function saveDataEvening() {
  var rule = new schedule.RecurrenceRule()
  rule.dayOfWeek = 0
  rule.hour = 23
  rule.minute = 55
  rule.second = 35

  var j = schedule.scheduleJob(rule, function() {
    var strava = new require("strava")({
      "client_id": process.env.CLIENT_ID,
      "access_token": process.env.ACCESS_TOKEN,
      "client_secret": process.env.CLIENT_SECRET,
      "redirect_url": "https://www.stravasegmenthunter.com/"
    });

    findSegmentCodes()

    var params = {
      "date_range": timeFrame
    }
    var noOfResults = 100
    var gender = ["F", "M"]
    var implClubs = []
    var segment = []
    var results = [];

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

    //Gathering Club Data
    ClubData.find(async function (err, clubInfo) {
      if (err) {
        console.log(err)
      } else {
        for (let i = 0; i < clubInfo.length; i++) {
          implClubs.push([clubInfo[i].clubName, clubInfo[i].clubId, clubInfo[i]])
        }
      }

      //Loop each club
      for (let i = 0; i < implClubs.length; i++) {
        segment.length = 0;

        //"EVERYONE" no filter on anything
        var params = {
          "date_range": timeFrame,
          "per_page": noOfResults,
          "club_id": implClubs[i][1]
        }
        try {
          strava.segments.leaderboard.get(segmentId, params, async function(err, data) {
            if (data != "") {
              numberOfEntry = await data.entries.length

              for (let z = 0; z < numberOfEntry; z++) {
                segment.push([data.entries[z].athlete_name, convertSecondsToMinutes(data.entries[z].elapsed_time), data.entries[z].rank])
              }

              populateSchema(segment, implClubs[i][1], implClubs[i][0])
              segment.length = 0;
            } //If statment
          }) //API Call
        } catch (err) {
          console.log(err)
        }

        //"EVERYONE" With Gender Filter Applied
        for (let y = 0; y < 2; y++) {
          var params = {
            "date_range": timeFrame,
            "per_page": noOfResults,
            "club_id": implClubs[i][1],
            "gender": gender[y]
          }

          try {
            strava.segments.leaderboard.get(segmentId, params, async function(err, data) {
              console.log(gender[y])
              console.log(data)
              if (data != "") {
                numberOfEntry = await data.entries.length

                for (let z = 0; z < numberOfEntry; z++) {
                  segment.push([data.entries[z].athlete_name, convertSecondsToMinutes(data.entries[z].elapsed_time), data.entries[z].rank])
                }

                populateSchema(segment, implClubs[i][1], implClubs[i][0] + gender[y])
                segment.length = 0;
              }
            })
          } catch {
            console.log(err)
          }
        }

        //Masters EVERYONE
        var resultMaster = []
        var paramsMaster54 = {
          "date_range": timeFrame,
          "per_page": 100,
          "club_id": implClubs[i][1],
          "age_group": "45_54",
        }

        var paramsMaster64 = {
          "date_range": timeFrame,
          "per_page": 100,
          "club_id": implClubs[i][1],
          "age_group": "55_64",
        }
        strava.segments.leaderboard.get(segmentId, paramsMaster54, function(err, data) {
          try {
            if (data.statusCode != 404 && data.entries != "") {
              for (let i = 0; i < data.entries.length; i++) {
                resultMaster.push([data.entries[i].athlete_name, data.entries[i].elapsed_time, data.entries[i].rank])
              }
            }

            strava.segments.leaderboard.get(segmentId, paramsMaster64, function(err, data) {
              if (data.statusCode != 404 && data.entries != "") {
                for (let i = 0; i < data.entries.length; i++) {
                  resultMaster.push([data.entries[i].athlete_name, data.entries[i].elapsed_time, data.entries[i].rank])
                }
              }

              if (resultMaster.length != 0) {
                resultMaster.sort(sortFunctionClub)
                populateSchema(resultMaster, implClubs[i][1], implClubs[i][0] + "Master")
                results.length = 0;
              }
            })
          } catch (err) {
            console.log(err)
          }
        })

        //Masters and Gender filter Applied
        results.length = 0;
        var resultMasterM = []
        var paramsMasterM542 = {
          "date_range": timeFrame,
          "per_page": 100,
          "club_id": implClubs[i][1],
          "age_group": "45_54",
          "gender": "M"
        }

        var paramsMasterM642 = {
          "date_range": timeFrame,
          "per_page": 100,
          "club_id": implClubs[i][1],
          "age_group": "55_64",
          "gender": "M"
        }

        strava.segments.leaderboard.get(segmentId, paramsMasterM542, function(err, data) {
          try {
            if (data.statusCode != 404 && data.entries != "") {
              for (let i = 0; i < data.entries.length; i++) {
                resultMasterM.push([data.entries[i].athlete_name, data.entries[i].elapsed_time, data.entries[i].rank])
              }
            }

            strava.segments.leaderboard.get(segmentId, paramsMasterM642, function(err, data) {
              if (data.statusCode != 404) {
                for (let i = 0; i < data.entries.length; i++) {
                  resultMasterM.push([data.entries[i].athlete_name, data.entries[i].elapsed_time, data.entries[i].rank])
                }
              }

              if (resultMasterM.length != 0) {
                resultMasterM.sort(sortFunctionClub)
                populateSchema(resultMasterM, implClubs[i][1], implClubs[i][0] + "MasterM")
              }
            })
          } catch (err) {
            console.log(err)
          }
        })

        results.length = 0;

        var resultMasterF = []
        var paramsMaster54F = {
          "date_range": timeFrame,
          "per_page": 100,
          "club_id": implClubs[i][1],
          "age_group": "45_54",
          "gender": "F"
        }

        var paramsMaster64F = {
          "date_range": timeFrame,
          "per_page": 100,
          "club_id": implClubs[i][1],
          "age_group": "55_64",
          "gender": "F"
        }

        strava.segments.leaderboard.get(segmentId, paramsMaster54F, function(err, data) {
          try {
            if (data.statusCode != 404 && data.entries != "") {
              for (let i = 0; i < data.entries.length; i++) {
                resultMasterF.push([data.entries[i].athlete_name, data.entries[i].elapsed_time, data.entries[i].rank])
              }
            }
            strava.segments.leaderboard.get(segmentId, paramsMaster64F, function(err, data) {
              if (data.statusCode != 404) {
                for (let i = 0; i < data.entries.length; i++) {
                  resultMasterF.push([data.entries[i].athlete_name, data.entries[i].elapsed_time, data.entries[i].rank])
                }
              }

              if (results.length != 0) {
                resultMasterF.sort(sortFunctionClub)
                populateSchema(resultMasterF, implClubs[i][1], implClubs[i][0] + "MasterF")
                results.length = 0;
              }
            })
          } catch (err) {
            console.log(err)
          }
        })
      }
    })

    
   
    //findSegmentCodes();
  }) //Timing Method
}

//DATA CONVERSION
function convertingMetersToMiles(meters) {
  return (meters * 0.000621371).toFixed(2) + " miles"
}

function convertSecondsToMinutes(seconds) {
  var minutes = Math.floor(seconds / 60);
  var seconds = ((seconds % 60) / 100).toFixed(2);
  return minutes + ":" + seconds.slice(-2);
}

//DATA HANDLING
function scoringSystem(placing) {
  switch (placing) {
    case 1:
      return 20;
      break
    case 2:
      return 16;
      break
    case 3:
      return 14;
      break;
    case 4:
      return 12;
      break;
    case 5:
      return 10;
      break;
    case 6:
      return 8;
      break;
    case 7:
      return 6;
      break;
    case 8:
      return 4;
      break;
    case 9:
      return 2;
      break;
    default:
      return 1;
  }
}

function findSegmentCodes(clubId) {
  const SegmentInfo = mongoose.model(clubId + "segment", segSchema)

  SegmentInfo.find(function(err, data) {
    if (err) {
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

function deleteUsedSegment(clubId) {

  SegmentInfor = mongoose.model(clubId + "segment", segSchema)

  var smallestSegmentId = 0;
  SegmentInfor.find(function (err, data) {
    if (err) {
      console.log(err)
    } else {
      smallestSegmentId = data[0].segmentId

      SegmentData.deleteMany({
          segmentId: {
            $in: [
              smallestSegmentId
            ]
          }
        },
        function(err, results) {
          if (err) {
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

function sortFunctionClub(a, b) {
  if (a[1] === b[1]) {
    return 0;
  } else {
    return (a[1] < b[1]) ? -1 : 1;
  }
}

function emailResults(club, results) {
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

  transport.sendMail(mailOptions, function(error, info) {
    if (error) {
      console.log(error);
    } else {
      console.log('Email sent: ' + info.response);
    }
  });
}

function emailNewSegment(segmentId) {
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

  transport.sendMail(mailOptions, function(error, info) {
    if (error) {
      console.log(error);
    } else {
      console.log('Email sent: ' + info.response);
    }
  });
}









