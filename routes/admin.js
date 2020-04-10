require('dotenv').config();
const express = require('express')
const bodyParser = require('body-parser')
const mongoose = require('mongoose')
const router = express.Router();

mongoose.connect('mongodb+srv://' + process.env.DB_USERNAME + ':' + process.env.DB_PASSWORD + '@cluster0-tnkii.mongodb.net/' + process.env.DB_REG_NAME, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  }).then(() => console.log('Connected to MongoDB...'))
  .catch(err => console.error('Could not connect to mongoDB', err));

const userSchema = {
  email: String,
  password: String,
  clubName: String,
  clubId: Number
}

const User = new mongoose.model("User", userSchema)

router.use(bodyParser.urlencoded({
  extended: false
}))

router.use(express.static(__dirname + '/public-updated'));

router.get('/signup', function(req,res){
  res.render('signup')
})

router.post('/register', function(req,res){
  const newUser = new User({
    email: req.body.emailAddress,
    password: req.body.password,
    clubName: req.body.clubName,
    clubId: req.body.clubId
  })

  newUser.save(function(err){
    if(err){
      console.log(err)
    } else {
      res.send("Registered")
    }
  })
})

router.post('/login', function(req,res){
  const email = req.body.emailAddress
  const password = req.body.password

  User.findOne({email: email}, function(err, foundUser){
    if(err){
      console.log(err)
    } else {
      if(foundUser){
        if(foundUser.password == password){
          res.send(email + " has been logged in")
        }
      }
    }
  })
})

module.exports = router
