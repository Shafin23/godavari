const express = require("express");
const { bookingController } = require("../controller/booking");
const router = express.Router()

router.post("/phoneNumber", bookingController.phoneNumber)
router.post("/book", bookingController.book)
router.put("/cancelBooking", bookingController.cancelBooking)
router.get("/getBookingData", bookingController.getBookingData)
router.get("/getCancelledBookings", bookingController.getCancelledBookings)
router.get("/getBookingsWithInsurance", bookingController.getBookingsWithInsurance)
router.get("/getBookingsWithTourGuide", bookingController.getBookingsWithTourGuide)
router.get("/getTodaysBookings", bookingController.getTodaysBookings)
router.get("/getBookingById/:bookingID", bookingController.getBookingById)
router.get("/getBookingByIdForMobile/:bookingID", bookingController.getBookingByIdForMobile)

module.exports = router 