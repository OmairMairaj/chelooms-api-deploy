const sideSlitService = require('../../services/DesignTool/sideSlitService');

class SideSlitController {

  // ==========================================
  // 1. Create Side Slit
  // ==========================================
  async createSideSlit(req, res) {
    try {
      const payload = { ...req.body };

      // 1. Strings ko Array/JSON banate hain
      if (typeof payload.keywords === 'string') payload.keywords = JSON.parse(payload.keywords);
      if (typeof payload.tags === 'string') payload.tags = JSON.parse(payload.tags);
      if (typeof payload.allowedHemlineShapes === 'string') payload.allowedHemlineShapes = JSON.parse(payload.allowedHemlineShapes);
      
      // Base cutouts JSON agar frontend ne bheja hai (warna khali object)
      let cutouts = typeof payload.cutouts === 'string' ? JSON.parse(payload.cutouts) : (payload.cutouts || {});

      let mainImage = [];
      let optionImages = [];

      // 2. ✨ FILE NAMING MAGIC: Dynamic SVGs ko Handle Karna
      // upload.any() use karne ki waja se req.files ek array hoga
      if (req.files && req.files.length > 0) {
        req.files.forEach(file => {
          if (file.fieldname === 'image') {
            mainImage.push(file.path); // Main Thumbnail
          } else if (file.fieldname === 'images') {
            optionImages.push(file.path); // Option Images array
          } else if (file.fieldname.startsWith('cutout_')) {
            // Jadoo Yahan Hai: "cutout_hl-short_round" ko tod kar JSON banana
            const parts = file.fieldname.split('_'); // Result: ['cutout', 'hl-short', 'round']
            if (parts.length === 3) {
              const length = parts[1]; // e.g., hl-short
              const shape = parts[2];  // e.g., round
              
              // Agar us length ya shape ka object nahi hai, toh pehle banao
              if (!cutouts[length]) cutouts[length] = {};
              if (!cutouts[length][shape]) cutouts[length][shape] = {};
              
              // Phir Cloudinary URL map kar do
              cutouts[length][shape].svgUrl = file.path;
            }
          }
        });
      }

      const finalData = { 
        ...payload, 
        image: mainImage,
        images: optionImages,
        cutouts: cutouts 
      };

      const newSideSlit = await sideSlitService.createSideSlit(finalData);
      res.status(201).json({ success: true, message: "Side Slit Created!", data: newSideSlit });
    } catch (error) {
      console.error("Create Side Slit Error:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // ==========================================
  // 2. Get All Side Slits (Grouped Json for Frontend)
  // ==========================================
  async getAllSideSlits(req, res) {
    try {
      const slits = await sideSlitService.getAllSideSlits();
      res.status(200).json({ success: true, data: slits });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // ==========================================
  // 3. Update Side Slit
  // ==========================================
  async updateSideSlit(req, res) {
    try {
      const { id } = req.params;
      const payload = { ...req.body };

      if (typeof payload.keywords === 'string') payload.keywords = JSON.parse(payload.keywords);
      if (typeof payload.tags === 'string') payload.tags = JSON.parse(payload.tags);
      if (typeof payload.allowedHemlineShapes === 'string') payload.allowedHemlineShapes = JSON.parse(payload.allowedHemlineShapes);
      
      let cutouts = typeof payload.cutouts === 'string' ? JSON.parse(payload.cutouts) : undefined;

      if (req.files && req.files.length > 0) {
        let mainImage = [];
        let optionImages = [];
        
        if (!cutouts) cutouts = {}; // Update mein agar naya cutout add ho raha ho
        
        req.files.forEach(file => {
          if (file.fieldname === 'image') mainImage.push(file.path);
          else if (file.fieldname === 'images') optionImages.push(file.path);
          else if (file.fieldname.startsWith('cutout_')) {
            const parts = file.fieldname.split('_');
            if (parts.length === 3) {
              const length = parts[1];
              const shape = parts[2];
              
              if (!cutouts[length]) cutouts[length] = {};
              if (!cutouts[length][shape]) cutouts[length][shape] = {};
              
              cutouts[length][shape].svgUrl = file.path;
            }
          }
        });

        if (mainImage.length > 0) payload.image = mainImage;
        if (optionImages.length > 0) payload.images = optionImages;
      }

      if (cutouts) payload.cutouts = cutouts;

      const updatedSideSlit = await sideSlitService.updateSideSlit(id, payload);
      res.status(200).json({ success: true, message: "Side Slit Updated!", data: updatedSideSlit });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
}

module.exports = new SideSlitController();