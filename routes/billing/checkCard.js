require('dotenv').config();
const router = require("express").Router(),
    stripe = require("stripe")(process.env.STRIPE_SECRET_KEY),
    User = require("../../models/user"),
    passport = require('passport'),
    ClubData = require("../../models/clubdata"),
    nodemailer = require('nodemailer'),
    timestamp = require('unix-timestamp')

router.post("/check-card", async (request, response) => {
    stripe.paymentMethods.create({
        type: "card",
        card: {
            number: request.body.number,
            exp_month: request.body.exp_month,
            exp_year: request.body.exp_year,
            cvc: request.body.cvc
        }
    }, async (paymentError, paymentMethod) => {
        if (!paymentError) {
            try {
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
                        plan: process.env.STRIPE_PLAN
                    }],
                    trial_end: Math.round(timestamp.add(timestamp.now(), '2w')),
                    expand: ["latest_invoice.payment_intent"]
                })

                User.register({
                    username: request.body.username
                }, request.body.password, async function (err, user) {
                    if (err) {
                        console.log(err)
                        response.redirect("/signup")
                    } else {
                        passport.authenticate('local')(request, response, function () {
                            var query = {
                                username: request.body.username
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
                                if (err) {
                                    console.log(err)
                                } else {
                                    console.log(doc);
                                }
                            });

                            try {
                                // a document instance
                                var newClub = new ClubData({
                                    alais: request.body.clubName,
                                    clubId: request.body.clubId,
                                    clubName: request.body.clubName,
                                    timezone: request.body.timezone
                                });

                                // save model to database
                                newClub.save(function (err, club) {
                                    if (err) return console.error(err);
                                });

                                regEmail(request.body.clubName, user.username)
                                response.render('pages/welcome');

                            } catch {
                                console.log("saving issue")
                            }
                        })
                    }
                })
            } catch {
                response.render('pages/signup-confirmation', {
                    clubName: request.body.clubName,
                    clubId: request.body.clubId,
                    password: request.body.password,
                    username: request.body.username,
                    time: request.body.timezone,
                    paymentError: 'Wow, something went wrong on our end... Please try and log in before making another attempt'
                })
            }
        } else {
            // The credit card has an issue
            response.render('pages/signup-confirmation', {
                clubName: request.body.clubName,
                clubId: request.body.clubId,
                password: request.body.password,
                username: request.body.username,
                time: request.body.timezone,
                paymentError: 'Oops, we could not verify this card.'
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
            'You now have access to the Strava Segment Hunter Admin Dashboard for ' + clubName + '. This gives you the ability to add and remove segments on the leaderboard.<br>' +
            '<h3>So what next?</h3> We suggest adding in 5 segments to get started, this gives you enough time to get up to speed with the site and allow competitors to plan ahead.<br><br>' +
            'If you have any queries, suggestions or issues please do not hesitate to get in contact with us.' +
            '<br><br>Thanks again for your support,<br>' +
            'Strava Segment Hunter'
    };
    smtpTransport.sendMail(mailOptions, function (err) {
        if (err) {
            console.log(err)
        } 
    });
}

module.exports = router