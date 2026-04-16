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
  // 👕 OPTION APIs (Child)
  // ==========================================

  // 4. Create Option
  async createOption(req, res) {
    try {
      const payload = { ...req.body };

      // 1. Strings ko wapis Array/JSON banate hain
      if (typeof payload.layers === 'string') payload.layers = JSON.parse(payload.layers);
      if (typeof payload.keywords === 'string') payload.keywords = JSON.parse(payload.keywords);
      if (typeof payload.tags === 'string') payload.tags = JSON.parse(payload.tags);
      
      // 2. Booleans theek karna (Neckline specific toggles)
      payload.hasButtons = payload.hasButtons === 'true';
      payload.isButton = payload.isButton === 'true';
      payload.thread = payload.thread === 'true';
      payload.collarback = payload.collarback === 'true';
      payload.premium = payload.premium === 'true';

      // 3. Handle Main Option Images
      let optionImagesUrl = [];
      if (req.files && req.files.images && req.files.images.length > 0) {
        // Agar array of images aayin hain toh sabka path nikal lo
        optionImagesUrl = req.files.images.map(file => file.path); 
      }

      // 4. 🚀 Handle Layer SVGs/Images (The Fix)
      if (req.files && req.files.layerFiles && req.files.layerFiles.length > 0) {
        // payload.layers JSON ko map karte hain
        if (Array.isArray(payload.layers)) {
          payload.layers = payload.layers.map((layer, index) => {
            // Agar is index ki file aayi hai, toh uska Cloudinary URL layer object mein daal do
            if (req.files.layerFiles[index]) {
              layer.svgUrl = req.files.layerFiles[index].path; 
            }
            return layer;
          });
        }
      }

      // 5. Finalize data and pass to service
      const finalData = { ...payload, images: optionImagesUrl };
      const newOption = await necklineService.createOption(finalData);
      
      res.status(201).json({ success: true, message: "Neckline Option Created!", data: newOption });
    } catch (error) {
      console.error("Create Neckline Option Error:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async updateOption(req, res) {
    try {
      const { id } = req.params;
      const payload = { ...req.body };

      // 1. Strings ko wapis Array/JSON banate hain
      if (typeof payload.layers === 'string') payload.layers = JSON.parse(payload.layers);
      if (typeof payload.keywords === 'string') payload.keywords = JSON.parse(payload.keywords);
      if (typeof payload.tags === 'string') payload.tags = JSON.parse(payload.tags);
      
      // 2. Booleans theek karna
      if (payload.hasButtons !== undefined) payload.hasButtons = payload.hasButtons === 'true';
      if (payload.isButton !== undefined) payload.isButton = payload.isButton === 'true';
      if (payload.thread !== undefined) payload.thread = payload.thread === 'true';
      if (payload.collarback !== undefined) payload.collarback = payload.collarback === 'true';
      if (payload.premium !== undefined) payload.premium = payload.premium === 'true';

      // 3. Handle Main Option Images (Thumbnail)
      if (req.files && req.files.images && req.files.images.length > 0) {
        payload.images = [req.files.images[0].path]; 
      }

      // 4. Handle Layer SVGs/Images (The Fix for Update)
      if (req.files && req.files.layerFiles && req.files.layerFiles.length > 0) {
        if (Array.isArray(payload.layers)) {
          payload.layers = payload.layers.map((layer, index) => {
            // Agar is index ki nayi file upload hui hai, toh Cloudinary URL update kar do
            if (req.files.layerFiles[index]) {
              layer.svgUrl = req.files.layerFiles[index].path; 
            }
            return layer;
          });
        }
      }

      // 5. Pass to Service Layer
      const updatedOption = await necklineService.updateOption(id, payload);
      res.status(200).json({ success: true, message: "Neckline Option Updated!", data: updatedOption });
      
    } catch (error) {
      console.error("Update Neckline Option Error:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
  // async createOption(req, res) {
  //   try {
  //     const payload = { ...req.body };

  //     // Strings ko wapis Array/JSON banate hain
  //     if (typeof payload.layers === 'string') payload.layers = JSON.parse(payload.layers);
  //     if (typeof payload.keywords === 'string') payload.keywords = JSON.parse(payload.keywords);
  //     if (typeof payload.tags === 'string') payload.tags = JSON.parse(payload.tags);
      
  //     // Booleans theek karna (Neckline specific toggles)
  //     payload.hasButtons = payload.hasButtons === 'true';
  //     payload.isButton = payload.isButton === 'true';
  //     payload.thread = payload.thread === 'true';
  //     payload.collarback = payload.collarback === 'true';
  //     payload.premium = payload.premium === 'true';

  //     let optionImagesUrl = [];
  //     if (req.files && req.files.images && req.files.images.length > 0) {
  //       optionImagesUrl.push(req.files.images[0].path);
  //     }

  //     const finalData = { ...payload, images: optionImagesUrl };
  //     const newOption = await necklineService.createOption(finalData);
      
  //     res.status(201).json({ success: true, message: "Neckline Option Created!", data: newOption });
  //   } catch (error) {
  //     console.error("Create Neckline Option Error:", error);
  //     res.status(500).json({ success: false, error: error.message });
  //   }
  // }

  // 5. Update Option
  // async updateOption(req, res) {
  //   try {
  //     const { id } = req.params;
  //     const payload = { ...req.body };

  //     if (typeof payload.layers === 'string') payload.layers = JSON.parse(payload.layers);
  //     if (typeof payload.keywords === 'string') payload.keywords = JSON.parse(payload.keywords);
  //     if (typeof payload.tags === 'string') payload.tags = JSON.parse(payload.tags);
      
  //     if (payload.hasButtons !== undefined) payload.hasButtons = payload.hasButtons === 'true';
  //     if (payload.isButton !== undefined) payload.isButton = payload.isButton === 'true';
  //     if (payload.thread !== undefined) payload.thread = payload.thread === 'true';
  //     if (payload.collarback !== undefined) payload.collarback = payload.collarback === 'true';
  //     if (payload.premium !== undefined) payload.premium = payload.premium === 'true';

  //     if (req.files && req.files.images && req.files.images.length > 0) {
  //       payload.images = [req.files.images[0].path]; 
  //     }

  //     const updatedOption = await necklineService.updateOption(id, payload);
  //     res.status(200).json({ success: true, message: "Neckline Option Updated!", data: updatedOption });
  //   } catch (error) {
  //     res.status(500).json({ success: false, error: error.message });
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