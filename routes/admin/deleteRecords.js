require('dotenv').config();
const express = require("express"),
 router = express.Router(),
 resultsSchema = require("../../models/results"),
 User = require("../../models/user"),
 passport = require('passport'),
 mongoose = require('mongoose')

router.use(passport.initialize());
router.use(passport.session());

router.delete('/deleteDatabase', function (req, res) {
   User.findOne({
         username: req.user.username
      },
      function (err, obj) {
         var clubId = obj.clubId

         const everyone = mongoose.model(clubId + "s", resultsSchema)
         const master = mongoose.model(clubId + "masters", resultsSchema)
         const males = mongoose.model(clubId + "ms", resultsSchema)
         const females = mongoose.model(clubId + "fs", resultsSchema)
         const masterFemales = mongoose.model(clubId + "masterfs", resultsSchema)
         const masterMales = mongoose.model(clubId + "masterms", resultsSchema)

         try {
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
         } catch {
            console.log("Error thrown deleting leaderboards")
         }
      })
})

module.exports = router