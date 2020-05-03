var mongoose = require("mongoose");

const segClubData = new mongoose.Schema({
    clubName: String,
    clubId: Number,
    alais: String,
    timezone: Number
})

module.exports = mongoose.model("clubData", segClubData);