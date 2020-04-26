var mongoose = require("mongoose");

const resultsSchema = new mongoose.Schema({
    points: Number,
    name: String,
})

module.exports = resultsSchema