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


app.use(express.static(__dirname + '/public'));

app.get('/', (req, res) => {
  res.sendFile('public/index.html', {root: __dirname })

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
    "per_page": findClubMembership
  }

  strava.clubs.members.get(55274, params, function(err,data){
    var objJSON = JSON.parse(JSON.stringify(data));
    console.log(objJSON);
  });
}

function findClubMembership(){
  strava.clubs.get(55274, function(err,res){
    var objJSON = JSON.parse(JSON.stringify(res.member_count))
    return objJSON
  })
}
