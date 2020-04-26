var mongoose = require("mongoose");

const segClubData = new mongoose.Schema({
    clubName: String,
    clubId: Number,
    alais: String
})

module.exports = mongoose.model("clubData", segClubData);