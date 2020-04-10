require('dotenv').config();
const express = require('express')
const bodyParser = require('body-parser')
const router = express.Router();



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

    const collection = mongoose.model(clubName, segLeaderboardSchema)
    collection.update(query, update, options, function(err, doc) {
      //console.log(doc);
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
          strava.segments.leaderboard.get(segmentId, params, function(err, data) {
            if (data.statusCode != 404) {
              total = JSON.parse(JSON.stringify(data.effort_count))
              var paramsClub = {
                "date_range": timeFrame,
                "per_page": noOfResults,
                "club_id": implClubs[i][1]
              }
            }
            strava.segments.leaderboard.get(segmentId, paramsClub, async function(err, data) {
              if (data != "") {
                numberOfEntry = await data.entries.length

                for (let z = 0; z < numberOfEntry; z++) {
                  segment.push([data.entries[z].athlete_name, convertSecondsToMinutes(data.entries[z].elapsed_time), data.entries[z].rank])
                }

                await populateSchema(segment, implClubs[i][1], implClubs[i][0])
                segment.length = 0;
              }
            })

            //General Gender Section
            strava.segments.leaderboard.get(segmentId, params, async function(err, data) {
              total = JSON.parse(JSON.stringify(data.effort_count))
              var paramsClub = {
                "date_range": timeFrame,
                "per_page": noOfResults,
                "club_id": implClubs[i][1],
                "gender": "M"
              }
              strava.segments.leaderboard.get(segmentId, paramsClub, async function(err, data) {
                if (data != "") {
                  numberOfEntry = await data.entries.length

                  for (let z = 0; z < numberOfEntry; z++) {
                    segment.push([data.entries[z].athlete_name, convertSecondsToMinutes(data.entries[z].elapsed_time), data.entries[z].rank])
                  }

                  await populateSchema(segment, implClubs[i][1], implClubs[i][0] + "male")
                  segment.length = 0;
                }
              })
            })

            strava.segments.leaderboard.get(segmentId, params, async function(err, data) {
              total = JSON.parse(JSON.stringify(data.effort_count))
              var paramsClub = {
                "date_range": timeFrame,
                "per_page": noOfResults,
                "club_id": implClubs[i][1],
                "gender": "F"
              }
              strava.segments.leaderboard.get(segmentId, paramsClub, async function(err, data) {
                if (data != "") {
                  numberOfEntry = await data.entries.length

                  for (let z = 0; z < numberOfEntry; z++) {
                    segment.push([data.entries[z].athlete_name, convertSecondsToMinutes(data.entries[z].elapsed_time), data.entries[z].rank])
                  }

                  await populateSchema(segment, implClubs[i][1], implClubs[i][0] + "female")
                  segment.length = 0;
                }
              })
            })

            //Master Section
            var results = [];
            var params54 = {
              "date_range": timeFrame,
              "per_page": 100,
              "club_id": implClubs[i][1],
              "age_group": "45_54"
            }

            strava.segments.leaderboard.get(segmentId, params54, function(err, data) {

              if (data.statusCode != 404) {
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
                if (data.statusCode != 404) {
                  for (let i = 0; i < data.entries.length; i++) {
                    results.push([data.entries[i].athlete_name, convertSecondsToMinutes(data.entries[i].elapsed_time), data.entries[i].rank])
                  }
                }
                populateSchema(results, implClubs[i][1], implClubs[i][0] + "Master")
              })
            })

            //Masters Gender Section
            var results = [];
            var params54 = {
              "date_range": timeFrame,
              "per_page": 100,
              "club_id": implClubs[i][1],
              "age_group": "45_54",
              "gender": "M"
            }

            strava.segments.leaderboard.get(segmentId, params54, function(err, data) {
              if (data.statusCode != 404) {
                for (let i = 0; i < data.entries.length; i++) {
                  results.push([data.entries[i].athlete_name, convertSecondsToMinutes(data.entries[i].elapsed_time), data.entries[i].rank])
                }
              }

              var params64 = {
                "date_range": timeFrame,
                "per_page": 100,
                "club_id": implClubs[i][1],
                "age_group": "55_64",
                "gender": "M"
              }

              strava.segments.leaderboard.get(segmentId, params64, function(err, data) {
                if (data.statusCode != 404) {
                  for (let i = 0; i < data.entries.length; i++) {
                    results.push([data.entries[i].athlete_name, convertSecondsToMinutes(data.entries[i].elapsed_time), data.entries[i].rank])
                  }
                }
                populateSchema(results, implClubs[i][1], implClubs[i][0] + "MasterMale")
              })

            })


            var results = [];
            var params54 = {
              "date_range": timeFrame,
              "per_page": 100,
              "club_id": clubId,
              "age_group": "45_54",
              "gender": "F"
            }

            strava.segments.leaderboard.get(segmentId, params54, function(err, data) {
              if (data.statusCode != 404) {
                for (let i = 0; i < data.entries.length; i++) {
                  results.push([data.entries[i].athlete_name, convertSecondsToMinutes(data.entries[i].elapsed_time), data.entries[i].rank])
                }
              }

              var params64 = {
                "date_range": timeFrame,
                "per_page": 100,
                "club_id": implClubs[i][1],
                "age_group": "55_64",
                "gender": "F"
              }

              strava.segments.leaderboard.get(segmentId, params64, function(err, data) {
                if (data.statusCode != 404) {
                  for (let i = 0; i < data.entries.length; i++) {
                    results.push([data.entries[i].athlete_name, convertSecondsToMinutes(data.entries[i].elapsed_time), data.entries[i].rank])
                  }
                }
                populateSchema(results, implClubs[i][1], implClubs[i][0] + "MasterFemale")
              })

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

            for (let i = 0; i < implClubsInter.length; i++) {
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

                if (i == implClubsInter.length - 1) {
                  segment.sort(sortFunction)

                  populateSchema(segment, -1, 'DWD Interclub')
                  segment.length = 0;
                }
              })
            }
          })
        } else {
          strava.segments.leaderboard.get(segmentId, params, async function(err, data) {
            if (data != "") {
              total = await JSON.parse(JSON.stringify(data.effort_count))
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
                  populateSchema(segment, implClubs[i][1], implClubs[i][0])
                  segment.length = 0;
                }
              })
            }

            //general gender
            strava.segments.leaderboard.get(segmentId, params, function(err, data) {
              if (data != "") {
                total = JSON.parse(JSON.stringify(data.effort_count))
                var paramsClub = {
                  "date_range": timeFrame,
                  "per_page": noOfResults,
                  "gender": 'M'
                }
                strava.segments.leaderboard.get(segmentId, paramsClub, function(err, data) {
                  if (data != "") {
                    numberOfEntry = data.entries.length

                    for (let i = 0; i < numberOfEntry; i++) {
                      segment.push([data.entries[i].athlete_name, convertSecondsToMinutes(data.entries[i].elapsed_time), data.entries[i].rank])
                    }
                    populateSchema(segment, implClubs[i][1], implClubs[i][0] + "male")
                    segment.length = 0;
                  }
                })
              }

              strava.segments.leaderboard.get(segmentId, params, function(err, data) {
                if (data != "") {
                  total = JSON.parse(JSON.stringify(data.effort_count))
                  var paramsClub = {
                    "date_range": timeFrame,
                    "per_page": noOfResults,
                    "gender": 'F'
                  }
                  strava.segments.leaderboard.get(segmentId, paramsClub, function(err, data) {
                    if (data != "") {
                      numberOfEntry = data.entries.length

                      for (let i = 0; i < numberOfEntry; i++) {
                        segment.push([data.entries[i].athlete_name, convertSecondsToMinutes(data.entries[i].elapsed_time), data.entries[i].rank])
                      }
                      populateSchema(segment, implClubs[i][1], implClubs[i][0] + "female")
                      segment.length = 0;
                    }
                  })
                }
              })

              //masters
              var resultsData = [];

              var params54 = {
                "date_range": timeFrame,
                "per_page": 100,
                "age_group": "45_54"
              }

              strava.segments.leaderboard.get(segmentId, params54, function(err, data) {
                console.log(data)
                if (data.statusCode != 404) {
                  for (let i = 0; i < data.entries.length; i++) {
                    resultsData.push([data.entries[i].athlete_name, convertSecondsToMinutes(data.entries[i].elapsed_time), data.entries[i].rank])
                  }
                }

                var params64 = {
                  "date_range": timeFrame,
                  "per_page": 100,
                  "age_group": "55_64"
                }

                strava.segments.leaderboard.get(segmentId, params64, function(err, data) {
                  console.log(data)
                  if (data.statusCode != 404) {
                    for (let i = 0; i < data.entries.length; i++) {
                      resultsData.push([data.entries[i].athlete_name, convertSecondsToMinutes(data.entries[i].elapsed_time), data.entries[i].rank])
                    }
                  }
                  populateSchema(resultsData, implClubs[i][1], implClubs[i][0] + "Master")
                })
              })



              //masters
              var resultsData = [];

              var params54master = {
                "date_range": timeFrame,
                "per_page": 100,
                "age_group": "45_54",
                "gender": "M"
              }

              strava.segments.leaderboard.get(segmentId, params54master, function(err, data) {
                console.log(data)
                if (data.statusCode != 404) {
                  for (let i = 0; i < data.entries.length; i++) {
                    resultsData.push([data.entries[i].athlete_name, convertSecondsToMinutes(data.entries[i].elapsed_time), data.entries[i].rank])
                  }
                }

                var params64master = {
                  "date_range": timeFrame,
                  "per_page": 100,
                  "age_group": "55_64",
                  "gender": "M"
                }

                strava.segments.leaderboard.get(segmentId, params64master, function(err, data) {
                  console.log(data)
                  if (data.statusCode != 404) {
                    for (let i = 0; i < data.entries.length; i++) {
                      resultsData.push([data.entries[i].athlete_name, convertSecondsToMinutes(data.entries[i].elapsed_time), data.entries[i].rank])
                    }
                  }
                  populateSchema(resultsData, implClubs[i][1], implClubs[i][0] + "Master")
                })
              })


            })
          })
        }
      }
    })
    deleteUsedSegment();
    findSegmentCodes();
    emailNewSegment(segmentId);
  })

}

module.exports = router
