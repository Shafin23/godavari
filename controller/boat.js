const { Boat } = require("../model/boat");

// Helper function to format the `willActive` field
function formatAvailability(willActive) {
    console.log(willActive)
    const date = new Date(willActive);

    // Format the date part
    const dateFormatter = new Intl.DateTimeFormat("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
    });
    const formattedDate = dateFormatter.format(date);

    // Format the time part
    const startTime = date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "numeric",
        hour12: true,
    });
    const endTime = "6:00 PM"; // Static end time for this example, customize if needed

    return `${formattedDate}: ${startTime} - ${endTime}`;
}



const boatController = {

    // Add boat
    addBoat: async (req, res) => {
        try {
            const {
                name,
                capacity,
                amenities,
                safetyFeatures,
                meals,
                ownersContactNumber,
            } = req.body;
            

            // Process uploaded files
            let photos = [];
            if (req.files) {
                photos = req.files.map((file) => `https://godavari-xm9d.vercel.app/uploads/${file.filename}`);
            }

            const isAlreadyExist = await Boat.findOne({ name: name })
            if (isAlreadyExist) {
                return res.json({ success: false, message: "Boat already exist" })
            }

            const addingNewBoat = new Boat({
                name,
                capacity,
                availableSeats: capacity,
                amenities: JSON.parse(amenities), // Parse JSON strings
                safetyFeatures: JSON.parse(safetyFeatures),
                meals: JSON.parse(meals),
                ownersContactNumber,
                photo: photos, // Add uploaded photo URLs
            });

            const added = await addingNewBoat.save();
            if (!added) {
                return res.status(400).json({ success: false, message: "Failed to add the boat" });
            }
            res.json({ success: true, message: "Successfully added the boat" });
        } catch (error) {
            console.error("Error adding boat:", error);
            res.status(500).json({ success: false, message: "Failed to add boat. Please try again" });
        }
    },
    getBoatList: async (req, res) => {
        try {
            // Get skip and limit from query parameters (if provided)
            const skip = parseInt(req.query.skip) || 0; // Number of documents to skip
            const limit = parseInt(req.query.limit) || 10; // Number of documents to fetch per batch

            // Fetch the next batch of boats
            const boatList = await Boat.find({}, {
                _id: 1,
                name: 1,
                capacity: 1,
                isActive: 1,
                willActive: 1,
                ownersContactNumber: 1,
            })
                .sort({ _id: 1 }) // Sort by _id to ensure consistency
                .skip(skip) // Skip the specified number of documents
                .limit(limit); // Limit the number of documents

            // Format the response keys to match the table headings
            const formattedBoatList = boatList.map((boat) => ({
                _id: boat._id,
                Boat_Name: boat.name,
                Total_capacity: `${boat.capacity} Passengers`,
                Status: boat.isActive ? "Currently Available" : "Under maintenance",
                Upcoming_availability: boat.isActive == false
                    ? formatAvailability(boat.willActive)
                    : "Available", // Format willActive or fallback to "Available"
                Activity: boat.isActive ? "Active" : "Inactive",
                Owners_Contact: boat.ownersContactNumber,
            }));

            res.json({
                success: true,
                limit,
                skip,
                data: formattedBoatList,
                hasMore: boatList.length === limit, // If the returned batch size equals limit, there might be more data
            });
        } catch (error) {
            console.error(error);
            res.json({ success: false, message: "Failed to load boat list" });
        }
    },
    // Activate boat (update isActive status)
    updateActiveStatusOfBoat: async (req, res) => {
        try {
            const id = req.params.id;  // Get the boat ID from the request parameters
            const { isActive } = req.body;  // Get the isActive value from the request body

            // Update the 'isActive' field of the boat document
            const updatedBoat = await Boat.findOneAndUpdate(
                { _id: id },  // Filter to find the boat by its ID
                { isActive: isActive },  // The update: setting the isActive field
                { new: true }  // Option to return the updated document
            );

            // If the boat was updated successfully, return the updated boat data
            if (updatedBoat) {
                res.json({
                    success: true,
                    message: 'Boat status updated successfully',
                    data: updatedBoat
                });
            } else {
                // If no boat was found with the given ID, return an error
                res.json({
                    success: false,
                    message: 'Boat not found'
                });
            }
        } catch (error) {
            // Handle any other errors and return a failure message
            console.error(error);
            res.json({
                success: false,
                message: 'Failed to update boat status',
                error: error.message
            });
        }
    },

    updateWillActive: async (req, res) => {
        try {
            const { boatId } = req.params; // Get the boat ID from the route parameters
            const { willActive } = req.body; // Get the new willActive date from the request body

            if (!willActive) {
                return res.status(400).json({ success: false, message: "The willActive field is required." });
            }

            const updatedBoat = await Boat.findByIdAndUpdate(
                boatId,
                { willActive }, // Update the willActive field
                { new: true, runValidators: true } // Return the updated document and run schema validators
            );

            if (!updatedBoat) {
                return res.status(404).json({ success: false, message: "Boat not found." });
            }

            res.status(200).json({ success: true, message: "WillActive field updated successfully.", data: updatedBoat });
        } catch (error) {
            console.error("Error updating willActive:", error);
            res.status(500).json({ success: false, message: "Failed to update willActive field.", error });
        }
    },
    // Get a specific boat by ID (Optimized with Aggregation)
    getBoatById: async (req, res) => {
        try {
            const id = req.params.id;

            // Aggregation pipeline to retrieve the boat
            const boat = await Boat.aggregate([
                { $match: { _id: new mongoose.Types.ObjectId(id) } },  // Match by the boat's ID
                {
                    $project: {
                        _id: 1,
                        name: 1,
                        capacity: 1,
                        amenities: 1,
                        safetyFeatures: 1,
                        meals: 1,
                        ownersContactNumber: 1,
                        photos: 1,
                        isActive: 1
                    }
                }
            ]);

            // Check if boat exists and return the appropriate response
            if (boat.length === 0) {
                return res.json({
                    success: false,
                    message: 'Boat not found'
                });
            }

            res.json({
                success: true,
                boat: boat[0]  // Return the first (and only) matched boat
            });

        } catch (error) {
            res.json({
                success: false,
                message: 'Failed to retrieve boat',
                error: error.message
            });
        }
    },
    getParticularBoatByIdForMobileApp: async (req, res) => {
        try {
            const { id } = req.params;
            const expectedBoat = await Boat.findOne({ _id: id });
            if (!expectedBoat) {
                return res.json({ success: false, message: "Boat not found" });
            }

            let amenitiesArray = [];
            let safetyFeaturesArray = [];
            let mealsArray = [];

            // Amenities
            if (expectedBoat.amenities.cleanRestrooms) {
                amenitiesArray.push("Clean Restrooms");
            }
            if (expectedBoat.amenities.comfortableSeating) {
                amenitiesArray.push("Comfortable Seating");
            }
            if (expectedBoat.amenities.onboardDining) {
                amenitiesArray.push("Onboard Dining");
            }
            if (expectedBoat.amenities.wifiAccess) {
                amenitiesArray.push("WiFi Access");
            }
            if (expectedBoat.amenities.entertainmentSystem) {
                amenitiesArray.push("Entertainment System");
            }
            if (expectedBoat.amenities.airConditioning) {
                amenitiesArray.push("Air Conditioning");
            }

            // Safety Features
            if (expectedBoat.safetyFeatures.lifeJackets) {
                safetyFeaturesArray.push("Life Jackets");
            }
            if (expectedBoat.safetyFeatures.emergencyKit) {
                safetyFeaturesArray.push("Emergency Kit");
            }
            if (expectedBoat.safetyFeatures.fireExtinguishers) {
                safetyFeaturesArray.push("Fire Extinguishers");
            }

            // Meals
            if (expectedBoat.meals.vegNonVeg) {
                mealsArray.push("Veg/Non-Veg Meals");
            }
            if (expectedBoat.meals.pureVeg) {
                mealsArray.push("Pure Veg Meals");
            }

            res.json({
                success: true,
                name: expectedBoat.name,
                photos: expectedBoat.photo, // Assuming the property is named `photo`
                amenities: amenitiesArray,
                safetyFeatures: safetyFeaturesArray,
                meals: mealsArray
            });
        } catch (error) {
            res.json({ success: false, message: "Something went wrong" });
        }
    },
    getBoatListForMobileApp: async (req, res) => {
        try {
            // Fetch boats from the database where availableSeats >= 1
            const boats = await Boat.find(
                { availableSeats: { $gte: 1 } }, // Filter condition: at least 1 seat
                {
                    _id: 1,
                    name: 1,                    // Select the boat name
                    photo: 1,                   // Select the list of photos
                    availableSeats: 1,          // Select the capacity
                    'priceSection.adult': 1     // Select the price for adult
                }
            );

            // Format the response
            const formattedBoats = boats.map(boat => ({
                id: boat._id,
                boatName: boat.name,
                photos: boat.photo,        // Provide the entire photo list
                capacity: boat.availableSeats,
                priceForAdult: boat.priceSection?.adult
            }));

            // Send the response
            res.status(200).json(formattedBoats);
        } catch (error) {
            console.error("Error fetching boat details:", error);
            res.status(500).json({ message: "Error fetching boat details", error });
        }
    }



}

module.exports = { boatController }
