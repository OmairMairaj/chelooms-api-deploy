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

}

module.exports = new ProductController();