const savedDesignService = require('../services/savedDesignService');

const savedDesignController = {
  
  //   console.log("👉 [SAVE DESIGN] Step 1: Request hit the controller!");

  //   try {
  //     // 1. Get User ID from Auth Middleware
  //     const userId = req.user ? req.user.user_id : null;
  //     if (!userId) {
  //       console.log("❌ [SAVE DESIGN] Error: Unauthorized. User ID missing.");
  //       return res.status(401).json({ success: false, message: "Please login to save your design." });
  //     }

  //     // 2. Extract Data from Body
  //     const { productId, designName, canvasData, status, aspectRatio } = req.body;
  //     console.log(`👉 [SAVE DESIGN] Step 2: Data received for Product ID: ${productId}`);

  //     // 3. Validation
  //     if (!productId || !canvasData) {
  //       console.log("❌ [SAVE DESIGN] Error: Missing Product ID or Canvas Data.");
  //       return res.status(400).json({ success: false, message: "Product ID and Canvas Data are required." });
  //     }

  //     // 4. Handle Thumbnail Image (Agar frontend ne image file bheji hai)
  //     // 4. Handle Thumbnail Image (Smart Check)
  //     let thumbnailUrl = null;
  //     console.log("🕵️ req.files PURA OBJECT:", JSON.stringify(req.files, null, 2));
  //     // 🕵️ DEBUGGING: Console pe check karte hain multer ne file kahan rakhi hai
  //     console.log("🕵️ Check req.file:", req.file ? "File Exists" : "Undefined");
  //     console.log("🕵️ Check req.files:", req.files ? "Files Object Exists" : "Undefined");

  //     if (req.file && req.file.path) {
  //       // Scenario A: Agar route mein `upload.single('thumbnail')` lagaya hai
  //       thumbnailUrl = req.file.path;
  //       console.log("👉 [SAVE DESIGN] Step 3: Thumbnail uploaded via req.file");
  //     } 
  //     else if (req.files && req.files.thumbnail && req.files.thumbnail.length > 0) {
  //       // Scenario B: Agar route mein `upload.fields([{ name: 'thumbnail' }])` lagaya hai
  //       thumbnailUrl = req.files.thumbnail[0].path; 
  //       console.log("👉 [SAVE DESIGN] Step 3: Thumbnail uploaded via req.files");
  //     } 
  //     else {
  //       console.log("⚠️ [SAVE DESIGN] Step 3: No thumbnail image found in request.");
  //     }

  //     // 5. Parse JSON agar frontend ne stringify karke bheja ho
  //     let parsedCanvasData = canvasData;
  //     if (typeof canvasData === 'string') {
  //       parsedCanvasData = JSON.parse(canvasData);
  //     }
  //     console.log("👉 [SAVE DESIGN] Step 4: Canvas Data parsed successfully.");

  //     // 6. Pass Data to Service
  //     const finalData = {
  //       userId,
  //       productId,
  //       designName,
  //       canvasData: parsedCanvasData,
  //       status,
  //       thumbnailUrl,
  //       aspectRatio // service coerces to number with 1.0 fallback
  //     };

  //     console.log("👉 [SAVE DESIGN] Step 5: Sending data to Service layer...");
  //     const savedDesign = await savedDesignService.saveNewDesign(finalData);

  //     console.log("✅ [SAVE DESIGN] Step 6: Success! Design Saved.");
  //     return res.status(201).json({
  //       success: true,
  //       message: "Your custom design has been saved successfully!",
  //       data: savedDesign
  //     });

  //   } catch (error) {
  //     console.error("❌ CRITICAL ERROR IN SAVE DESIGN CONTROLLER:");
  //     console.error(error.stack);
  //     return res.status(500).json({ success: false, error: error.message, stack: error.stack });
  //   }
  // },

  async saveDesign(req, res) {
    console.log("👉 [SAVE DESIGN] Step 1: Request hit the controller!");

    try {
      // 1. Get User ID from Auth Middleware
      const userId = req.user ? req.user.user_id : null;
      if (!userId) {
        console.log("❌ [SAVE DESIGN] Error: Unauthorized. User ID missing.");
        return res.status(401).json({ success: false, message: "Please login to save your design." });
      }

      // 2. Extract Data from Body (Nayi fields yahan add ki hain)
      const { 
        productId, designName, canvasData, status, aspectRatio,
        basePrice, addOnPrice, finalPrice, currency, pricingBreakdown, remixedFromId
      } = req.body;
      
      console.log(`👉 [SAVE DESIGN] Step 2: Data received for Product ID: ${productId}`);

      // 3. Validation
      if (!productId || !canvasData) {
        console.log("❌ [SAVE DESIGN] Error: Missing Product ID or Canvas Data.");
        return res.status(400).json({ success: false, message: "Product ID and Canvas Data are required." });
      }

      // 4. Handle Thumbnail Image (Smart Check)
      let thumbnailUrl = null;
      console.log("🕵️ req.files PURA OBJECT:", JSON.stringify(req.files, null, 2));
      console.log("🕵️ Check req.file:", req.file ? "File Exists" : "Undefined");
      console.log("🕵️ Check req.files:", req.files ? "Files Object Exists" : "Undefined");

      if (req.file && req.file.path) {
        thumbnailUrl = req.file.path;
        console.log("👉 [SAVE DESIGN] Step 3: Thumbnail uploaded via req.file");
      } 
      else if (req.files && req.files.thumbnail && req.files.thumbnail.length > 0) {
        thumbnailUrl = req.files.thumbnail[0].path; 
        console.log("👉 [SAVE DESIGN] Step 3: Thumbnail uploaded via req.files");
      } 
      else {
        console.log("⚠️ [SAVE DESIGN] Step 3: No thumbnail image found in request.");
      }

      // 5. Parse JSON Data
      let parsedCanvasData = canvasData;
      if (typeof canvasData === 'string') {
        parsedCanvasData = JSON.parse(canvasData);
      }

      // 🚨 NAYI FIELDS PARSING LOGIC 🚨
      const parsedBasePrice = basePrice ? parseFloat(basePrice) : null;
      const parsedAddOnPrice = addOnPrice ? parseFloat(addOnPrice) : null;
      const parsedFinalPrice = finalPrice ? parseFloat(finalPrice) : null;
      const parsedCurrency = currency || 'PKR';

      let parsedBreakdown = null;
      if (pricingBreakdown) {
        try {
          parsedBreakdown = typeof pricingBreakdown === 'string' ? JSON.parse(pricingBreakdown) : pricingBreakdown;
        } catch (err) {
          console.error("⚠️ [SAVE DESIGN] Error parsing pricingBreakdown:", err.message);
        }
      }
      console.log("👉 [SAVE DESIGN] Step 4: Canvas & Pricing Data parsed successfully.");

      // 6. Pass Data to Service
      const finalData = {
        userId,
        productId,
        designName,
        canvasData: parsedCanvasData,
        status,
        thumbnailUrl,
        //aspectRatio, // service coerces to number
        basePrice: parsedBasePrice,
        addOnPrice: parsedAddOnPrice,
        finalPrice: parsedFinalPrice,
        currency: parsedCurrency,
        pricingBreakdown: parsedBreakdown,  
        remixedFromId: remixedFromId || null
      };

      console.log("👉 [SAVE DESIGN] Step 5: Sending data to Service layer...");
      const savedDesign = await savedDesignService.saveNewDesign(finalData);

      console.log("✅ [SAVE DESIGN] Step 6: Success! Design Saved.");
      return res.status(201).json({
        success: true,
        message: remixedFromId ? "Design remixed successfully! ♻️" : "Design saved successfully!",
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
      const userId = req.user ? req.user.user_id : null;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;

      // 2. Pass to Service
      console.log(`👉 [GET PUBLISHED] Step 2: Requesting Page ${page}...`);
      const result = await savedDesignService.getAllPublishedDesigns(page, limit, userId);

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
  },


  // 👁️ INCREMENT VIEW CONTROLLER
  async incrementView(req, res) {
    try {
      const { id } = req.params;
      const newViewsCount = await savedDesignService.incrementViewCount(id);

      return res.status(200).json({
        success: true,
        message: "View count updated",
        viewsCount: newViewsCount
      });
    } catch (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
  },

  // ❤️ TOGGLE LIKE CONTROLLER
  async toggleLike(req, res) {
    try {
      // Auth middleware se user ID aayegi (User ka login hona zaroori hai)
      const userId = req.user ? req.user.user_id : null; 
      const { id } = req.params; // Yeh designId hai

      if (!userId) {
        return res.status(401).json({ success: false, message: "Please login to like designs." });
      }

      const result = await savedDesignService.toggleLikeDesign(userId, id);

      return res.status(200).json({
        success: true,
        message: result.message,
        liked: result.liked
      });
    } catch (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
  },

  /** Admin / inventory: all saved designs (paginated + filters) */
  async getAllForAdmin(req, res) {
    try {
      const result = await savedDesignService.getAdminSavedDesignsList(req.query);
      return res.status(200).json({
        success: true,
        message: 'Saved designs fetched successfully',
        data: result.designs,
        meta: result.meta,
      });
    } catch (error) {
      console.error('Error fetching admin saved designs:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  },

};

module.exports = savedDesignController;