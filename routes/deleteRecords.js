require('dotenv').config();
var express = require("express");
var router = express.Router();
const resultsSchema = require("../models/results")
var User = require("../models/user");
const passport = require('passport')
const mongoose = require('mongoose')

router.use(passport.initialize());
router.use(passport.session());

router.delete('/deleteDatabase', function(req,res){
    console.log("called")
    User.findOne({ username: req.user.username}, 
        function (err, obj) {
            var clubId = obj.clubId

            const everyone = mongoose.model(clubId + "s", resultsSchema)
            const master = mongoose.model(clubId + "masters", resultsSchema)
            const males = mongoose.model(clubId + "ms", resultsSchema)
            const females = mongoose.model(clubId + "fs", resultsSchema)
            const masterFemales = mongoose.model(clubId + "masterfs", resultsSchema)
            const masterMales = mongoose.model(clubId + "masterms", resultsSchema)

            everyone.deleteMany({}, function (err, result) {
                console.log("Deleted everyone")
            });

            master.deleteMany({}, function (err, result) {
               console.log("Deleted Masters")
            });

            males.deleteMany({}, function (err, result) {
               console.log("Deleted Males")
            });

             females.deleteMany({}, function (err, result) {
                console.log("Deleted Females")
             });

             masterMales.deleteMany({}, function (err, result) {
               console.log("Deleted Masters Male")
             });

              masterFemales.deleteMany({}, function (err, result) {
                console.log("Deleted Masters Female")
              });
        })
})

module.exports = router