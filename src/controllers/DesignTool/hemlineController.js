const hemlineService = require('../../services/DesignTool/hemlineService');

class HemlineController {

  // ==========================================
  // 📁 CATEGORY APIs (Parent)
  // ==========================================

  // 1. Create Category
  async createCategory(req, res) {
    try {
      const payload = { ...req.body };
      let categoryImageUrl = [];

      if (req.files && req.files.categoryImage && req.files.categoryImage.length > 0) {
        categoryImageUrl.push(req.files.categoryImage[0].path); // Cloudinary URL
      }

      const finalData = { ...payload, image: categoryImageUrl };
      const newCategory = await hemlineService.createCategory(finalData);
      
      res.status(201).json({ success: true, message: "Hemline Category Created!", data: newCategory });
    } catch (error) {
      console.error("Create Hemline Category Error:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // 2. Get All Categories
  async getAllCategories(req, res) {
    try {
      const categories = await hemlineService.getAllCategories();
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

      const updatedCategory = await hemlineService.updateCategory(id, payload);
      res.status(200).json({ success: true, message: "Hemline Category Updated!", data: updatedCategory });
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
      await hemlineService.reorderCategories(orderedIds);
      res.status(200).json({ success: true, message: "Categories reordered successfully!" });
    } catch (error) {
      console.error("Reorder Hemline Categories Error:", error);
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
      await hemlineService.reorderOptions(orderedIds);
      res.status(200).json({ success: true, message: "Options reordered successfully!" });
    } catch (error) {
      console.error("Reorder Hemline Options Error:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // ==========================================
  // 👕 OPTION APIs (Child) - WITH LAYERS UPLOAD
  // ==========================================

  // 4. Create Option
  async createOption(req, res) {
    try {
      const payload = { ...req.body };

      // 1. Strings ko Array/JSON banate hain
      if (typeof payload.tags === 'string') payload.tags = JSON.parse(payload.tags);
      let parsedLayers = typeof payload.layers === 'string' ? JSON.parse(payload.layers) : (payload.layers || []);
      
      // 2. Booleans theek karna
      payload.premium = payload.premium === 'true';

      // 3. ✨ MAGIC: Mapping Cloudinary URLs to Layers
      // Agar frontend ne 'layerImages' ke naam se files bheji hain
      if (req.files && req.files.layerImages && req.files.layerImages.length > 0) {
        req.files.layerImages.forEach((file, index) => {
          // Admin placeholder.svg ignore karo taake existing svgUrl overwrite na ho
          if (parsedLayers[index] && file.originalname !== 'placeholder.svg') {
            parsedLayers[index].svgUrl = file.path;
          }
        });
      }

      const finalData = { 
        ...payload, 
        layers: parsedLayers // Updated layers with Cloudinary URLs
      };

      const newOption = await hemlineService.createOption(finalData);
      res.status(201).json({ success: true, message: "Hemline Option Created!", data: newOption });
    } catch (error) {
      console.error("Create Hemline Option Error:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // 5. Update Option
  async updateOption(req, res) {
    try {
      const { id } = req.params;
      const payload = { ...req.body };

      if (typeof payload.tags === 'string') payload.tags = JSON.parse(payload.tags);
      let parsedLayers = typeof payload.layers === 'string' ? JSON.parse(payload.layers) : undefined;
      
      if (payload.premium !== undefined) payload.premium = payload.premium === 'true';

      // ✨ Update ke waqt bhi Cloudinary URL mapping
      if (parsedLayers && req.files && req.files.layerImages && req.files.layerImages.length > 0) {
        req.files.layerImages.forEach((file, index) => {
          // Admin placeholder.svg ignore karo taake existing svgUrl overwrite na ho
          if (parsedLayers[index] && file.originalname !== 'placeholder.svg') {
            parsedLayers[index].svgUrl = file.path;
          }
        });
      }

      // Agar layers update hue hain toh payload mein updated wale daal do
      if (parsedLayers) {
        payload.layers = parsedLayers;
      }

      const updatedOption = await hemlineService.updateOption(id, payload);
      res.status(200).json({ success: true, message: "Hemline Option Updated!", data: updatedOption });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // ==========================================
  // 🪄 THE MAGIC API
  // ==========================================

  // 6. Get All Hemlines Grouped
  async getAllHemlinesGrouped(req, res) {
    try {
      const groupedHemlines = await hemlineService.getAllHemlinesGrouped();
      res.status(200).json({ success: true, data: groupedHemlines });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
}

module.exports = new HemlineController();