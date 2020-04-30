var mongoose = require("mongoose");
var passportLocalMongoose = require("passport-local-mongoose");

const userSchema = new mongoose.Schema({
  username: String,
  password: String,
  clubName: String,
  clubId: Number,
  resetPasswordToken: String,
  resetPasswordTokenExpires: Date,
  stripeId: String
})

userSchema.plugin(passportLocalMongoose)

module.exports = mongoose.model("User", userSchema);
