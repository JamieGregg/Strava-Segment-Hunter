//Setting up modules
const express = require('express')
const bodyParser = require('body-parser')
require('dotenv').config();
const app = express();
app.use(bodyParser.urlencoded({extended: false}))
var strava = new require("strava")({
  "access_token"  : process.env.ACCESS_TOKEN,
  "client_id"     : process.env.CLIENT_ID,
  "client_secret" : process.env.CLIENT_SECRET,
  "redirect_url"  : "www.google.com"
});

app.get('/', (req, res) => {
  //findAthlete();
  //findClub();

  res.send("hello")
});

app.listen(8000, () => {
  console.log("server is now running")
  findClubMembers();
});

function findAthlete(){
  strava.athlete.get(function(err, res) {
        console.log(res);
    });
}

function findClub(){
  strava.clubs.get(55274, function(err,res){
    console.log(res);
  })
}

function findClubMembers(){
  var params = {
    "id": 55274,
    "page" : 1,
    "per_page": 100
  }

  strava.clubs.members.get(55274, params, function(err,data){
    //parseJsonAsync(data).then(jsonData => console.log(jsonData))
    //console.log(obj.firstname)
    var obj = JSON.stringify(data);
    var objJSON = JSON.parse(obj);
    console.log(objJSON[1].firstname);
  })
}

const parseJsonAsync = (jsonString) => {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve(JSON.parse(jsonString))
    })
  })
}
