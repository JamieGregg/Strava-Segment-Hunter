require('dotenv').config();
const router = require("express").Router()

router.get('/FAQ', function (req, res) {
    if (req.isAuthenticated(req, res)) {
        res.render('pages/FAQ', {
            isAuthenticated: true
        })
    } else {
        res.render('pages/FAQ', {
            isAuthenticated: false
        })
    }
})

module.exports = router