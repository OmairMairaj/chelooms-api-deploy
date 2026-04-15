const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class ProductCategoryService {
  // Create
  async createCategory(data) {
    // data mein name, description, isActive aayega
    return await prisma.productCategory.create({
      data
    });
  }

  // Read All (with optional filter for active only)
  async getAllCategories(includeInactive = false) {
    const where = includeInactive ? {} : { isActive: true };
    return await prisma.productCategory.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });
  }

  // Read Single
  async getCategoryById(productCategoryId) {
    return await prisma.productCategory.findUnique({
      where: { productCategoryId }
    });
  }

  // Update
  async updateCategory(productCategoryId, data) {
    return await prisma.productCategory.update({
      where: { productCategoryId },
      data
    });
  }

  // Delete
  async deleteCategory(productCategoryId) {
    return await prisma.productCategory.delete({
      where: { productCategoryId }
    });
  }
}

module.exports = new ProductCategoryService();