const savedDesignService = require('../services/savedDesignService');

const savedDesignController = {
  async saveDesign(req, res) {
    console.log("👉 [SAVE DESIGN] Step 1: Request hit the controller!");

    try {
      // 1. Get User ID from Auth Middleware
      const userId = req.user ? req.user.user_id : null;
      if (!userId) {
        console.log("❌ [SAVE DESIGN] Error: Unauthorized. User ID missing.");
        return res.status(401).json({ success: false, message: "Please login to save your design." });
      }

      // 2. Extract Data from Body
      const { productId, designName, canvasData, status } = req.body;
      console.log(`👉 [SAVE DESIGN] Step 2: Data received for Product ID: ${productId}`);

      // 3. Validation
      if (!productId || !canvasData) {
        console.log("❌ [SAVE DESIGN] Error: Missing Product ID or Canvas Data.");
        return res.status(400).json({ success: false, message: "Product ID and Canvas Data are required." });
      }

      // 4. Handle Thumbnail Image (Agar frontend ne image file bheji hai)
      let thumbnailUrl = null;
      if (req.files && req.files.thumbnail && req.files.thumbnail.length > 0) {
        thumbnailUrl = req.files.thumbnail[0].path; // Cloudinary URL from Multer
        console.log("👉 [SAVE DESIGN] Step 3: Thumbnail uploaded to Cloudinary.");
      }

      // 5. Parse JSON agar frontend ne stringify karke bheja ho
      let parsedCanvasData = canvasData;
      if (typeof canvasData === 'string') {
        parsedCanvasData = JSON.parse(canvasData);
      }
      console.log("👉 [SAVE DESIGN] Step 4: Canvas Data parsed successfully.");

      // 6. Pass Data to Service
      const finalData = {
        userId,
        productId,
        designName,
        canvasData: parsedCanvasData,
        status,
        thumbnailUrl
      };

      console.log("👉 [SAVE DESIGN] Step 5: Sending data to Service layer...");
      const savedDesign = await savedDesignService.saveNewDesign(finalData);

      console.log("✅ [SAVE DESIGN] Step 6: Success! Design Saved.");
      return res.status(201).json({
        success: true,
        message: "Your custom design has been saved successfully!",
        data: savedDesign
      });

    } catch (error) {
      console.error("❌ CRITICAL ERROR IN SAVE DESIGN CONTROLLER:");
      console.error(error.stack);
      return res.status(500).json({ success: false, error: error.message, stack: error.stack });
    }
  },

  async updateStatus(req, res) {
    const { id } = req.params; // URL se designId aayegi
    console.log(`👉 [UPDATE STATUS] Step 1: Request hit for Design ID: ${id}`);

    try {
      // 1. Get User ID from Token
      const userId = req.user ? req.user.user_id : null;
      if (!userId) {
        console.log("❌ [UPDATE STATUS] Error: Unauthorized.");
        return res.status(401).json({ success: false, message: "Please login to perform this action." });
      }

      // 2. Get new status from body
      const { status } = req.body;
      console.log(`👉 [UPDATE STATUS] Step 2: Requested new status is '${status}'`);

      // 3. Validation
      if (!status || !['private', 'published'].includes(status.toLowerCase())) {
        console.log("❌ [UPDATE STATUS] Error: Invalid status value.");
        return res.status(400).json({ 
          success: false, 
          message: "Invalid status. It must be either 'private' or 'published'." 
        });
      }

      // 4. Pass to Service
      console.log("👉 [UPDATE STATUS] Step 3: Sending to Service layer...");
      const updatedDesign = await savedDesignService.updateDesignStatus(id, userId, status.toLowerCase());

      console.log("✅ [UPDATE STATUS] Step 4: Success!");
      return res.status(200).json({
        success: true,
        message: `Your design status has been updated to ${status}.`,
        data: updatedDesign
      });

    } catch (error) {
      console.error("❌ CRITICAL ERROR IN UPDATE STATUS CONTROLLER:");
      console.error(error.stack);
      
      // Handle our custom security error from service
      if (error.message === "NOT_FOUND_OR_UNAUTHORIZED") {
        return res.status(404).json({ 
          success: false, 
          message: "Design not found, or you don't have permission to modify it." 
        });
      }

      return res.status(500).json({ success: false, error: error.message });
    }
  },

  async getPublishedDesigns(req, res) {
    console.log("👉 [GET PUBLISHED] Step 1: Request hit the controller!");

    try {
      // 1. Get Pagination Params from URL Query (Default: Page 1, Limit 10)
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;

      // 2. Pass to Service
      console.log(`👉 [GET PUBLISHED] Step 2: Requesting Page ${page}...`);
      const result = await savedDesignService.getAllPublishedDesigns(page, limit);

      console.log("✅ [GET PUBLISHED] Step 3: Success!");
      return res.status(200).json({
        success: true,
        message: "Published designs fetched successfully.",
        data: result.designs,
        meta: result.meta
      });

    } catch (error) {
      console.error("❌ CRITICAL ERROR IN GET PUBLISHED DESIGNS CONTROLLER:");
      console.error(error.stack);
      return res.status(500).json({ success: false, error: error.message });
    }
  },

  async getMyDesigns(req, res) {
    console.log("👉 [GET MY DESIGNS] Step 1: Request hit the controller!");

    try {
      // 1. Get User ID from Token (Auth Middleware)
      const userId = req.user ? req.user.user_id : null;
      if (!userId) {
        console.log("❌ [GET MY DESIGNS] Error: Unauthorized.");
        return res.status(401).json({ success: false, message: "Please login to see your designs." });
      }

      // 2. Pass to Service
      console.log(`👉 [GET MY DESIGNS] Step 2: Fetching designs for User: ${userId}`);
      const designs = await savedDesignService.getDesignsByUser(userId);

      console.log("✅ [GET MY DESIGNS] Step 3: Success!");
      return res.status(200).json({
        success: true,
        message: "Your designs have been fetched successfully.",
        count: designs.length,
        data: designs
      });

    } catch (error) {
      console.error("❌ CRITICAL ERROR IN GET MY DESIGNS CONTROLLER:");
      console.error(error.stack);
      return res.status(500).json({ success: false, error: error.message });
    }
  }
};

module.exports = savedDesignController;