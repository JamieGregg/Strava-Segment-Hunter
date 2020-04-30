const router = require("express").Router()
const Joi = require("Joi")
const User = require("../../models/user")
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY)

router.get("/subscribe", async (request, response) => {
    const customer = await stripe.customers.create({
        payment_method: request.query.paymentId,
        email: request.email,
        invoice_settings: {
            default_payment_method: request.query.paymentId
        }
    })

    const subscription = await stripe.subscriptions.create({
        customer: customer.id,
        items: [{
            plan: 'plan_HC0nbotstwur6e'
        }],
        expand: ["latest_invoice.payment_intent"]
    })

    User.register({
        username: request.body.username
    }, request.body.password, function (err, user) {
        console.log("Registered")
        if (err) {
            console.log(err)
            response.redirect("/signup")
        } else {
            passport.authenticate('local')(req, res, function () {
                var query = {
                    username: user.username
                };
                var update = {
                    clubName: request.body.clubName,
                    clubId: request.body.clubId,
                    stripeId: customer.id
                }
                var options = {
                    upsert: true,
                    'new': true,
                    'useFindAndModify': true
                };

                User.update(query, update, options, function (err, doc) {
                    console.log(doc);
                });

                var strava = new require("strava")({
                    "client_id": process.env.CLIENT_ID,
                    "access_token": process.env.ACCESS_TOKEN,
                    "client_secret": process.env.CLIENT_SECRET,
                    "redirect_url": "https://www.stravasegmenthunter.com/"
                });

                strava.clubs.get(request.body.clubId, function (err, data) {
                    // a document instance
                    var newClub = new ClubData({
                        alais: request.body.clubName,
                        clubId: request.body.clubId,
                        clubName: data.name
                    });

                    // save model to database
                    newClub.save(function (err, club) {
                        if (err) return console.error(err);
                    });
                })
                regEmail(request.body.clubName, user.username)

                response.redirect('/adminDashboard');
            })
        }
    })
})

module.exports = router
