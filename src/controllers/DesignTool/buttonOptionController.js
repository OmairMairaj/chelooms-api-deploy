const buttonOptionService = require('../../services/DesignTool/buttonOptionService');

class ButtonOptionController {

  // ==========================================
  // 1. Create Button Option
  // ==========================================
  async createButtonOption(req, res) {
    try {
      const payload = { ...req.body };

      // 1. Parsing Strings to JSON/Boolean/Float
      if (typeof payload.colors === 'string') payload.colors = JSON.parse(payload.colors);
      if (payload.premium !== undefined) payload.premium = payload.premium === 'true';
      if (payload.premiumPrice) payload.premiumPrice = parseFloat(payload.premiumPrice);

      let optionImages = [];

      // 2. Handle Uploaded Images
      if (req.files && req.files.length > 0) {
        req.files.forEach(file => {
          if (file.fieldname === 'images') {
            optionImages.push(file.path);
          }
        });
      }

      const finalData = { ...payload, images: optionImages };
      const newButton = await buttonOptionService.createButtonOption(finalData);

      res.status(201).json({ success: true, message: "Button Option Created!", data: newButton });
    } catch (error) {
      console.error("Create Button Option Error:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // ==========================================
  // 2. Get All Button Options
  // ==========================================
  async getAllButtonOptions(req, res) {
    try {
      const buttons = await buttonOptionService.getAllButtonOptions();
      res.status(200).json({ success: true, data: buttons });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // ==========================================
  // 3. Update Button Option
  // ==========================================
  async updateButtonOption(req, res) {
    try {
      const { id } = req.params;
      const payload = { ...req.body };

      // Parsing
      if (typeof payload.colors === 'string') payload.colors = JSON.parse(payload.colors);
      if (payload.premium !== undefined) payload.premium = payload.premium === 'true';
      if (payload.premiumPrice !== undefined) payload.premiumPrice = parseFloat(payload.premiumPrice);

      // Handle Images update
      if (req.files && req.files.length > 0) {
        let optionImages = [];
        req.files.forEach(file => {
          if (file.fieldname === 'images') {
            optionImages.push(file.path);
          }
        });
        if (optionImages.length > 0) payload.images = optionImages;
      }

      const updatedButton = await buttonOptionService.updateButtonOption(id, payload);
      res.status(200).json({ success: true, message: "Button Option Updated!", data: updatedButton });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
}

module.exports = new ButtonOptionController();