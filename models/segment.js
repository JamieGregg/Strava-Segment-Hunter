var mongoose = require("mongoose");

const segCodeSchema = new mongoose.Schema({
    counterId: Number,
    segmentId: Number,
    name: String,
    grade: Number,
    distance: String,
    efforts: Number,
    alais: String
})

module.exports = mongoose.model("55274Segment", segCodeSchema)