var mongoose = require("mongoose");

const segBacklogSchema = new mongoose.Schema({
    segmentId: Number,
    name: String,
    dateDeleted: Date
})

module.exports = segBacklogSchema;

