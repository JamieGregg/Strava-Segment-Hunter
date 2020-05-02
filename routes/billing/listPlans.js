const router = require("express").Router()
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY)

router.get("/plans", async (request, response) => {
    let plans = await stripe.plans.list({
        "product": "prod_HC0nFm7XrWw1D0",
        "interval": "year",
        "currency": "gbp"
    })

    response.json(plans)
})

module.exports = router
