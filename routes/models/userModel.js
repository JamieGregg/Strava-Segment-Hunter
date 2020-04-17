const mongoose = require("./routes/databaseConnection.js");
const schema = new mongoose.Schema({
  username: String,
  password: String,
  clubName: String,
  clubId: Number
})
const collectionName = "User";
const userSchema = mongoose.Schema(schema);
const User = mongoose.model(collectionName, userSchema);
module.exports = User;
