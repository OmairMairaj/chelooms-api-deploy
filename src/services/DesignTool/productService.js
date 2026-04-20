const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class ProductService {
  async createProduct(data) {
    const product = await prisma.product.create({
      data: {
        name: data.name,
        productCategoryId : data.productCategoryId,
        pieceType: data.pieceType,
        baseStitchingPrice: data.baseStitchingPrice,
        status: data.status || 'Draft',
        
        images: data.images || [],
        thumbnails: data.thumbnails || [],
        seasonTags: data.seasonTags || [],

        // 🎛️ Arrays of Allowed Options
        allowedFabricIds: data.allowedFabricIds || [],
        allowedNecklineOptionIds: data.allowedNecklineOptionIds || [],
        allowedSleeveOptionIds: data.allowedSleeveOptionIds || [],
        allowedHemlineOptionIds: data.allowedHemlineOptionIds || [],
        allowedSideSlitIds: data.allowedSideSlitIds || [],
        allowedEmbellishmentOptionIds: data.allowedEmbellishmentOptionIds || [],

        // 🎨 Default Design
        defaultDesign: data.defaultDesign || {}
      }
    });

    return product;
  }

  async updateProduct(id, updateData) {
    // Check if product exists
    const existingProduct = await prisma.product.findUnique({ where: { id } });
    if (!existingProduct) {
      throw new Error("Product not found");
    }

    // Update product
    const updatedProduct = await prisma.product.update({
      where: { id },
      data: updateData
    });

    return updatedProduct;
  }

  // Get Products for Admin Dashboard
  async getAllProducts(page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    // Koi filter nahi lagaya, taake A to Z sab products aayein (Active + Soft Deleted)
    const products = await prisma.product.findMany({
      skip: skip,
      take: limit,
      orderBy: { createdAt: 'desc' }, 
      include: {
        productCategory: {
          select: { name: true } 
        }
      }
    });

    // Count bhi poore database ke products ka hoga
    const total = await prisma.product.count();

    return {
      products,
      meta: {
        total,
        currentPage: page,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async deleteProduct(id, isHardDelete = false) {
    const existingProduct = await prisma.product.findUnique({ where: { id } });
    if (!existingProduct) {
      throw new Error("Product not found");
    }

    if (isHardDelete) {
      // 🚨 HARD DELETE: Database se hamesha ke liye delete
      return await prisma.product.delete({
        where: { id }
      });
    } else {
      // 🗂️ SOFT DELETE: Sirf deletedAt mein timestamp daal do
      return await prisma.product.update({
        where: { id },
        data: { 
          deletedAt: new Date() // 👈 Yahan current time aayega
        }
      });
    }
  }

  // ♻️ RESTORE PRODUCT (Reactivate)
  async restoreProduct(id) {
    const existingProduct = await prisma.product.findUnique({ where: { id } });
    if (!existingProduct) {
      throw new Error("Product not found");
    }

    return await prisma.product.update({
      where: { id },
      data: { deletedAt: null } // 👈 Dobara null kar diya, matlab active ho gaya!
    });
  }

  // ==================================================
  // 🧠 THE MASTER ASSEMBLY API (For E-com Frontend)
  // ==================================================
  async getProductForFrontend(productId) {
    // 1. Fetch Basic Product
    // const product = await prisma.product.findUnique({
    //   where: { id: productId }
    // });

    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: { productCategory: true } // 🔥 Yeh line add karni hai
    });

    if (!product) throw new Error("Product not found");

    // 2. 👗 Fetch Fabrics (Inventory + FabricProfile)
    let fabricsData = [];
    if (product.allowedFabricIds && product.allowedFabricIds.length > 0) {
      const inventoryItems = await prisma.inventoryItem.findMany({
        where: { id: { in: product.allowedFabricIds } },
        include: { fabricProfile: true }
      });

      fabricsData = inventoryItems.map(item => {
        const fp = item.fabricProfile || {};
        return {
          id: item.id, // option id for frontend
          name: item.name,
          type: fp.fabricType || product.pieceType,
          texture_url: fp.textureUrl || null,
          physical_repeat_width_cm: fp.physicalRepeatWidthCm || 0,
          physical_repeat_height_cm: fp.physicalRepeatHeightCm || 0,
          patternOrigin: fp.patternOrigin || { x: 0.5, y: 0.5 },
          colors: fp.colors || null,
          premium: fp.isPremium || false,
          premium_price: fp.premiumPrice || null,
          texture_parts: fp.textureParts || null
        };
      });
    }

    // --- 🛠️ SMART HELPER: Group Options by their Category ---
    const groupByCategory = (optionsList) => {
      const grouped = {};
      optionsList.forEach(opt => {
        const cat = opt.category;
        if (!cat) return; // Fallback safeguard

        if (!grouped[cat.categoryId]) {
          grouped[cat.categoryId] = {
            id: cat.frontendId || cat.categoryId, // E.g., nl-angular
            name: cat.name,
            image: cat.image || [],
            options: []
          };
        }

        // Child Option map
        grouped[cat.categoryId].options.push({
          id: opt.frontendId || opt.optionId,
          // Expose both aliases so callers (e.g. default_design translator)
          // can reconcile options saved by either identifier.
          optionId: opt.optionId,
          frontendId: opt.frontendId || null,
          name: opt.name,
          type: opt.type || "subtractive",
          hasButtons: opt.hasButtons || false,
          images: opt.images || [],
          keywords: opt.keywords || [],
          tags: opt.tags || [],
          layers: opt.layers || [],
          // Neckline/Sleeve/Hemline option models expose `isPremium` (@map("premium"));
          // EmbellishmentOption exposes `premium` directly. Read either so this helper
          // stays correct for all four shapes.
          premium: (opt.isPremium ?? opt.premium) || false,
          premium_price: opt.premiumPrice || null,
          overlays: opt.overlays || undefined, // For embellishments
          shapeTag: opt.shapeTag || undefined,
          colors: opt.colors || undefined // For hemlines
        });
      });
      return Object.values(grouped);
    };

    // 3. 👚 Fetch Necklines (with Category)
    let necklinesData = [];
    if (product.allowedNecklineOptionIds && product.allowedNecklineOptionIds.length > 0) {
      const necklines = await prisma.necklineOption.findMany({
        where: { 
          OR: [
            { optionId: { in: product.allowedNecklineOptionIds } },
            { frontendId: { in: product.allowedNecklineOptionIds } }
          ]
        },
        include: { category: true }
      });
      necklinesData = groupByCategory(necklines);
    }

    // 4. 👘 Fetch Sleeves (with Category)
    let sleevesData = [];
    if (product.allowedSleeveOptionIds && product.allowedSleeveOptionIds.length > 0) {
      const sleeves = await prisma.sleeveOption.findMany({
        where: { 
          OR: [
            { optionId: { in: product.allowedSleeveOptionIds } },
            { frontendId: { in: product.allowedSleeveOptionIds } }
          ]
        },
        include: { category: true }
      });
      sleevesData = groupByCategory(sleeves);
    }

    // 5. 👗 Fetch Hemlines (with Category)
    let hemlinesData = [];
    if (product.allowedHemlineOptionIds && product.allowedHemlineOptionIds.length > 0) {
      const hemlines = await prisma.hemlineOption.findMany({
        where: { 
          OR: [
            { optionId: { in: product.allowedHemlineOptionIds } },
            { frontendId: { in: product.allowedHemlineOptionIds } }
          ]
        },
        include: { category: true }
      });
      hemlinesData = groupByCategory(hemlines);
    }

    // 6. ✂️ Fetch Side Slits
    let sideSlitsData = [];
    if (product.allowedSideSlitIds && product.allowedSideSlitIds.length > 0) {
      const sideSlits = await prisma.sideSlit.findMany({
        where: { 
          OR: [
            { sideSlitId: { in: product.allowedSideSlitIds } },
            { frontendId: { in: product.allowedSideSlitIds } }
          ]
        }
      });
      sideSlitsData = sideSlits.map(slit => ({
        id: slit.frontendId || slit.sideSlitId,
        // Alias fields used by the default_design translator.
        sideSlitId: slit.sideSlitId,
        frontendId: slit.frontendId || null,
        name: slit.name,
        image: slit.image || [],
        images: slit.images || [],
        tags: slit.tags || [],
        allowedHemlineShapes: slit.allowedHemlineShapes || [],
        cutouts: slit.cutouts || {},
        premium: slit.premium || false,
        premium_price: slit.premiumPrice || null
      }));
    }

    // 7. ✨ Fetch Embellishments (with Category)
    let embellishmentsData = [];
    if (product.allowedEmbellishmentOptionIds && product.allowedEmbellishmentOptionIds.length > 0) {
      const embellishments = await prisma.embellishmentOption.findMany({
        where: { 
          OR: [
            { optionId: { in: product.allowedEmbellishmentOptionIds } },
            { frontendId: { in: product.allowedEmbellishmentOptionIds } }
          ]
        },
        include: { category: true }
      });
      embellishmentsData = groupByCategory(embellishments);
    }

    // 8. 🔘 Buttons (Bonus: Fetch all buttons if needed, or you can link them later)
    const allButtons = await prisma.buttonOption.findMany();
    const buttonOptionsData = allButtons.map(btn => ({
      id: btn.frontendId || btn.buttonId,
      name: btn.name,
      premium: btn.premium,
      premium_price: btn.premiumPrice || 0,
      colors: btn.colors || []
    }));

    // ==========================================
    // 🎁 ASSEMBLE THE EXACT FRONTEND JSON
    // ==========================================
    return {
      product_id: product.id,
      name: product.name,
      category: product.productCategory ? product.productCategory.name : "Unknown", // ✅ Naya structure
      images: product.images,
      thumbnails: product.thumbnails,
      base_stitching_price: product.baseStitchingPrice,
      status: product.status,
      season_tags: product.seasonTags,
      created_at: product.createdAt,
      updated_at: product.updatedAt,
      
      // 🛠️ The Massive Nested JSON
      modification_options: {
        fabrics: fabricsData,
        necklines: necklinesData,
        sleeves: sleevesData,
        hemline: hemlinesData,
        side_slits: sideSlitsData,
        embellishments: embellishmentsData,
        button_options: buttonOptionsData
      },

      // 📊 Spec Display Summary
      spec_display: {
        fabric: fabricsData.length > 0 ? fabricsData[0].name : "Standard",
        neckStyles: `${product.allowedNecklineOptionIds.length} lengths`,
        sleeves: `${product.allowedSleeveOptionIds.length} lengths`,
        hemline: `${product.allowedHemlineOptionIds.length} lengths`,
        sideSlits: `${product.allowedSideSlitIds.length} lengths`,
        embellishments: `${product.allowedEmbellishmentOptionIds.length} lengths`
      },

      piece_type: product.pieceType,
      // The stored defaultDesign may reference options by their DB UUID
      // (admin save) while the canvas exposes `id = frontendId || optionId`.
      // Translate each entry so the frontend's equality check lines up.
      default_design: this._translateDefaultDesignIds(product.defaultDesign, {
        fabrics: fabricsData,
        necklines: necklinesData,
        sleeves: sleevesData,
        hemline: hemlinesData,
        side_slits: sideSlitsData,
        embellishments: embellishmentsData
      })
    };
  }

  // Maps any option_id (UUID or frontendId) in the stored defaultDesign to the
  // canonical `id` the canvas response exposes (= frontendId || optionId).
  // This makes the canvas resilient to whichever identifier the admin saved.
  _translateDefaultDesignIds(defaultDesign, canvasGroups) {
    if (!defaultDesign || typeof defaultDesign !== 'object') return defaultDesign || {};

    const flattenOptions = (groups) =>
      (Array.isArray(groups) ? groups : []).flatMap(g => Array.isArray(g?.options) ? g.options : []);

    // Each group bucket we resolved in canvas: [fabricsData], [necklinesData], ...
    // fabricsData is already a flat array; the rest are { id, options }[]
    const buckets = {
      fabric: Array.isArray(canvasGroups.fabrics) ? canvasGroups.fabrics : [],
      neckline: flattenOptions(canvasGroups.necklines),
      sleeve: flattenOptions(canvasGroups.sleeves),
      hemline: flattenOptions(canvasGroups.hemline),
      sideSlit: Array.isArray(canvasGroups.side_slits) ? canvasGroups.side_slits : [],
      embellishment: flattenOptions(canvasGroups.embellishments)
    };

    // For each bucket, build: { uuidOrFrontendId -> canvasId }
    // The canvas `id` is already frontendId || optionId, so mapping is just
    // "any known alias" -> opt.id. We intentionally include opt.id too so
    // re-translating is idempotent.
    const buildAliasMap = (options) => {
      const map = new Map();
      for (const opt of options) {
        const canonical = opt?.id;
        if (!canonical) continue;
        map.set(canonical, canonical);
        if (opt.optionId) map.set(opt.optionId, canonical);
        if (opt.frontendId) map.set(opt.frontendId, canonical);
        if (opt.sideSlitId) map.set(opt.sideSlitId, canonical);
      }
      return map;
    };

    const maps = {
      fabric: buildAliasMap(buckets.fabric),
      neckline: buildAliasMap(buckets.neckline),
      sleeve: buildAliasMap(buckets.sleeve),
      hemline: buildAliasMap(buckets.hemline),
      sideSlit: buildAliasMap(buckets.sideSlit),
      embellishment: buildAliasMap(buckets.embellishment)
    };

    const translateEntry = (entry, mapKey) => {
      if (!entry || typeof entry !== 'object') return entry;
      const id = entry.option_id;
      if (!id) return entry;
      const translated = maps[mapKey]?.get(id);
      return translated ? { ...entry, option_id: translated } : entry;
    };

    return {
      ...defaultDesign,
      fabric: translateEntry(defaultDesign.fabric, 'fabric'),
      neckline: translateEntry(defaultDesign.neckline, 'neckline'),
      sleeve: translateEntry(defaultDesign.sleeve, 'sleeve'),
      sleeves: translateEntry(defaultDesign.sleeves, 'sleeve'),
      hemline: translateEntry(defaultDesign.hemline, 'hemline'),
      sideSlit: translateEntry(defaultDesign.sideSlit, 'sideSlit'),
      side_slits: translateEntry(defaultDesign.side_slits, 'sideSlit'),
      embellishment: translateEntry(defaultDesign.embellishment, 'embellishment')
    };
  }

  // ==================================================
  // 🛠️ ADMIN MASTER FORM OPTIONS API
  // ==================================================
  async getAdminFormOptions() {
    // 1. 👗 Fetch Fabrics (Wo inventory items jinki Fabric Profile mojood hai)
    // 1. 👗 Fetch Fabrics (Wo inventory items jinki Fabric Profile mojood hai)
    const fabricProfiles = await prisma.fabricProfile.findMany({
      include: { inventoryItem: true }
    });
    
    // 🔥 FIX: Sirf ek category banani hai, aur saare fabrics uske 'options' array mein dalne hain
    const fabrics = [{
      categoryId: "fabrics-main",
      name: "All Fabrics",
      options: fabricProfiles.map(fp => ({
        optionId: fp.inventoryItem.id, // Yeh child ID hai
        name: fp.inventoryItem?.name || "Unknown Fabric",
        image: fp.textureUrl
      }))
    }];

    // 2. 👚 Fetch Necklines (Category include Options)
    const necklines = await prisma.necklineCategory.findMany({
      include: { options: true }
    });

    // 3. 👘 Fetch Sleeves (Category include Options)
    const sleeves = await prisma.sleeveCategory.findMany({
      include: { options: true }
    });

    // 4. 👗 Fetch Hemlines (Category include Options)
    const hemlines = await prisma.hemlineCategory.findMany({
      include: { options: true }
    });

    // 5. ✂️ Fetch Side Slits (Inki category nahi hoti, isliye direct UI format banayenge)
    const rawSideSlits = await prisma.sideSlit.findMany();
    const sideSlits = [{
      categoryId: "side-slits-main",
      name: "All Side Slits",
      options: rawSideSlits
    }];

    // 6. ✨ Fetch Embellishments (Category include Options)
    const embellishments = await prisma.embellishmentCategory.findMany({
      include: { options: true }
    });

    // Return the Master Payload
    return {
      fabrics, // Isko bhi nested format mein diya hai taake Frontend ka logic same rahay
      necklines,
      sleeves,
      hemlines,
      sideSlits,
      embellishments
    };
  }


// ==================================================
  // 🛍️ FRONTEND: GET ALL PRODUCTS BY CATEGORY NAME
  // ==================================================
  async getProductsByCategoryFrontend(categoryName) {
    // 1. Fetch products where Category Name matches (Case Insensitive)
    // Aur sirf wo products layen jinka status "Publish" hai
    const products = await prisma.product.findMany({
      where: {
        productCategory: {
          name: {
            equals: categoryName,
            mode: 'insensitive' // 'sherwani' aur 'Sherwani' dono ko same manega
          }
        },
        status: "Publish" 
      },
      include: {
        productCategory: true
      }
    });

    if (!products || products.length === 0) {
      return []; // Agar is category mein koi product nahi toh empty array
    }

    // 2. Format the response to match the exact shell structure
    const formattedProducts = await Promise.all(products.map(async (product) => {
      
      // Fabric ka naam nikalne ke liye choti si query (taake spec_display perfect rahay)
      let defaultFabricName = "Standard";
      if (product.allowedFabricIds && product.allowedFabricIds.length > 0) {
        const firstFabric = await prisma.inventoryItem.findUnique({
          where: { id: product.allowedFabricIds[0] },
          select: { name: true }
        });
        if (firstFabric) defaultFabricName = firstFabric.name;
      }

      return {
        product_id: product.id,
        name: product.name,
        category: product.productCategory ? product.productCategory.name : categoryName,
        images: product.images,
        thumbnails: product.thumbnails,
        base_stitching_price: product.baseStitchingPrice,
        status: product.status,
        season_tags: product.seasonTags,
        created_at: product.createdAt,
        updated_at: product.updatedAt,
        
        // 🚫 modification_options HATA DIYA GAYA HAI (As requested)

        // 📊 Spec Display Summary (Sirf counts bhej rahe hain)
        spec_display: {
          fabric: defaultFabricName,
          neckStyles: `${product.allowedNecklineOptionIds?.length || 0} styles`,
          sleeves: `${product.allowedSleeveOptionIds?.length || 0} styles`,
          hemline: `${product.allowedHemlineOptionIds?.length || 0} styles`,
          sideSlits: `${product.allowedSideSlitIds?.length || 0} styles`,
          embellishments: `${product.allowedEmbellishmentOptionIds?.length || 0} styles`
        },

        piece_type: product.pieceType,
        default_design: product.defaultDesign
      };
    }));

    return formattedProducts;
  }


  // ==================================================
  // 🛍️ FRONTEND: GET ALL PRODUCTS GROUPED BY CATEGORY
  // ==================================================
  async getAllProductsGroupedByCategory() {
    // 1. Fetch all Active Categories aur unke andar sirf "Publish" products
    const categories = await prisma.productCategory.findMany({
      where: { isActive: true },
      include: {
        products: {
          where: { status: "Publish" }
        }
      }
    });

    const groupedData = [];

    // 2. Loop through categories and format
    for (const category of categories) {
      // Agar kisi category mein koi product nahi hai, toh usko skip kar do
      if (!category.products || category.products.length === 0) {
        continue;
      }

      // Products ko format karo
      const formattedProducts = await Promise.all(category.products.map(async (product) => {
        // Fabric ka naam nikalne ke liye
        let defaultFabricName = "Standard";
        if (product.allowedFabricIds && product.allowedFabricIds.length > 0) {
          const firstFabric = await prisma.inventoryItem.findUnique({
            where: { id: product.allowedFabricIds[0] },
            select: { name: true }
          });
          if (firstFabric) defaultFabricName = firstFabric.name;
        }

        return {
          product_id: product.id,
          name: product.name,
          category: category.name,
          images: product.images || [],
          thumbnails: product.thumbnails || [],
          base_stitching_price: product.baseStitchingPrice,
          status: product.status,
          season_tags: product.seasonTags || [],
          created_at: product.createdAt,
          updated_at: product.updatedAt,
          
          // 🚫 modification_options HATA DIYA GAYA HAI
          // 🚫 default_design HATA DIYA GAYA HAI

          // 📊 Spec Display Summary
          spec_display: {
            fabric: defaultFabricName,
            neckStyles: `${product.allowedNecklineOptionIds?.length || 0} styles`,
            sleeves: `${product.allowedSleeveOptionIds?.length || 0} styles`,
            hemline: `${product.allowedHemlineOptionIds?.length || 0} styles`,
            sideSlits: `${product.allowedSideSlitIds?.length || 0} styles`,
            embellishments: `${product.allowedEmbellishmentOptionIds?.length || 0} styles`
          },

          piece_type: product.pieceType
        };
      }));

      // Group format build karna
      groupedData.push({
        categoryId: category.productCategoryId, // Aapka naya primary key standard
        name: category.name,
        products: formattedProducts
      });
    }

    return groupedData;
  }

}

module.exports = new ProductService();