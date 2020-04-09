require('dotenv').config();
const express = require('express')
const bodyParser = require('body-parser')
const fetch = require('node-fetch')
const mongoose = require('mongoose')
const schedule = require('node-schedule')
const nodemailer = require('nodemailer')
const passwordValidator = require('password-validator')
const bcrypt = require('bcrypt');
const app = express();

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({
  extended: false
}))

mongoose.connect('mongodb+srv://' + process.env.DB_USERNAME + ':' + process.env.DB_PASSWORD + '@cluster0-tnkii.mongodb.net/segLeaderboard', {
    useNewUrlParser: true,
    useUnifiedTopology: true
  }).then(() => console.log('Connected to MongoDB...'))
  .catch(err => console.error('Could not connect to mongoDB', err));

const resultsSchema = new mongoose.Schema({
  points: Number,
  name: String,
})

const segCodeSchema = new mongoose.Schema({
  counterId: Number,
  segmentId: Number
})

const segClubData = new mongoose.Schema({
  clubName: String,
  clubId: Number,
  alais: String
})

const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  clubName: String,
  clubId: Number
})

var schema = new passwordValidator();
schema
  .is().min(8) // Minimum length 8
  .is().max(100) // Maximum length 100
  .has().uppercase() // Must have uppercase letters
  .has().not().spaces()
  .is().not().oneOf(['Passw0rd', 'Password123']);


var strava = new require("strava")({
  "client_id": process.env.CLIENT_ID,
  "access_token": process.env.ACCESS_TOKEN,
  "client_secret": process.env.CLIENT_SECRET,
  "redirect_url": "https://www.stravasegmenthunter.com/"
});

const segDwdInterResults = mongoose.model("DWDInterclub", resultsSchema)
const segmentCodes = mongoose.model("Segment", segCodeSchema)
const clubData = mongoose.model("ClubData", segClubData)
const dwdInterclubStruct = mongoose.model("dwdinterclubstructure", segClubData)
const user = mongoose.model("User", userSchema)


let segment = []
let clubId = 0
let segmentId;
let timeFrame = "today"
let clubName = "Public"
let saltRounds = 10

app.use(express.static(__dirname + '/public-updated'));

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
//SEGMENT FUNCTIONS
//Finding the information on any segment

async function loadLeaderboard(type, segmentId, clubId, reload, ageFilter, gender, res, req){
  var params = { "date_range": timeFrame }
  var params64 = {}
  var noOfResults = 20
  var segment = []
  var segmentInfo = []
  var implClubs = []
  var tomorrowsSegmentInfo = []
  var databaseLeaderboard = []
  var clubsInLeague = [];
  var dayOne = [];
  var dayTwo = [];
  var dayThree = [];
  var dayFour = [];

  if ( req.body.clubs != undefined ) {
    clubName = "Public"
  }

  var strava = new require("strava")({
    "client_id": process.env.CLIENT_ID,
    "access_token": process.env.ACCESS_TOKEN,
    "client_secret": process.env.CLIENT_SECRET,
    "redirect_url": "https://www.stravasegmenthunter.com/"
  });

  findSegmentCodes()

  //Gathering Club Data
  clubData.find(async function(err, clubInfo) {
    if ( err ) {
      console.log(err)
    } else {
      for (let i = 0; i < clubInfo.length; i++) {
        implClubs.push([clubInfo[i].clubName, clubInfo[i].clubId, clubInfo[i].alais])
      }
    }

    //Gathering segment data
    strava.segments.get(segmentId, async function(err, data) {
      var objJSON = await JSON.parse(JSON.stringify(data))
      segmentInfo = {
        "name": objJSON.name,
        "distance": convertingMetersToMiles(objJSON.distance),
        "average_grade": objJSON.average_grade,
        "link": "https://www.strava.com/segments/" + objJSON.id,
        "efforts": objJSON.effort_count,
        "location": objJSON.state
      }
    })//todays segment

    //Finding upcoming segments
    segmentCodes.find(async function(err, data) {
      if ( err ) {
        console.log(err)
      } else {
        for (let i = 1; i < 5; i++) {
          strava.segments.get(data[i].segmentId, async function(err, data) {
            var objJSON = await JSON.parse(JSON.stringify(data))

            if (i == 1) {
              dayOne = [objJSON.name, "https://www.strava.com/segments/" + objJSON.id]
            } else if (i == 2) {
              dayTwo = [objJSON.name, "https://www.strava.com/segments/" + objJSON.id]
            } else if (i == 3) {
              dayThree = [objJSON.name, "https://www.strava.com/segments/" + objJSON.id]
            } else if (i == 4) {
              dayFour = [objJSON.name, "https://www.strava.com/segments/" + objJSON.id]
            }
          })
        }
      }
    }).sort({
      counterId: 1
    }).exec(function(err, docs) {
      console.log(err);
    });//Upcoming Segments

    if ( (ageFilter === 'false') && (gender === '') ){
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
               if ( type === 'POST' ) {
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
                  });//collection
                } else if ( type === 'GET' ) {
                  collection.find(function(err, people) {
                  databaseLeaderboard = people

                  res.render('home',{
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
                   });//collection
                }//Type Check
              }//Club Check
            } //For
          }) //Api call
    } else if ( (ageFilter === 'false') && (gender != '') ){
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
           if ( type === 'POST' ) {
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
              });//collection
            } else if ( type === 'GET' ) {
              collection.find(function(err, people) {
              databaseLeaderboard = people

              res.render('home',{
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
               });//collection
            }//Type Check
          }//Club Check
        } //For
      }) //Api call
    } else if ( (ageFilter === 'true') && (gender === '') ){
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
        segment.push([data.entries[i].athlete_name, convertSecondsToMinutes(data.entries[i].elapsed_time), data.entries[i].rank])
      }

      strava.segments.leaderboard.get(segmentId, params64, async function(err, data) {
      numberOfEntry = data.entries.length

      for (let i = 0; i < numberOfEntry; i++) {
        segment.push([data.entries[i].athlete_name, convertSecondsToMinutes(data.entries[i].elapsed_time), data.entries[i].rank])
      }

      for (let i = 0; i < implClubs.length; i++) {
        if (clubId == implClubs[i][1]) {
            const collection = mongoose.model(implClubs[i][0] + "master", resultsSchema)
            if ( type === 'POST' ) {
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
               });//collection
             } else if ( type === 'GET' ) {
               collection.find(function(err, people) {
               databaseLeaderboard = people

               res.render('home',{
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
                });//collection
             }//Type Check
           }//Club Check
         } //For
       }) //Api call 54
     }) //Api call 64
   } else if ( (ageFilter === 'true') && (gender != '') ){
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
        segment.push([data.entries[i].athlete_name, convertSecondsToMinutes(data.entries[i].elapsed_time), data.entries[i].rank])
      }

      strava.segments.leaderboard.get(segmentId, params64, async function(err, data) {
      numberOfEntry = data.entries.length

      for (let i = 0; i < numberOfEntry; i++) {
        segment.push([data.entries[i].athlete_name, convertSecondsToMinutes(data.entries[i].elapsed_time), data.entries[i].rank])
      }

      for (let i = 0; i < implClubs.length; i++) {
        if (clubId == implClubs[i][1]) {
            const collection = mongoose.model(implClubs[i][0] + "master" + gender, resultsSchema)
            if ( type === 'POST' ) {
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
               });//collection
             } else if ( type === 'GET' ) {
               collection.find(function(err, people) {
               databaseLeaderboard = people

               res.render('home',{
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
                });//collection
             }//Type Check
           }//Club Check
         } //For
       }) //Api call 54
     }) // Api call 64
   }//over looking if
  })//club data
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

  for (let z = 0; z < results.length; z++) {
    var currentName = results[z][0]

    var query = {
      name: currentName
    };
    var update = {
      $inc: {
        points: scoringSystem(z)
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
  var strava = new require("strava")({
    "client_id": process.env.CLIENT_ID,
    "access_token": process.env.ACCESS_TOKEN,
    "client_secret": process.env.CLIENT_SECRET,
    "redirect_url": "https://www.stravasegmenthunter.com/"
  });

  var rule = new schedule.RecurrenceRule()
  rule.hour = 23
  rule.minute = 55
  rule.second = 30

  var j = schedule.scheduleJob(rule, function() {
    findSegmentCodes()

    var params = { "date_range": timeFrame }
    var noOfResults = 20
    var gender = ["F","M"]
    var segmentInfo = []
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
    clubData.find(async function(err, clubInfo) {
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

        strava.segments.leaderboard.get(segmentId, params, async function(err, data) {
          if (data != "") {
            numberOfEntry = await data.entries.length

            for (let z = 0; z < numberOfEntry; z++) {
              segment.push([data.entries[z].athlete_name, convertSecondsToMinutes(data.entries[z].elapsed_time), data.entries[z].rank])
            }

            populateSchema(segment, implClubs[i][1], implClubs[i][0])
            segment.length = 0;
          }//If statment
        })//API Call

        //"EVERYONE" With Gender Filter Applied
        for (let y = 0; y < 2; y++) {
          var params = {
            "date_range": timeFrame,
            "per_page": noOfResults,
            "club_id": implClubs[i][1],
            "gender": gender[y]
          }

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
        }//Gender for loop


        //"EVERYONE" master section
        results.length = 0;
        var params54 = {
          "date_range": timeFrame,
          "per_page": 100,
          "club_id": implClubs[i][1],
          "age_group": "45_54"
        }

        strava.segments.leaderboard.get(segmentId, params54, function(err, data) {
          if ( data.statusCode != 404 && data.entries != "") {
            for (let i = 0; i < data.entries.length; i++) {
              results.push([data.entries[i].athlete_name, convertSecondsToMinutes(data.entries[i].elapsed_time), data.entries[i].rank])
            }
          }

          var params64 = {
            "date_range": timeFrame,
            "per_page": 100,
            "club_id": implClubs[i][1],
            "age_group": "55_64"
          }

          strava.segments.leaderboard.get(segmentId, params64, function(err, data) {
            if ( data.statusCode != 404 ) {
              for ( let i = 0; i < data.entries.length; i++ ) {
                results.push([data.entries[i].athlete_name, convertSecondsToMinutes(data.entries[i].elapsed_time), data.entries[i].rank])
              }
            }

            populateSchema(results, implClubs[i][1], implClubs[i][0] + "Master")
          })
        })


        //Masters and Gender filter Applied
        results.length = 0;
          var paramsMasterM54 = {
            "date_range": timeFrame,
            "per_page": 100,
            "club_id": implClubs[i][1],
            "age_group": "45_54",
            "gender": "M"
          }

          var paramsMasterM64 = {
            "date_range": timeFrame,
            "per_page": 100,
            "club_id": implClubs[i][1],
            "age_group": "55_64",
            "gender": "M"
          }

          strava.segments.leaderboard.get(segmentId, paramsMasterM54, function(err, data) {
            if (data.statusCode != 404 && data.entries != "") {
              for (let i = 0; i < data.entries.length; i++) {
                results.push([data.entries[i].athlete_name, convertSecondsToMinutes(data.entries[i].elapsed_time), data.entries[i].rank])
              }
            }

            strava.segments.leaderboard.get(segmentId, paramsMasterM64, function(err, data) {
              if (data.statusCode != 404) {
                for (let i = 0; i < data.entries.length; i++) {
                  results.push([data.entries[i].athlete_name, convertSecondsToMinutes(data.entries[i].elapsed_time), data.entries[i].rank])
                }
              }

              if(results.length != 0){
                populateSchema(results, implClubs[i][1], implClubs[i][0] + "MasterM")
                results.length = 0;
              }
            })
          })

          results.length = 0;
            var paramsMaster54 = {
              "date_range": timeFrame,
              "per_page": 100,
              "club_id": implClubs[i][1],
              "age_group": "45_54",
              "gender": "F"
            }

            var paramsMaster64 = {
              "date_range": timeFrame,
              "per_page": 100,
              "club_id": implClubs[i][1],
              "age_group": "55_64",
              "gender": "F"
            }

            strava.segments.leaderboard.get(segmentId, paramsMaster54, function(err, data) {
              if (data.statusCode != 404 && data.entries != "") {
                for (let i = 0; i < data.entries.length; i++) {
                  results.push([data.entries[i].athlete_name, convertSecondsToMinutes(data.entries[i].elapsed_time), data.entries[i].rank])
                }
              }

              strava.segments.leaderboard.get(segmentId, paramsMaster64, function(err, data) {
                if (data.statusCode != 404) {
                  for (let i = 0; i < data.entries.length; i++) {
                    results.push([data.entries[i].athlete_name, convertSecondsToMinutes(data.entries[i].elapsed_time), data.entries[i].rank])
                  }
                }

                if(results.length != 0){
                  populateSchema(results, implClubs[i][1], implClubs[i][0] + "MasterF")
                  results.length = 0;
                }
              })
            })

      }//For loop
    })//Club Data
    deleteUsedSegment();
    findSegmentCodes();
    emailNewSegment(segmentId);
  })//Timing Method
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

function findSegmentCodes() {
  segmentCodes.find(function(err, data) {
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

function deleteUsedSegment() {
  var smallestSegmentId = 0;
  segmentCodes.find(function(err, data) {
    if (err) {
      console.log(err)
    } else {
      smallestSegmentId = data[0].segmentId

      segmentCodes.deleteMany({
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

function sortFunction(a, b) {
  if (a[3] === b[3]) {
    return 0;
  } else {
    return (a[3] < b[3]) ? -1 : 1;
  }
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









app.get('/signup', function(req, res) {
  res.render('signup', {
    passwordVal: ""
  })
})

app.post('/register', function(req, res) {
  bcrypt.hash(req.body.password, saltRounds, function(err, hash) {
    if (schema.validate(req.body.password) == true) {
      const newUser = new user({
        email: req.body.emailAddress,
        password: hash,
        clubName: req.body.clubName,
        clubId: req.body.clubId
      })

      newUser.save(function(err) {
        if (err) {
          console.log(err)
        } else {
          res.send("Registered")
          console.log("Registered")
        }
      })
    } else {
      res.send({
        passwordVal: "Your password must be at least 8 characters long with an uppercase and lowercase letter"
      })
    }
  })
})

app.post('/login', function(req, res) {
  const email = req.body.emailAddress
  const password = req.body.password

  user.findOne({email: email}, function(err, foundUser) {
    if (err) {
      console.log(err)
    } else {
      if (foundUser) {
        bcrypt.compare(password, foundUser.password, function(err,result) {
          if(result === true){
            res.send(email + " has been logged in")
          }
        })
      }
    }
  })
})
