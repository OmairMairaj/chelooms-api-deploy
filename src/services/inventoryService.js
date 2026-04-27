const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * M-02: Inventory Management Service
 * Handles Categories, Items, and Stock Adjustments with Audit Logs.
 * Merged Features: Class Structure + Pagination + Soft Delete + Full Audit
 */
class InventoryService {

  // 1. Create Category (Fabric or Embellishment)
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



  async createItem(data, adminId, fabricProfileData = null) { // 👈 Parameter add kiya
    return await prisma.$transaction(async (tx) => {
      
      // Step A: Create Item
      const newItem = await tx.inventoryItem.create({
        data: {
          categoryId: data.categoryId,
          name: data.name,
          description: data.description,
          sku: data.sku,
          material: data.material || null,
          tags: Array.isArray(data.tags) ? data.tags : [],
          metadata: data.metadata || {}, 
          colorHex: data.colorHex,
          colorName: data.colorName,
          price: data.price,
          images: data.images || {},
          stockQuantity: data.stockQuantity,
          lowStockThreshold: data.lowStockThreshold || 10,
          isActive: true
        }
      });

      // Step B: Create Initial Log
      await tx.inventoryAuditLog.create({
        data: {
          itemId: newItem.id,
          adminId: adminId, 
          action: 'CREATE',
          quantityChange: data.stockQuantity,
          reason: 'Initial Stock Addition',
          previousValues: {} 
        }
      });

      // ==========================================
      // 🚀 Step C: Create Fabric 3D Profile (Naya Addition)
      // ==========================================
      if (fabricProfileData) {
        const newFabricProfile = await tx.fabricProfile.create({
          data: {
            inventoryItemId: newItem.id, // 👈 Godown wale item se link kar diya
            textureUrl: fabricProfileData.textureUrl,
            physicalRepeatWidthCm: fabricProfileData.physicalRepeatWidthCm,
            physicalRepeatHeightCm: fabricProfileData.physicalRepeatHeightCm,
            patternOrigin: fabricProfileData.patternOrigin,
            fabricType: fabricProfileData.fabricType || null,
            colors: fabricProfileData.colors || null,
            textureParts: fabricProfileData.textureParts || null,
            isPremium: fabricProfileData.isPremium,
            premiumPrice: fabricProfileData.premiumPrice
          }
        });

        // Response mein dikhane ke liye object mein attach kar do
        newItem.fabricProfile = newFabricProfile; 
      }

      return newItem;
    });
  }

  // 4. Update ONLY Stock (The most critical function)
  async updateStock(itemId, quantityChange, reason, adminId) {
    return await prisma.$transaction(async (tx) => {
      const currentItem = await tx.inventoryItem.findUnique({
        where: { id: itemId }
      });

      if (!currentItem) throw new Error("Item not found");

      const newStock = Number(currentItem.stockQuantity) + Number(quantityChange);
      if (newStock < 0) throw new Error("Stock cannot be negative");

      // Step B: Update the Item
      const updatedItem = await tx.inventoryItem.update({
        where: { id: itemId },
        data: { stockQuantity: newStock }
      });

      // Step C: Create Audit Log
      await tx.inventoryAuditLog.create({
        data: {
          itemId: itemId,
          adminId: adminId,
          action: 'STOCK_ADJUSTMENT',
          quantityChange: quantityChange,
          reason: reason || "Manual Override", 
          previousValues: { oldStock: currentItem.stockQuantity } 
        }
      });

      return updatedItem;
    });
  }

  // 5. Update Basic Details (Name, Price, Images) - Stock change nahi hoga isme
  async updateItemDetails(itemId, updateData, adminId, fabricProfileData = null) {
    return await prisma.$transaction(async (tx) => {
      const currentItem = await tx.inventoryItem.findUnique({ where: { id: itemId } });
      if (!currentItem) throw new Error("Item not found");

      // Note: Stock aur Category update yahan nahi hongi (Security)
      const safeData = {
        name: updateData.name,
        description: updateData.description,
        price: updateData.price,
        sku: updateData.sku,
        material: updateData.material || null,
        tags: Array.isArray(updateData.tags) ? updateData.tags : undefined,
        colorHex: updateData.colorHex,
        colorName: updateData.colorName,
        images: updateData.images,
        metadata: updateData.metadata
      };

      const updatedItem = await tx.inventoryItem.update({
        where: { id: itemId },
        data: safeData
      });

      if (fabricProfileData) {
        await tx.fabricProfile.upsert({
          where: { inventoryItemId: itemId },
          update: {
            // Agar pehle se profile hai, toh bas naye data se update kardo
            textureUrl: fabricProfileData.textureUrl,
            physicalRepeatWidthCm: fabricProfileData.physicalRepeatWidthCm,
            physicalRepeatHeightCm: fabricProfileData.physicalRepeatHeightCm,
            patternOrigin: fabricProfileData.patternOrigin,
            fabricType: fabricProfileData.fabricType !== undefined ? fabricProfileData.fabricType : undefined,
            colors: fabricProfileData.colors !== undefined ? fabricProfileData.colors : undefined,
            textureParts: fabricProfileData.textureParts !== undefined ? fabricProfileData.textureParts : undefined,
            isPremium: fabricProfileData.isPremium,
            premiumPrice: fabricProfileData.premiumPrice
          },
          create: {
            // Agar pehle profile NAHI tha, toh naya bana do
            inventoryItemId: itemId,
            textureUrl: fabricProfileData.textureUrl,
            physicalRepeatWidthCm: fabricProfileData.physicalRepeatWidthCm,
            physicalRepeatHeightCm: fabricProfileData.physicalRepeatHeightCm,
            patternOrigin: fabricProfileData.patternOrigin,
            isPremium: fabricProfileData.isPremium,
            premiumPrice: fabricProfileData.premiumPrice
          }
        });
      }

      // Audit log for basic update
      await tx.inventoryAuditLog.create({
        data: {
          itemId: itemId,
          adminId: adminId,
          action: 'UPDATE',
          reason: "Updated item details (Name/Price/Images)",
          previousValues: { 
            name: currentItem.name, 
            price: currentItem.price 
          } 
        }
      });

      return updatedItem;
    });
  }

  // 6. Toggle Status (Soft Delete / Reactivate)
  async toggleItemStatus(itemId, adminId) {
    return await prisma.$transaction(async (tx) => {
      const currentItem = await tx.inventoryItem.findUnique({ where: { id: itemId } });
      if (!currentItem) throw new Error("Item not found");

      const newStatus = !currentItem.isActive;

      const updatedItem = await tx.inventoryItem.update({
        where: { id: itemId },
        data: { isActive: newStatus }
      });

      await tx.inventoryAuditLog.create({
        data: {
          itemId: itemId,
          adminId: adminId,
          action: newStatus ? 'UPDATE' : 'DELETE', 
          reason: newStatus ? "Item Reactivated" : "Item Deactivated (Soft Delete)",
          previousValues: { isActive: currentItem.isActive }
        }
      });

      return updatedItem;
    });
  }

  // 7. Get All Items (Admin List view with Pagination, Search, Filters)
  async getItems(query) {
    const { page = 1, limit = 10, search, categoryId, status, lowStockOnly } = query;
    
    const pageNumber = parseInt(page);
    const pageSize = parseInt(limit);
    const skip = (pageNumber - 1) * pageSize;

    const where = {};
    
    // Filters
    if (categoryId) where.categoryId = Number(categoryId);
    
    if (status === 'active') where.isActive = true;
    else if (status === 'inactive') where.isActive = false;

    if (search) {
        where.OR = [
            { name: { contains: search, mode: 'insensitive' } },
            { sku: { contains: search, mode: 'insensitive' } }
        ];
    }

    if (lowStockOnly === 'true') {
      // Hardcoded threshold for simplicity (e.g., 10) or compare if your ORM logic allows
      where.stockQuantity = { lte: 10 }; 
    }

    const [items, total] = await prisma.$transaction([
      prisma.inventoryItem.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: { category: true , fabricProfile: true} // Category name bhi sath layega
      }),
      prisma.inventoryItem.count({ where })
    ]);

    return {
      items,
      meta: {
        total,
        page: pageNumber,
        limit: pageSize,
        totalPages: Math.ceil(total / pageSize)
      }
    };
  }

  // 8. Get Single Item by ID (For Admin Detail View)
  async getItemById(itemId) {
    const item = await prisma.inventoryItem.findUnique({
      where: { id: itemId },
      include: { 
        category: true, // Category ka naam waghera layega
        fabricProfile: true,
        auditLogs: {    // 🚀 Pro Feature: Aakhri 5 logs bhi sath layega
            orderBy: { createdAt: 'desc' },
            take: 5,
            include: { 
                admin: { 
                    select: { first_name: true, last_name: true, role: true } 
                } 
            }
        }
      }
    });

    if (!item) {
        throw new Error("Item not found");
    }

    return item;
  }

  // 🚀 Nayi API: Sirf Dropdown ke liye (Lightweight)
  async getInventoryDropdown(type) {
    // type = 'EMBELLISHMENT' ya 'FABRIC'
    return await prisma.inventoryItem.findMany({
      where: {
        isActive: true,
        category: {
          type: type // Sirf specific type ke items layega
        }
      },
      select: {
        id: true,
        name: true,
        sku: true,
        stockQuantity: true // Taa ke dropdown mein (Out of stock) bhi dikha sakein
      },
      orderBy: { name: 'asc' }
    });
  }

  
  
}




module.exports = new InventoryService();


