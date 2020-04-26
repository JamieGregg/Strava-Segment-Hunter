require('dotenv').config();
var express = require("express");
var router = express.Router();
const passport = require('passport')
var User = require("../models/user");
const segCodeSchema = require("../models/segmentSchema")
const mongoose = require('mongoose')

router.use(passport.initialize());
router.use(passport.session());

router.get('/adminDashboard', function (req, res) {
    if (req.isAuthenticated(req, res)) {
        console.log("Authentication Complete")
        loadAdminBoard(req, res);
    } else {
        res.redirect("login")
    }
})

router.post('/addSegment', async function (req, res) {
    await User.findOne({
        username: req.user.username
    }, function (err, obj) {
        var strava = new require("strava")({
            "client_id": process.env.CLIENT_ID,
            "access_token": process.env.ACCESS_TOKEN,
            "client_secret": process.env.CLIENT_SECRET,
            "redirect_url": "https://www.stravasegmenthunter.com/"
        });

        const collection = mongoose.model(obj.clubId + "segments", segCodeSchema)

        collection
            .findOne({})
            .sort('-counterId') // give me the max
            .exec(function (err, member) {
                if (err) {
                    console.log(err)
                } else {
                    console.log(member)

                    var lastCounter = 0;
                    if (member == null) {
                        lastCounter = 1;
                    } else {
                        lastCounter = (member.counterId += 1)
                    }

                    strava.segments.get(req.body.segmentId, async function (err, info) {
                        console.log(info.name)

                        var newSegment = new collection({
                            counterId: lastCounter,
                            segmentId: req.body.segmentId,
                            name: info.name,
                            distance: convertingMetersToMiles(info.distance),
                            grade: info.average_grade,
                            efforts: info.effort_count
                        });

                        // save model to database
                        newSegment.save(function (err, segment) {
                            if (err) return console.error(err);
                            console.log(info.name + " saved to database collection.");
                        });

                        res.send({
                            stravaSegment: req.body.segmentId
                        })
                    })
                }
            });
    })
})

router.get('/upcomingSegments', async function (req, res) {
    User.findOne({
        username: req.user.username
    }, function (err, obj) {

        var segmentList = [];
        var clubId = obj.clubId;

        const collection = mongoose.model(clubId + "segment", segCodeSchema)
        collection.find(async function (err, data) {
            if (err) {
                console.log(err)
            } else {
                for (let i = 0; i < data.length; i++) {
                    console.log(data)
                    segmentList.push([i, data[i].name])

                    if (i === data.length - 1) {
                        showSegments(res, segmentList)
                    }
                }
            }
        }).sort({
            counterId: 1
        }).exec(function (err, docs) {
            console.log(err);
        });
    })
})

router.post('/deleteSegment', function (req, res) {
    console.log("called")
    User.findOne({
        username: req.user.username
    }, function (err, obj) {
        var segmentName = req.body.segmentName;
        var clubId = obj.clubId

        const collection = mongoose.model(clubId + "segments", segCodeSchema)

        collection.deleteOne({
            name: segmentName
        }, function (err) {
            if (!err) {
                console.log("removed " + segmentName)
                res.send({
                    result: "Pass"
                })
            } else {
                message.type = 'error';
            }
        });
    })
})

router.post('/validateSegment', function (req, res) {
    var strava = new require("strava")({
        "client_id": process.env.CLIENT_ID,
        "access_token": process.env.ACCESS_TOKEN,
        "client_secret": process.env.CLIENT_SECRET,
        "redirect_url": "https://www.stravasegmenthunter.com/"
    });

    strava.segments.get(req.body.segmentId, function (err, data) {
        console.log(data)
        res.send({
            segmentName: data.name,
            statusCode: data.statusCode
        })
    })
})

function showSegments(res, segInfo) {
    segInfo.sort(sortCounter)
    res.send({
        segment: segInfo
    })
}

function loadAdminBoard(req, res) {
    User.findOne({
        username: req.user.username
    }, function (err, obj) {
        res.render('admindash', {
            clubName: obj.clubName,
            clubId: obj.clubId,
            segment: ""
        })
    })
}

function sortCounter(a, b) {
    if (a[0] === b[0]) {
        return 0;
    } else {
        return (a[0] < b[0]) ? -1 : 1;
    }
}

module.exports = router