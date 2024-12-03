const express = require("express")
const { pricingController } = require("../controller/pricing")
const router = express.Router()

router.get("/getBoatsWithPrices", pricingController.getBoatsWithPrices)
router.put("/updatePrice/:id", pricingController.updatePrice)

module.exports = router