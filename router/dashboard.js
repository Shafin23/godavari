const express = require("express")
const { dashboardController } = require("../controller/dashboard")

const router = express.Router()

router.get("/getGraphOfBookedSeat", dashboardController.getGraphOfBookedSeat)
router.get("/getStatsForGraph", dashboardController.getStatsForGraph)
router.get("/getTotalBookingsAndCancellations", dashboardController.getTotalBookingsAndCancellations)

module.exports = router