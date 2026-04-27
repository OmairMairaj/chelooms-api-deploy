const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class ProductCategoryService {
  // Create
  async createCategory(data) {
    const maxSort = await prisma.productCategory.aggregate({ _max: { sortOrder: true } });
    const nextSortOrder = (maxSort._max.sortOrder ?? -1) + 1;
    // data mein name, description, isActive aayega
    return await prisma.productCategory.create({
      data: {
        ...data,
        sortOrder: typeof data.sortOrder === 'number' ? data.sortOrder : nextSortOrder,
      }
    });
  }

  // Read All (with optional filter for active only)
  async getAllCategories(includeInactive = false) {
    const where = includeInactive ? {} : { isActive: true };
    return await prisma.productCategory.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }]
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

  async reorderCategories(orderedIds = []) {
    const tx = orderedIds.map((id, index) =>
      prisma.productCategory.update({
        where: { productCategoryId: id },
        data: { sortOrder: index },
      })
    );
    return prisma.$transaction(tx);
  }
}

module.exports = new ProductCategoryService();