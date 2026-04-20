const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const savedDesignService = {
  async saveNewDesign(data) {
    try {
      console.log("⚙️ [SERVICE] Attempting to save Custom Design in DB...");
      
      // Coerce aspectRatio: FormData delivers strings, keep a sane fallback so
      // legacy callers (no ratio sent) still default to square.
      const parsedRatio = Number(data.aspectRatio);
      const aspectRatio = Number.isFinite(parsedRatio) && parsedRatio > 0 ? parsedRatio : 1.0;

      const newDesign = await prisma.savedDesign.create({
        data: {
          userId: data.userId,
          productId: data.productId,
          designName: data.designName || "My Custom Design",
          canvasData: data.canvasData, // Yeh poora JSON object hoga
          status: data.status || "private",
          thumbnailUrl: data.thumbnailUrl || null,
          //aspectRatio
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
  },

  async getAllPublishedDesigns(page = 1, limit = 10) {
    try {
      console.log(`⚙️ [SERVICE] Fetching published designs. Page: ${page}, Limit: ${limit}`);
      const skip = (page - 1) * limit;

      // 1. Fetch designs with User & Product info
      const designs = await prisma.savedDesign.findMany({
        where: { status: 'published' },
        skip: skip,
        take: limit,
        orderBy: { createdAt: 'desc' }, // Naye designs sabse upar aayenge
        include: {
          // 🚀 Frontend ke liye extra data (Joins)
          user: { 
            select: { first_name: true, last_name: true, profile_picture_url: true } 
          },
          product: { 
            select: { name: true, baseStitchingPrice: true } 
          }
        }
      });

      // 2. Count total designs (Frontend pagination ke liye)
      const total = await prisma.savedDesign.count({
        where: { status: 'published' }
      });

      console.log(`⚙️ [SERVICE] Successfully fetched ${designs.length} published designs.`);
      
      return { 
        designs, 
        meta: {
          total, 
          currentPage: page, 
          totalPages: Math.ceil(total / limit),
          hasMore: page * limit < total
        }
      };
      
    } catch (dbError) {
      console.error("🔥 DATABASE ERROR IN FETCH PUBLISHED DESIGNS:");
      console.error(dbError);
      throw dbError; 
    }
  },

  async getDesignsByUser(userId) {
    try {
      console.log(`⚙️ [SERVICE] Fetching all designs for User ID: ${userId}`);

      const designs = await prisma.savedDesign.findMany({
        where: { userId: userId },
        orderBy: { createdAt: 'desc' }, // Latest designs pehle dikhengi
        include: {
          product: {
            select: { 
              name: true, 
              baseStitchingPrice: true,
              images: true 
            }
          }
        }
      });

      console.log(`⚙️ [SERVICE] Successfully fetched ${designs.length} designs for user.`);
      return designs;

    } catch (dbError) {
      console.error("🔥 DATABASE ERROR IN FETCH USER DESIGNS:");
      console.error(dbError);
      throw dbError;
    }
  }


};

module.exports = savedDesignService;