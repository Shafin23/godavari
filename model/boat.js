const mongoose = require("mongoose");

const boatSchema = mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    capacity: {
        type: Number,
        required: true,
        min: 1 // Ensure capacity is at least 1
    },
    availableSeats: {
        type: Number,
        required: true,
        min: 1 // Ensure capacity is at least 1
    },
    photo: {
        type: [String], // max three images
        required: true
    },
    amenities: {
        cleanRestrooms: { type: Boolean, default: false },
        comfortableSeating: { type: Boolean, default: false },
        onboardDining: { type: Boolean, default: false },
        wifiAccess: { type: Boolean, default: false },
        entertainmentSystem: { type: Boolean, default: false },
        airConditioning: { type: Boolean, default: false }
    },
    safetyFeatures: {
        lifeJackets: { type: Boolean, default: false },
        emergencyKit: { type: Boolean, default: false },
        fireExtinguishers: { type: Boolean, default: false }
    },
    meals: {
        vegNonVeg: { type: Boolean, default: false },
        pureVeg: { type: Boolean, default: false }
    },
    isActive: { type: Boolean, default: false },
    willActive: { 
        type: Date, 
        default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // Default: 7 days from now
    },
    ownersContactNumber: String,
    priceSection: {
        adult: Number,
        child: Number,
        privateCar_4seater: Number,
        privateCar_7seater: Number,
        shared_rides: Number,
        breakfast: Number,
        vegLunch: Number,
        nonVegLunch: Number,
        tourGuide: Number,
        insurence: Number
    }
});

const Boat = mongoose.model("Boat", boatSchema);

module.exports = { Boat };
