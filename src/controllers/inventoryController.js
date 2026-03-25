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
  async addItem(req, res) {
    try {
      const adminId = req.user?.user_id;

      // ==========================================
      // 🕵️‍♂️ DEBUGGING LOGS (Terminal mein check karna)
      // ==========================================
      console.log("--- DEBUG START ---");
      console.log("Req Body:", req.body);
      console.log("Req Files:", req.files);
      console.log("--- DEBUG END ---");

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

      const files = req.files || []; 
      let imagesJson = {};

      if (files.length > 0) {
        const firstPath = files[0].path || files[0].secure_url;
        imagesJson = {
          thumbnail: firstPath, 
          original_name: files[0].originalname,
          gallery: files.map(f => f.path || f.secure_url).filter(Boolean) 
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
      
      const newItem = await inventoryService.createItem(itemData, adminId);

      posthog.capture({
        distinctId: adminId.toString(), // Jis admin ne item add kiya uski ID
        event: 'Inventory_Item_Added',  // Event ka naam
        properties: {
          itemId: newItem.id,
          itemName: newItem.name,
          categoryType: req.body.type || 'Unknown', 
          price: newItem.price,
          initialStock: newItem.stockQuantity
        }
      });

      await posthog.flush();
      
      res.status(201).json({ 
        success: true, 
        message: "Inventory Item Added Successfully", 
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
  async updateItemDetails(req, res) {
    try {
      const { id } = req.params;
      const adminId = req.user?.user_id;
      const updateData = req.body;

      const updatedItem = await inventoryService.updateItemDetails(id, updateData, adminId);

      res.status(200).json({
        success: true,
        message: "Item details updated successfully",
        data: updatedItem
      });
    } catch (error) {
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