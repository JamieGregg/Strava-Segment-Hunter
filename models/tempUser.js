var mongoose = require("mongoose");

const tempUser = new mongoose.Schema({
    clubName: String,
    clubId: Number,
    username: String,
    password: String,
})

module.exports = tempUser