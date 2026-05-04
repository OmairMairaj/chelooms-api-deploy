const { prisma } = require('../config/db');

const asArray = (value) => (Array.isArray(value) ? value : []);

const normalizeColorEntry = (entry, source = 'unknown') => {
  if (!entry) return null;
  if (typeof entry === 'string') {
    const maybeHex = entry.trim();
    if (!maybeHex) return null;
    return {
      id: `${source}-${maybeHex.toLowerCase()}`,
      name: maybeHex,
      hex: maybeHex.startsWith('#') ? maybeHex : undefined,
      source,
    };
  }
  if (typeof entry === 'object') {
    const name = typeof entry.name === 'string' ? entry.name.trim() : '';
    const hex = typeof entry.hex === 'string' ? entry.hex.trim() : '';
    const id =
      (typeof entry.id === 'string' && entry.id.trim()) ||
      `${source}-${(name || hex || 'color').toLowerCase().replace(/\s+/g, '-')}`;
    if (!name && !hex) return null;
    return {
      id,
      name: name || hex || 'Color',
      hex: hex || undefined,
      source,
    };
  }
  return null;
};

const dedupeColors = (colors = []) => {
  const map = new Map();
  for (const color of colors) {
    if (!color) continue;
    const key = `${(color.name || '').toLowerCase()}|${(color.hex || '').toLowerCase()}`;
    if (!map.has(key)) map.set(key, color);
  }
  return Array.from(map.values());
};

const resolveFabricColors = (fabricColorsRaw) => {
  if (!fabricColorsRaw) return [];
  if (Array.isArray(fabricColorsRaw)) {
    return dedupeColors(fabricColorsRaw.map((c) => normalizeColorEntry(c, 'fabric')).filter(Boolean));
  }
  if (typeof fabricColorsRaw === 'object') {
    const pairs = Object.entries(fabricColorsRaw)
      .map(([key, val]) => normalizeColorEntry({ id: key, name: key, hex: typeof val === 'string' ? val : undefined }, 'fabric'))
      .filter(Boolean);
    return dedupeColors(pairs);
  }
  return [];
};

const resolveEmbellishmentColors = (rawColors, selectedColorId) => {
  const colors = asArray(rawColors)
    .map((c) => normalizeColorEntry(c, 'embellishment'))
    .filter(Boolean);
  if (!selectedColorId) return dedupeColors(colors);
  const selected = colors.find((c) => c.id === selectedColorId);
  if (selected) return [selected];
  return dedupeColors(colors);
};

async function deriveDesignColorsFromCanvas(canvasData) {
  if (!canvasData || typeof canvasData !== 'object') return [];

  const derived = [];
  const fabricId = canvasData?.fabric?.option_1_id;
  if (typeof fabricId === 'string' && fabricId.trim()) {
    const fabric = await prisma.inventoryItem.findUnique({
      where: { id: fabricId.trim() },
      include: { fabricProfile: { select: { colors: true } } },
    });
    const fabricColors = resolveFabricColors(fabric?.fabricProfile?.colors);
    derived.push(...fabricColors);
  }

  const embellishment = canvasData?.embellishment || {};
  const embellishmentVariationId =
    (typeof embellishment.variation_id === 'string' && embellishment.variation_id.trim()) || null;
  const embellishmentStyleId =
    (typeof embellishment.style_id === 'string' && embellishment.style_id.trim()) || null;
  const embellishmentColorId =
    (typeof embellishment.color_id === 'string' && embellishment.color_id.trim()) || null;

  if (embellishmentVariationId || embellishmentStyleId) {
    const embOption = await prisma.embellishmentOption.findFirst({
      where: {
        OR: [
          embellishmentVariationId ? { frontendId: embellishmentVariationId } : undefined,
          embellishmentVariationId ? { optionId: embellishmentVariationId } : undefined,
          embellishmentStyleId ? { frontendId: embellishmentStyleId } : undefined,
          embellishmentStyleId ? { optionId: embellishmentStyleId } : undefined,
        ].filter(Boolean),
      },
      select: { colors: true },
    });
    const embellishmentColors = resolveEmbellishmentColors(embOption?.colors, embellishmentColorId);
    derived.push(...embellishmentColors);
  }

  return dedupeColors(derived);
}

/**
 * Batched enrichment for arrays of canvas payloads — collects ids that need
 * lookup once and executes 3 batched queries instead of 3 per row.
 */
async function enrichCanvasDataDisplayFieldsBatch(canvasList) {
  if (!Array.isArray(canvasList) || canvasList.length === 0) return canvasList;

  const fabricIds = new Set();
  const styleIds = new Set();
  const variationIds = new Set();

  const cloned = canvasList.map((c) => {
    if (!c || typeof c !== 'object') return c;
    return JSON.parse(JSON.stringify(c));
  });

  cloned.forEach((next) => {
    if (!next || typeof next !== 'object') return;
    const fabricId = next?.fabric?.option_1_id;
    const hasFabricName = typeof next?.fabric?.option_1_name === 'string' && next.fabric.option_1_name.trim();
    if (typeof fabricId === 'string' && fabricId.trim() && !hasFabricName) {
      fabricIds.add(fabricId.trim());
    }
    const emb = next?.embellishment;
    if (emb && typeof emb === 'object') {
      const styleId = typeof emb.style_id === 'string' && emb.style_id.trim() ? emb.style_id.trim() : null;
      const variationId = typeof emb.variation_id === 'string' && emb.variation_id.trim() ? emb.variation_id.trim() : null;
      const hasStyleName = typeof emb.style_name === 'string' && emb.style_name.trim();
      const hasVariationName = typeof emb.variation_name === 'string' && emb.variation_name.trim();
      if (styleId && !hasStyleName) styleIds.add(styleId);
      if (variationId && !hasVariationName) variationIds.add(variationId);
    }
  });

  const [fabrics, styles, options] = await Promise.all([
    fabricIds.size > 0
      ? prisma.inventoryItem.findMany({
          where: { id: { in: Array.from(fabricIds) } },
          select: { id: true, name: true },
        })
      : Promise.resolve([]),
    styleIds.size > 0
      ? prisma.embellishmentCategory.findMany({
          where: {
            OR: [
              { frontendId: { in: Array.from(styleIds) } },
              { categoryId: { in: Array.from(styleIds) } },
            ],
          },
          select: { frontendId: true, categoryId: true, name: true },
        })
      : Promise.resolve([]),
    variationIds.size > 0
      ? prisma.embellishmentOption.findMany({
          where: {
            OR: [
              { frontendId: { in: Array.from(variationIds) } },
              { optionId: { in: Array.from(variationIds) } },
            ],
          },
          select: { frontendId: true, optionId: true, name: true },
        })
      : Promise.resolve([]),
  ]);

  const fabricMap = new Map();
  fabrics.forEach((f) => f?.id && f?.name && fabricMap.set(f.id, f.name));

  const styleMap = new Map();
  styles.forEach((s) => {
    if (!s?.name) return;
    if (s.frontendId) styleMap.set(s.frontendId, s.name);
    if (s.categoryId) styleMap.set(s.categoryId, s.name);
  });

  const variationMap = new Map();
  options.forEach((o) => {
    if (!o?.name) return;
    if (o.frontendId) variationMap.set(o.frontendId, o.name);
    if (o.optionId) variationMap.set(o.optionId, o.name);
  });

  cloned.forEach((next) => {
    if (!next || typeof next !== 'object') return;
    const fabricId = next?.fabric?.option_1_id;
    const hasFabricName = typeof next?.fabric?.option_1_name === 'string' && next.fabric.option_1_name.trim();
    if (typeof fabricId === 'string' && fabricMap.has(fabricId.trim()) && !hasFabricName) {
      next.fabric = { ...(next.fabric || {}), option_1_name: fabricMap.get(fabricId.trim()) };
    }
    const emb = next?.embellishment;
    if (emb && typeof emb === 'object') {
      const styleId = typeof emb.style_id === 'string' ? emb.style_id.trim() : '';
      const variationId = typeof emb.variation_id === 'string' ? emb.variation_id.trim() : '';
      const hasStyleName = typeof emb.style_name === 'string' && emb.style_name.trim();
      const hasVariationName = typeof emb.variation_name === 'string' && emb.variation_name.trim();
      if (styleId && styleMap.has(styleId) && !hasStyleName) {
        next.embellishment = { ...(next.embellishment || {}), style_name: styleMap.get(styleId) };
      }
      if (variationId && variationMap.has(variationId) && !hasVariationName) {
        next.embellishment = { ...(next.embellishment || {}), variation_name: variationMap.get(variationId) };
      }
    }
  });

  return cloned;
}

async function enrichCanvasDataDisplayFields(canvasData) {
  if (!canvasData || typeof canvasData !== 'object') return canvasData;
  const next = JSON.parse(JSON.stringify(canvasData));

  // Fabric display name enrichment (non-breaking additive field).
  const fabricId = next?.fabric?.option_1_id;
  if (typeof fabricId === 'string' && fabricId.trim()) {
    const hasName = typeof next?.fabric?.option_1_name === 'string' && next.fabric.option_1_name.trim();
    if (!hasName) {
      const fabric = await prisma.inventoryItem.findUnique({
        where: { id: fabricId.trim() },
        select: { name: true },
      });
      if (fabric?.name) {
        next.fabric = {
          ...(next.fabric || {}),
          option_1_name: fabric.name,
        };
      }
    }
  }

  // Embellishment style/variation names enrichment.
  const emb = next?.embellishment;
  if (emb && typeof emb === 'object') {
    const styleId = typeof emb.style_id === 'string' && emb.style_id.trim() ? emb.style_id.trim() : null;
    const variationId = typeof emb.variation_id === 'string' && emb.variation_id.trim() ? emb.variation_id.trim() : null;

    if (styleId && !(typeof emb.style_name === 'string' && emb.style_name.trim())) {
      const style = await prisma.embellishmentCategory.findFirst({
        where: {
          OR: [{ frontendId: styleId }, { categoryId: styleId }],
        },
        select: { name: true },
      });
      if (style?.name) {
        next.embellishment = {
          ...(next.embellishment || {}),
          style_name: style.name,
        };
      }
    }

    if (variationId && !(typeof emb.variation_name === 'string' && emb.variation_name.trim())) {
      const option = await prisma.embellishmentOption.findFirst({
        where: {
          OR: [{ frontendId: variationId }, { optionId: variationId }],
        },
        select: { name: true },
      });
      if (option?.name) {
        next.embellishment = {
          ...(next.embellishment || {}),
          variation_name: option.name,
        };
      }
    }
  }

  return next;
}

const savedDesignService = {
  
  async saveNewDesign(data) {
    try {
      console.log("⚙️ [SERVICE] Saving Design with Remix Logic...");

      const parsedRatio = Number(data.aspectRatio);
      const aspectRatio = Number.isFinite(parsedRatio) && parsedRatio > 0 ? parsedRatio : 1.0;

      const enrichedCanvasData = await enrichCanvasDataDisplayFields(data.canvasData);

      const providedColors = asArray(data.colors)
        .map((c) => normalizeColorEntry(c, 'design'))
        .filter(Boolean);
      const resolvedColors =
        providedColors.length > 0 ? dedupeColors(providedColors) : await deriveDesignColorsFromCanvas(enrichedCanvasData);

      // 🚨 Hum Transaction use kar rahe hain taake dono kaam ek sath hon
      const result = await prisma.$transaction(async (tx) => {
        
        // 1. Naya Design Create Karein
        const newDesign = await tx.savedDesign.create({
          data: {
            userId: data.userId,
            productId: data.productId,
            designName: data.designName || "My Custom Design",
            canvasData: enrichedCanvasData,
            status: data.status || "private",
            thumbnailUrl: data.thumbnailUrl || null,
            //aspectRatio: aspectRatio,
            basePrice: data.basePrice,
            addOnPrice: data.addOnPrice,
            finalPrice: data.finalPrice,
            currency: data.currency,
            pricingBreakdown: data.pricingBreakdown,
            colors: resolvedColors.length > 0 ? resolvedColors : null,
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

  /** Published gallery canvas for customize/remix — single DB row, no pagination. */
  async getPublishedCanvasBySaveDesignId(saveDesignId) {
    if (!saveDesignId || typeof saveDesignId !== 'string') return null;
    try {
      const design = await prisma.savedDesign.findFirst({
        where: {
          saveDesignId: saveDesignId.trim(),
          status: 'published',
          isActive: true,
        },
        select: {
          saveDesignId: true,
          productId: true,
          canvasData: true,
        },
      });
      if (!design) return null;
      return {
        ...design,
        canvasData: await enrichCanvasDataDisplayFields(design.canvasData),
      };
    } catch (dbError) {
      console.error('🔥 DATABASE ERROR IN getPublishedCanvasBySaveDesignId:', dbError);
      throw dbError;
    }
  },

  /**
   * Full published design payload by id — used by storefront detail pages so
   * they don't have to scan the paginated list to find one design.
   */
  async getPublishedDesignBySaveDesignId(saveDesignId, userId = null) {
    if (!saveDesignId || typeof saveDesignId !== 'string') return null;
    try {
      const design = await prisma.savedDesign.findFirst({
        where: {
          saveDesignId: saveDesignId.trim(),
          status: 'published',
          isActive: true,
        },
        include: {
          user: {
            select: { first_name: true, last_name: true, profile_picture_url: true },
          },
          product: {
            select: { name: true, baseStitchingPrice: true },
          },
          ...(userId && {
            likes: {
              where: { userId },
              select: { id: true },
            },
          }),
        },
      });
      if (!design) return null;
      const isLiked = Array.isArray(design.likes) && design.likes.length > 0;
      const { likes, ...rest } = design;
      void likes;
      return {
        ...rest,
        canvasData: await enrichCanvasDataDisplayFields(rest.canvasData),
        isLiked,
      };
    } catch (dbError) {
      console.error('🔥 DATABASE ERROR IN getPublishedDesignBySaveDesignId:', dbError);
      throw dbError;
    }
  },

  async getAllPublishedDesigns(page = 1, limit = 10, userId = null, search = '', sortBy = 'newest', color = '') {
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

      // 👇 🎨 NAYA COLOR FILTER YAHAN ADD KIYA HAI
      if (color) {
        // Prisma ka array_contains JSON objects ke andar deeply match karta hai
        whereCondition.colors = {
          array_contains: [{ name: color }] 
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

      // 🚀 3. DATABASE QUERY — page rows + total count in parallel
      const [designs, total] = await Promise.all([
        prisma.savedDesign.findMany({
          where: whereCondition,
          skip: skip,
          take: limit,
          orderBy: orderByCondition,
          include: {
            user: {
              select: { first_name: true, last_name: true, profile_picture_url: true },
            },
            product: {
              select: { name: true, baseStitchingPrice: true },
            },
            ...(userId && {
              likes: {
                where: { userId: userId },
                select: { id: true },
              },
            }),
          },
        }),
        prisma.savedDesign.count({ where: whereCondition }),
      ]);

      // 🎯 Batch-enrich canvas data (collapses N+1 → 3 queries total)
      const enrichedCanvases = await enrichCanvasDataDisplayFieldsBatch(
        designs.map((d) => d.canvasData)
      );

      const formattedDesigns = designs.map((design, idx) => {
        const isLiked = design.likes && design.likes.length > 0;
        const { likes, ...cleanDesign } = design;
        void likes;
        return {
          ...cleanDesign,
          canvasData: enrichedCanvases[idx],
          isLiked,
        };
      });

      return {
        designs: formattedDesigns,
        meta: {
          total,
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          hasMore: page * limit < total,
        },
      };
      
    } catch (dbError) {
      console.error("🔥 DATABASE ERROR IN FETCH PUBLISHED DESIGNS:", dbError);
      throw dbError; 
    }
  },
  // 👇 Parameters mein search aur sortBy add kar diye hain
  // async getAllPublishedDesigns(page = 1, limit = 10, userId = null, search = '', sortBy = 'newest') {
  //   try {
  //     const skip = (page - 1) * limit;

  //     // 🔍 1. BUILD WHERE CLAUSE (Search Filter) — sirf published + active
  //     const whereCondition = { status: 'published', isActive: true };
      
  //     if (search) {
  //       whereCondition.designName = {
  //         contains: search,
  //         mode: 'insensitive' // Yeh uppercase/lowercase ka masla khatam kar dega
  //       };
  //     }

  //     // 📊 2. BUILD ORDER BY CLAUSE (Sorting Filter)
  //     let orderByCondition = { createdAt: 'desc' }; // Default: Newest

  //     switch (sortBy) {
  //       case 'most-liked':
  //         orderByCondition = { likesCount: 'desc' }; // Sabse zyada likes wale upar
  //         break;
  //       case 'trending':
  //         orderByCondition = { viewsCount: 'desc' }; // Jisko sabse zyada dekha gaya (Trending)
  //         break;
  //       case 'price-low-high':
  //         orderByCondition = { finalPrice: 'asc' }; // Sastay pehle
  //         break;
  //       case 'price-high-low':
  //         orderByCondition = { finalPrice: 'desc' }; // Mehnge pehle
  //         break;
  //       case 'newest':
  //       default:
  //         orderByCondition = { createdAt: 'desc' }; // Naye pehle
  //         break;
  //     }

  //     // 🚀 3. DATABASE QUERY
  //     const designs = await prisma.savedDesign.findMany({
  //       where: whereCondition,
  //       skip: skip,
  //       take: limit,
  //       orderBy: orderByCondition, // 👈 Dynamic sorting lag gayi
  //       include: {
  //         user: { 
  //           select: { first_name: true, last_name: true, profile_picture_url: true } 
  //         },
  //         product: { 
  //           select: { name: true, baseStitchingPrice: true } 
  //         },
  //         ...(userId && {
  //           likes: {
  //             where: { userId: userId },
  //             select: { id: true } 
  //           }
  //         })
  //       }
  //     });

  //     // 🎯 4. isLiked Formatting Logic (Purani wali same rahegi)
  //     const formattedDesigns = designs.map(design => {
  //       const isLiked = design.likes && design.likes.length > 0;
  //       const { likes, ...cleanDesign } = design; 
  //       return {
  //         ...cleanDesign,
  //         isLiked: isLiked
  //       };
  //     });

  //     // 🧮 5. Pagination Total Count (Where condition isme bhi lagayenge taake search sahi chale)
  //     const total = await prisma.savedDesign.count({
  //       where: whereCondition
  //     });

  //     return { 
  //       designs: formattedDesigns, 
  //       meta: {
  //         total, 
  //         currentPage: page, 
  //         totalPages: Math.ceil(total / limit),
  //         hasMore: page * limit < total
  //       }
  //     };
      
  //   } catch (dbError) {
  //     console.error("🔥 DATABASE ERROR IN FETCH PUBLISHED DESIGNS:", dbError);
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