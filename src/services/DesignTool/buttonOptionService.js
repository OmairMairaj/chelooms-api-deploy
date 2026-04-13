const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class ButtonOptionService {
  
  // ==========================================
  // 1. Create a new Button Option
  // ==========================================
  async createButtonOption(data) {
    return await prisma.buttonOption.create({
      data: {
        frontendId: data.frontendId || `btn-${data.name.toLowerCase().replace(/\s+/g, '-')}`,
        name: data.name,
        images: data.images || [],
        premium: data.premium || false,
        premiumPrice: data.premiumPrice || 0,
        colors: data.colors || [] // 🎨 JSON Array for hex codes
      }
    });
  }

  // ==========================================
  // 2. Get All Button Options (For Frontend JSON)
  // ==========================================
  async getAllButtonOptions() {
    const buttons = await prisma.buttonOption.findMany({
      orderBy: { createdAt: 'asc' } // Ascending taake Plastic, Metal waghaira tarteeb se aayen
    });

    // Frontend ko exactly wahi structure dena hai jo aapke JSON mein tha
    return buttons.map(btn => ({
      dbId: btn.buttonId, // 👈 API update ke liye zaroori
      id: btn.frontendId,
      name: btn.name,
      premium: btn.premium,
      premium_price: btn.premiumPrice, // Snake_case matching frontend
      colors: btn.colors,
      images: btn.images
    }));
  }

  // ==========================================
  // 3. Update a Button Option
  // ==========================================
  async updateButtonOption(id, updateData) {
    const dataToUpdate = {};
    
    if (updateData.frontendId !== undefined) dataToUpdate.frontendId = updateData.frontendId;
    if (updateData.name !== undefined) dataToUpdate.name = updateData.name;
    if (updateData.images !== undefined) dataToUpdate.images = updateData.images;
    if (updateData.premium !== undefined) dataToUpdate.premium = updateData.premium;
    if (updateData.premiumPrice !== undefined) dataToUpdate.premiumPrice = updateData.premiumPrice;
    if (updateData.colors !== undefined) dataToUpdate.colors = updateData.colors;

    return await prisma.buttonOption.update({
      where: { buttonId: id },
      data: dataToUpdate
    });
  }
}

module.exports = new ButtonOptionService();