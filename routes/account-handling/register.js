require('dotenv').config();
const express = require("express"),
    router = express.Router(),
    passport = require('passport'),
    session = require('express-session'),
    User = require("../../models/user"),
    ClubData = require("../../models/clubdata"),
    bodyParser = require('body-parser')

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
    res.render('pages/signup')
})

router.post('/registering', function (req, res) {
    res.render('pages/signup-confirmation', {
        clubName: req.body.clubName,
        clubId: req.body.clubId,
        password: req.body.password,
        username: req.body.username,
        time: req.body.timezone,
        paymentError: ''
    })
})

router.post('/validateClub', async function (req, res) {
    ClubData.findOne({
        clubId: req.body.clubId
    }, function (err, obj) {
        if (err) {
            res.send({
                clubName: "",
                clubIcon: "",
                statusCode: 404
            })
        } else {
            if (obj === 'NULL' || obj === 'null' || obj === null) {
                var strava = new require("strava")({
                    "client_id": process.env.CLIENT_ID,
                    "access_token": process.env.ACCESS_TOKEN,
                    "client_secret": process.env.CLIENT_SECRET,
                    "redirect_url": "https://www.stravasegmenthunter.com/"
                });

                User.findOne({
                    username: req.body.email
                }, function (err, obj) {
                    if (err) {
                        res.send({
                            clubName: "",
                            clubIcon: "",
                            statusCode: 404
                        })
                    } else {
                        if (obj === 'NULL' || obj === 'null' || obj === null) {
                            strava.clubs.get(req.body.clubId, function (err, data) {
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
                                statusCode: 1501
                            })
                        }
                    }
                })
            } else {
                res.send({
                    clubName: "",
                    clubIcon: "",
                    statusCode: 1500
                })
            }
        }
    })
})

router.get('/register', function (req, res) {
    res.render('pages/signup')
})

module.exports = router