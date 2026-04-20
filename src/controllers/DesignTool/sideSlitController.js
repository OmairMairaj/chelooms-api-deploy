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
  // 3. Reorder Side Slits (Drag and Drop)
  // ==========================================
  async reorderSideSlits(req, res) {
    try {
      const { orderedIds } = req.body;

      // 1. Validate the incoming data
      if (!orderedIds || !Array.isArray(orderedIds)) {
        return res.status(400).json({ 
          success: false, 
          message: "Invalid or missing orderedIds array." 
        });
      }

      // 2. Pass the clean array to the Chef (Service)
      await sideSlitService.reorderSideSlits(orderedIds);

      // 3. Return success to the frontend
      res.status(200).json({ 
        success: true, 
        message: "Side Slits reordered successfully!" 
      });
    } catch (error) {
      console.error("Reorder Side Slits Error:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // ==========================================
  // 4. Update Side Slit
  // ==========================================
  async updateSideSlit(req, res) {
    try {
      const { id } = req.params;
      const payload = { ...req.body };

      if (typeof payload.keywords === 'string') payload.keywords = JSON.parse(payload.keywords);
      if (typeof payload.tags === 'string') payload.tags = JSON.parse(payload.tags);
      if (typeof payload.allowedHemlineShapes === 'string') payload.allowedHemlineShapes = JSON.parse(payload.allowedHemlineShapes);
      
      // Parse any cutouts JSON the admin UI sent (authoritative list of rows that should exist).
      let cutouts = typeof payload.cutouts === 'string' ? JSON.parse(payload.cutouts) : undefined;
      const cutoutsTouched = cutouts !== undefined;

      let mainImage = [];
      let optionImages = [];

      if (req.files && req.files.length > 0) {
        // If only file uploads came in (no JSON), seed from DB so sibling entries aren't wiped.
        const hasCutoutUploads = req.files.some(f => f.fieldname && f.fieldname.startsWith('cutout_'));
        if (hasCutoutUploads && cutouts === undefined) {
          const existing = await sideSlitService.getSideSlitById(id);
          cutouts = (existing?.cutouts && typeof existing.cutouts === 'object' && !Array.isArray(existing.cutouts))
            ? JSON.parse(JSON.stringify(existing.cutouts))
            : {};
        }

        req.files.forEach(file => {
          if (file.fieldname === 'image') mainImage.push(file.path);
          else if (file.fieldname === 'images') optionImages.push(file.path);
          else if (file.fieldname.startsWith('cutout_')) {
            const parts = file.fieldname.split('_');
            if (parts.length === 3) {
              const length = parts[1];
              const shape = parts[2];
              if (!cutouts) cutouts = {};
              if (!cutouts[length]) cutouts[length] = {};
              if (!cutouts[length][shape]) cutouts[length][shape] = {};
              cutouts[length][shape].svgUrl = file.path;
            }
          }
        });

        if (mainImage.length > 0) payload.image = mainImage;
        if (optionImages.length > 0) payload.images = optionImages;
      }

      // Defensive merge: for any slot whose svgUrl is empty/missing in the incoming JSON,
      // restore the existing DB URL for the SAME (length, shape) key. This protects against
      // the admin UI ever sending blank placeholders by mistake. New file uploads always win
      // because they were written into `cutouts` above BEFORE this merge runs.
      if (cutoutsTouched || (cutouts && Object.keys(cutouts).length > 0)) {
        const existing = await sideSlitService.getSideSlitById(id);
        const existingCutouts = (existing?.cutouts && typeof existing.cutouts === 'object' && !Array.isArray(existing.cutouts))
          ? existing.cutouts
          : {};

        Object.keys(cutouts || {}).forEach(lengthKey => {
          const shapesObj = cutouts[lengthKey] || {};
          Object.keys(shapesObj).forEach(shapeKey => {
            const incomingUrl = shapesObj[shapeKey]?.svgUrl;
            const existingUrl = existingCutouts?.[lengthKey]?.[shapeKey]?.svgUrl;
            if ((!incomingUrl || incomingUrl === "") && existingUrl) {
              cutouts[lengthKey][shapeKey].svgUrl = existingUrl;
            }
          });
        });

        payload.cutouts = cutouts;
      }

      const updatedSideSlit = await sideSlitService.updateSideSlit(id, payload);
      res.status(200).json({ success: true, message: "Side Slit Updated!", data: updatedSideSlit });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  
}

module.exports = new SideSlitController();