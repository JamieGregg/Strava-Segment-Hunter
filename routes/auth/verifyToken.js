const jsonwebtoken = require("jsonwebtoken")
const User = require("../../models/User")

/* Use this middleware if a route requires the user to be logged in */

module.exports = function (request, response, next) {
    const token = request.header("token")

    if (token) {
        // Set the email for the request
        request.email = jsonwebtoken.verify(token, process.env.TOKEN_SECRET)

        // Ensure user associated with token exists.
        const query = {
            email: request.email
        }

        User.findOne(query, (err, res) => {
            if (!err) {
                next() // "Next middleware"
            } else {
                response.status(401).json({
                    message: "Access Denied; try signing in again?"
                })
            }
        })
    } else {
        response.status(401).json({
            message: "Access Denied; try signing in again?"
        })
    }
}
