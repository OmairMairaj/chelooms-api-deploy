const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class NecklineService {
  
  // 1. Create a new Neckline (Admin Panel)
  async createNeckline(data) {
    return await prisma.neckline.create({
      data: {
        name: data.name,
        family: data.family,
        type: data.type,
        hasButtons: data.hasButtons || false,

        isButton: data.isButton || false,
        thread: data.thread || false,
        collarback: data.collarback || false,
        
        images: data.images || [],
        keywords: data.keywords || [],
        tags: data.tags || [],
        
        layers: data.layers || [], // Frontend ka exact JSON array yahan save hoga
        
        isPremium: data.premium || false, // Frontend "premium" bhejega, DB "isPremium" save karega
        premiumPrice: data.premium_price ? parseFloat(data.premium_price) : null
      }
    });
  }

  // 2. Get All Necklines (For Customer Design Tool & Admin List)
  async getAllNecklines() {
    return await prisma.neckline.findMany({
      orderBy: { createdAt: 'desc' }
    });
  }

  // 3. Get Single Neckline by ID (For Edit Modal in Admin Panel)
  async getNecklineById(necklineId) {
    const neckline = await prisma.neckline.findUnique({
      where: { necklineId: necklineId }
    });
    
    if (!neckline) {
      throw new Error("Neckline not found");
    }
    
    return neckline;
  }

  // 4. Update an existing Neckline (Admin Panel)
  async updateNeckline(necklineId, updateData) {
    // Sirf wahi fields update hongi jo frontend se aayengi (Partial Update Support)
    const dataToUpdate = {};
    
    if (updateData.name !== undefined) dataToUpdate.name = updateData.name;
    if (updateData.family !== undefined) dataToUpdate.family = updateData.family;
    if (updateData.type !== undefined) dataToUpdate.type = updateData.type;
    if (updateData.hasButtons !== undefined) dataToUpdate.hasButtons = updateData.hasButtons;

    if (updateData.isButton !== undefined) dataToUpdate.isButton = updateData.isButton;
    if (updateData.thread !== undefined) dataToUpdate.thread = updateData.thread;
    if (updateData.collarback !== undefined) dataToUpdate.collarback = updateData.collarback;
    
    if (updateData.images !== undefined) dataToUpdate.images = updateData.images;
    if (updateData.keywords !== undefined) dataToUpdate.keywords = updateData.keywords;
    if (updateData.tags !== undefined) dataToUpdate.tags = updateData.tags;
    
    if (updateData.layers !== undefined) dataToUpdate.layers = updateData.layers;
    
    if (updateData.premium !== undefined) dataToUpdate.isPremium = updateData.premium;
    if (updateData.premium_price !== undefined) {
      dataToUpdate.premiumPrice = updateData.premium_price ? parseFloat(updateData.premium_price) : null;
    }

    return await prisma.neckline.update({
      where: { necklineId: necklineId },
      data: dataToUpdate
    });
  }
}

module.exports = new NecklineService();