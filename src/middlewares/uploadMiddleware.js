const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Fallback: Agar Cloudinary env vars nahi hain to disk storage use karo
let storage;
if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
  const { storage: cloudStorage } = require('../config/cloudinary');
  storage = cloudStorage;
} else {
  // Local disk storage (uploads/ folder)
  const isServerlessRuntime = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
  const uploadDir = isServerlessRuntime ? path.join('/tmp', 'uploads') : path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
  
  storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
      const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
      const ext = path.extname(file.originalname) || '.jpg';
      cb(null, unique + ext);
    }
  });
}

const upload = multer({ storage });

module.exports = upload;