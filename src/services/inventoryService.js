const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * M-02: Inventory Management Service
 * Handles Categories, Items, and Stock Adjustments with Audit Logs.
 */
class InventoryService {

  // 1. Create Category (Fabric or Embellishment)
  // FR-02.04: Standardized Taxonomy [cite: 154]
  async createCategory(data) {
    try {
      return await prisma.inventoryCategory.create({
        data: {
          name: data.name,
          type: data.type, // 'FABRIC' or 'EMBELLISHMENT'
          description: data.description
        }
      });
    } catch (error) {
      throw new Error(`Error creating category: ${error.message}`);
    }
  }

  // 2. Get All Categories (Dropdowns ke liye)
  async getAllCategories() {
    return await prisma.inventoryCategory.findMany();
  }

  // 3. Add New Inventory Item (With Initial Audit Log)
  // FR-02.02 & FR-02.03: Metadata Requirements [cite: 154]
  async createItem(data, adminId) {
    // Transaction: Item Create + Audit Log Entry
    return await prisma.$transaction(async (tx) => {
      
      // Step A: Create Item
      const newItem = await tx.inventoryItem.create({
        data: {
          categoryId: data.categoryId,
          name: data.name,
          description: data.description,
          sku: data.sku,
          
          // Metadata JSON (Flexible fields like designer, width, origin)
          metadata: data.metadata || {}, 
          
          colorHex: data.colorHex,
          colorName: data.colorName,
          
          price: data.price,
          images: data.images || {},
          stockQuantity: data.stockQuantity,
          lowStockThreshold: data.lowStockThreshold || 10,
        }
      });

      // Step B: Create Initial Log (Traceability FR-02.14) [cite: 166]
      await tx.inventoryAuditLog.create({
        data: {
          itemId: newItem.id,
          adminId: adminId, // Jo user add kar raha hai
          action: 'CREATE',
          quantityChange: data.stockQuantity,
          reason: 'Initial Stock Addition',
          previousValues: {} // Pehle kuch nahi tha
        }
      });

      return newItem;
    });
  }

  // 4. Update Stock (The most critical function)
  // FR-02.10: Log all inventory overrides [cite: 159]
  async updateStock(itemId, quantityChange, reason, adminId) {
    return await prisma.$transaction(async (tx) => {
      
      // Step A: Fetch current item to check constraints
      const currentItem = await tx.inventoryItem.findUnique({
        where: { id: itemId }
      });

      if (!currentItem) throw new Error("Item not found");

      // Calculate new stock
      // Note: quantityChange can be negative (e.g., -5 for used stock)
      const newStock = Number(currentItem.stockQuantity) + Number(quantityChange);

      if (newStock < 0) {
        throw new Error("Stock cannot be negative");
      }

      // Step B: Update the Item
      const updatedItem = await tx.inventoryItem.update({
        where: { id: itemId },
        data: {
          stockQuantity: newStock
        }
      });

      // Step C: Create Audit Log (FR-02.09: Reason required) [cite: 159]
      await tx.inventoryAuditLog.create({
        data: {
          itemId: itemId,
          adminId: adminId,
          action: 'STOCK_ADJUSTMENT',
          quantityChange: quantityChange,
          reason: reason, // "Manual Override" or "Order Fulfillment"
          previousValues: { oldStock: currentItem.stockQuantity } // Snapshot
        }
      });

      return updatedItem;
    });
  }

  // 5. Get Items (With Filtering logic)
  async getItems(filters) {
    const { categoryId, lowStockOnly } = filters;
    
    const where = {};
    if (categoryId) where.categoryId = Number(categoryId);
    
    // FR-02.06: Flag low stock items [cite: 156]
    if (lowStockOnly) {
      where.stockQuantity = {
        lte: prisma.inventoryItem.fields.lowStockThreshold 
        // Note: Raw query might be needed for field comparison in some Prisma versions, 
        // but simple logic logic: stock <= 10 works too.
      };
    }

    return await prisma.inventoryItem.findMany({
      where,
      include: { category: true } // Category name bhi sath layega
    });
  }
}

module.exports = new InventoryService();