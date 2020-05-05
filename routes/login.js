require('dotenv').config();
var express = require("express");
var router = express.Router();
const passport = require('passport')
var User = require("../models/user");
var async = require("async");
var nodemailer = require("nodemailer");
var crypto = require("crypto");

router.use(passport.initialize());
router.use(passport.session());

router.get("/login", function (req, res) {
    res.render('login', {
        invalidPassword: ""
    })
})

router.get("/login-failed", function (req, res) {
    res.render('login', {
        invalidPassword: "Incorrect username or password"
    })
})

router.get("/loginFailed", function (req, res) {
    res.redirect('/login-failed')
})

router.post('/login', passport.authenticate('local', {
    successRedirect: '/admin-dashboard',
    failureRedirect: '/login-failed'
}));

router.get('/forgot-password', function (req, res) {
    res.render('forgot', {
        invalidEmail: ""
    })
})

router.post('/forgot-password', function (req, res, next) {
    try {
        async.waterfall([
            function (done) {
                crypto.randomBytes(20, function (err, buf) {
                    var token = buf.toString('hex');
                    done(err, token);
                });
            },
            function (token, done) {
                User.findOne({
                    username: req.body.emailForgotten
                }, function (err, user) {
                    if (!user) {
                        res.send({
                            response: 'No account with that email address exists.'
                        })
                    }
                    try{
                         user.resetPasswordToken = token;
                         user.resetPasswordTokenExpires = Date.now() + 3600000; // 1 hour
                    } catch {
                        res.send({
                            response: 'Try again...'
                        })
                    }
                   
                    user.save(function (err) {
                        done(err, token, user);
                    });
                });
            },
            function (token, user, done) {
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
                    to: user.username,
                    from: 'contact@stravasegmenthunter.com',
                    subject: 'Strava Segment Hunter Password Reset',
                    text: 'You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n' +
                        'Please click on the following link, or paste this into your browser to complete the process:\n\n' +
                        'https://' + req.headers.host + '/reset/' + token + '\n\n' +
                        'If you did not request this, please ignore this email and your password will remain unchanged.\n'
                };
                smtpTransport.sendMail(mailOptions, function (err) {
                    console.log('mail sent');
                    res.send({
                        response: "Success, An e-mail has been sent to " + user.username + " with further instructions."
                    })
                });
            }
        ], function (err) {
            if (err) return next(err);
            res.redirect('/forgot-password');
        });
    } catch {
        res.send({
            response: 'Try again...'
        })
    }
    
});

router.get('/reset/:token', function (req, res) {
    User.findOne({
        resetPasswordToken: req.params.token,
        resetPasswordTokenExpires: {
            $gt: Date.now()
        }
    }, function (err, user) {
        if (!user) {
            res.render('forgot-password', {
                response: 'Password reset token is invalid or has expired.'
            })
        }
        res.render('reset', {
            token: req.params.token,
            response: ""
        });
    });
});

router.post('/reset/:token', function (req, res) {
    async.waterfall([
        function (done) {
            User.findOne({
                resetPasswordToken: req.params.token,
                resetPasswordTokenExpires: {
                    $gt: Date.now()
                }
            }, function (err, user) {
                if (!user) {
                    res.render('forgot-password', {
                        response: 'Password reset token is invalid or has expired.'
                    })
                }
                if (req.body.password === req.body.passwordRetyped) {
                    user.setPassword(req.body.password, function (err) {
                        user.resetPasswordToken = undefined;
                        user.resetPasswordExpires = undefined;

                        user.save(function (err) {
                            req.logIn(user, function (err) {
                                done(err, user);
                            });
                        });
                    })
                } else {
                    res.render('reset', {
                        response: 'Passwords do not match',
                        token: req.params.token
                    })
                }
            });
        },
        function (user, done) {
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
                to: user.username,
                from: 'contact@stravasegmenthunter.com',
                subject: 'Your password has been changed',
                text: 'Hello,\n\n' +
                    'This is a confirmation that the password for your account ' + user.username + ' has just been changed.\n'
            };
            smtpTransport.sendMail(mailOptions, function (err) {
                res.redirect('/admin-dashboard');
                done(err);
            });
        }
    ], function (err) {
        res.redirect('/admin-dashboard');
    });
});

module.exports = router;