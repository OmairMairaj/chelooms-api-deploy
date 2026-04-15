const productCategoryService = require('../../services/DesignTool/productCategoryService');

class ProductCategoryController {
  // POST /api/product-categories
  async createCategory(req, res) {
    try {
      const category = await productCategoryService.createCategory(req.body);
      res.status(201).json({ success: true, data: category });
    } catch (error) {
      // Prisma unique constraint error handling for duplicate names
      if (error.code === 'P2002') {
        return res.status(400).json({ success: false, message: "Category with this name already exists." });
      }
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // GET /api/product-categories
  async getAllCategories(req, res) {
    try {
      // Frontend UI dropdown ke liye active, Admin table ke liye sab
      const includeInactive = req.query.all === 'true';
      const categories = await productCategoryService.getAllCategories(includeInactive);
      res.status(200).json({ success: true, data: categories });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // GET /api/product-categories/:id
  async getCategoryById(req, res) {
    try {
      const category = await productCategoryService.getCategoryById(req.params.id);
      if (!category) return res.status(404).json({ success: false, message: "Category not found" });
      res.status(200).json({ success: true, data: category });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // PUT /api/product-categories/:id
  async updateCategory(req, res) {
    try {
      const category = await productCategoryService.updateCategory(req.params.id, req.body);
      res.status(200).json({ success: true, data: category });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // DELETE /api/product-categories/:id
  async deleteCategory(req, res) {
    try {
      await productCategoryService.deleteCategory(req.params.id);
      res.status(200).json({ success: true, message: "Category deleted successfully" });
    } catch (error) {
      res.status(500).json({ success: false, message: "Cannot delete category, it might be linked to existing products." });
    }
  }
}

module.exports = new ProductCategoryController();