var mongoose = require("mongoose");
var passportLocalMongoose = require("passport-local-mongoose");

const userSchema = new mongoose.Schema({
  username: String,
  password: String,
  clubName: String,
  clubId: Number,
  resetPasswordToken: String,
  resetPasswordTokenExpires: Date
})

userSchema.plugin(passportLocalMongoose)

module.exports = mongoose.model("User", userSchema);
