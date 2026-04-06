const necklineService = require('../../services/DesignTool/necklineService');

class NecklineController {
  
  // 1. Create Neckline
  async createNeckline(req, res) {
    try {
      // Basic Validation
      if (!req.body || !req.body.name || !req.body.layers) {
        return res.status(400).json({ 
          success: false, 
          error: "Incomplete Data! Name aur Layers zaroori hain." 
        });
      }

      const newNeckline = await necklineService.createNeckline(req.body);
      
      res.status(201).json({ 
        success: true, 
        message: "Neckline Added Successfully!", 
        data: newNeckline 
      });

    } catch (error) {
      console.error("Create Neckline Error:", error);
      res.status(500).json({ success: false, error: "Internal Server Error", details: error.message });
    }
  }

  // 2. Get All Necklines
  async getAllNecklines(req, res) {
    try {
      const necklines = await necklineService.getAllNecklines();
      res.status(200).json({ 
        success: true, 
        data: necklines 
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // 3. Get Single Neckline
  async getNecklineById(req, res) {
    try {
      const { id } = req.params;
      const neckline = await necklineService.getNecklineById(id);
      
      res.status(200).json({ 
        success: true, 
        data: neckline 
      });
    } catch (error) {
      res.status(404).json({ success: false, error: error.message });
    }
  }

  // 4. Update Neckline
  async updateNeckline(req, res) {
    try {
      const { id } = req.params;
      
      if (!req.body || Object.keys(req.body).length === 0) {
        return res.status(400).json({ 
          success: false, 
          error: "Update data is empty!" 
        });
      }

      const updatedNeckline = await necklineService.updateNeckline(id, req.body);
      
      res.status(200).json({
        success: true,
        message: "Neckline Updated Successfully!",
        data: updatedNeckline
      });

    } catch (error) {
      console.error("Update Neckline Error:", error);
      // Prisma error code P2025 means Record Not Found
      if (error.code === 'P2025') {
         return res.status(404).json({ success: false, error: "Neckline not found in database." });
      }
      res.status(500).json({ success: false, error: "Internal Server Error", details: error.message });
    }
  }
}

module.exports = new NecklineController();