const express = require("express")
const { mealController } = require("../controller/meal")
const router = express.Router()

router.get("/getStatistics", mealController.getStatistics)
router.get("/getMealBoatViaDetails", mealController.getMealBoatViaDetails)
router.get("/getBookingOverview", mealController.getBookingOverview)

module.exports = router