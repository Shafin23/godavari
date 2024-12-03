const express = require("express")
const { boatController } = require("../controller/boat")
const upload = require("../middleware/fileUploadMiddleware")
const router = express.Router()

router.post("/addBoat", upload.array("photos", 10), boatController.addBoat)
router.get("/getBoatList", boatController.getBoatList)
router.put("/updateActiveStatusOfBoat/:id", boatController.updateActiveStatusOfBoat)
router.get("/getBoatById/:id", boatController.getBoatById)

module.exports =  router 