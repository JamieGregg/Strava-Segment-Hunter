require('dotenv').config();
var express = require("express");
var router = express.Router();
const passport = require('passport')
const session = require('express-session')
const paypal = require('paypal-rest-sdk')
var User = require("../models/user");
const nodemailer =  require('nodemailer')
const ClubData = require("../models/clubdata")
const bodyParser = require('body-parser')
const cors = require("cors")
const Joi = require('joi');
const stripe = require("stripe")(process.env.STRIPE_SECRET)
router.use(bodyParser.urlencoded({
    extended: false
}))

//const tempUser = require("../models/tempUser")
var tempUser = {
        username: "",
        password: "",
        clubName: "",
        clubId: ""
};

router.use(session({
    secret: process.env.HASH_KEY,
    resave: false,
    saveUninitialized: false
}))

router.use(passport.initialize());
router.use(passport.session());

passport.use(User.createStrategy())
passport.serializeUser(User.serializeUser())
passport.deserializeUser(User.deserializeUser())

paypal.configure({
    'mode': 'sandbox', //sandbox or live
    'client_id': process.env.PAYPAL_CLIENT,
    'client_secret': process.env.PAYPAL_SECRET
});

router.get('/signup', function (req, res) {
    res.render('signup')
})

const schema = Joi.object({
    plan_id: Joi.string()
        .required(),
    payment_method: Joi.string()
        .required()
})

router.post('/register', function (req, res) {     
    // Case 2: first time ever subscribing.
    const customer = await stripe.customers.create({
        payment_method: request.body.payment_method,
        email: request.email,
        invoice_settings: {
            default_payment_method: request.body.payment_method
        }
    })

    const subscription = await stripe.subscriptions.create({
        customer: customer.id,
        items: [{
            plan: 'plan_HC0nbotstwur6e'
        }],
        expand: ["latest_invoice.payment_intent"]
    })

    user.stripeId = customer.id
    await user.save()

    response.json({
        message: `Thank you ${request.email} for your first subscription!`
    })
})

const schema = Joi.object({
    number: Joi.string()
        .trim()
        .creditCard()
        .required(),
    exp_month: Joi.string()
        .trim()
        .length(2)
        .required(),
    exp_year: Joi.string()
        .trim()
        .length(2)
        .required(),
    cvc: Joi.string()
        .trim()
        .required()
})

router.post("/check_card", async (request, response) => {
    const {
        error
    } = schema.validate(request.body)
    if (error) {
        response.status(400).json({
            message: error.details[0].message
        })
    } else {
        stripe.paymentMethods.create({
            type: "card",
            card: {
                number: request.body.number,
                exp_month: request.body.exp_month,
                exp_year: request.body.exp_year,
                cvc: request.body.cvc
            }
        }, (paymentError, paymentMethod) => {
            if (!paymentError) {
                // The credit card is valid
                response.json({
                    message: `Card "${paymentMethod.card.brand}" is OK with Stripe!`,
                    payment_method: paymentMethod.id
                })
            } else {
                // The credit card has an issue
                response.status(400).json({
                    message: `Could not verify card ${request.body.number.substring(0, 6)}... with Stripe?`
                })
            }
        })
    }
})

router.get("/plans", async (request, response) => {
    let plans = await stripe.plans.list({
        "product": "prod_HC0nFm7XrWw1D0",
        "interval": "year",
        "currency": "gbp"
    })

    response.json(plans)
})

/*router.post('/register', function (req, res) {
    tempUser = {
        username: req.body.username,
        password: req.body.password,
        clubName: req.body.clubName,
        clubId: req.body.clubId
    }

    const create_payment_json = {
        "intent": "sale",
        "payer": {
            "payment_method": "paypal"
        },
        "redirect_urls": {
            "return_url": "http://localhost:8000/success",
            "cancel_url": "http://localhost:8000/signUp"
        },
        "transactions": [{
            "item_list": {
                "items": [{
                    "name": "Strava Segment Hunter",
                    "sku": "001",
                    "price": "9.99",
                    "currency": "GBP",
                    "quantity": 1
                }]
            },
            "amount": {
                "currency": "GBP",
                "total": "9.99"
            },
            "description": "A subscription to Strava Segment Hunter allowing for admin access for segment management"
        }] 
    };

    paypal.payment.create(create_payment_json, function (error, payment) {
        if (error) {
            throw error;
        } else {
            for ( let i = 0; i < payment.links.length; i++){
                if ( payment.links[i].rel === 'approval_url'){
                    res.redirect(payment.links[i].href)
                }
            }
        }
    });
})*/


/*router.get('/success', function(req,res){
    res.render('signup-confirmation', {
        clubName: tempUser.clubName,
        clubId: tempUser.clubId,
        password: tempUser.password,
        username: tempUser.username
    })

    const payerId = req.query.PayerID
    const paymentId = req.query.paymentId

    const execute_payment_json = {
        "payer_id": payerId,
        "transactions": [{
            "amount": {
                "currency": "GBP",
                "total": "9.99"
            }
        }]
    }

    paypal.payment.execute(paymentId, execute_payment_json, function (error, payment) {
        if (error) {
            console.log(error.response)
        } else {
            console.log("Get payment response")
            console.log(JSON.stringify(payment))
        }
    })
})*/

/*router.post('/confirm-payment', function(req, res){
    console.log(req.body.username)
    User.register({
        username: req.body.username
    }, req.body.password, function (err, user) {
        console.log("Registered")
        if (err) {
            console.log(err)
            res.redirect("/signup")
        } else {
            passport.authenticate('local')(req, res, function () {
                var query = {
                    username: user.username
                };
                var update = {
                    clubName: req.body.clubName,
                    clubId: req.body.clubId
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

                 strava.clubs.get(req.body.clubId, function (err, data) {
                     // a document instance
                     var newClub = new ClubData({
                         alais: req.body.clubName,
                         clubId: req.body.clubId,
                         clubName: data.name
                     });

                     // save model to database
                     newClub.save(function (err, club) {
                         if (err) return console.error(err);
                     });
                 })
                regEmail(req.body.clubName, user.username)
                
                res.redirect('/adminDashboard');
            })
        }
    })
})*/



router.post('/validateClub', async function (req, res) {
    User.findOne({
        username: req.body.email
    }, function (err, person) {
        if (!person) {
            ClubData.findOne({
                clubId: req.body.clubId
            }, function (err, obj) {
                console.log(obj)
                if (err) {
                    res.send({
                        clubName: "",
                        clubIcon: "",
                        statusCode: 404
                    })
                } else {
                    try {
                        if (obj.length === 0 || obj === 'NULL') {
                            var strava = new require("strava")({
                                "client_id": process.env.CLIENT_ID,
                                "access_token": process.env.ACCESS_TOKEN,
                                "client_secret": process.env.CLIENT_SECRET,
                                "redirect_url": "https://www.stravasegmenthunter.com/"
                            });

                            strava.clubs.get(req.body.clubId, function (err, data) {
                                console.log(data)
                                res.send({
                                    clubName: data.name,
                                    clubIcon: data.profile,
                                    statusCode: data.statusCode
                                })
                            })
                        } else {
                            res.send({
                                clubName: "",
                                clubIcon: "",
                                statusCode: 1500
                            })
                        }
                    } catch {
                        var strava = new require("strava")({
                            "client_id": process.env.CLIENT_ID,
                            "access_token": process.env.ACCESS_TOKEN,
                            "client_secret": process.env.CLIENT_SECRET,
                            "redirect_url": "https://www.stravasegmenthunter.com/"
                        });

                        strava.clubs.get(req.body.clubId, function (err, data) {
                            console.log(data)
                            res.send({
                                clubName: data.name,
                                clubIcon: data.profile,
                                statusCode: data.statusCode
                            })
                        })
                    }
                }
            })
        } else {
            res.send({
                clubName: "",
                clubIcon: "",
                statusCode: 1501
            })
        }
    })
})

function regEmail(clubName, email){
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
        html: '<h3>Welcome to Strava Segment Hunter!</h3><br>'
        +'You now have access to the Strava Segment Hunter admin dashboard for ' + clubName + '. This gives you have the ability to add and remove segments on the leaderboard.<br>'
        +'<h3>So what next?</h3> We suggest adding in 4 segments to get started, this gives you enough time to get up to speed with the site and allow competitors to plan ahead.<br><br>'
        +'If you have any queries, suggestions or issues please do not hesitate to get in contact with us.'
        +'<br><br>Thanks again for your support,<br>' 
        +'Jamie<br>'
        +'Strava Segment Hunter'
    };
    smtpTransport.sendMail(mailOptions, function (err) {
        console.log('mail sent');
    });
    
}

router.get('/register', function(req,res){
    res.render('signup')
})

module.exports = router