const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../cloudinaryConfig'); // Import your Cloudinary configuration

// Configure Multer to use Cloudinary
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'uploads', // Folder name in Cloudinary
    allowed_formats: ['jpeg', 'png', 'jpg', 'gif'], // File types allowed
  },
});

const upload = multer({ storage });

module.exports = upload;
