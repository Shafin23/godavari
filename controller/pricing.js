const { Boat } = require("../model/boat");

const pricingController = {
    // Get boats with infinite scroll using skip and limit
    getBoatsWithPrices: async (req, res) => {
        try {
            // Retrieve skip and limit from query parameters
            const skip = parseInt(req.query.skip) || 0; // Default to 0 (start from beginning)
            const limit = parseInt(req.query.limit) || 10; // Default to 10 items per request
    
            // Retrieve boats with skip and limit
            const boats = await Boat.find(
                { isActive: true }, // Optional: Filter for active boats
                {
                    name: 1, // Include the boat name
                    priceSection: 1, // Include the entire priceSection,
                    _id:1

                }
            )
                .skip(skip) // Skip the specified number of documents
                .limit(limit) // Limit the number of documents retrieved
                .lean(); // Optional: Return plain JavaScript objects instead of Mongoose Documents
    
            // Flatten the priceSection fields
            const result = boats.map((boat) => ({
                _id: boat._id,
                name: boat.name,
                adult: boat.priceSection?.adult || 0, // Use default value if undefined
                child: boat.priceSection?.child || 0,
                privateCar_4seater: boat.priceSection?.privateCar_4seater || 0,
                privateCar_7seater: boat.priceSection?.privateCar_7seater || 0,
                shared_rides: boat.priceSection?.shared_rides || 0,
                breakfast: boat.priceSection?.breakfast || 0,
                vegLunch: boat.priceSection?.vegLunch || 0,
                nonVegLunch: boat.priceSection?.nonVegLunch || 0,
                tourGuide: boat.priceSection?.tourGuide || 0,
                insurence: boat.priceSection?.insurence || 0
            }));
    
            // Send response with data and metadata
            res.json({
                success: true,
                data: result,
                skip,
                limit,
                fetchedCount: result.length // Number of items fetched
            });
        } catch (error) {
            console.error(error);
            res.json({ success: false, message: "Failed to load boats with prices" });
        }
    },    
    updatePrice: async (req, res) => {
        try {
            const { id } = req.params; // Boat ID from the request parameters
            const { priceField, newValue } = req.body; // Field and value from request body

            if(newValue <0){
                return res.json({success:false,message:"Value must be positive"})
            }

            // Validate input
            if (!priceField || newValue == null) {
                return res.status(400).json({ success: false, message: "Price field and new value are required" });
            }

            // Ensure the field is valid
            const validFields = [
                "adult",
                "child",
                "privateCar_4seater",
                "privateCar_7seater",
                "shared_rides",
                "breakfast",
                "vegLunch",
                "nonVegLunch",
                "tourGuide",
                "insurence"
            ];
            if (!validFields.includes(priceField)) {
                return res.status(400).json({ success: false, message: "Invalid price field" });
            }

            // Construct the update query dynamically
            const updateQuery = { [`priceSection.${priceField}`]: newValue };

            // Update the boat's price field
            const updatedBoat = await Boat.findByIdAndUpdate(id, { $set: updateQuery }, { new: true });

            if (!updatedBoat) {
                return res.status(404).json({ success: false, message: "Boat not found" });
            }

            res.json({ success: true, message: "Price updated successfully", data: updatedBoat });
        } catch (error) {
            console.error(error);
            res.status(500).json({ success: false, message: "Failed to update price" });
        }
    }
};

module.exports = { pricingController };
