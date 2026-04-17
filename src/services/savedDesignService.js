const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const savedDesignService = {
  async saveNewDesign(data) {
    try {
      console.log("⚙️ [SERVICE] Attempting to save Custom Design in DB...");
      
      const newDesign = await prisma.savedDesign.create({
        data: {
          userId: data.userId,
          productId: data.productId,
          designName: data.designName || "My Custom Design",
          canvasData: data.canvasData, // Yeh poora JSON object hoga
          status: data.status || "private",
          thumbnailUrl: data.thumbnailUrl || null
        }
      });

      console.log("⚙️ [SERVICE] DB Save Successful! Design ID:", newDesign.saveDesignId);
      return newDesign;
      
    } catch (dbError) {
      console.error("🔥 DATABASE ERROR IN SAVE DESIGN:");
      console.error(dbError);
      throw new Error(`DB Save Error: ${dbError.message}`);
    }
  },

  async updateDesignStatus(saveDesignId, userId, newStatus) {
    try {
      console.log(`⚙️ [SERVICE] Step A: Verifying ownership for Design ID: ${saveDesignId}`);
      
      // 1. Security Check: Find the design BUT ensure it belongs to this specific user
      const existingDesign = await prisma.savedDesign.findFirst({
        where: {
          saveDesignId: saveDesignId,
          userId: userId // 👈 Yeh sabse zaroori security lock hai
        }
      });

      if (!existingDesign) {
        throw new Error("NOT_FOUND_OR_UNAUTHORIZED");
      }

      console.log(`⚙️ [SERVICE] Step B: Design found. Updating status to: '${newStatus}'...`);
      
      // 2. Update the status
      const updatedDesign = await prisma.savedDesign.update({
        where: { saveDesignId: saveDesignId },
        data: { status: newStatus }
      });

      console.log("⚙️ [SERVICE] DB Update Successful!");
      return updatedDesign;
      
    } catch (dbError) {
      console.error("🔥 DATABASE ERROR IN UPDATE STATUS:");
      console.error(dbError);
      throw dbError; // Controller mein handle karenge
    }
  }
};

module.exports = savedDesignService;