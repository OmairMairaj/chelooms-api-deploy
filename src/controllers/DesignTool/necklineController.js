const necklineService = require('../../services/DesignTool/necklineService');

class NecklineController {

  // ==========================================
  // 📁 CATEGORY APIs (Parent)
  // ==========================================

  // 1. Create Category
  async createCategory(req, res) {
    try {
      const payload = { ...req.body };
      let categoryImageUrl = [];

      // Cloudinary File Upload: req.files...path use kar rahe hain
      if (req.files && req.files.categoryImage && req.files.categoryImage.length > 0) {
        categoryImageUrl.push(req.files.categoryImage[0].path); 
      }

      const finalData = { ...payload, image: categoryImageUrl };
      const newCategory = await necklineService.createCategory(finalData);
      
      res.status(201).json({ success: true, message: "Neckline Category Created!", data: newCategory });
    } catch (error) {
      console.error("Create Neckline Category Error:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // 2. Get All Categories
  async getAllCategories(req, res) {
    try {
      const categories = await necklineService.getAllCategories();
      res.status(200).json({ success: true, data: categories });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // 3. Update Category
  async updateCategory(req, res) {
    try {
      const { id } = req.params;
      const payload = { ...req.body };
      
      if (req.files && req.files.categoryImage && req.files.categoryImage.length > 0) {
        payload.image = [req.files.categoryImage[0].path]; 
      }

      const updatedCategory = await necklineService.updateCategory(id, payload);
      res.status(200).json({ success: true, message: "Neckline Category Updated!", data: updatedCategory });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // ==========================================
  // REORDER CATEGORIES
  // ==========================================
  async reorderCategories(req, res) {
    try {
      const { orderedIds } = req.body;
      if (!orderedIds || !Array.isArray(orderedIds)) {
        return res.status(400).json({ success: false, message: "Invalid orderedIds array." });
      }
      await necklineService.reorderCategories(orderedIds);
      res.status(200).json({ success: true, message: "Categories reordered successfully!" });
    } catch (error) {
      console.error("Reorder Neckline Categories Error:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // ==========================================
  // REORDER OPTIONS
  // ==========================================
  async reorderOptions(req, res) {
    try {
      const { orderedIds } = req.body;
      if (!orderedIds || !Array.isArray(orderedIds)) {
        return res.status(400).json({ success: false, message: "Invalid orderedIds array." });
      }
      await necklineService.reorderOptions(orderedIds);
      res.status(200).json({ success: true, message: "Options reordered successfully!" });
    } catch (error) {
      console.error("Reorder Neckline Options Error:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async createOption(req, res) {
    console.log("👉 [CREATE NECKLINE] Step 1: Request hit the controller!");
    
    try {
      const payload = { ...req.body };

      // 1. Strings ko wapis Array/JSON banate hain
      if (typeof payload.layers === 'string') payload.layers = JSON.parse(payload.layers);
      if (typeof payload.keywords === 'string') payload.keywords = JSON.parse(payload.keywords);
      if (typeof payload.tags === 'string') payload.tags = JSON.parse(payload.tags);
      
      // 2. Main Option Booleans theek karna (Kachra saaf kar diya gaya hai)
      payload.hasButtons = payload.hasButtons === 'true';
      payload.premium = payload.premium === 'true';

      // 3. Handle Main Option Images
      let optionImagesUrl = [];
      if (req.files && req.files.images && req.files.images.length > 0) {
        optionImagesUrl = req.files.images.map(file => file.path); 
      }

      // 4. Handle Layer SVGs/Images & Booleans
      if (Array.isArray(payload.layers)) {
        payload.layers = payload.layers.map((layer, index) => {
          // A. Layer ki naye booleans ko parse karna
          layer.isCollarback = layer.isCollarback === true || layer.isCollarback === 'true';
          
          // B. SVG Map karna — admin placeholder.svg ignore karo taake existing svgUrl overwrite na ho
          const uploadedFile = req.files && req.files.layerFiles && req.files.layerFiles[index];
          if (uploadedFile && uploadedFile.originalname !== 'placeholder.svg') {
            layer.svgUrl = uploadedFile.path;
          }
          return layer;
        });
      }

      // 5. Finalize data and pass to service
      const finalData = { ...payload, images: optionImagesUrl };
      const newOption = await necklineService.createOption(finalData);
      
      res.status(201).json({ success: true, message: "Neckline Option Created!", data: newOption });

    } catch (error) {
      console.error("❌ CRITICAL ERROR IN CREATE CONTROLLER:");
      console.error(error.stack); 
      res.status(500).json({ success: false, error: error.message, stack: error.stack });
    }
  }

  async updateOption(req, res) {
    console.log(`👉 [UPDATE NECKLINE] Step 1: Request hit for ID: ${req.params.id}`);

    try {
      const { id } = req.params;
      const payload = { ...req.body };

      // 1. Strings ko wapis Array/JSON banate hain
      if (typeof payload.layers === 'string') payload.layers = JSON.parse(payload.layers);
      if (typeof payload.keywords === 'string') payload.keywords = JSON.parse(payload.keywords);
      if (typeof payload.tags === 'string') payload.tags = JSON.parse(payload.tags);
      
      // 2. Main Option Booleans theek karna
      if (payload.hasButtons !== undefined) payload.hasButtons = payload.hasButtons === 'true';
      if (payload.premium !== undefined) payload.premium = payload.premium === 'true';

      // 3. Handle Main Option Images (Thumbnail)
      if (req.files && req.files.images && req.files.images.length > 0) {
        payload.images = [req.files.images[0].path]; 
      }

      // 4. Handle Layer SVGs/Images & Booleans for Update
      if (Array.isArray(payload.layers)) {
        payload.layers = payload.layers.map((layer, index) => {
          // A. Layer ki naye booleans ko parse karna
          if (layer.isCollarback !== undefined) {
             layer.isCollarback = layer.isCollarback === true || layer.isCollarback === 'true';
          }
          
          // B. SVG Map karna — admin placeholder.svg ignore karo taake existing svgUrl overwrite na ho
          const uploadedFile = req.files && req.files.layerFiles && req.files.layerFiles[index];
          if (uploadedFile && uploadedFile.originalname !== 'placeholder.svg') {
            layer.svgUrl = uploadedFile.path;
          }
          return layer;
        });
      }

      // 5. Pass to Service Layer
      const updatedOption = await necklineService.updateOption(id, payload);
      
      res.status(200).json({ success: true, message: "Neckline Option Updated!", data: updatedOption });
      
    } catch (error) {
      console.error("❌ CRITICAL ERROR IN UPDATE CONTROLLER:");
      console.error(error.stack);
      res.status(500).json({ success: false, error: error.message, stack: error.stack });
    }
  }
 
  // async createOption(req, res) {
  //   console.log("👉 [CREATE] Step 1: Request hit the controller!");
    
  //   try {
  //     console.log("👉 [CREATE] Step 2: Files received from Multer:", req.files ? Object.keys(req.files) : "No files");
  //     console.log("👉 [CREATE] Step 3: Body received:", req.body);

  //     const payload = { ...req.body };

  //     // 1. Strings ko wapis Array/JSON banate hain
  //     if (typeof payload.layers === 'string') payload.layers = JSON.parse(payload.layers);
  //     if (typeof payload.keywords === 'string') payload.keywords = JSON.parse(payload.keywords);
  //     if (typeof payload.tags === 'string') payload.tags = JSON.parse(payload.tags);
  //     console.log("👉 [CREATE] Step 4: JSON Parsing successful.");
      
  //     // 2. Booleans theek karna
  //     payload.hasButtons = payload.hasButtons === 'true';
  //     payload.isButton = payload.isButton === 'true';
  //     payload.thread = payload.thread === 'true';
  //     payload.collarback = payload.collarback === 'true';
  //     payload.premium = payload.premium === 'true';

  //     // 3. Handle Main Option Images
  //     let optionImagesUrl = [];
  //     if (req.files && req.files.images && req.files.images.length > 0) {
  //       optionImagesUrl = req.files.images.map(file => file.path); 
  //       console.log("👉 [CREATE] Step 5: Main images mapped:", optionImagesUrl);
  //     }

  //     // 4. Handle Layer SVGs/Images
  //     if (req.files && req.files.layerFiles && req.files.layerFiles.length > 0) {
  //       if (Array.isArray(payload.layers)) {
  //         payload.layers = payload.layers.map((layer, index) => {
  //           if (req.files.layerFiles[index]) {
  //             layer.svgUrl = req.files.layerFiles[index].path; 
  //           }
  //           return layer;
  //         });
  //         console.log("👉 [CREATE] Step 6: Layer files mapped with SVGs.");
  //       }
  //     }

  //     // 5. Finalize data and pass to service
  //     const finalData = { ...payload, images: optionImagesUrl };
      
  //     console.log("👉 [CREATE] Step 7: Sending data to Service layer...");
  //     const newOption = await necklineService.createOption(finalData);
      
  //     console.log("✅ [CREATE] Step 8: Success! Option Created.");
  //     res.status(201).json({ success: true, message: "Neckline Option Created!", data: newOption });

  //   } catch (error) {
  //     // Yahan error.stack lagaya hai taake line number bhi pata chale
  //     console.error("❌ CRITICAL ERROR IN CREATE CONTROLLER:");
  //     console.error(error.stack); 
  //     res.status(500).json({ success: false, error: error.message, stack: error.stack });
  //   }
  // }

  // async updateOption(req, res) {
  //   console.log(`👉 [UPDATE] Step 1: Request hit for ID: ${req.params.id}`);

  //   try {
  //     const { id } = req.params;
  //     console.log("👉 [UPDATE] Step 2: Files received:", req.files ? Object.keys(req.files) : "No files");
      
  //     const payload = { ...req.body };

  //     // 1. Strings ko wapis Array/JSON banate hain
  //     if (typeof payload.layers === 'string') payload.layers = JSON.parse(payload.layers);
  //     if (typeof payload.keywords === 'string') payload.keywords = JSON.parse(payload.keywords);
  //     if (typeof payload.tags === 'string') payload.tags = JSON.parse(payload.tags);
  //     console.log("👉 [UPDATE] Step 3: JSON Parsing successful.");
      
  //     // 2. Booleans theek karna
  //     if (payload.hasButtons !== undefined) payload.hasButtons = payload.hasButtons === 'true';
  //     if (payload.isButton !== undefined) payload.isButton = payload.isButton === 'true';
  //     if (payload.thread !== undefined) payload.thread = payload.thread === 'true';
  //     if (payload.collarback !== undefined) payload.collarback = payload.collarback === 'true';
  //     if (payload.premium !== undefined) payload.premium = payload.premium === 'true';

  //     // 3. Handle Main Option Images (Thumbnail)
  //     if (req.files && req.files.images && req.files.images.length > 0) {
  //       payload.images = [req.files.images[0].path]; 
  //       console.log("👉 [UPDATE] Step 4: New Main Image mapped.");
  //     }

  //     // 4. Handle Layer SVGs/Images
  //     if (req.files && req.files.layerFiles && req.files.layerFiles.length > 0) {
  //       if (Array.isArray(payload.layers)) {
  //         payload.layers = payload.layers.map((layer, index) => {
  //           if (req.files.layerFiles[index]) {
  //             layer.svgUrl = req.files.layerFiles[index].path; 
  //           }
  //           return layer;
  //         });
  //         console.log("👉 [UPDATE] Step 5: New Layer files mapped.");
  //       }
  //     }

  //     // 5. Pass to Service Layer
  //     console.log("👉 [UPDATE] Step 6: Sending data to Service layer...");
  //     const updatedOption = await necklineService.updateOption(id, payload);
      
  //     console.log("✅ [UPDATE] Step 7: Success! Option Updated.");
  //     res.status(200).json({ success: true, message: "Neckline Option Updated!", data: updatedOption });
      
  //   } catch (error) {
  //     console.error("❌ CRITICAL ERROR IN UPDATE CONTROLLER:");
  //     console.error(error.stack);
  //     res.status(500).json({ success: false, error: error.message, stack: error.stack });
  //   }
  // }

  // ==========================================
  // 🪄 THE MAGIC API
  // ==========================================

  // 6. Get All Necklines Grouped
  async getAllNecklinesGrouped(req, res) {
    try {
      const groupedNecklines = await necklineService.getAllNecklinesGrouped();
      res.status(200).json({ success: true, data: groupedNecklines });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
}

module.exports = new NecklineController();