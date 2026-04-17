const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class SideSlitService {
  
  // 1. Create a new Side Slit
  async createSideSlit(data) {
    return await prisma.sideSlit.create({
      data: {
        frontendId: data.frontendId || `ss-${data.name.toLowerCase().replace(/\s+/g, '-')}`,
        name: data.name,
        image: data.image || [],
        images: data.images || [],
        keywords: data.keywords || [],
        tags: data.tags || [],
        allowedHemlineShapes: data.allowedHemlineShapes || [],
        cutouts: data.cutouts || {} // 🐙 Nested SVGs yahan aayengi
      }
    });
  }

  // 2. Get All Side Slits (The Magic JSON for Frontend)
  async getAllSideSlits() {
    const slits = await prisma.sideSlit.findMany({
      orderBy: { sortOrder: 'asc' }
    });

    // Frontend ko exactly wahi structure dena hai jo JSON mein tha
    return slits.map(slit => ({
      dbId: slit.sideSlitId, // 👈 API update ke liye UUID
      id: slit.frontendId,
      name: slit.name,
      image: slit.image.length > 0 ? slit.image : null, // Match JSON behavior
      tags: slit.tags,
      allowedHemlineShapes: slit.allowedHemlineShapes,
      images: slit.images,
      keywords: slit.keywords,
      cutouts: slit.cutouts
    }));
  }

  // 3. Reorder Side Slits
  async reorderSideSlits(orderedIds) {
    // We map over the array of IDs and create an update command for each one
    const transaction = orderedIds.map((id, index) => {
      return prisma.sideSlit.update({
        where: { sideSlitId: id }, // Uses your exact Primary Key name
        data: { sortOrder: index } // The array index dictates the new order
      });
    });

    // $transaction ensures that if one update fails, they all fail, protecting your data
    return await prisma.$transaction(transaction);
  }

  // 4. Update a Side Slit
  async updateSideSlit(id, updateData) {
    const dataToUpdate = {};
    
    if (updateData.frontendId !== undefined) dataToUpdate.frontendId = updateData.frontendId;
    if (updateData.name !== undefined) dataToUpdate.name = updateData.name;
    if (updateData.image !== undefined) dataToUpdate.image = updateData.image;
    if (updateData.images !== undefined) dataToUpdate.images = updateData.images;
    if (updateData.keywords !== undefined) dataToUpdate.keywords = updateData.keywords;
    if (updateData.tags !== undefined) dataToUpdate.tags = updateData.tags;
    if (updateData.allowedHemlineShapes !== undefined) dataToUpdate.allowedHemlineShapes = updateData.allowedHemlineShapes;
    if (updateData.cutouts !== undefined) dataToUpdate.cutouts = updateData.cutouts;

    return await prisma.sideSlit.update({
      where: { sideSlitId: id },
      data: dataToUpdate
    });
  }

  
}

module.exports = new SideSlitService();