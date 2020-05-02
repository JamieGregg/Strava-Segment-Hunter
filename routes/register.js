require('dotenv').config();
var express = require("express");
var router = express.Router();
const passport = require('passport')
const session = require('express-session')
var User = require("../models/user");
const ClubData = require("../models/clubdata")
const bodyParser = require('body-parser')
router.use(bodyParser.urlencoded({
    extended: false
}))

router.use(session({
    secret: process.env.HASH_KEY,
    resave: false,
    saveUninitialized: false
}))

router.use(passport.initialize());
router.use(passport.session());

passport.use(User.createStrategy())
passport.serializeUser(User.serializeUser())
passport.deserializeUser(User.deserializeUser())


router.get('/signup', function (req, res) {
    res.render('signup')
})

router.post('/registering', function (req, res) {
    res.render('signup-confirmation', {
        clubName: req.body.clubName,
        clubId: req.body.clubId,
        password: req.body.password,
        username: req.body.username,
        paymentError: ''
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

router.get('/register', function(req,res){
    res.render('signup')
})

module.exports = router