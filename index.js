require('dotenv').config();
const express = require('express')
const bodyParser = require('body-parser')
const fetch = require('node-fetch')
const mongoose = require('mongoose')
const schedule = require('node-schedule')
const session = require('express-session')
const passport = require('passport')
const User = require("./models/user")
const ClubData = require("./models/clubdata")
const resultsSchema = require("./models/results")
const segSchema = require("./models/segmentSchema")
const segBacklogSchema = require("./models/segBacklogSchema")
var nodemailer = require("nodemailer");
const app = express();

app.use(express.static(__dirname + '/public-updated'));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({
  extended: false
}))

app.enable("trust proxy");
app.use(function (req, res, next) {
  if (req.secure) {
    next();
  } else {
    res.redirect('https://' + req.headers.host + req.url);
  }
});

app.use(session({
  secret: process.env.HASH_KEY,
  resave: false,
  saveUninitialized: false
}))

var login = require("./routes/login"),
    register = require("./routes/register"),
    loadLeaderboard = require("./routes/loadleaderboard"),
    admins = require("./routes/admin"),
    deleteRecords = require("./routes/deleteRecords"),
    checkCard = require("./routes/billing/checkCard"),
    listPlans = require("./routes/billing/listPlans")

app.use(login);
app.use(register);
app.use(loadLeaderboard);
app.use(admins);
app.use(deleteRecords)
app.use(checkCard)
app.use(listPlans)
app.use(passport.initialize());
app.use(passport.session());

mongoose.connect('mongodb+srv://' + process.env.DB_USERNAME + ':' + process.env.DB_PASSWORD + '@cluster0-tnkii.mongodb.net/' + process.env.DB_NAME, {
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

let port = process.env.PORT;
if (port == null || port == "") {
  port = 8000;
}

app.listen(port, () => {
  console.log("server is now running on port 8000")
  refreshTokensNow()
});

app.get('/FAQ', function (req, res) {
  if (req.isAuthenticated(req, res)) {
    res.render('FAQ', {
      isAuthenticated: true
    })
  } else {
    res.render('FAQ', {
      isAuthenticated: false
    })
  }
})

refreshTokens();
saveDataEvening();

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
function populateSchema(results, clubName) {
  var rank = 0;
  var lastTime = -1;

  //Clearing lastweeks points
  const collection = mongoose.model(clubName, resultsSchema)
  collection.find(function (err, people) {
    for(let i = 0; i < people.length; i++){
      var query = {
        name: people[i].name
      };
      var update = {
        lastweek: 0
      }
      var options = {
        upsert: true,
        'new': true,
        'useFindAndModify': true
      };
      collection.update(query, update, options, function (err, doc) {
      });
    }
  })

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
      }, 
      lastweek: scoringSystem(rank)
    }
    var options = {
      upsert: true,
      'new': true,
      'useFindAndModify': true
    };

    const collection = mongoose.model(clubName, resultsSchema)
    collection.update(query, update, options, function(err, doc) {
      if ( err ){
        console.log(err);
      } 
    });
  }
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
    case 2:
      return 16;
    case 3:
      return 14;
    case 4:
      return 12;
    case 5:
      return 10;
    case 6:
      return 8;
    case 7:
      return 6;
    case 8:
      return 4;
    case 9:
      return 2;
    default:
      return 1;
  }
}

async function findSegmentCodes(clubId) {
  const SegmentInfo = mongoose.model(clubId + "segment", segSchema)

  SegmentInfo.find(function(err, data) {
    if (err) {
      console.log(err)
    } else {
      try{
        segmentId = data[0].segmentId
        console.log(segmentId)
      } catch {
        segmentId = -1
      }
    }
  }).sort({
    counterId: 1
  }).exec(function(err, docs) {
    console.log(err);
  });
}

function deleteUsedSegment(clubId) {
  var currentDate = new Date();
  const SegmentInfor = mongoose.model(clubId + "segment", segSchema)
  const SegmentBacklog = mongoose.model(clubId + "segmentBacklog", segBacklogSchema)

  SegmentInfor.find(function (err, obj) {
    if (obj.length > 0 ){
      var outdatedSegment = new SegmentBacklog({
        segmentId: obj[0].segmentId,
        name: obj[0].name,
        dateDeleted: currentDate
      });

      // save model to database
      outdatedSegment.save(function (err, segment) {
      if (err) return console.error(err);
      console.log(segment.name + " saved to database collection.");
      });
    }
  }).sort({
    counterId: 1
  }).exec(function (err, docs) {
    console.log(err);
  });
    
  var smallestSegmentId = 0;
  SegmentInfor.find(function (err, data) {
    if( data.length > 0 ) {
      if (err) {
        console.log(err)
      } else {
        smallestSegmentId = data[0].segmentId

        SegmentInfor.deleteOne({
            segmentId: {
              $in: [
                smallestSegmentId
              ]
            }
          },
          function (err, results) {
            if (err) {
              console.log(err)
            } else {
              console.log(results)
            }
          })
      }
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

function backdatedData(data, clubId) {
  var datetime = new Date();
  var smtpTransport = nodemailer.createTransport({
    pool: true,
    host: "smtpout.secureserver.net",
    secure: true,
    secureConnection: false, // TLS requires secureConnection to be false
    tls: {
      ciphers: 'SSLv3'
    },
    requireTLS: true,
    port: 465,
    debug: true,
    auth: {
      user: 'contact@stravasegmenthunter.com',
      pass: process.env.EMAIL_PASSWORD
    }
  });
  var mailOptions = {
    to: 'stravaresults@gmail.com',
    from: 'contact@stravasegmenthunter.com',
    subject: clubId + ' Leaderboard on ' + datetime,
    html: '<div><table><thead><tr><th>Rank</th><th>Name</th><th>Time</th></tr></thead><tbody>' + data + '</tbody></table></div>'
  };
  smtpTransport.sendMail(mailOptions, function (err) {
    if ( err ){
      console.log(err);
    } else {
      console.log('mail sent');
    }
    
  });
}

function saveData(time){
  var strava = new require("strava")({
    "client_id": process.env.CLIENT_ID,
    "access_token": process.env.ACCESS_TOKEN,
    "client_secret": process.env.CLIENT_SECRET,
    "redirect_url": "https://www.stravasegmenthunter.com/"
  });

  var noOfResults = 100
  var gender = ["F", "M"]
  var implClubs = []
  var segment = []
  var results = [];


  //Gathering Club Data
  ClubData.find({timezone : time}, async function (err, clubInfo) {
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

    findSegmentCodes(implClubs[i][1])
    await new Promise(resolve => setTimeout(resolve, 5000));

    try {
      strava.segments.get(segmentId, function (err, data) {
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

      //"EVERYONE" no filter on anything
      var params = {
        "date_range": timeFrame,
        "per_page": noOfResults,
        "club_id": implClubs[i][1]
      }
      try {
        strava.segments.leaderboard.get(segmentId, params, async function (err, data) {
          if (data != "") {
            numberOfEntry = await data.entries.length

            for (let z = 0; z < numberOfEntry; z++) {
              segment.push([data.entries[z].athlete_name, convertSecondsToMinutes(data.entries[z].elapsed_time), data.entries[z].rank])
            }
            populateSchema(segment, implClubs[i][1] + "s")

            var content = segment.reduce(function (a, b) {
              return a + '<tr><td>' + b[2] + '</a></td><td>' + b[0] + '</td><td>' + b[1] + '</td></tr>';
            }, '');

            backdatedData(content, implClubs[i][1] + " Everyone")
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
          strava.segments.leaderboard.get(segmentId, params, async function (err, data) {
            console.log(gender[y])
            console.log(data)
            if (data != "") {
              numberOfEntry = await data.entries.length

              for (let z = 0; z < numberOfEntry; z++) {
                segment.push([data.entries[z].athlete_name, convertSecondsToMinutes(data.entries[z].elapsed_time), data.entries[z].rank])
              }

              populateSchema(segment, implClubs[i][1] + gender[y] + "s")

              var content = segment.reduce(function (a, b) {
                return a + '<tr><td>' + b[2] + '</a></td><td>' + b[0] + '</td><td>' + b[1] + '</td></tr>';
              }, '');

              backdatedData(content, implClubs[i][1] + " Gender: " + gender[y])

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
      strava.segments.leaderboard.get(segmentId, paramsMaster54, function (err, data) {
        try {
          if (data.statusCode != 404 && data.entries != "") {
            for (let i = 0; i < data.entries.length; i++) {
              resultMaster.push([data.entries[i].athlete_name, data.entries[i].elapsed_time, data.entries[i].rank])
            }
          }

          strava.segments.leaderboard.get(segmentId, paramsMaster64, function (err, data) {
            if (data.statusCode != 404 && data.entries != "") {
              for (let i = 0; i < data.entries.length; i++) {
                resultMaster.push([data.entries[i].athlete_name, data.entries[i].elapsed_time, data.entries[i].rank])
              }
            }

            if (resultMaster.length != 0) {
              resultMaster.sort(sortFunctionClub)
              populateSchema(resultMaster, implClubs[i][1] + "Masters")

              var content = resultMaster.reduce(function (a, b) {
                return a + '<tr><td>' + b[2] + '</a></td><td>' + b[0] + '</td><td>' + b[1] + '</td></tr>';
              }, '');

              backdatedData(content, implClubs[i][1] + " Master")
              results.length = 0;
            }
          })
        } catch (err) {
          console.log(err)
        }
      })

      //Masters and Gender filter Applied
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

      strava.segments.leaderboard.get(segmentId, paramsMasterM542, function (err, data) {
        try {
          if (data.statusCode != 404 && data.entries != "") {
            for (let i = 0; i < data.entries.length; i++) {
              resultMasterM.push([data.entries[i].athlete_name, data.entries[i].elapsed_time, data.entries[i].rank])
            }
          }

          strava.segments.leaderboard.get(segmentId, paramsMasterM642, function (err, data) {
            if (data.statusCode != 404) {
              for (let i = 0; i < data.entries.length; i++) {
                resultMasterM.push([data.entries[i].athlete_name, data.entries[i].elapsed_time, data.entries[i].rank])
              }
            }

            if (resultMasterM.length != 0) {
              resultMasterM.sort(sortFunctionClub)
              populateSchema(resultMasterM, implClubs[i][1] + "MasterMs")

              var content = resultMasterM.reduce(function (a, b) {
                return a + '<tr><td>' + b[2] + '</a></td><td>' + b[0] + '</td><td>' + b[1] + '</td></tr>';
              }, '');

              backdatedData(content, implClubs[i][1] + " Male Master")
            }
          })
        } catch (err) {
          console.log(err)
        }
      })


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

      strava.segments.leaderboard.get(segmentId, paramsMaster54F, function (err, data) {
        try {
          if (data.statusCode != 404 && data.entries != "") {
            for (let i = 0; i < data.entries.length; i++) {
              resultMasterF.push([data.entries[i].athlete_name, data.entries[i].elapsed_time, data.entries[i].rank])
            }
          }
          strava.segments.leaderboard.get(segmentId, paramsMaster64F, function (err, data) {
            if (data.statusCode != 404) {
              for (let i = 0; i < data.entries.length; i++) {
                resultMasterF.push([data.entries[i].athlete_name, data.entries[i].elapsed_time, data.entries[i].rank])
              }
            }

            if (resultMasterF.length != 0) {
              resultMasterF.sort(sortFunctionClub)
              populateSchema(resultMasterF, implClubs[i][1] + "MasterFs")
              
              var content = resultMasterF.reduce(function (a, b) {
                return a + '<tr><td>' + b[2] + '</a></td><td>' + b[0] + '</td><td>' + b[1] + '</td></tr>';
              }, '');

              backdatedData(content, implClubs[i][1] + " Female Master")
            }
          })
        } catch (err) {
          console.log(err)
        }
      })

      deleteUsedSegment(implClubs[i][1])

    } catch {
      console.log("Invalid Segment")
    }
  }
  }) 
}

function saveDataEvening() {
  //Hawaii -10
  var ruleGMTminus10 = new schedule.RecurrenceRule()
  ruleGMTminus10.dayOfWeek = 1
  ruleGMTminus10.hour = 10
  ruleGMTminus10.minute = 30
  ruleGMTminus10.second = 55

  var gmtMinus10 = schedule.scheduleJob(ruleGMTminus10, function () {
    saveData(-10)
  })

  //Alaska -9
  var ruleGMTminus9 = new schedule.RecurrenceRule()
  ruleGMTminus9.dayOfWeek = 1
  ruleGMTminus9.hour = 8
  ruleGMTminus9.minute = 30
  ruleGMTminus9.second = 55

  var gmtMinus9 = schedule.scheduleJob(ruleGMTminus9, function () {
    saveData(-9)
  })

  //Pacific and Cali-8
  var ruleGMTminus8 = new schedule.RecurrenceRule()
  ruleGMTminus8.dayOfWeek = 1
  ruleGMTminus8.hour = 7
  ruleGMTminus8.minute = 30
  ruleGMTminus8.second = 55

  var gmtMinus8 = schedule.scheduleJob(ruleGMTminus8, function () {
    saveData(-8)
  })

  //Arizona -7
  var ruleGMTminus7 = new schedule.RecurrenceRule()
  ruleGMTminus7.dayOfWeek = 1
  ruleGMTminus7.hour = 6
  ruleGMTminus7.minute = 30
  ruleGMTminus7.second = 55

  var gmtMinus7 = schedule.scheduleJob(ruleGMTminus7, function () {
    saveData(-7)
  })

  //Central America -6
  var ruleGMTminus6 = new schedule.RecurrenceRule()
  ruleGMTminus6.dayOfWeek = 1
  ruleGMTminus6.hour = 5
  ruleGMTminus6.minute = 30
  ruleGMTminus6.second = 55

  var gmtMinus6 = schedule.scheduleJob(ruleGMTminus6, function () {
    saveData(-6)
  })

  //Eastern Time -5
  var ruleGMTminus5 = new schedule.RecurrenceRule()
  ruleGMTminus5.dayOfWeek = 1
  ruleGMTminus5.hour = 4
  ruleGMTminus5.minute = 30
  ruleGMTminus5.second = 55

  var gmtMinus5 = schedule.scheduleJob(ruleGMTminus5, function () {
    saveData(-5)
  })

  //Alantic Time -4
  var ruleGMTminus4 = new schedule.RecurrenceRule()
  ruleGMTminus4.dayOfWeek = 1
  ruleGMTminus4.hour = 3
  ruleGMTminus4.minute = 30
  ruleGMTminus4.second = 55

  var gmtMinus4 = schedule.scheduleJob(ruleGMTminus4, function () {
    saveData(-4)
  })

  //Newfoundland -3.5
  var ruleGMTminus3half = new schedule.RecurrenceRule()
  ruleGMTminus3half.dayOfWeek = 1
  ruleGMTminus3half.hour = 3
  ruleGMTminus3half.minute = 45
  ruleGMTminus3half.second = 55

  var gmtMinus3half = schedule.scheduleJob(ruleGMTminus3half, function () {
    saveData(-3.5)
  })

  //Greenland -2
  var ruleGMTminus3= new schedule.RecurrenceRule()
  ruleGMTminus3.dayOfWeek = 1
  ruleGMTminus3.hour = 2
  ruleGMTminus3.minute = 30
  ruleGMTminus3.second = 55

  var gmtMinus3 = schedule.scheduleJob(ruleGMTminus3, function () {
    saveData(-3)
  })

  //Mid-Atlantic -2
  var ruleGMTminus2 = new schedule.RecurrenceRule()
  ruleGMTminus2.dayOfWeek = 1
  ruleGMTminus2.hour = 2
  ruleGMTminus2.minute = 30
  ruleGMTminus2.second = 55

  var gmtMinus2 = schedule.scheduleJob(ruleGMTminus2, function () {
    saveData(-2)
  })

  //Cape Verde -1
  var ruleGMTminus1 = new schedule.RecurrenceRule()
  ruleGMTminus1.dayOfWeek = 1
  ruleGMTminus1.hour = 1
  ruleGMTminus1.minute = 30
  ruleGMTminus1.second = 55

  var gmtMinus1 = schedule.scheduleJob(ruleGMTminus1, function () {
    saveData(-1)
  })

  //UK etc
  var ruleGMT0 = new schedule.RecurrenceRule()
  ruleGMT0.dayOfWeek = 0
  ruleGMT0.hour = 23
  ruleGMT0.minute = 30
  ruleGMT0.second = 30

  var gmt0 = schedule.scheduleJob(ruleGMT0, function () {
    saveData(0)
  })

  
  //Europe + 1 etc
  var ruleGMT1 = new schedule.RecurrenceRule()
  ruleGMT1.dayOfWeek = 0
  ruleGMT1.hour = 22
  ruleGMT1.minute = 30
  ruleGMT1.second = 55

  var gmt1 = schedule.scheduleJob(ruleGMT1, function () {
    saveData(1)
  })

  //Greece + 2 etc
  var ruleGMT2 = new schedule.RecurrenceRule()
  ruleGMT2.dayOfWeek = 0
  ruleGMT2.hour = 21
  ruleGMT2.minute = 30
  ruleGMT2.second = 55

  var gmt2 = schedule.scheduleJob(ruleGMT2, function () {
    saveData(2)
  })

  //Russia + 3 etc
  var ruleGMT3 = new schedule.RecurrenceRule()
  ruleGMT3.dayOfWeek = 0
  ruleGMT3.hour = 20
  ruleGMT3.minute = 30
  ruleGMT3.second = 55

  var gmt3 = schedule.scheduleJob(ruleGMT3, function () {
    saveData(3)
  })

  //Iran + 3.5 etc
  var ruleGMT3half = new schedule.RecurrenceRule()
  ruleGMT3half.dayOfWeek = 0
  ruleGMT3half.hour = 20
  ruleGMT3half.minute = 00
  ruleGMT3half.second = 55

  var gmt3half = schedule.scheduleJob(ruleGMT3half, function () {
    saveData(3.5)
  })

  //BST END Baku + 4
  var ruleGMT4 = new schedule.RecurrenceRule()
  ruleGMT4.dayOfWeek = 0
  ruleGMT4.hour = 20
  ruleGMT4.minute = 30
  ruleGMT4.second = 55

  var gmt4 = schedule.scheduleJob(ruleGMT4, function () {
    saveData(4)
  })

  //Afganistan + 4:30 
  var ruleGMT4Half = new schedule.RecurrenceRule()
  ruleGMT4Half.dayOfWeek = 0
  ruleGMT4Half.hour = 20
  ruleGMT4Half.minute = 00
  ruleGMT4Half.second = 55

  var gmt4half = schedule.scheduleJob(ruleGMT4Half, function () {
    saveData(4.5)
  })

  //More Russia + 5
  var ruleGMT5 = new schedule.RecurrenceRule()
  ruleGMT5.dayOfWeek = 0
  ruleGMT5.hour = 19
  ruleGMT5.minute = 30
  ruleGMT5.second = 55

  var gmt5 = schedule.scheduleJob(ruleGMT5, function () {
    saveData(5)
  })

  //Mumbai + 5:30 
  var ruleGMT5half = new schedule.RecurrenceRule()
  ruleGMT5half.dayOfWeek = 0
  ruleGMT5half.hour = 19
  ruleGMT5half.minute = 00
  ruleGMT5half.second = 55

  var gmt5half = schedule.scheduleJob(ruleGMT5half, function () {
    saveData(5.5)
  })

  //Kathmandu + 5:45
  var ruleGMT545 = new schedule.RecurrenceRule()
  ruleGMT545.dayOfWeek = 0
  ruleGMT545.hour = 18
  ruleGMT545.minute = 45
  ruleGMT545.second = 55

  var gmt545 = schedule.scheduleJob(ruleGMT545, function () {
    saveData(5.75)
  })

  //Astana + 6
  var ruleGMT6 = new schedule.RecurrenceRule()
  ruleGMT6.dayOfWeek = 0
  ruleGMT6.hour = 18
  ruleGMT6.minute = 30
  ruleGMT6.second = 55

  var gmt6 = schedule.scheduleJob(ruleGMT6, function () {
    saveData(6)
  })

  //Bangkok + 7
  var ruleGMT7 = new schedule.RecurrenceRule()
  ruleGMT7.dayOfWeek = 0
  ruleGMT7.hour = 17
  ruleGMT7.minute = 34
  ruleGMT7.second = 0

  var gmt7 = schedule.scheduleJob(ruleGMT7, function () {
    saveData(7)
  })
  
  //Beijing + 8
  var ruleGMT8 = new schedule.RecurrenceRule()
  ruleGMT8.dayOfWeek = 0
  ruleGMT8.hour = 16
  ruleGMT8.minute = 30
  ruleGMT8.second = 55

  var gmt8 = schedule.scheduleJob(ruleGMT8, function () {
    saveData(8)
  })

  //Tokyo + 9
  var ruleGMT9 = new schedule.RecurrenceRule()
  ruleGMT9.dayOfWeek = 0
  ruleGMT9.hour = 15
  ruleGMT9.minute = 30
  ruleGMT9.second = 55

  var gmt9 = schedule.scheduleJob(ruleGMT9, function () {
    saveData(9)
  })

  //Adelaide + 9.5
  var ruleGMT9half = new schedule.RecurrenceRule()
  ruleGMT9half.dayOfWeek = 0
  ruleGMT9half.hour = 15
  ruleGMT9half.minute = 00
  ruleGMT9half.second = 55

  var gmt9half = schedule.scheduleJob(ruleGMT9half, function () {
    saveData(9.5)
  })

  //Syndney + 10
  var ruleGMT10 = new schedule.RecurrenceRule()
  ruleGMT10.dayOfWeek = 0
  ruleGMT10.hour = 14
  ruleGMT10.minute = 30
  ruleGMT10.second = 55

  var gmt10 = schedule.scheduleJob(ruleGMT10, function () {
    saveData(10)
  })

  //Even more russia + 11
  var ruleGMT11 = new schedule.RecurrenceRule()
  ruleGMT11.dayOfWeek = 0
  ruleGMT11.hour = 13
  ruleGMT11.minute = 30
  ruleGMT11.second = 55

  var gmt11 = schedule.scheduleJob(ruleGMT11, function () {
    saveData(11)
  })

  //New Zealand + 12
  var ruleGMT12 = new schedule.RecurrenceRule()
  ruleGMT12.dayOfWeek = 0
  ruleGMT12.hour = 12
  ruleGMT12.minute = 30
  ruleGMT12.second = 55

  var gmt12 = schedule.scheduleJob(ruleGMT12, function () {
    saveData(12)
  })

  console.log("Updates complete")
}


//The 404 Route (ALWAYS Keep this as the last route)
app.get('*', function (req, res) {
  res.render('404');
});