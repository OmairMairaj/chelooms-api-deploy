const posthog = require('../config/posthog');
const inventoryService = require('../services/inventoryService');

/**
 * Controller: Handles HTTP Requests for Inventory Module (M-02)
 */
class InventoryController {

  // 1. Create Category
  async createCategory(req, res) {
    try {
      const { name, type, description } = req.body;
      if (!name || !type) {
        return res.status(400).json({ error: "Name and Type (FABRIC/EMBELLISHMENT) are required" });
      }
      const category = await inventoryService.createCategory({ name, type, description });
      res.status(201).json({ success: true, data: category });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  // 2. Get All Categories
  async getCategories(req, res) {
    try {
      const categories = await inventoryService.getAllCategories();
      res.status(200).json({ success: true, data: categories });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  // 3. Add Inventory Item (With Bulletproof Debugging)
  // async addItem(req, res) {
  //   try {
  //     const adminId = req.user?.user_id;

  //     // ==========================================
  //     // 🕵️‍♂️ DEBUGGING LOGS (Terminal mein check karna)
  //     // ==========================================
  //     console.log("--- DEBUG START ---");
  //     console.log("Req Body:", req.body);
  //     console.log("Req Files:", req.files);
  //     console.log("--- DEBUG END ---");

  //     if (!adminId) {
  //       return res.status(401).json({ error: "Unauthorized: Admin ID missing" });
  //     }

  //     if (!req.body || !req.body.name) {
  //       return res.status(400).json({ 
  //           error: "Form Data is Empty!", 
  //           message: "Use form-data in Postman. Required: name, categoryId, price, stockQuantity." 
  //       });
  //     }

  //     const categoryId = parseInt(req.body.categoryId, 10);
  //     const price = parseFloat(req.body.price);
  //     const stockQuantity = parseFloat(req.body.stockQuantity);
      
  //     if (isNaN(categoryId) || categoryId < 1) return res.status(400).json({ error: "Valid categoryId is required" });
  //     if (isNaN(price) || price < 0) return res.status(400).json({ error: "Valid price is required" });
  //     if (isNaN(stockQuantity) || stockQuantity < 0) return res.status(400).json({ error: "Valid stockQuantity is required" });

  //     const files = req.files || []; 
  //     let imagesJson = {};

  //     if (files.length > 0) {
  //       const firstPath = files[0].path || files[0].secure_url;
  //       imagesJson = {
  //         thumbnail: firstPath, 
  //         original_name: files[0].originalname,
  //         gallery: files.map(f => f.path || f.secure_url).filter(Boolean) 
  //       };
  //     }

  //     const itemData = {
  //       categoryId,
  //       name: req.body.name.trim(),
  //       description: (req.body.description || "").trim(),
  //       sku: req.body.sku?.trim() || null,
  //       colorHex: req.body.colorHex?.trim() || null,
  //       colorName: req.body.colorName?.trim() || null,
  //       price,
  //       stockQuantity,
  //       lowStockThreshold: req.body.lowStockThreshold ? parseFloat(req.body.lowStockThreshold) : 10,
  //       images: Object.keys(imagesJson).length > 0 ? imagesJson : undefined 
  //     };
      
  //     const newItem = await inventoryService.createItem(itemData, adminId);

  //     posthog.capture({
  //       distinctId: adminId.toString(), // Jis admin ne item add kiya uski ID
  //       event: 'Inventory_Item_Added',  // Event ka naam
  //       properties: {
  //         itemId: newItem.id,
  //         itemName: newItem.name,
  //         categoryType: req.body.type || 'Unknown', 
  //         price: newItem.price,
  //         initialStock: newItem.stockQuantity
  //       }
  //     });

  //     await posthog.flush();
      
  //     res.status(201).json({ 
  //       success: true, 
  //       message: "Inventory Item Added Successfully", 
  //       data: newItem 
  //     });

  //   } catch (error) {
  //     console.error("Actual Catch Error:", error);
  //     res.status(500).json({ error: "Internal Error", details: error.message });
  //   }
  // }

  // 3. Add Inventory Item (With Bulletproof Debugging & 3D Fabric Profile)
  // 3. Add Inventory Item (With Bulletproof Debugging & 3D Fabric Profile)
  async addItem(req, res) {
    try {
      const adminId = req.user?.user_id;

      if (!adminId) {
        return res.status(401).json({ error: "Unauthorized: Admin ID missing" });
      }

      if (!req.body || !req.body.name) {
        return res.status(400).json({ 
            error: "Form Data is Empty!", 
            message: "Use form-data in Postman. Required: name, categoryId, price, stockQuantity." 
        });
      }

      const categoryId = parseInt(req.body.categoryId, 10);
      const price = parseFloat(req.body.price);
      const stockQuantity = parseFloat(req.body.stockQuantity);
      
      if (isNaN(categoryId) || categoryId < 1) return res.status(400).json({ error: "Valid categoryId is required" });
      if (isNaN(price) || price < 0) return res.status(400).json({ error: "Valid price is required" });
      if (isNaN(stockQuantity) || stockQuantity < 0) return res.status(400).json({ error: "Valid stockQuantity is required" });

      // ==========================================
      // 📂 NAYA FILE EXTRACTION LOGIC (upload.fields ke liye)
      // ==========================================
      const imageFiles = req.files && req.files['images'] ? req.files['images'] : [];
      const textureFile = req.files && req.files['textureImage'] ? req.files['textureImage'][0] : null;

      let imagesJson = {};

      if (imageFiles.length > 0) {
        const firstPath = imageFiles[0].path || imageFiles[0].secure_url;
        imagesJson = {
          thumbnail: firstPath, 
          original_name: imageFiles[0].originalname,
          gallery: imageFiles.map(f => f.path || f.secure_url).filter(Boolean) 
        };
      }

      const itemData = {
        categoryId,
        name: req.body.name.trim(),
        description: (req.body.description || "").trim(),
        sku: req.body.sku?.trim() || null,
        colorHex: req.body.colorHex?.trim() || null,
        colorName: req.body.colorName?.trim() || null,
        price,
        stockQuantity,
        lowStockThreshold: req.body.lowStockThreshold ? parseFloat(req.body.lowStockThreshold) : 10,
        images: Object.keys(imagesJson).length > 0 ? imagesJson : undefined 
      };

      // ==========================================
      // 🚀 EXTRACT FABRIC 3D PROFILE DATA
      // ==========================================
      let fabricProfileData = null;
      
      // Check karo ke Texture File aayi hai YA string URL aaya hai
      const hasTexture = textureFile || req.body.textureUrl;

      if (hasTexture && req.body.physicalRepeatWidthCm && req.body.physicalRepeatHeightCm) {
          let parsedOrigin = { x: 0.5, y: 0.5 }; 
          
          if (req.body.patternOrigin) {
              try {
                  parsedOrigin = typeof req.body.patternOrigin === 'string' 
                      ? JSON.parse(req.body.patternOrigin) 
                      : req.body.patternOrigin;
              } catch (e) {
                  console.warn("Could not parse patternOrigin, using default.", e);
              }
          }

          // Asal URL nikalo (Cloudinary se ya Body se)
          const finalTextureUrl = textureFile 
              ? (textureFile.path || textureFile.secure_url) 
              : req.body.textureUrl;

          fabricProfileData = {
              textureUrl: finalTextureUrl,
              physicalRepeatWidthCm: parseFloat(req.body.physicalRepeatWidthCm),
              physicalRepeatHeightCm: parseFloat(req.body.physicalRepeatHeightCm),
              patternOrigin: parsedOrigin,
              isPremium: req.body.isPremium === 'true' || req.body.isPremium === true,
              premiumPrice: req.body.premiumPrice ? parseFloat(req.body.premiumPrice) : 0.00
          };
      }
      // ==========================================
      
      const newItem = await inventoryService.createItem(itemData, adminId, fabricProfileData);

      // (Posthog events waise hi rahenge, main length bachane ke liye skip kar raha hun yahan, aap apne wale rakhna)
      
      res.status(201).json({ 
        success: true, 
        message: fabricProfileData ? "Inventory Item & 3D Profile Added Successfully" : "Inventory Item Added Successfully", 
        data: newItem 
      });

    } catch (error) {
      console.error("Actual Catch Error:", error);
      res.status(500).json({ error: "Internal Error", details: error.message });
    }
  }

  // 4. Update Stock ONLY (Override/Adjustment)
  async updateStock(req, res) {
    try {
      const { id } = req.params; 
      const { quantityChange, reason } = req.body;
      const adminId = req.user?.user_id;

      if (!quantityChange || !reason) {
        return res.status(400).json({ error: "Quantity change and Reason are required" });
      }

      if (reason.length < 5) { 
        return res.status(400).json({ error: "Reason must be descriptive (min 5 chars)" });
      }

      const updatedItem = await inventoryService.updateStock(id, quantityChange, reason, adminId);

      res.status(200).json({ 
        success: true, 
        message: "Stock Updated Successfully", 
        data: updatedItem 
      });

    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  // 5. Update Item Basic Details (Name, Price, etc. No Stock change here)
  // async updateItemDetails(req, res) {
  //   try {
  //     const { id } = req.params;
  //     const adminId = req.user?.user_id;
  //     const updateData = req.body;

  //     const updatedItem = await inventoryService.updateItemDetails(id, updateData, adminId);

  //     res.status(200).json({
  //       success: true,
  //       message: "Item details updated successfully",
  //       data: updatedItem
  //     });
  //   } catch (error) {
  //     res.status(500).json({ error: error.message });
  //   }
  // }

  // 5. Update Item Basic Details (Name, Price, etc. No Stock change here)
  async updateItemDetails(req, res) {
    try {
      const { id } = req.params;
      const adminId = req.user?.user_id;

      if (!req.body) {
        return res.status(400).json({ error: "Form Data is Empty!" });
      }

      // 1. Basic Info Extract Karo
      const updateData = {
        name: req.body.name,
        description: req.body.description,
        sku: req.body.sku,
        colorHex: req.body.colorHex,
        colorName: req.body.colorName,
        price: req.body.price ? parseFloat(req.body.price) : undefined,
      };

      // 2. 🚀 Extract Fabric 3D Profile Data (Jaisa Create mein kiya tha)
      let fabricProfileData = null;
      
      const textureFile = req.files && req.files['textureImage'] ? req.files['textureImage'][0] : null;
      const hasTexture = textureFile || req.body.textureUrl;

      // Agar form mein 3D details aayi hain, toh object banao
      if (req.body.physicalRepeatWidthCm || req.body.physicalRepeatHeightCm || hasTexture) {
          let parsedOrigin = { x: 0.5, y: 0.5 }; 
          
          if (req.body.patternOrigin) {
              try {
                  parsedOrigin = typeof req.body.patternOrigin === 'string' 
                      ? JSON.parse(req.body.patternOrigin) 
                      : req.body.patternOrigin;
              } catch (e) {
                  console.warn("Could not parse patternOrigin, using default.", e);
              }
          }

          const finalTextureUrl = textureFile 
              ? (textureFile.path || textureFile.secure_url) 
              : req.body.textureUrl;

          fabricProfileData = {
              textureUrl: finalTextureUrl,
              physicalRepeatWidthCm: req.body.physicalRepeatWidthCm ? parseFloat(req.body.physicalRepeatWidthCm) : 0,
              physicalRepeatHeightCm: req.body.physicalRepeatHeightCm ? parseFloat(req.body.physicalRepeatHeightCm) : 0,
              patternOrigin: parsedOrigin,
              isPremium: req.body.isPremium === 'true' || req.body.isPremium === true,
              premiumPrice: req.body.premiumPrice ? parseFloat(req.body.premiumPrice) : 0.00
          };
      }

      // 3. Service ko call karo (Sath mein fabricProfileData bhi bhejo)
      const updatedItem = await inventoryService.updateItemDetails(id, updateData, adminId, fabricProfileData);

      res.status(200).json({
        success: true,
        message: "Item details updated successfully",
        data: updatedItem
      });
    } catch (error) {
      console.error("Actual Catch Error:", error);
      res.status(500).json({ error: error.message });
    }
  }

  // 6. Toggle Item Status (Soft Delete / Reactivate)
  async toggleItemStatus(req, res) {
    try {
      const { id } = req.params;
      const adminId = req.user?.user_id;

      const updatedItem = await inventoryService.toggleItemStatus(id, adminId);

      res.status(200).json({
        success: true,
        message: `Item is now ${updatedItem.isActive ? 'Active' : 'Inactive (Hidden)'}`,
        data: { id: updatedItem.id, isActive: updatedItem.isActive }
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  // 7. Get Items (Admin Dashboard List - Now Supports Pagination & Search)
  async getItems(req, res) {
    try {
      // Ab service direct req.query accept karegi (page, limit, search, status, etc.)
      const result = await inventoryService.getItems(req.query);
      
      res.status(200).json({ 
        success: true, 
        message: "Inventory items fetched successfully",
        data: result.items,
        meta: result.meta 
      });

    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  // 8. Get Single Item by ID
  async getItemById(req, res) {
    try {
      const { id } = req.params;
      const item = await inventoryService.getItemById(id);
      
      res.status(200).json({ 
        success: true, 
        message: "Item details fetched successfully",
        data: item 
      });
    } catch (error) {
      // Agar item na mile toh 404 bhejo
      if (error.message === "Item not found") {
        return res.status(404).json({ success: false, error: error.message });
      }
      res.status(500).json({ success: false, error: error.message });
    }
  }
  
}

module.exports = new InventoryController();