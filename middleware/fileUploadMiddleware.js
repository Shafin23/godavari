const multer = require('multer');
const path = require('path');

// Configure Multer for local storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Define the destination folder for uploaded files
    cb(null, path.join(__dirname, 'uploads')); // Adjust the path as needed
  },
  filename: (req, file, cb) => {
    // Define the filename format for uploaded files
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  },
});

// Set up Multer with the storage configuration
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 2 * 1024 * 1024, // Limit file size to 2MB (optional)
  },
  fileFilter: (req, file, cb) => {
    // Filter files based on allowed types (optional)
    const fileTypes = /jpeg|jpg|png|gif/;
    const mimeType = fileTypes.test(file.mimetype);
    const extName = fileTypes.test(path.extname(file.originalname).toLowerCase());

    if (mimeType && extName) {
      return cb(null, true);
    }
    cb(new Error('Only image files are allowed!'));
  },
});

module.exports = upload;
