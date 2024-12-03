const { Boat } = require("../model/boat");
const { Booking } = require("../model/booking");

const mealController = {
    getMealBoatViaDetails: async (req, res) => {
        try {
            const lastId = req.query.lastId; // Get the last document ID from the query params
            const limit = parseInt(req.query.limit) || 10; // Number of documents to fetch per request

            // Match query for infinite scroll
            let matchQuery = { isCancelled: false };
            if (lastId) {
                matchQuery._id = { $gt: mongoose.Types.ObjectId(lastId) }; // Fetch documents with IDs greater than lastId
            }

            const extractData = await Booking.aggregate([
                { $match: matchQuery }, // Match for pagination
                {
                    $project: {
                        boatName: "$boatName", // Use boatName from the Booking schema
                        totalPassengers: { $size: "$passenger" }, // Count passengers
                        breakFast: { $toDouble: "$breakFast" }, // Ensure numeric
                        vegLunch: { $toDouble: "$vegLunch" }, // Ensure numeric
                        nonVegLunch: { $toDouble: "$nonVegLunch" }, // Ensure numeric
                    },
                },
                {
                    $group: {
                        _id: "$boatName", // Group by boatName
                        totalPassengers: { $sum: "$totalPassengers" }, // Total passengers
                        totalMeals: { $sum: { $add: ["$breakFast", "$vegLunch", "$nonVegLunch"] } }, // Total meals
                        totalVegMeals: { $sum: "$vegLunch" }, // Total veg meals
                        totalNonVegMeals: { $sum: "$nonVegLunch" }, // Total non-veg meals
                    },
                },
                {
                    $project: {
                        _id: 0,
                        Boat_Name: "$_id", // Rename `_id` to `Boat_Name`
                        No_of_passengers: "$totalPassengers",
                        Total_Meals: "$totalMeals",
                        No_of_Veg_meals: "$totalVegMeals",
                        No_of_Non_veg_meals: "$totalNonVegMeals",
                    },
                },
                { $sort: { Boat_Name: 1 } }, // Sort by Boat_Name alphabetically
                { $limit: limit }, // Limit results for pagination
            ]);

            // Define hasMore after processing extractData
            const hasMore = extractData.length === limit;

            const updatedExtractedData = extractData.map(item => ({
                "Boat_Name": item.Boat_Name,
                "No._of_passengers": item.No_of_passengers,
                "Total_Meals": item.Total_Meals,
                "No._of_Veg_meals": item.No_of_Veg_meals,
                "No._of_Non-veg_meals": item.No_of_Non_veg_meals,
            }));

            res.json({
                success: true,
                data: updatedExtractedData,
                hasMore, // Indicates if there are more documents to fetch
            });
        } catch (error) {
            console.error(error);
            res.json({ success: false, message: "Failed to load data" });
        }
    },
    getStatistics: async (req, res) => {
        try {
            const statistics = await Booking.aggregate([
                {
                    $project: {
                        // Ensure fields are numeric or default to 0 using $ifNull and $toDouble
                        totalMeal: {
                            $add: [
                                { $ifNull: [{ $toDouble: "$breakFast" }, 0] },
                                { $ifNull: [{ $toDouble: "$vegLunch" }, 0] },
                                { $ifNull: [{ $toDouble: "$nonVegLunch" }, 0] }
                            ]
                        },
                        veg: { $ifNull: [{ $toDouble: "$vegLunch" }, 0] }, // Convert vegLunch to number or default to 0
                        noVeg: { $ifNull: [{ $toDouble: "$nonVegLunch" }, 0] } // Convert nonVegLunch to number or default to 0
                    }
                },
                {
                    $group: {
                        _id: null, // Group all documents together
                        totalMeal: { $sum: "$totalMeal" }, // Sum all totalMeal values
                        veg: { $sum: "$veg" }, // Sum all veg values
                        noVeg: { $sum: "$noVeg" } // Sum all nonVeg values
                    }
                }
            ]);

            res.json({
                success: true,
                data: statistics[0] || { totalMeal: 0, veg: 0, noVeg: 0 } // Handle case with no data
            });
        } catch (error) {
            console.error(error);
            res.json({ success: false, message: "Failed to load statistics" });
        }
    },
    getBookingOverview: async (req, res) => {
        try {
            const { mealType, skip = 0, limit = 10 } = req.query;
    
            // Parse skip and limit
            const skipNumber = parseInt(skip, 10);
            const limitNumber = parseInt(limit, 10);
    
            if (isNaN(skipNumber) || isNaN(limitNumber) || skipNumber < 0 || limitNumber <= 0) {
                return res.status(400).json({ success: false, message: "Invalid skip or limit value" });
            }
    
            // Base filter: Exclude cancelled bookings
            let filter = { isCancelled: false };
    
            // Add meal type filtering
            if (mealType === "veg") {
                filter.vegLunch = { $gt: 0 };
            } else if (mealType === "nonVeg") {
                filter.nonVegLunch = { $gt: 0 };
            } else if (mealType === "both") {
                filter.$or = [{ vegLunch: { $gt: 0 } }, { nonVegLunch: { $gt: 0 } }];
            }
    
            // Fetch bookings with filter, skip, and limit
            const bookings = await Booking.find(
                filter,
                {
                    boatName: 1,
                    bookingID: 1,
                    passenger: { $slice: 1 }, // Fetch only the first passenger
                    breakFast: 1,
                    vegLunch: 1,
                    nonVegLunch: 1,
                }
            )
                .skip(skipNumber)
                .limit(limitNumber)
                .lean();
    
            // Process results to calculate meals and format response
            const result = bookings.map((booking) => ({
                Name: booking.passenger[0]?.fullName || "N/A",
                Booking_ID: booking.bookingID,
                Boat_Name: booking.boatName,
                "No._of_meals":
                    (booking.breakFast || 0) +
                    (booking.vegLunch || 0) +
                    (booking.nonVegLunch || 0),
            }));
    
            res.json({ success: true, data: result });
        } catch (error) {
            console.error(error);
            res.status(500).json({ success: false, message: "Failed to fetch booking details" });
        }
    }    
};

module.exports = { mealController };
