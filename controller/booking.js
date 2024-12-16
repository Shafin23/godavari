const { Boat } = require("../model/boat")
const { Booking } = require("../model/booking")
const mongoose = require('mongoose');
const { generatingBookingID } = require("../utilityFunction/generatingBookingID")


const bookingController = {
    phoneNumber: async (req, res) => {
        try {
            const { phoneNumber } = req.body
            console.log(phoneNumber)
            res.json({ success: true, message: "5 digit code has been sent to your phone." })
        } catch (error) {
            res.json({ success: false, message: "Something went wrong. Please try again." })
        }
    },
    book: async (req, res) => {
        const session = await mongoose.startSession(); // Start a session for transactions
        session.startTransaction(); // Begin the transaction

        try {
            const {
                phoneNumber,
                boatName,
                date,
                passenger,
                privateCar_4seater,
                privateCar_7seater,
                shared_rides,
                breakFast,
                vegLunch,
                nonVegLunch,
                tourGuide,
                insurance,
                paymentType,
                payment
            } = req.body;

            // Validate required fields
            if (!phoneNumber || !boatName || !date || !passenger || !paymentType || !payment) {
                return res.status(400).json({ message: 'Missing required fields' });
            }

            // Generate a unique bookingID
            const bookingID = generatingBookingID();

            // Find and update the boat's availableSeats atomically
            const updatedBoat = await Boat.findOneAndUpdate(
                { name: boatName, availableSeats: { $gt: 0 }, isActive: true }, // Ensure boat has capacity and is active
                { $inc: { availableSeats: -1 } }, // Decrement availableSeats by 1
                { new: true, session } // Return the updated document and include session for the transaction
            );

            if (!updatedBoat) {
                await session.abortTransaction();
                session.endSession();
                return res.status(400).json({
                    message: 'No available capacity for the selected boat or the boat is inactive'
                });
            }

            // Create a new booking document
            const newBooking = new Booking({
                phoneNumber,
                bookingID,
                boatName,
                date,
                passenger,
                privateCar_4seater,
                privateCar_7seater,
                shared_rides,
                breakFast,
                vegLunch,
                nonVegLunch,
                tourGuide,
                insurance,
                paymentType,
                payment
            });

            // Save the booking in the same transaction
            await newBooking.save({ session });

            // Commit the transaction
            await session.commitTransaction();
            session.endSession();

            // Return the success response
            return res.status(201).json({
                success: true,
                message: 'Booking successfully created and boat capacity updated',
                booking: newBooking
            });
        } catch (error) {
            // Rollback the transaction in case of any errors
            await session.abortTransaction();
            session.endSession();
            console.error(error);
            return res.status(500).json({ message: 'Internal server error' });
        }
    },
    cancelBooking: async (req, res) => {
        try {
            const { bookingID } = req.body; // Expect the bookingID in the request body

            console.log('---------------', bookingID)
            // Validate the bookingID
            if (!bookingID) {
                return res.status(400).json({ success: false, message: "Booking ID is required" });
            }

            // Find the booking by bookingID
            const booking = await Booking.findOne({ bookingID });

            // If booking not found
            if (!booking) {
                return res.status(404).json({ success: false, message: "Booking not found" });
            }

            // Check if the booking is already cancelled
            if (booking.isCancelled) {
                return res.status(400).json({ success: false, message: "Booking is already cancelled" });
            }

            // Cancel the booking by setting isCancelled to true
            booking.isCancelled = true;
            booking.refundStatus = "Not Applicable";

            // Save the updated booking
            await booking.save();

            return res.status(200).json({ success: true, message: "Booking successfully cancelled", booking });
        } catch (error) {
            console.error(error);
            return res.status(500).json({ success: false, message: "Failed to cancel the booking" });
        }
    },
    getBookingData: async (req, res) => {
        try {
            // Extract query parameters
            const { filter, startDate, endDate, skip = 0, limit = 10 } = req.query;

            // Define match conditions for the aggregation pipeline
            let matchStage = {};

            // Apply date filter if provided
            if (startDate || endDate) {
                const dateFilter = {};
                if (startDate) {
                    dateFilter.$gte = new Date(startDate); // Greater than or equal to start date
                }
                if (endDate) {
                    dateFilter.$lte = new Date(endDate); // Less than or equal to end date
                }
                matchStage.date = dateFilter;
            }

            // Apply filter conditions (cancelled, not cancelled, insurance, tour guide)
            if (filter === "cancelledBooking") {
                matchStage.isCancelled = true;
            } else if (filter === "notCancelledBooking") {
                matchStage.isCancelled = false;
            } else if (filter === "insurence") {
                matchStage.insurance = { $gt: 0 }; // Filter for bookings with insurance greater than 0
            } else if (filter === "tourGuide") {
                matchStage.tourGuide = { $gt: 0 }; // Filter for bookings with tour guide greater than 0
            }

            // Aggregation pipeline to filter, project and paginate
            const pipeline = [
                { $match: matchStage }, // Match stage to filter data
                {
                    $project: {
                        Contact_no: "$phoneNumber", // Phone number renamed to Contact_no.
                        Booking_ID: "$bookingID", // Booking ID renamed
                        Boat_Name: "$boatName", // Boat name renamed
                        Journey_Time: {
                            $dateToString: { format: "%d-%b-%Y", date: "$date" } // Format the Journey_Time as 29-Nov-2024
                        },
                        Payment_Type: "$paymentType", // Payment type renamed
                        Total_Payment: "$payment", // Payment amount renamed
                        Name: { $arrayElemAt: ["$passenger.fullName", 0] }, // First passenger name renamed to Name
                        No_of_Passenger: {
                            $concat: [
                                { $toString: { $size: { $filter: { input: "$passenger", as: "p", cond: { $gte: ["$$p.age", 18] } } } } }, " Adult",
                                { $cond: { if: { $gt: [{ $size: { $filter: { input: "$passenger", as: "p", cond: { $gte: ["$$p.age", 18] } } } }, 1] }, then: "s", else: "" } },
                                ", ",
                                { $toString: { $size: { $filter: { input: "$passenger", as: "p", cond: { $lt: ["$$p.age", 18] } } } } }, " Kid",
                                { $cond: { if: { $gt: [{ $size: { $filter: { input: "$passenger", as: "p", cond: { $lt: ["$$p.age", 18] } } } }, 1] }, then: "s", else: "" } }
                            ]
                        } // Combine adult and children counts into a string
                    }
                },
                // Add pagination stage (skip and limit)
                { $skip: parseInt(skip) },
                { $limit: parseInt(limit) }
            ];

            // Execute the aggregation
            let result = await Booking.aggregate(pipeline);
            result = result.map(booking => ({
                ...booking,
                "No._of_Passenger": booking.No_of_Passenger, // Add a new field with the desired name
                No_of_Passenger: undefined // Remove the original field (optional)
            }));
            return res.status(200).json({ success: true, data: result, skip, limit });
        } catch (error) {
            console.error(error);
            return res.status(500).json({ success: false, message: "Failed to fetch booking data" });
        }
    },
    getCancelledBookings: async (req, res) => {
        try {
            // Extract query parameters
            const { startDate, endDate, skip = 0, limit = 10 } = req.query;

            // Define match conditions for the aggregation pipeline
            let matchStage = {
                isCancelled: true // Only fetch cancelled bookings
            };

            // Apply date filter if provided
            if (startDate || endDate) {
                const dateFilter = {};
                if (startDate) {
                    dateFilter.$gte = new Date(startDate); // Greater than or equal to start date
                }
                if (endDate) {
                    dateFilter.$lte = new Date(endDate); // Less than or equal to end date
                }
                matchStage.date = dateFilter;
            }

            // Aggregation pipeline to filter, project, and paginate
            const pipeline = [
                { $match: matchStage },  // Match stage to filter cancelled bookings
                {
                    $project: {
                        Contact_no: "$phoneNumber",  // Phone number renamed to Contact_no.
                        Booking_ID: "$bookingID",  // Booking ID renamed
                        Boat_Name: "$boatName",  // Boat name renamed
                        Journey_Time: "$date",  // Date renamed to Journey_Time
                        Payment_Type: "$paymentType",  // Payment type renamed
                        Total_Payment: "$payment",  // Payment amount renamed
                        Name: { $arrayElemAt: ["$passenger.fullName", 0] },  // First passenger name renamed to Name
                        No_of_Passenger: {
                            $concat: [
                                { $toString: { $size: { $filter: { input: "$passenger", as: "p", cond: { $gte: ["$$p.age", 18] } } } } }, " Adult",
                                { $cond: { if: { $gt: [{ $size: { $filter: { input: "$passenger", as: "p", cond: { $gte: ["$$p.age", 18] } } } }, 1] }, then: "s", else: "" } },
                                ", ",
                                { $toString: { $size: { $filter: { input: "$passenger", as: "p", cond: { $lt: ["$$p.age", 18] } } } } }, " Kid",
                                { $cond: { if: { $gt: [{ $size: { $filter: { input: "$passenger", as: "p", cond: { $lt: ["$$p.age", 18] } } } }, 1] }, then: "s", else: "" } }
                            ]
                        }, // Combine adult and children counts into a string
                        Cancellation_Reason: "$cancellationReason",  // Add cancellation reason
                        Refund_Status: "$refundStatus",  // Add refund status
                        Booking_Date: {
                            $dateToString: {
                                format: "%d-%b-%Y",  // Format as DD-MMM-YYYY
                                date: "$createdAt"
                            }
                        }  // Add creation time as Booking_Date in desired format
                    }
                },
                // Add pagination stage (skip and limit)
                { $skip: parseInt(skip) },
                { $limit: parseInt(limit) }
            ];

            // Execute the aggregation
            let result = await Booking.aggregate(pipeline);
            result = result.map(booking => ({
                ...booking,
                "No._of_Passenger": booking.No_of_Passenger, // Add a new field with the desired name
                No_of_Passenger: undefined // Remove the original field (optional)
            }));
            return res.status(200).json({ success: true, data: result, skip, limit });
        } catch (error) {
            console.error(error);
            return res.status(500).json({ success: false, message: "Failed to fetch cancelled bookings" });
        }
    },
    getBookingsWithInsurance: async (req, res) => {
        try {
            // Extract pagination parameters (optional)
            const { skip = 0, limit = 10 } = req.query;

            // Aggregation pipeline
            const pipeline = [
                { $match: { insurance: true, isCancelled: false } }, // Filter bookings with insurance set to true
                {
                    $project: {
                        Contact_no: "$phoneNumber", // Phone number as Contact_no
                        Booking_ID: "$bookingID", // Booking ID
                        Name: { $arrayElemAt: ["$passenger.fullName", 0] }, // First passenger's name as Name
                        No_of_Passenger: {
                            $concat: [
                                { $toString: { $size: { $filter: { input: "$passenger", as: "p", cond: { $gte: ["$$p.age", 18] } } } } }, " Adult",
                                { $cond: { if: { $gt: [{ $size: { $filter: { input: "$passenger", as: "p", cond: { $gte: ["$$p.age", 18] } } } }, 1] }, then: "s", else: "" } },
                                ", ",
                                { $toString: { $size: { $filter: { input: "$passenger", as: "p", cond: { $lt: ["$$p.age", 18] } } } } }, " Kid",
                                { $cond: { if: { $gt: [{ $size: { $filter: { input: "$passenger", as: "p", cond: { $lt: ["$$p.age", 18] } } } }, 1] }, then: "s", else: "" } }
                            ]
                        }, // Combine adult and children counts into a string
                        Total_Payment: "$payment", // Total payment
                        Payment_Type: "$paymentType" // Payment type
                    }
                },
                { $skip: parseInt(skip) }, // Skip documents for pagination
                { $limit: parseInt(limit) } // Limit documents for pagination
            ];

            // Execute the aggregation
            const result = await Booking.aggregate(pipeline);

            // Format the response
            const formattedResult = result.map(booking => ({
                Name: booking.Name,
                Booking_ID: booking.Booking_ID,
                "No._of_Passenger": booking.No_of_Passenger,
                Total_Payment: booking.Total_Payment,
                Payment_Type: booking.Payment_Type,
                "Contact_no.": booking.Contact_no
            }));

            // Send the response
            return res.status(200).json({
                success: true,
                data: formattedResult,
                skip,
                limit
            });
        } catch (error) {
            console.error(error);
            return res.status(500).json({ success: false, message: "Failed to fetch bookings with insurance" });
        }
    },
    getBookingsWithTourGuide: async (req, res) => {
        try {
            // Extract pagination parameters (optional)
            const { skip = 0, limit = 10 } = req.query;

            // Aggregation pipeline
            const pipeline = [
                { $match: { tourGuide: true, isCancelled: false } }, // Filter bookings with insurance set to true
                {
                    $project: {
                        Contact_no: "$phoneNumber", // Phone number as Contact_no
                        Booking_ID: "$bookingID", // Booking ID
                        Name: { $arrayElemAt: ["$passenger.fullName", 0] }, // First passenger's name as Name
                        No_of_Passenger: {
                            $concat: [
                                { $toString: { $size: { $filter: { input: "$passenger", as: "p", cond: { $gte: ["$$p.age", 18] } } } } }, " Adult",
                                { $cond: { if: { $gt: [{ $size: { $filter: { input: "$passenger", as: "p", cond: { $gte: ["$$p.age", 18] } } } }, 1] }, then: "s", else: "" } },
                                ", ",
                                { $toString: { $size: { $filter: { input: "$passenger", as: "p", cond: { $lt: ["$$p.age", 18] } } } } }, " Kid",
                                { $cond: { if: { $gt: [{ $size: { $filter: { input: "$passenger", as: "p", cond: { $lt: ["$$p.age", 18] } } } }, 1] }, then: "s", else: "" } }
                            ]
                        }, // Combine adult and children counts into a string
                        Total_Payment: "$payment", // Total payment
                        Payment_Type: "$paymentType" // Payment type
                    }
                },
                { $skip: parseInt(skip) }, // Skip documents for pagination
                { $limit: parseInt(limit) } // Limit documents for pagination
            ];

            // Execute the aggregation
            const result = await Booking.aggregate(pipeline);

            // Format the response
            const formattedResult = result.map(booking => ({
                Name: booking.Name,
                Booking_ID: booking.Booking_ID,
                "No._of_Passenger": booking.No_of_Passenger,
                Total_Payment: booking.Total_Payment,
                Payment_Type: booking.Payment_Type,
                "Contact_no.": booking.Contact_no
            }));

            // Send the response
            return res.status(200).json({
                success: true,
                data: formattedResult,
                skip,
                limit
            });
        } catch (error) {
            console.error(error);
            return res.status(500).json({ success: false, message: "Failed to fetch bookings with insurance" });
        }
    },
    getTodaysBookings: async (req, res) => {
        try {
            // Get today's date (midnight start and just before midnight end)
            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0); // Set to midnight of today

            const tomorrowStart = new Date(todayStart);
            tomorrowStart.setDate(todayStart.getDate() + 1); // Set to midnight of the next day

            // Aggregation pipeline to get today's bookings
            let result = await Booking.aggregate([
                {
                    $match: {
                        createdAt: { $gte: todayStart, $lt: tomorrowStart }, // Filter by today's date range
                        isCancelled: false // Optionally, you can also filter out cancelled bookings
                    }
                },
                {
                    $project: {
                        Booking_ID: "$bookingID",
                        Boat_Name: "$boatName", // Rename boatName to Boat_Name
                        Journey_Time: {
                            $dateToString: { format: "%d %B, %Y", date: "$date" } // Format Journey_Time
                        },
                        Payment_Type: "$paymentType", // Rename paymentType to Payment_Type
                        Passenger_Name: { $arrayElemAt: ["$passenger.fullName", 0] }, // First passenger name
                        totalAdults: {
                            $size: {
                                $filter: {
                                    input: "$passenger",
                                    as: "p",
                                    cond: { $gte: ["$$p.age", 18] } // Adults are considered age 18+
                                }
                            }
                        }, // Total number of adults
                        totalChildren: {
                            $size: {
                                $filter: {
                                    input: "$passenger",
                                    as: "p",
                                    cond: { $lt: ["$$p.age", 18] } // Children are considered age < 18
                                }
                            }
                        } // Total number of children
                    }
                },
                {
                    $project: {
                        Booking_ID: 1,
                        Boat_Name: 1,
                        Journey_Time: 1,
                        Payment_Type: 1,
                        Passenger_Name: 1,
                        No_of_Passenger: {
                            $concat: [
                                { $toString: "$totalAdults" }, " Adult",
                                { $cond: { if: { $gte: ["$totalAdults", 1] }, then: ", ", else: "" } },
                                { $toString: "$totalChildren" }, " Kids"
                            ]
                        }
                    }
                }
            ]);

            // Modify result to change `No_of_Passenger` to `No._of_Passenger`
            result = result.map(booking => ({
                ...booking,
                "No._of_Passenger": booking.No_of_Passenger, // Add a new field with the desired name
                No_of_Passenger: undefined // Remove the original field (optional)
            }));

            return res.status(200).json({ success: true, data: result });
        } catch (error) {
            console.error(error);
            return res.status(500).json({ success: false, message: "Failed to fetch today's bookings" });
        }
    },
    getBookingById: async (req, res) => {
        try {
            const { bookingID } = req.params;
            if (!bookingID) {
                return res.status(400).json({ success: false, message: "Booking ID is required" });
            }

            const booking = await Booking.findOne({ _id: bookingID });

            if (!booking) {
                return res.status(404).json({ success: false, message: "Booking not found" });
            }

            res.status(200).json({ success: true, data: booking });
        } catch (error) {
            console.error(error);
            res.status(500).json({ success: false, message: "Failed to fetch booking details" });
        }
    },
    getBookingByIdForMobile: async (req, res) => {
        try {
            const { phoneNumber } = req.params;
            if (!phoneNumber) {
                return res.status(400).json({ success: false, message: "PhoneNumber is required" });
            }

            // Fetch only the required fields
            const bookings = await Booking.find(
                { phoneNumber },
                {
                    bookingID: 1,
                    isCancelled: 1,
                    boatName: 1,
                    phoneNumber: 1,
                    date: 1,
                    passenger: 1 // Include the passenger array to extract specific details
                }
            );

            if (!bookings || bookings.length === 0) {
                return res.status(404).json({ success: false, message: "Bookings not found" });
            }

            // Prepare the response structure
            const response = bookings.map((booking) => ({
                bookingID: booking.bookingID,
                boatName: booking.boatName,
                phoneNumber: booking.phoneNumber,
                totalNumberOfPassenger: booking.passenger.length,
                firstPassengerName: booking.passenger.length > 0 ? booking.passenger[0].fullName : null,
                date: booking.date,
                isCancelled: booking.isCancelled
            }));

            res.status(200).json({ success: true, data: response });
        } catch (error) {
            console.error(error);
            res.status(500).json({ success: false, message: "Failed to fetch booking details" });
        }
    }
}

module.exports = { bookingController }