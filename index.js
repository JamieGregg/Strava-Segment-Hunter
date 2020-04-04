require('dotenv').config();
const express = require('express')
const bodyParser = require('body-parser')
const fetch = require('node-fetch')
const mongoose = require('mongoose')
const schedule = require('node-schedule')
const nodemailer = require('nodemailer')
const app = express();

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({
  extended: false
}))

mongoose.connect('mongodb+srv://admin-jamie:' + process.env.DB_PASSWORD + '@cluster0-tnkii.mongodb.net/segLeaderboard', {
    useNewUrlParser: true,
    useUnifiedTopology: true
  }).then(() => console.log('Connected to MongoDB...'))
  .catch(err => console.error('Could not connect to mongoDB', err));

const segLeaderboardSchema = new mongoose.Schema({
  points: Number,
  name: String,
})

const segCodeSchema = new mongoose.Schema({
  counterId: Number,
  segmentId: Number
})

const segClubData = new mongoose.Schema({
  clubName: String,
  clubId: Number
})

const segLeaderboard = mongoose.model("Public", segLeaderboardSchema)
const segDwdInterResults = mongoose.model("DWDInterclub", segLeaderboardSchema)
const segmentCodes = mongoose.model("Segment", segCodeSchema)
const clubData = mongoose.model("ClubData", segClubData)
const dwdInterclubStruct = mongoose.model("dwdinterclubstructure", segClubData)

let segment = []
let clubId = 0
let segmentId;
let timeFrame = "today"
let clubName = "Public"

app.use(express.static(__dirname + '/public-updated'));

app.post('/', function(req, res) {
  loadLeaderboard(segmentId, req.body.clubs, true, req, res)
})

app.get('/', (req, res) => {
  loadLeaderboard(segmentId, 55274, false, req, res)
});

let port = process.env.PORT;
if (port == null || port == "") {
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
async function loadLeaderboard(segmentId, clubId, reload, req, res) {
  var segmentId = segmentId;
  var clubId = clubId;
  var params = {
    "date_range": timeFrame
  }
  var noOfResults = 20
  var numberOfEntry = 0;
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

  if (req.body.clubs != undefined) {
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
    if (err) {
      console.log(err)
    } else {
      for (let i = 0; i < clubInfo.length; i++) {
        implClubs.push([clubInfo[i].clubName, clubInfo[i].clubId, clubInfo[i]])
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
    })

    //Finding upcoming segments
    segmentCodes.find(async function(err, data) {
      if (err) {
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
    });

    //Findling leaderboards today then manipulating that to find club leaderboard
    await strava.segments.leaderboard.get(segmentId, params, async function(err, data) {
      total = await JSON.parse(JSON.stringify(data.effort_count))

      //Is this a strava club?
      if (clubId > 0) {
        var paramsClub = {
          "date_range": timeFrame,
          "per_page": noOfResults,
          "club_id": clubId
        }
        await strava.segments.leaderboard.get(segmentId, paramsClub, async function(err, data) {
          numberOfEntry = await data.entries.length

          for (let i = 0; i < numberOfEntry; i++) {
            segment.push([data.entries[i].athlete_name, convertSecondsToMinutes(data.entries[i].elapsed_time), data.entries[i].rank])
          }

          for (let i = 0; i < implClubs.length; i++) {
            //In club for
            if (clubId == implClubs[i][1]) {
              const collection = mongoose.model(implClubs[i][0], segLeaderboardSchema)
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
                  db: databaseLeaderboard,
                  clubName: implClubs[i][0],
                  clubInfo: implClubs
                })
              }).sort({
                points: -1
              }).exec(function(err, docs) {
                console.log(err);
              });//collection
            } //if
          } //for
        }) //strava
        //DWD Interclub
      } else if (clubId == -1) {
        dwdInterclubStruct.find(async function(err, struct) {

          if (err) {
            console.log(err)
          } else {
            var objJSON = await JSON.parse(JSON.stringify(struct))
            for (let i = 0; i < objJSON.length; i++) {
              clubsInLeague.push([objJSON[i].clubName, objJSON[i].clubId])
            }
          }

          for (let i = 0; i < clubsInLeague.length; i++) {
            var paramsClub = {
              "date_range": timeFrame,
              "per_page": noOfResults,
              "club_id": clubsInLeague[i][1]
            }

            //Adding in that club results to the segment array
            await strava.segments.leaderboard.get(segmentId, paramsClub, async function(err, data) {
              var objJSON = await JSON.parse(JSON.stringify(data))

              for (let j = 0; j < data.entries.length; j++) {
                segment.push([clubsInLeague[i][0] + " | " + objJSON.entries[j].athlete_name, convertSecondsToMinutes(objJSON.entries[j].elapsed_time), 0, objJSON.entries[j].elapsed_time])
              }


              if (i == clubsInLeague.length - 1) {
                segment.sort(sortFunction)

                //Adding in ranks
                for (let z = 0; z < segment.length; z++) {
                  segment[z][2] = z + 1;
                }

                await segDwdInterResults.find(function(err, person) {
                  databaseLeaderboard = person

                  res.render('home', {
                    data: segment,
                    segmentInfo: segmentInfo,
                    dayOne: dayOne,
                    dayTwo: dayTwo,
                    dayThree: dayThree,
                    dayFour: dayFour,
                    clubId: -1,
                    reload: reload,
                    db: databaseLeaderboard,
                    clubName: "DWD Interclub",
                    clubInfo: implClubs
                  });
                }).sort({
                  points: -1
                }).exec(function(err, docs) {
                  console.log(err);
                });
              }
            });
          }
        });
        //Public leaderboard
      } else if (clubId == 0) {
        var paramsNoClub = {
          "date_range": timeFrame,
          "per_page": noOfResults
        }
         await strava.segments.leaderboard.get(segmentId, paramsNoClub, async function(err, data) {
          var objJSON = await JSON.parse(JSON.stringify(data))
          numberOfEntry = objJSON.entries.length

          for (let i = 0; i < numberOfEntry; i++) {
            segment.push([objJSON.entries[i].athlete_name, convertSecondsToMinutes(objJSON.entries[i].elapsed_time), objJSON.entries[i].rank])
          }

          await segLeaderboard.find(function(err, person) {
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
              clubName: clubName,
              clubInfo: implClubs
            });
          }).sort({
            points: -1
          }).exec(function(err, docs) {
            console.log(err);
          });
        })
      } //if
    }) //strava
  }) //club
} //func

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
  console.log("schema loaded for  " + clubName)
  console.log(results)
  var implClubs = []

  for (let z = 0; z < results.length; z++){
    console.log("for loop started")
    var currentName = results[z][0]
    console.log(results)

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

    const collection = mongoose.model(clubName, segLeaderboardSchema)
    collection.update(query, update, options, function(err, doc) {
      console.log(doc);
    });
  }
}

function saveDataEvening() {
  var rule = new schedule.RecurrenceRule()
  rule.hour = 23
  rule.minute = 55
  rule.second = 30


  var j = schedule.scheduleJob(rule, function() {
    findSegmentCodes()

    var params = {
      "date_range": timeFrame
    }
    var noOfResults = 20
    var numberOfEntry = 0;
    var segmentInfo = []
    var implClubs = []

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

    //Gathering Club Data
    clubData.find(async function(err, clubInfo) {
      if (err) {
        console.log(err)
      } else {
        for (let i = 0; i < clubInfo.length; i++) {
          implClubs.push([clubInfo[i].clubName, clubInfo[i].clubId, clubInfo[i]])
        }
      }

      for (let i = 0; i < implClubs.length; i++) {
        var segment = [];

        if (implClubs[i][1] > 0) {
          strava.segments.leaderboard.get(segmentId, params, async function(err, data) {
            total = JSON.parse(JSON.stringify(data.effort_count))
            var paramsClub = {
              "date_range": timeFrame,
              "per_page": noOfResults,
              "club_id": implClubs[i][1]
            }
            strava.segments.leaderboard.get(segmentId, paramsClub, async function(err, data) {
              if (data != "") {
                numberOfEntry = await data.entries.length


                for (let z = 0; z < numberOfEntry; z++) {
                  segment.push([data.entries[z].athlete_name, convertSecondsToMinutes(data.entries[z].elapsed_time), data.entries[z].rank])
                }

                await populateSchema(segment, implClubs[i][1], implClubs[i][0])
                console.log("Completed")
                segment.length = 0;

              }
            })
          })

          //interclub
        } else if (implClubs[i][1] == -1) {
          var implClubsInter = []

          dwdInterclubStruct.find(async function(err, clubInfo) {
            if (err) {
              console.log(err)
            } else {
              for (let i = 0; i < clubInfo.length; i++) {
                implClubsInter.push([clubInfo[i].clubName, clubInfo[i].clubId, clubInfo[i]])
              }
            }

            for(let i = 0; i < implClubsInter.length; i++){
              var params = {
                "date_range": timeFrame,
                "per_page": noOfResults,
                "club_id": implClubsInter[i][1]
              }
              strava.segments.leaderboard.get(segmentId, params, function(err, data) {
                numberOfEntry = data.entries.length

                for (let z = 0; z < numberOfEntry; z++) {
                  segment.push([implClubsInter[i][0] + " | " + data.entries[z].athlete_name, convertSecondsToMinutes(data.entries[z].elapsed_time), 0, data.entries[z].elapsed_time])
                }

                if(i == implClubsInter.length - 1){
                  segment.sort(sortFunction)

                  populateSchema(segment, -1, 'DWD Interclub')
                  segment.length = 0;
                }
              })
            }
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
                populateSchema(segment, implClubs[i][1],  implClubs[i][0])
                segment.length = 0;
              }
            })
          }
        })
      }
    }
  });

    //deleteUsedSegment();
    findSegmentCodes();
    emailNewSegment(segmentId);
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
