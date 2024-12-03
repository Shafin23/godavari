const mongoose = require("mongoose")

const cancelledBookingSchema = mongoose.Schema({
    phoneNumber: String,
    bookingID: String,
    boatName: String,
    date: Date,
    passenger: {
        adult: [
            {
                fullName: String,
                age: Number,
                gender: String
            }
        ],
        child: [
            {
                fullName: String,
                age: Number,
                gender: String
            }
        ]
    },
    privateCar_4seater: { type: Boolean, default: false },
    privateCar_7seater: { type: Boolean, default: false },
    shared_rides: { type: Boolean, default: false },
    breakFast: { type: Boolean, default: false },
    vegLunch: { type: Number, default: 0 },
    nonVegLunch: { type: Number, default: 0 },
    tourGuide: { type: Boolean, default: false },
    insurance: { type: Boolean, default: false },
    paymentType: String,
    payment: Number
},
    { timestamps: true }
)

const CancelledBooking = mongoose.model("CancelledBooking", cancelledBookingSchema)

module.exports = { CancelledBooking}