const booking = require("../router/booking")
const boat = require("../router/boat")
const dashboard = require("../router/dashboard")
const meal = require("../router/meal")
const pricing = require("../router/pricing")


const routeHandlingMiddleware = (app) => {
    app.use("/booking", booking)
    app.use("/boat", boat)
    app.use("/dashboard", dashboard)
    app.use("/meal", meal)
    app.use("/pricing", pricing)
}

module.exports = { routeHandlingMiddleware }