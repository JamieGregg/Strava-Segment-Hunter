require('dotenv').config();
var express = require("express");
var router = express.Router();
const passport = require('passport')
var User = require("../models/user");
const ClubData = require("../models/clubdata")

router.use(passport.initialize());
router.use(passport.session());

router.get('/signup', function (req, res) {
    res.render('signup')
})

router.post('/register', function (req, res) {
    var clubName = req.body.clubName
    var clubId = req.body.clubId

    User.register({
        username: req.body.username
    }, req.body.password, function (err, user) {
        console.log("Registered")
        if (err) {
            console.log(err)
            res.redirect("/signup")
        } else {
            passport.authenticate('local')(req, res, function () {
                var query = {
                    username: user.username
                };
                var update = {
                    clubName: clubName,
                    clubId: clubId
                }
                var options = {
                    upsert: true,
                    'new': true,
                    'useFindAndModify': true
                };

                User.update(query, update, options, function (err, doc) {
                    console.log(doc);
                });

                var strava = new require("strava")({
                    "client_id": process.env.CLIENT_ID,
                    "access_token": process.env.ACCESS_TOKEN,
                    "client_secret": process.env.CLIENT_SECRET,
                    "redirect_url": "https://www.stravasegmenthunter.com/"
                });

                strava.clubs.get(req.body.clubId, function (err, data) {
                    // a document instance
                    var newClub = new ClubData({
                        alais: clubName,
                        clubId: clubId,
                        clubName: data.name
                    });

                    // save model to database
                    newClub.save(function (err, club) {
                        if (err) return console.error(err);
                    });
                })
                res.redirect('/adminDashboard');
            })
        }
    })
})

router.post('/validateClub', async function (req, res) {
    User.findOne({
        username: req.body.email
    }, function (err, person) {
        if (!person) {
            ClubData.findOne({
                clubId: req.body.clubId
            }, function (err, obj) {
                console.log(obj)
                if (err) {
                    res.send({
                        clubName: "",
                        clubIcon: "",
                        statusCode: 404
                    })
                } else {
                    try {
                        if (obj.length === 0 || obj === 'NULL') {
                            var strava = new require("strava")({
                                "client_id": process.env.CLIENT_ID,
                                "access_token": process.env.ACCESS_TOKEN,
                                "client_secret": process.env.CLIENT_SECRET,
                                "redirect_url": "https://www.stravasegmenthunter.com/"
                            });

                            strava.clubs.get(req.body.clubId, function (err, data) {
                                console.log(data)
                                res.send({
                                    clubName: data.name,
                                    clubIcon: data.profile,
                                    statusCode: data.statusCode
                                })
                            })
                        } else {
                            res.send({
                                clubName: "",
                                clubIcon: "",
                                statusCode: 1500
                            })
                        }
                    } catch {
                        var strava = new require("strava")({
                            "client_id": process.env.CLIENT_ID,
                            "access_token": process.env.ACCESS_TOKEN,
                            "client_secret": process.env.CLIENT_SECRET,
                            "redirect_url": "https://www.stravasegmenthunter.com/"
                        });

                        strava.clubs.get(req.body.clubId, function (err, data) {
                            console.log(data)
                            res.send({
                                clubName: data.name,
                                clubIcon: data.profile,
                                statusCode: data.statusCode
                            })
                        })
                    }
                }
            })
        } else {
            res.send({
                clubName: "",
                clubIcon: "",
                statusCode: 1501
            })
        }
    })
})

module.exports = router