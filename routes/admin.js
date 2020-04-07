require('dotenv').config();
const express = require('express')
const bodyParser = require('body-parser')
const router = express.Router();

router.use(bodyParser.urlencoded({
  extended: false
}))

router.use(express.static(__dirname + '/public-updated'));

router.get('/signup', function(req,res){
  res.render('signup')
})

module.exports = router
