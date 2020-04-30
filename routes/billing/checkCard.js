const router = require("express").Router()
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY)
const User = require("../../models/user")
const passport = require('passport')
const ClubData = require("../../models/clubdata")
const nodemailer = require('nodemailer')

router.post("/check-card", async (request, response) => {
    stripe.paymentMethods.create({
        type: "card",
        card: {
            number: request.body.number,
            exp_month: request.body.exp_month,
            exp_year: request.body.exp_year,
            cvc:request.body.cvc
        }
    }, async (paymentError, paymentMethod) => {
        if (!paymentError) {
            const customer = await stripe.customers.create({
                payment_method: paymentMethod.id,
                email: request.body.username,
                invoice_settings: {
                    default_payment_method: paymentMethod.id
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
            }, request.body.password, async function (err, user) {
                console.log("Registered")
                if (err) {
                    console.log(err)
                    response.redirect("/signup")
                } else {
                    passport.authenticate('local')(request, response, function () {
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
        } else {
            // The credit card has an issue
            response.status(400).json({
                message: `Could not verify card ${request.body.number.substring(0, 6)}... with Stripe?`
            })
        }
    })
    
})

function regEmail(clubName, email) {
    var smtpTransport = nodemailer.createTransport({
        host: "smtpout.secureserver.net",
        secure: true,
        secureConnection: false, // TLS requires secureConnection to be false
        tls: {
            ciphers: 'SSLv3'
        },
        requireTLS: true,
        port: 465,
        debug: true,
        auth: {
            user: 'contact@stravasegmenthunter.com',
            pass: process.env.EMAIL_PASSWORD
        }
    });
    var mailOptions = {
        to: email,
        from: 'contact@stravasegmenthunter.com',
        subject: 'Welcome to Strava Segment Hunter',
        html: '<h3>Welcome to Strava Segment Hunter!</h3><br>' +
            'You now have access to the Strava Segment Hunter admin dashboard for ' + clubName + '. This gives you have the ability to add and remove segments on the leaderboard.<br>' +
            '<h3>So what next?</h3> We suggest adding in 4 segments to get started, this gives you enough time to get up to speed with the site and allow competitors to plan ahead.<br><br>' +
            'If you have any queries, suggestions or issues please do not hesitate to get in contact with us.' +
            '<br><br>Thanks again for your support,<br>' +
            'Jamie<br>' +
            'Strava Segment Hunter'
    };
    smtpTransport.sendMail(mailOptions, function (err) {
        console.log('mail sent');
    });
}

module.exports = router
