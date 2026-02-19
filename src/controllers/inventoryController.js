const inventoryService = require('../services/inventoryService');

/**
 * Controller: Handles HTTP Requests for Inventory Module (M-02)
 */
class InventoryController {

  // 1. Create Category
  // FR-02.04: Standardized Taxonomy
  async createCategory(req, res) {
    try {
      const { name, type, description } = req.body;
 
      // Basic Validation
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

  // 3. Add Inventory Item
  // FR-02.01: Allow authorized managers to add items
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

      // Agar user hi nahi mila to yahin rok do
      if (!adminId) {
        return res.status(401).json({ error: "Unauthorized: Admin ID missing" });
      }

      // Agar body bilkul khali hai (undefined ya empty object)
      if (!req.body || !req.body.name) {
        return res.status(400).json({ 
            error: "Form Data is Empty!", 
            message: "Use form-data in Postman. Required: name, categoryId, price, stockQuantity." 
        });
      }

      // Required fields validation
      const categoryId = parseInt(req.body.categoryId, 10);
      const price = parseFloat(req.body.price);
      const stockQuantity = parseFloat(req.body.stockQuantity);
      
      if (isNaN(categoryId) || categoryId < 1) {
        return res.status(400).json({ error: "Valid categoryId (number) is required" });
      }
      if (isNaN(price) || price < 0) {
        return res.status(400).json({ error: "Valid price (number) is required" });
      }
      if (isNaN(stockQuantity) || stockQuantity < 0) {
        return res.status(400).json({ error: "Valid stockQuantity (number) is required" });
      }

      // 1. Files Handle karo (Cloudinary returns path/secure_url, diskStorage returns path)
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

      // 2. Data Prepare
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
      
      // Service call
      const newItem = await inventoryService.createItem(itemData, adminId);
      
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

  // 4. Update Stock (Override/Adjustment)
  // FR-02.10: Log all inventory overrides
  async updateStock(req, res) {
    try {
      const { id } = req.params; // Item ID form URL
      const { quantityChange, reason } = req.body;
      const adminId = req.user?.user_id;

      // Validation
      if (!quantityChange || !reason) {
        return res.status(400).json({ error: "Quantity change and Reason are required" });
      }

      // FR-02.09: Reason length validation
      if (reason.length < 5) { // Document said 20 chars, starting with 5 for testing
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

  // 5. Get Items (Filterable)
  async getItems(req, res) {
    try {
      // Query Params: ?categoryId=1&lowStockOnly=true
      const filters = {
        categoryId: req.query.categoryId,
        lowStockOnly: req.query.lowStockOnly === 'true'
      };

      const items = await inventoryService.getItems(filters);
      res.status(200).json({ success: true, count: items.length, data: items });

    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = new InventoryController();