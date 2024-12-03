const moment = require('moment');
const { Booking } = require('../model/booking');
const { Boat } = require('../model/boat');

const getRandomColor = () => {
    // Generate a random hex color
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
};

const lightenColor = (hex, percent) => {
    // Lighten a hex color by the given percentage
    const num = parseInt(hex.slice(1), 16);
    const r = Math.min(255, Math.floor((num >> 16) + (255 - (num >> 16)) * percent));
    const g = Math.min(255, Math.floor(((num >> 8) & 0x00ff) + (255 - ((num >> 8) & 0x00ff)) * percent));
    const b = Math.min(255, Math.floor((num & 0x0000ff) + (255 - (num & 0x0000ff)) * percent));
    return `#${(r << 16 | g << 8 | b).toString(16).padStart(6, '0')}`;
};

const dashboardController = {
    getGraphOfBookedSeat: async (req, res) => {
        try {
            const boatInfo = await Boat.aggregate([
                {
                    $match: { isActive: true } // Filter only active boats
                },
                {
                    $addFields: {
                        bookedSeats: { $subtract: ["$capacity", "$availableSeats"] }, // Calculate booked seats
                        bookedPercentage: {
                            $multiply: [
                                { $divide: [{ $subtract: ["$capacity", "$availableSeats"] }, "$capacity"] },
                                100
                            ] // Calculate booked percentage
                        }
                    }
                },
                {
                    $project: {
                        boatName: "$name",
                        bookedPercentage: {
                            $ifNull: [{ $round: ["$bookedPercentage", 2] }, 0] // Ensure bookedPercentage is not null
                        },
                        totalSeats: "$capacity" // Optional: keep this if needed in response
                    }
                }
            ]);

            if (boatInfo.length === 0) {
                return res.status(404).json({ message: "No boats found" });
            }

            // Add dynamic colors to each boat
            const boatInfoWithColors = boatInfo.map(boat => {
                const color = getRandomColor(); // Generate a random color
                return {
                    ...boat,
                    color,
                    emptyPartColor: lightenColor(color, 0.8) // Lighten the color for emptyPartColor
                };
            });

            return res.status(200).json({
                success: true,
                data: boatInfoWithColors // Return boats with calculated bookedPercentage
            });
        } catch (error) {
            console.error(error);
            return res.status(500).json({ message: "Internal server error" });
        }
    },
    getTotalBookingsAndCancellations: async (req, res) => {
        try {
            // Aggregate total bookings and total cancellations
            const result = await Booking.aggregate([
                {
                    $facet: {
                        totalBookings: [
                            {
                                $match: { isCancelled: false }  // Match bookings that are not cancelled
                            },
                            {
                                $count: "total"  // Count total bookings
                            }
                        ],
                        totalCancellations: [
                            {
                                $match: { isCancelled: true }  // Match bookings that are cancelled
                            },
                            {
                                $count: "total"  // Count total cancellations
                            }
                        ]
                    }
                },
                {
                    $project: {
                        totalBookings: { $ifNull: [{ $arrayElemAt: ["$totalBookings.total", 0] }, 0] }, // If no result, set to 0
                        totalCancellations: { $ifNull: [{ $arrayElemAt: ["$totalCancellations.total", 0] }, 0] } // If no result, set to 0
                    }
                }
            ]);

            // Return the response with the total bookings and cancellations
            return res.status(200).json({
                success: true,
                data: {
                    totalBookings: result[0].totalBookings,
                    totalCancellations: result[0].totalCancellations
                }
            });

        } catch (error) {
            console.error(error);
            return res.status(500).json({ message: "Internal server error" });
        }
    },
    getStatsForGraph: async (req, res) => {
        try {
            // Parse the number of months from query parameters (default to 3)
            const monthsRange = parseInt(req.query.months) || 3;

            // Calculate start and end dates
            const endDate = moment().endOf('month'); // End of current month
            const startDate = moment().subtract(monthsRange - 1, 'months').startOf('month'); // Start of the range

            // Aggregate bookings within the date range
            const bookingStats = await Booking.aggregate([
                {
                    $match: {
                        date: { $gte: startDate.toDate(), $lte: endDate.toDate() }
                    }
                },
                {
                    $group: {
                        _id: { $month: "$date" }, // Group by month number
                        totalRevenue: { $sum: "$payment" }, // Total revenue
                        totalCanceledAmount: {
                            $sum: { $cond: [{ $eq: ["$isCancelled", true] }, "$payment", 0] }
                        } // Sum of payments for canceled bookings
                    }
                },
                { $sort: { _id: 1 } } // Sort by month
            ]);

            // Format the data
            const formattedData = bookingStats.map((stat) => ({
                month: moment().month(stat._id - 1).format("MMM"), // Convert month number to name
                revenue: stat.totalRevenue,
                canceledAmount: stat.totalCanceledAmount // Total amount refunded due to cancellations
            }));

            // Respond with formatted data
            res.status(200).json({
                success: true,
                message: 'Data fetched successfully.',
                data: formattedData
            });

        } catch (error) {
            console.error(error);
            res.status(500).json({ success: false, message: 'Failed to fetch data' });
        }
    }
}

module.exports = { dashboardController }