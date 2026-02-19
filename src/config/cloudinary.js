require('dotenv').config();

const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// 1. Cloudinary ko Config karo (Environment variables se)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// 2. Storage Engine Banao
// Ye batata hai ke image kahan aur kaise save hogi
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'project_jute_inventory', // Cloudinary mein is folder mein jayengi images
    allowed_formats: ['jpg', 'png', 'jpeg', 'webp'], // Sirf images allow karo
    transformation: [{ width: 800, crop: 'limit' }], // Auto-resize (Optimization)
  },
});

module.exports = { cloudinary, storage };