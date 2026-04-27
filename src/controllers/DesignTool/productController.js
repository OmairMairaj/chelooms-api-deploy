const productService = require('../../services/DesignTool/productService');

// Helper function: Form-Data se aane wale stringified array ko parse karne ke liye
const parseArray = (field) => {
    if (!field) return [];
    if (typeof field === 'string') {
        try { return JSON.parse(field); } 
        catch (e) { return field.split(',').map(s => s.trim()); }
    }
    if (Array.isArray(field)) return field;
    return [];
};

// Helper function: JSON objects ke liye
const parseJson = (field) => {
    if (!field) return {};
    if (typeof field === 'string') {
        try { return JSON.parse(field); } 
        catch (e) { console.warn("Failed to parse JSON field:", field); return {}; }
    }
    return field;
};

class ProductController {
  async createProduct(req, res) {
    try {
      if (!req.body || !req.body.name) {
        return res.status(400).json({ success: false, message: "Required fields are missing!" });
      }

      // 📂 Image Extraction Logic (upload.any() handled)
      let imagesList = [];
      let thumbnailsList = [];

      if (req.files && Array.isArray(req.files)) {
        req.files.forEach(file => {
          if (file.fieldname === 'images') {
            imagesList.push(file.path || file.secure_url);
          } else if (file.fieldname === 'thumbnails') {
            thumbnailsList.push(file.path || file.secure_url);
          }
        });
      }

      // Product Data map karna
      const productData = {
        name: req.body.name.trim(),
        productCategoryId: req.body.productCategoryId.trim(),
        pieceType: req.body.pieceType.trim(),
        baseStitchingPrice: parseFloat(req.body.baseStitchingPrice) || 0,
        status: req.body.status || 'Publish',
        
        images: imagesList,
        thumbnails: thumbnailsList,
        seasonTags: parseArray(req.body.seasonTags),

        // 🎛️ Arrays ko Parse kar rahe hain
        allowedFabricIds: parseArray(req.body.allowedFabricIds),
        allowedNecklineOptionIds: parseArray(req.body.allowedNecklineOptionIds),
        allowedSleeveOptionIds: parseArray(req.body.allowedSleeveOptionIds),
        allowedHemlineOptionIds: parseArray(req.body.allowedHemlineOptionIds),
        allowedSideSlitIds: parseArray(req.body.allowedSideSlitIds),
        allowedEmbellishmentOptionIds: parseArray(req.body.allowedEmbellishmentOptionIds),

        // 🎨 Default Design object ko Parse kar rahe hain
        defaultDesign: parseJson(req.body.defaultDesign)
      };

      // Service call
      const newProduct = await productService.createProduct(productData);

      res.status(201).json({
        success: true,
        message: "Master Product Created Successfully",
        data: newProduct
      });

    } catch (error) {
      console.error("Product Creation Error:", error);
      res.status(500).json({ success: false, error: "Internal Server Error", details: error.message });
    }
  }

  async updateProduct(req, res) {
    try {
      const { id } = req.params;

      // 1. Image Extraction Logic (Agar nayi files aayi hain)
      let newImagesList = [];
      let newThumbnailsList = [];

      if (req.files && Array.isArray(req.files)) {
        req.files.forEach(file => {
          if (file.fieldname === 'images') {
            newImagesList.push(file.path || file.secure_url);
          } else if (file.fieldname === 'thumbnails') {
            newThumbnailsList.push(file.path || file.secure_url);
          }
        });
      }

      // 2. Data Mapping for Update
      let updateData = {};

      // Basic Fields (Agar frontend ne bheji hain toh update karo)
      if (req.body.name) updateData.name = req.body.name.trim();
      if (req.body.productCategoryId) updateData.productCategoryId = req.body.productCategoryId.trim();
      if (req.body.pieceType) updateData.pieceType = req.body.pieceType.trim();
      if (req.body.baseStitchingPrice) updateData.baseStitchingPrice = parseFloat(req.body.baseStitchingPrice);
      if (req.body.status) updateData.status = req.body.status;

      // Images Handle karna (Purani images + Nayi images merge karna)
      // Frontend ko chahiye ke jo purani images rakhni hain wo "existingImages" aur "existingThumbnails" ke array mein bheje
      if (req.body.existingImages || newImagesList.length > 0) {
        const existingImages = parseArray(req.body.existingImages) || [];
        updateData.images = [...existingImages, ...newImagesList];
      }
      
      if (req.body.existingThumbnails || newThumbnailsList.length > 0) {
        const existingThumbnails = parseArray(req.body.existingThumbnails) || [];
        updateData.thumbnails = [...existingThumbnails, ...newThumbnailsList];
      }

      // Arrays & JSON Handle karna (Agar aaye hain toh overwrite karenge)
      if (req.body.seasonTags) updateData.seasonTags = parseArray(req.body.seasonTags);
      if (req.body.allowedFabricIds) updateData.allowedFabricIds = parseArray(req.body.allowedFabricIds);
      if (req.body.allowedNecklineOptionIds) updateData.allowedNecklineOptionIds = parseArray(req.body.allowedNecklineOptionIds);
      if (req.body.allowedSleeveOptionIds) updateData.allowedSleeveOptionIds = parseArray(req.body.allowedSleeveOptionIds);
      if (req.body.allowedHemlineOptionIds) updateData.allowedHemlineOptionIds = parseArray(req.body.allowedHemlineOptionIds);
      if (req.body.allowedSideSlitIds) updateData.allowedSideSlitIds = parseArray(req.body.allowedSideSlitIds);
      if (req.body.allowedEmbellishmentOptionIds) updateData.allowedEmbellishmentOptionIds = parseArray(req.body.allowedEmbellishmentOptionIds);
      
      if (req.body.defaultDesign) updateData.defaultDesign = parseJson(req.body.defaultDesign);

      // 3. Service call
      const updatedProduct = await productService.updateProduct(id, updateData);

      res.status(200).json({
        success: true,
        message: "Product Updated Successfully",
        data: updatedProduct
      });

    } catch (error) {
      console.error("Product Update Error:", error);
      if (error.message === "Product not found") {
        return res.status(404).json({ success: false, message: error.message });
      }
      res.status(500).json({ success: false, error: "Internal Server Error", details: error.message });
    }
  }

  async getAllProducts(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;

      const result = await productService.getAllProducts(page, limit);

      res.status(200).json({
        success: true,
        message: "Products fetched successfully",
        data: result.products,
        meta: result.meta
      });
    } catch (error) {
      console.error("Get All Products Error:", error);
      res.status(500).json({ success: false, error: "Internal Server Error", details: error.message });
    }
  }

  async deleteProduct(req, res) {
    try {
      const { id } = req.params;
      
      // Postman se query aayegi: ?hardDelete=true
      const isHardDelete = req.query.hardDelete === 'true'; 

      await productService.deleteProduct(id, isHardDelete);

      // Response message change hoga delete type ke hisaab se
      const message = isHardDelete 
        ? "Product permanently deleted from database! 🚨" 
        : "Product soft-deleted (Archived) successfully! 🗂️";

      res.status(200).json({
        success: true,
        message: message
      });

    } catch (error) {
      console.error("Delete Product Error:", error);
      if (error.message === "Product not found") {
        return res.status(404).json({ success: false, message: error.message });
      }
      res.status(500).json({ success: false, error: "Internal Server Error", details: error.message });
    }
  }

  // ♻️ RESTORE PRODUCT CONTROLLER
  async restoreProduct(req, res) {
    try {
      const { id } = req.params;
      await productService.restoreProduct(id);

      res.status(200).json({
        success: true,
        message: "Product restored and activated successfully! ♻️"
      });
    } catch (error) {
      console.error("Restore Product Error:", error);
      if (error.message === "Product not found") {
        return res.status(404).json({ success: false, message: error.message });
      }
      res.status(500).json({ success: false, error: "Internal Server Error" });
    }
  }

  // GET /api/products/:id/canvas
  // Public Route for E-commerce Frontend
  async getProductForCanvas(req, res) {
    try {
      const { id } = req.params;
      
      const masterJson = await productService.getProductForFrontend(id);

      res.status(200).json(masterJson); // Seedha data bhej rahe hain bina wrapper ke, as per your initial JSON layout.
      
    } catch (error) {
      console.error("Master JSON Error:", error);
      res.status(404).json({ 
        success: false, 
        message: "Failed to load product canvas data", 
        error: error.message 
      });
    }
  }

  // GET /api/products/form-options
  async getAdminFormOptions(req, res) {
    try {
      const optionsData = await productService.getAdminFormOptions();

      res.status(200).json({
        success: true,
        data: optionsData
      });
    } catch (error) {
      console.error("Admin Form Options Error:", error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to load form options", 
        error: error.message 
      });
    }
  }

  // GET /api/products/category/:categoryName
  async getProductsByCategory(req, res) {
    try {
      const { categoryName } = req.params;
      
      const productsData = await productService.getProductsByCategoryFrontend(categoryName);

      // E-com frontend ke liye seedha array ya wrapper mein bhej dein
      res.status(200).json({
        success: true,
        count: productsData.length,
        data: productsData
      });
      
    } catch (error) {
      console.error("Category Listing Error:", error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to load products for this category", 
        error: error.message 
      });
    }
  }

  // GET /api/products/grouped/categories
  async getAllGroupedProducts(req, res) {
    try {
      const groupedData = await productService.getAllProductsGroupedByCategory();

      res.status(200).json({
        success: true,
        count: groupedData.length, // Number of categories
        data: groupedData
      });
      
    } catch (error) {
      console.error("Grouped Listing Error:", error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to load grouped products", 
        error: error.message 
      });
    }
  }

  // POST /api/products/admin/products/reorder
  async reorderProducts(req, res) {
    try {
      const { orderedIds, productCategoryId } = req.body;
      if (!Array.isArray(orderedIds)) {
        return res.status(400).json({ success: false, message: "orderedIds array is required." });
      }
      await productService.reorderProducts(orderedIds, productCategoryId);
      return res.status(200).json({ success: true, message: "Product order updated." });
    } catch (error) {
      console.error("Reorder Products Error:", error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }

}

module.exports = new ProductController();