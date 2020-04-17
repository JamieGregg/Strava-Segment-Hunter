require('dotenv').config();
const express = require('express')
const bodyParser = require('body-parser')
const mongoose = require('mongoose')
const session = require('express-session')
const passport = require('passport')
const passportLocalMongoose = require('passport-local-mongoose')
const router = express.Router();

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

const userSchema = new mongoose.Schema({
  username: String,
  password: String,
  clubName: String,
  clubId: Number
})
userSchema.plugin(passportLocalMongoose)
const User = mongoose.model("User", userSchema)
passport.use(User.createStrategy())
passport.serializeUser(User.serializeUser())
passport.deserializeUser(User.deserializeUser())

const segCodeSchema = new mongoose.Schema({
  counterId: Number,
  segmentId: Number,
  name: String
})

router.post('/register', function(req, res) {
  var clubName = req.body.clubName
  var clubId = req.body.clubId

  User.register({
    username: req.body.username
  }, req.body.password, function(err, user) {
    console.log("Registered")
    if (err) {
      console.log(err)
      res.redirect("/signup")
    } else {
      passport.authenticate('local')(req, res, function() {
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

        User.update(query, update, options, function(err, doc) {
          console.log(doc);
        });

        res.redirect('/adminDashboard');
      })
    }
  })
})

router.post('/validateClub', function(req,res){
  var strava = new require("strava")({
    "client_id": process.env.CLIENT_ID,
    "access_token": process.env.ACCESS_TOKEN,
    "client_secret": process.env.CLIENT_SECRET,
    "redirect_url": "https://www.stravasegmenthunter.com/"
  });

  strava.clubs.get(req.body.clubId, function(err, data){
    console.log(data)
    res.send({
      clubName: data.name,
      clubIcon: data.profile,
      statusCode: data.statusCode
    })
  })
})

router.get('/signup', function(req, res) {
  res.render('signup')
})

router.get("/login", function(req, res) {
  res.render('login', {
    invalidPassword: ""
  })
})

router.get("/loginFailed", function(req, res) {
  res.render('login', {
    invalidPassword: "Incorrect username or password"
  })
})

router.get('/adminDashboard', function(req, res) {
  if (req.isAuthenticated(req, res)) {
    console.log("Authentication Complete")
    loadAdminBoard(req, res);
  } else {
    res.redirect("login")
  }
})

router.post('/login', passport.authenticate('local', {
  successRedirect: '/adminDashboard',
  failureRedirect: '/loginFailed'
}));


function loadAdminBoard(req, res) {
  User.findOne({
    username: req.user.username
  }, function(err, obj) {
    res.render('admindash', {
      clubName: obj.clubName,
      clubId: obj.clubId,
      segment: ""
    })
  })
}

router.post('/addSegment', async function(req, res) {
  await User.findOne({
    username: req.user.username
  }, function(err, obj) {
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
      .exec(function(err, member) {
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

          strava.segments.get(req.body.segmentId, async function(err, info) {
            console.log(info.name)

            var newSegment = new collection({
              counterId: lastCounter,
              segmentId: req.body.segmentId,
              name: info.name
            });

            // save model to database
            newSegment.save(function(err, segment) {
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

router.get('/upcomingSegments', async function(req, res) {
  User.findOne({
    username: req.user.username
  }, function(err, obj) {

    var segmentList = [];
    var clubId = obj.clubId;

    const collection = mongoose.model(clubId + "segments", segCodeSchema)
    collection.find(async function(err, data) {
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
    }).exec(function(err, docs) {
      console.log(err);
    });
  })
})

function showSegments(res, segInfo) {
  segInfo.sort(sortCounter)
  res.send({
    segment: segInfo
  })
}

router.post('/deleteSegment', function(req, res) {
  console.log("called")
  User.findOne({
    username: req.user.username
  }, function(err, obj) {
    var segmentName = req.body.segmentName;
    console.log(segmentName)
    var clubId = obj.clubId
    console.log(clubId)

    const collection = mongoose.model(clubId + "segments", segCodeSchema)

    collection.remove({
      name: segmentName
    }, function(err) {
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


module.exports = router
