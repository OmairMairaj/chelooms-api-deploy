const { prisma } = require('../config/db');

const savedDesignService = {
  
  async saveNewDesign(data) {
    try {
      console.log("⚙️ [SERVICE] Saving Design with Remix Logic...");

      const parsedRatio = Number(data.aspectRatio);
      const aspectRatio = Number.isFinite(parsedRatio) && parsedRatio > 0 ? parsedRatio : 1.0;

      // 🚨 Hum Transaction use kar rahe hain taake dono kaam ek sath hon
      const result = await prisma.$transaction(async (tx) => {
        
        // 1. Naya Design Create Karein
        const newDesign = await tx.savedDesign.create({
          data: {
            userId: data.userId,
            productId: data.productId,
            designName: data.designName || "My Custom Design",
            canvasData: data.canvasData,
            status: data.status || "private",
            thumbnailUrl: data.thumbnailUrl || null,
            //aspectRatio: aspectRatio,
            basePrice: data.basePrice,
            addOnPrice: data.addOnPrice,
            finalPrice: data.finalPrice,
            currency: data.currency,
            pricingBreakdown: data.pricingBreakdown,
            colors: data.colors || null,
            // 👇 Remix Link: Agar data mein original design ki ID hai toh save hogi
            remixedFromId: data.remixedFromId || null 
          }
        });

        // 2. Agar yeh Remix hai, toh Original Design ka count +1 karein
        if (data.remixedFromId) {
          await tx.savedDesign.update({
            where: { saveDesignId: data.remixedFromId },
            data: { remixesCount: { increment: 1 } }
          });
          console.log(`♻️ Original Design ${data.remixedFromId} ka remix count barh gaya!`);
        }

        return newDesign;
      });

      return result;
    } catch (dbError) {
      console.error("🔥 DATABASE ERROR IN SAVE/REMIX DESIGN:", dbError);
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

  // 👇 Parameters mein search aur sortBy add kar diye hain
  async getAllPublishedDesigns(page = 1, limit = 10, userId = null, search = '', sortBy = 'newest') {
    try {
      const skip = (page - 1) * limit;

      // 🔍 1. BUILD WHERE CLAUSE (Search Filter) — sirf published + active
      const whereCondition = { status: 'published', isActive: true };
      
      if (search) {
        whereCondition.designName = {
          contains: search,
          mode: 'insensitive' // Yeh uppercase/lowercase ka masla khatam kar dega
        };
      }

      // 📊 2. BUILD ORDER BY CLAUSE (Sorting Filter)
      let orderByCondition = { createdAt: 'desc' }; // Default: Newest

      switch (sortBy) {
        case 'most-liked':
          orderByCondition = { likesCount: 'desc' }; // Sabse zyada likes wale upar
          break;
        case 'trending':
          orderByCondition = { viewsCount: 'desc' }; // Jisko sabse zyada dekha gaya (Trending)
          break;
        case 'price-low-high':
          orderByCondition = { finalPrice: 'asc' }; // Sastay pehle
          break;
        case 'price-high-low':
          orderByCondition = { finalPrice: 'desc' }; // Mehnge pehle
          break;
        case 'newest':
        default:
          orderByCondition = { createdAt: 'desc' }; // Naye pehle
          break;
      }

      // 🚀 3. DATABASE QUERY
      const designs = await prisma.savedDesign.findMany({
        where: whereCondition,
        skip: skip,
        take: limit,
        orderBy: orderByCondition, // 👈 Dynamic sorting lag gayi
        include: {
          user: { 
            select: { first_name: true, last_name: true, profile_picture_url: true } 
          },
          product: { 
            select: { name: true, baseStitchingPrice: true } 
          },
          ...(userId && {
            likes: {
              where: { userId: userId },
              select: { id: true } 
            }
          })
        }
      });

      // 🎯 4. isLiked Formatting Logic (Purani wali same rahegi)
      const formattedDesigns = designs.map(design => {
        const isLiked = design.likes && design.likes.length > 0;
        const { likes, ...cleanDesign } = design; 
        return {
          ...cleanDesign,
          isLiked: isLiked
        };
      });

      // 🧮 5. Pagination Total Count (Where condition isme bhi lagayenge taake search sahi chale)
      const total = await prisma.savedDesign.count({
        where: whereCondition
      });

      return { 
        designs: formattedDesigns, 
        meta: {
          total, 
          currentPage: page, 
          totalPages: Math.ceil(total / limit),
          hasMore: page * limit < total
        }
      };
      
    } catch (dbError) {
      console.error("🔥 DATABASE ERROR IN FETCH PUBLISHED DESIGNS:", dbError);
      throw dbError; 
    }
  },

  // 👇 Naya parameter 'userId' add kiya (optional hai, taake bina login walay bhi gallery dekh sakein)
  // async getAllPublishedDesigns(page = 1, limit = 10, userId = null) {
  //   try {
  //     console.log(`⚙️ [SERVICE] Fetching published designs. Page: ${page}, Limit: ${limit}, User: ${userId}`);
  //     const skip = (page - 1) * limit;

  //     // 1. Fetch designs with User, Product & Likes info
  //     const designs = await prisma.savedDesign.findMany({
  //       where: { status: 'published' },
  //       skip: skip,
  //       take: limit,
  //       orderBy: { createdAt: 'desc' }, // Naye designs sabse upar aayenge
  //       include: {
  //         user: { 
  //           select: { first_name: true, last_name: true, profile_picture_url: true } 
  //         },
  //         product: { 
  //           select: { name: true, baseStitchingPrice: true } 
  //         },
  //         // 🚨 NAYI LOGIC: Agar user login hai, toh check karo kya usne like kiya hai?
  //         ...(userId && {
  //           likes: {
  //             where: { userId: userId },
  //             select: { id: true } // Sirf id le aao confirmation ke liye
  //           }
  //         })
  //       }
  //     });

  //     // 2. Formatting for Frontend (Smart mapping)
  //     // Frontend ko array nahi, sirf true/false chahiye hota hai isLiked ke liye
  //     const formattedDesigns = designs.map(design => {
  //       // Agar likes ki array mein kuch aya hai, matlab is user ne like kiya hai
  //       const isLiked = design.likes && design.likes.length > 0;
        
  //       // Asal design object se 'likes' array ko hata kar clean response bhejna
  //       const { likes, ...cleanDesign } = design; 

  //       return {
  //         ...cleanDesign,
  //         isLiked: isLiked // Frontend wala is variable se red heart chalayega
  //       };
  //     });

  //     // 3. Count total designs
  //     const total = await prisma.savedDesign.count({
  //       where: { status: 'published' }
  //     });

  //     console.log(`⚙️ [SERVICE] Successfully fetched ${formattedDesigns.length} published designs.`);
      
  //     return { 
  //       designs: formattedDesigns, // 👈 Yahan formatted designs bheje hain
  //       meta: {
  //         total, 
  //         currentPage: page, 
  //         totalPages: Math.ceil(total / limit),
  //         hasMore: page * limit < total
  //       }
  //     };
      
  //   } catch (dbError) {
  //     console.error("🔥 DATABASE ERROR IN FETCH PUBLISHED DESIGNS:");
  //     console.error(dbError);
  //     throw dbError; 
  //   }
  // },
  

  

  /**
   * Admin: paginated list of all saved designs (no full canvas payload).
   * Query: page, limit, status (private | published), search (name, id, user email/name)
   */
  async getAdminSavedDesignsList(queryParams = {}) {
    const page = Math.max(1, parseInt(queryParams.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(queryParams.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const where = {};

    const st = queryParams.status && String(queryParams.status).trim().toLowerCase();
    if (st === 'private' || st === 'published') {
      where.status = st;
    }

    if (queryParams.isActive === 'true' || queryParams.isActive === '1') {
      where.isActive = true;
    } else if (queryParams.isActive === 'false' || queryParams.isActive === '0') {
      where.isActive = false;
    }

    if (queryParams.search && String(queryParams.search).trim()) {
      const s = String(queryParams.search).trim();
      where.OR = [
        { designName: { contains: s, mode: 'insensitive' } },
        { saveDesignId: { contains: s, mode: 'insensitive' } },
        {
          user: {
            OR: [
              { email: { contains: s, mode: 'insensitive' } },
              { first_name: { contains: s, mode: 'insensitive' } },
              { last_name: { contains: s, mode: 'insensitive' } },
              { mobile_number: { contains: s, mode: 'insensitive' } },
            ],
          },
        },
      ];
    }

    const [designs, total] = await prisma.$transaction([
      prisma.savedDesign.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          saveDesignId: true,
          designName: true,
          thumbnailUrl: true,
          status: true,
          isActive: true,
          basePrice: true,
          addOnPrice: true,
          finalPrice: true,
          currency: true,
          viewsCount: true,
          likesCount: true,
          remixesCount: true,
          remixedFromId: true,
          createdAt: true,
          updatedAt: true,
          user: {
            select: {
              user_id: true,
              first_name: true,
              last_name: true,
              email: true,
              mobile_number: true,
            },
          },
          product: {
            select: {
              id: true,
              name: true,
              pieceType: true,
            },
          },
        },
      }),
      prisma.savedDesign.count({ where }),
    ]);

    return {
      designs,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 0,
      },
    };
  },

  /** Admin: gallery/search visibility (published designs can be hidden) */
  async setAdminIsActive(saveDesignId, isActive) {
    const existing = await prisma.savedDesign.findUnique({
      where: { saveDesignId },
      select: { saveDesignId: true },
    });
    if (!existing) {
      const err = new Error('NOT_FOUND');
      err.code = 'NOT_FOUND';
      throw err;
    }
    return prisma.savedDesign.update({
      where: { saveDesignId },
      data: { isActive: Boolean(isActive) },
      select: {
        saveDesignId: true,
        isActive: true,
        designName: true,
        status: true,
      },
    });
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
  },

  // 👁️ 1. INCREMENT VIEW COUNT (published + active only)
  async incrementViewCount(designId) {
    try {
      const design = await prisma.savedDesign.findFirst({
        where: {
          saveDesignId: designId,
          status: 'published',
          isActive: true,
        },
        select: { saveDesignId: true },
      });
      if (!design) {
        const err = new Error('DESIGN_NOT_AVAILABLE');
        err.code = 'DESIGN_NOT_AVAILABLE';
        throw err;
      }
      const updatedDesign = await prisma.savedDesign.update({
        where: { saveDesignId: designId },
        data: { viewsCount: { increment: 1 } },
      });
      return updatedDesign.viewsCount;
    } catch (error) {
      if (error.code === 'DESIGN_NOT_AVAILABLE') throw error;
      console.error("Error incrementing view count:", error);
      throw new Error("Failed to update view count");
    }
  },

  // ❤️ 2. TOGGLE LIKE (Like/Unlike Logic) — published + active only
  async toggleLikeDesign(userId, designId) {
    try {
      const design = await prisma.savedDesign.findFirst({
        where: {
          saveDesignId: designId,
          status: 'published',
          isActive: true,
        },
        select: { saveDesignId: true },
      });
      if (!design) {
        const err = new Error('DESIGN_NOT_AVAILABLE');
        err.code = 'DESIGN_NOT_AVAILABLE';
        throw err;
      }

      // 1. Check karein ke kya user ne pehle se like kiya hua hai?
      const existingLike = await prisma.designLike.findUnique({
        where: {
          userId_designId: { userId, designId }
        }
      });

      // 🚨 Hum Transaction use kar rahe hain taake DB count hamesha accurate rahe
      if (existingLike) {
        // UNLIKE LOGIC: Like delete karo, aur design table mein count -1 karo
        await prisma.$transaction([
          prisma.designLike.delete({ where: { id: existingLike.id } }),
          prisma.savedDesign.update({
            where: { saveDesignId: designId },
            data: { likesCount: { decrement: 1 } }
          })
        ]);
        return { message: "Design unliked", liked: false };
      } else {
        // LIKE LOGIC: Naya Like banao, aur design table mein count +1 karo
        await prisma.$transaction([
          prisma.designLike.create({
            data: { userId, designId }
          }),
          prisma.savedDesign.update({
            where: { saveDesignId: designId },
            data: { likesCount: { increment: 1 } }
          })
        ]);
        return { message: "Design liked", liked: true };
      }
    } catch (error) {
      if (error.code === 'DESIGN_NOT_AVAILABLE') throw error;
      console.error("Error toggling like:", error);
      throw new Error("Failed to toggle like status");
    }
  }


};

module.exports = savedDesignService;