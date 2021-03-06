require('dotenv').config();
const express = require("express"),
    router = express.Router(),
    passport = require('passport'),
    User = require("../../models/user"),
    segCodeSchema = require("../../models/segmentSchema"),
    mongoose = require('mongoose')

router.use(passport.initialize());
router.use(passport.session());

router.get('/admin-dashboard', function (req, res) {
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
                    var lastCounter = 0;

                    if (member == null) {
                        lastCounter = 1;
                    } else {
                        lastCounter = (member.counterId += 1)
                    }

                    strava.segments.get(req.body.segmentId, async function (err, info) {
                        var newSegment = new collection({
                            counterId: parseInt(lastCounter),
                            segmentId: parseInt(req.body.segmentId),
                            name: info.name,
                            distance: convertingMetersToMiles(info.distance),
                            grade: parseInt(info.average_grade),
                            efforts: parseInt(info.effort_count)
                        });

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
        res.send({
            segmentName: data.name,
            statusCode: data.statusCode
        })
    })
})

router.get('/log-out', function (req, res) {
    req.logout();
    res.redirect('/');
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
        res.render('pages/admindash', {
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

function convertingMetersToMiles(meters) {
    return (meters * 0.000621371).toFixed(2) + " miles"
}

module.exports = router