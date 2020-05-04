require('dotenv').config();
const express = require("express");
const router = express.Router();
const ClubData = require("../models/clubdata")
const mongoose = require('mongoose')
const passport = require('passport')
const segSchema = require("../models/segmentSchema")
const resultsSchema = require("../models/results")
var User = require("../models/user");
const timeFrame = "this_week"
let segmentId;

router.use(passport.initialize());
router.use(passport.session());

router.post('/loadleaderboard', function (req, res) {
    if (req.isAuthenticated(req, res)) {
        loadLeaderboard(true, 'POST', segmentId, req.body.clubs, true, req.body.masters, req.body.gender, res, req)
    } else {
        loadLeaderboard(false, 'POST', segmentId, req.body.clubs, true, req.body.masters, req.body.gender, res, req)
    }
})

router.get('/', (req, res) => {
     if (req.isAuthenticated(req, res)) {
         User.findOne({
            username: req.user.username
        }, function (err, obj) {
            loadLeaderboard(true, 'GET', segmentId, obj.clubId, false, 'false', '', res, req)
        })
     } else {
        loadLeaderboard(false, 'GET', segmentId, 25799, false, 'false', '', res, req)
     }
});

async function loadLeaderboard(isAuthenticated, type, segmentId, clubId, reload, ageFilter, gender, res, req) {
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

    var strava = new require("strava")({
        "client_id": process.env.CLIENT_ID,
        "access_token": process.env.ACCESS_TOKEN,
        "client_secret": process.env.CLIENT_SECRET,
        "redirect_url": "https://www.stravasegmenthunter.com/"
    });
   
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

        SegmentData.find(async function (err, data) {
            
            if (err) {
                console.log(err)
            } else {
                try {
                    if(data.length != 0 ){
                        segmentInfo = {
                            "name": data[0].name,
                            "distance": data[0].distance,
                            "average_grade": data[0].grade,
                            "link": "https://www.strava.com/segments/" + data[0].segmentId,
                            "efforts": data[0].efforts,
                            "segmentId": data[0].segmentId
                        }
                    } else {
                         segmentInfo = {
                             "name": "Contact your admin to update segments",
                             "distance": 0,
                             "average_grade": 0,
                             "link": "https://www.strava.com/segments/",
                             "efforts": 0,
                             "segmentId": 23717918
                         }
                    }
                   
                } catch {
                    segmentInfo = {
                        "name": "Contact your admin to update segments",
                        "distance": 0,
                        "average_grade": 0,
                        "link": "https://www.strava.com/segments/",
                        "efforts": 0,
                    }
                }

            }
        }).sort({
            counterId: 1
        }).exec(function (err, docs) {
            console.log(err);
        }); 

        console.log(segmentInfo)
    
        //Finding upcoming segments
        SegmentData.find(async function (err, data) {
            if (err) {
                console.log(err)
            } else {

                dayOne = ["No segment has been added", "https://www.strava.com/segments/"]
                dayTwo = ["No segment has been added", "https://www.strava.com/segments/"]
                dayThree = ["No segment has been added", "https://www.strava.com/segments/"]
                dayFour = ["No segment has been added", "https://www.strava.com/segments/"]

                for (let i = 0; i < 5; i++) {
                    if (err) {
                        console.log(err)
                    } else {
                        try {
                            if (i == 1) {
                                dayOne = [data[1].name, "https://www.strava.com/segments/" + data[1].segmentId]
                            } else if (i == 2) {
                                dayTwo = [data[2].name, "https://www.strava.com/segments/" + data[2].segmentId]
                            } else if (i == 3) {
                                dayThree = [data[3].name, "https://www.strava.com/segments/" + data[3].segmentId]
                            } else if (i == 4) {
                                dayFour = [data[4].name, "https://www.strava.com/segments/" + data[4].segmentId]
                            }
                        } catch {
                            console.log("Not enough segments");
                        }
                    }
                }
            }
        }).sort({
            counterId: 1
        }).exec(function (err, docs) {
            console.log(err);
        });

        await new Promise(resolve => setTimeout(resolve, 200));
        if ((ageFilter === 'false') && (gender === '')) {
            //no age no gender
            params = {
                "date_range": timeFrame,
                "per_page": noOfResults,
                "club_id": clubId
            }
            console.log(segmentInfo.segmentId)
            strava.segments.leaderboard.get(segmentInfo.segmentId, params, async function (err, data) {
                numberOfEntry = data.entries.length

                for (let i = 0; i < numberOfEntry; i++) {
                    segment.push([data.entries[i].athlete_name, convertSecondsToMinutes(data.entries[i].elapsed_time), data.entries[i].rank])
                }

                for (let i = 0; i < implClubs.length; i++) {
                    if (clubId == implClubs[i][1]) {
                        const collection = mongoose.model(implClubs[i][1] + "s", resultsSchema)
                        if (type === 'POST') {
                            collection.find(function (err, people) {

                                if (people.length) {
                                    databaseLeaderboard = people
                                } else {
                                    databaseLeaderboard = {
                                        name: "No Competitors",
                                        points: 0
                                    }
                                }
                                
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
                                    clubInfo: implClubs,
                                    isAuthenticated: isAuthenticated
                                })
                            }).sort({
                                points: -1
                            }).exec(function (err, docs) {
                                console.log(err);
                            }); //collection
                        } else if (type === 'GET') {
                            collection.find(function (err, people) {
                                 if (people.length) {
                                     databaseLeaderboard = people
                                 } else {
                                     databaseLeaderboard = {
                                         name: "No Competitors",
                                         points: 0
                                     }
                                 }

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
                                    clubInfo: implClubs,
                                    isAuthenticated: isAuthenticated
                                })
                            }).sort({
                                points: -1
                            }).exec(function (err, docs) {
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

            strava.segments.leaderboard.get(segmentInfo.segmentId, params, async function (err, data) {
                numberOfEntry = data.entries.length

                for (let i = 0; i < numberOfEntry; i++) {
                    segment.push([data.entries[i].athlete_name, convertSecondsToMinutes(data.entries[i].elapsed_time), data.entries[i].rank])
                }

                for (let i = 0; i < implClubs.length; i++) {
                    if (clubId == implClubs[i][1]) {
                        const collection = mongoose.model(implClubs[i][1] + gender + "s", resultsSchema)
                        if (type === 'POST') {
                            collection.find(function (err, people) {
                                 if (people.length) {
                                     databaseLeaderboard = people
                                 } else {
                                     databaseLeaderboard = {
                                         name: "No Competitors",
                                         points: 0
                                     }
                                 }

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
                                    clubInfo: implClubs,
                                    isAuthenticated: isAuthenticated
                                })
                            }).sort({
                                points: -1
                            }).exec(function (err, docs) {
                                console.log(err);
                            }); //collection
                        } else if (type === 'GET') {
                            collection.find(function (err, people) {
                                 if (people.length) {
                                     databaseLeaderboard = people
                                 } else {
                                     databaseLeaderboard = {
                                         name: "No Competitors",
                                         points: 0
                                     }
                                 }

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
                                    clubInfo: implClubs,
                                    isAuthenticated: isAuthenticated
                                })
                            }).sort({
                                points: -1
                            }).exec(function (err, docs) {
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

            strava.segments.leaderboard.get(segmentInfo.segmentId, params, async function (err, data) {
                numberOfEntry = data.entries.length

                for (let i = 0; i < numberOfEntry; i++) {
                    segment.push([data.entries[i].athlete_name, data.entries[i].elapsed_time, data.entries[i].rank])
                }

                strava.segments.leaderboard.get(segmentInfo.segmentId, params64, async function (err, data) {
                    numberOfEntry = data.entries.length

                    for (let i = 0; i < numberOfEntry; i++) {
                        segment.push([data.entries[i].athlete_name, data.entries[i].elapsed_time, data.entries[i].rank])
                    }

                    segment.sort(sortFunctionClub);
                    for (let i = 0; i < segment.length; i++) {
                        segment[i][2] = i + 1
                        segment[i][1] = convertSecondsToMinutes(segment[i][1])
                    }

                    for (let i = 0; i < implClubs.length; i++) {
                        if (clubId == implClubs[i][1]) {
                            const collection = mongoose.model(implClubs[i][1] + "masters", resultsSchema)
                            if (type === 'POST') {
                                collection.find(function (err, people) {
                                     if (people.length) {
                                         databaseLeaderboard = people
                                     } else {
                                         databaseLeaderboard = {
                                             name: "No Competitors",
                                             points: 0
                                         }
                                     }

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
                                        clubInfo: implClubs,
                                        isAuthenticated: isAuthenticated
                                    })
                                }).sort({
                                    points: -1
                                }).exec(function (err, docs) {
                                    console.log(err);
                                }); //collection
                            } else if (type === 'GET') {
                                collection.find(function (err, people) {
                                     if (people.length) {
                                         databaseLeaderboard = people
                                     } else {
                                         databaseLeaderboard = {
                                             name: "No Competitors",
                                             points: 0
                                         }
                                     }

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
                                        clubInfo: implClubs, 
                                        isAuthenticated: isAuthenticated
                                    })
                                }).sort({
                                    points: -1
                                }).exec(function (err, docs) {
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

            strava.segments.leaderboard.get(segmentInfo.segmentId, params, async function (err, data) {
                numberOfEntry = data.entries.length

                for (let i = 0; i < numberOfEntry; i++) {
                    segment.push([data.entries[i].athlete_name, data.entries[i].elapsed_time, data.entries[i].rank])
                }

                strava.segments.leaderboard.get(segmentId, params64, async function (err, data) {
                    numberOfEntry = data.entries.length

                    for (let i = 0; i < numberOfEntry; i++) {
                        segment.push([data.entries[i].athlete_name, data.entries[i].elapsed_time, data.entries[i].rank])
                    }

                    segment.sort(sortFunctionClub);
                    for (let i = 0; i < segment.length; i++) {
                        segment[i][2] = i + 1
                        segment[i][1] = convertSecondsToMinutes(segment[i][1])
                    }

                    for (let i = 0; i < implClubs.length; i++) {
                        if (clubId == implClubs[i][1]) {
                            const collection = mongoose.model(implClubs[i][1] + "master" + gender + "s", resultsSchema)
                            if (type === 'POST') {
                                collection.find(function (err, people) {
                                     if (people.length) {
                                         databaseLeaderboard = people
                                     } else {
                                         databaseLeaderboard = {
                                             name: "No Competitors",
                                             points: 0
                                         }
                                     }

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
                                        clubInfo: implClubs,
                                        isAuthenticated: isAuthenticated
                                    })
                                }).sort({
                                    points: -1
                                }).exec(function (err, docs) {
                                    console.log(err);
                                }); //collection
                            } else if (type === 'GET') {
                                collection.find(function (err, people) {
                                    if ( people.length ) {
                                        databaseLeaderboard = people
                                    } else {
                                        databaseLeaderboard = {
                                            name: "No Competitors",
                                            points: 0
                                        }
                                    }

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
                                        clubInfo: implClubs,
                                        isAuthenticated: isAuthenticated
                                    })
                                }).sort({
                                    points: -1
                                }).exec(function (err, docs) {
                                    console.log(err);
                                }); //collection
                            } //Type Check
                        } //Club Check
                    } //For
                }) //Api call 54
            }) // Api call 64
        } //over looking if
    })
} // function

async function findSegmentCodes(clubId) {
    const SegmentInfo = mongoose.model(clubId + "segment", segSchema)

    SegmentInfo.find(function (err, data) {
        if (err) {
            console.log(err)
        } else {
            try {
                segmentId = data[0].segmentId
            } catch {
                segmentId = 23717918
            }
        }
    }).sort({
        counterId: 1
    }).exec(function (err, docs) {
        console.log(err);
    });
}

function convertSecondsToMinutes(seconds) {
    var minutes = Math.floor(seconds / 60);
    var seconds = ((seconds % 60) / 100).toFixed(2);
    return minutes + ":" + seconds.slice(-2);
}

function sortFunctionClub(a, b) {
    if (a[1] === b[1]) {
        return 0;
    } else {
        return (a[1] < b[1]) ? -1 : 1;
    }
}

module.exports = router