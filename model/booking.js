const mongoose = require("mongoose")

const bookingSchema = mongoose.Schema({
    phoneNumber: String,
    bookingID: String,
    boatName: String,
    date: Date,
    passenger: [{
        fullName: String,
        age: Number,
        gender: String
    }],
    privateCar_4seater: { type: Number, default: 0 },
    privateCar_7seater: { type: Number, default: 0 },
    shared_rides: { type: Number, default: 0 },
    breakFast: { type: Number, default: 0 },
    vegLunch: { type: Number, default: 0 },
    nonVegLunch: { type: Number, default: 0 },
    tourGuide: { type: Boolean, default: false },
    insurance: { type: Boolean, default: false },
    paymentType: String,
    payment: Number,
    isCancelled: { type: Boolean, default: false },
    cancellationReason: String,
    refundStatus: {
        type: String,
        enum: ["Not-Disbursed", "Not Applicable", "Disbursed"], // Define allowed values
        default: "Not Applicable" // Assign a single default value
    }

},
    { timestamps: true }
)

const Booking = mongoose.model("Booking", bookingSchema)

module.exports = { Booking }