const embellishmentService = require('../../services/DesignTool/embellishmentService');

class EmbellishmentController {

  // ==========================================
  // 📁 CATEGORY APIs (Parent)
  // ==========================================

  async createCategory(req, res) {
    try {
      const payload = { ...req.body };
      let categoryImage = [];

      // Agar multer ne upload.any() se file bheji hai
      if (req.files && req.files.length > 0) {
        req.files.forEach(file => {
          if (file.fieldname === 'image') categoryImage.push(file.path);
        });
      }

      const finalData = { ...payload, image: categoryImage };
      const newCategory = await embellishmentService.createCategory(finalData);
      
      res.status(201).json({ success: true, message: "Embellishment Category Created!", data: newCategory });
    } catch (error) {
      console.error("Create Embellishment Category Error:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async getAllCategories(req, res) {
    try {
      const categories = await embellishmentService.getAllCategories();
      res.status(200).json({ success: true, data: categories });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async updateCategory(req, res) {
    try {
      const { id } = req.params;
      const payload = { ...req.body };
      
      if (req.files && req.files.length > 0) {
        let categoryImage = [];
        req.files.forEach(file => {
          if (file.fieldname === 'image') categoryImage.push(file.path);
        });
        if (categoryImage.length > 0) payload.image = categoryImage;
      }

      const updatedCategory = await embellishmentService.updateCategory(id, payload);
      res.status(200).json({ success: true, message: "Embellishment Category Updated!", data: updatedCategory });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // ==========================================
  // ✨ OPTION APIs (Child) - WITH OVERLAYS UPLOAD
  // ==========================================

  async createOption(req, res) {
    try {
      const payload = { ...req.body };

      // 1. Strings ko Array/JSON banate hain
      if (typeof payload.keywords === 'string') payload.keywords = JSON.parse(payload.keywords);
      if (typeof payload.tags === 'string') payload.tags = JSON.parse(payload.tags);
      if (typeof payload.allowedNecklines === 'string') payload.allowedNecklines = JSON.parse(payload.allowedNecklines);
      if (typeof payload.allowedHemlines === 'string') payload.allowedHemlines = JSON.parse(payload.allowedHemlines);
      if (typeof payload.allowedSleeves === 'string') payload.allowedSleeves = JSON.parse(payload.allowedSleeves);
      if (typeof payload.colors === 'string') payload.colors = JSON.parse(payload.colors);
      
      // Booleans aur Numbers
      payload.premium = payload.premium === 'true';
      if (payload.premiumPrice) payload.premiumPrice = parseFloat(payload.premiumPrice);

      // Base overlays JSON (isme zIndex wagerah hoga)
      let overlays = typeof payload.overlays === 'string' ? JSON.parse(payload.overlays) : (payload.overlays || {});
      let optionImages = [];

      // 2. ✨ FILE NAMING MAGIC: Dynamic SVGs ko Handle Karna
      if (req.files && req.files.length > 0) {
        req.files.forEach(file => {
          if (file.fieldname === 'images') {
            optionImages.push(file.path);
          } else if (file.fieldname.startsWith('overlay_')) {
            // Fieldname example: "overlay_necklines_nl-angular-v-standard"
            // Bulletproof splitting logic
            const rest = file.fieldname.substring('overlay_'.length); // "necklines_nl-angular-v-standard"
            const firstUnderscore = rest.indexOf('_');
            
            if (firstUnderscore !== -1) {
              const bodyPart = rest.substring(0, firstUnderscore); // "necklines"
              const targetId = rest.substring(firstUnderscore + 1); // "nl-angular-v-standard"

              // JSON ke andar object build karna (taake crash na ho)
              if (!overlays[bodyPart]) overlays[bodyPart] = {};
              if (!overlays[bodyPart][targetId]) overlays[bodyPart][targetId] = {};
              
              // Cloudinary URL map kar do (aur zIndex agar pehle se base JSON mein hai toh wo mehfooz rahega)
              overlays[bodyPart][targetId].svgUrl = file.path;
            }
          }
        });
      }

      const finalData = { 
        ...payload, 
        images: optionImages,
        overlays: overlays 
      };

      const newOption = await embellishmentService.createOption(finalData);
      res.status(201).json({ success: true, message: "Embellishment Option Created!", data: newOption });
    } catch (error) {
      console.error("Create Embellishment Option Error:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async updateOption(req, res) {
    try {
      const { id } = req.params;
      const payload = { ...req.body };

      // Parsing strings to JSON arrays
      if (typeof payload.keywords === 'string') payload.keywords = JSON.parse(payload.keywords);
      if (typeof payload.tags === 'string') payload.tags = JSON.parse(payload.tags);
      if (typeof payload.allowedNecklines === 'string') payload.allowedNecklines = JSON.parse(payload.allowedNecklines);
      if (typeof payload.allowedHemlines === 'string') payload.allowedHemlines = JSON.parse(payload.allowedHemlines);
      if (typeof payload.allowedSleeves === 'string') payload.allowedSleeves = JSON.parse(payload.allowedSleeves);
      if (typeof payload.colors === 'string') payload.colors = JSON.parse(payload.colors);
      
      if (payload.premium !== undefined) payload.premium = payload.premium === 'true';
      if (payload.premiumPrice !== undefined) payload.premiumPrice = parseFloat(payload.premiumPrice);

      let overlays = typeof payload.overlays === 'string' ? JSON.parse(payload.overlays) : undefined;

      if (req.files && req.files.length > 0) {
        let optionImages = [];
        if (!overlays) overlays = {}; // Safety check
        
        req.files.forEach(file => {
          if (file.fieldname === 'images') {
            optionImages.push(file.path);
          } else if (file.fieldname.startsWith('overlay_')) {
            const rest = file.fieldname.substring('overlay_'.length); 
            const firstUnderscore = rest.indexOf('_');
            
            if (firstUnderscore !== -1) {
              const bodyPart = rest.substring(0, firstUnderscore); 
              const targetId = rest.substring(firstUnderscore + 1); 

              if (!overlays[bodyPart]) overlays[bodyPart] = {};
              if (!overlays[bodyPart][targetId]) overlays[bodyPart][targetId] = {};
              
              overlays[bodyPart][targetId].svgUrl = file.path;
            }
          }
        });

        if (optionImages.length > 0) payload.images = optionImages;
      }

      if (overlays) payload.overlays = overlays;

      const updatedOption = await embellishmentService.updateOption(id, payload);
      res.status(200).json({ success: true, message: "Embellishment Option Updated!", data: updatedOption });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // ==========================================
  // 🪄 THE MAGIC API
  // ==========================================

  async getAllEmbellishmentsGrouped(req, res) {
    try {
      const groupedData = await embellishmentService.getAllEmbellishmentsGrouped();
      res.status(200).json({ success: true, data: groupedData });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
}

module.exports = new EmbellishmentController();