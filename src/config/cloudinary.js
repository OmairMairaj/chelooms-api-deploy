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
// 2. Storage Engine Banao
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    // Check karte hain ke file SVG hai ya nahi
    const isSvg = file.originalname.toLowerCase().endsWith('.svg') || file.mimetype === 'image/svg+xml';

    // Agar SVG hai toh usko 'raw' format mein bhejo (Bina kisi image processing ke)
    if (isSvg) {
      return {
        folder: 'project_jute_inventory',
        resource_type: 'raw', // 🚀 MAGIC BULLET FOR SVGs
        format: 'svg' 
      };
    } 
    
    // Baki normal images (JPG, PNG) ke liye purana logic
    return {
      folder: 'project_jute_inventory',
      allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
      resource_type: 'auto',
      transformation: [{ width: 800, crop: 'limit' }]
    };
  },
});

module.exports = { cloudinary, storage };