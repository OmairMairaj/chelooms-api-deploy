const galleryService = require('../services/galleryService');

class GalleryController {

  async getGallery(req, res) {
    try {
      // 👇 User ID nikalo (Optional Auth Middleware se)
      const userId = req.user ? req.user.user_id : null;

      const {
        categoryId, color, minPrice, maxPrice, page, limit, 
        sort, type, tags, isPremium, material, fabricType, q
      } = req.query;

      const filters = {
        categoryId, color, minPrice, maxPrice, sort, type, 
        tags, isPremium, material, fabricType, q
      };

      const pageNumber = page ? parseInt(page) : 1;
      const limitNumber = limit ? parseInt(limit) : 12;

      // 👇 userId ko 4th parameter bheja hai
      const result = await galleryService.getDisplayItems(filters, pageNumber, limitNumber, userId);

      res.status(200).json({
        success: true,
        data: result.items,
        pagination: result.pagination
      });

    } catch (error) {
      console.error("Gallery Fetch Error:", error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to fetch gallery items",
        error: error.message 
      });
    }
  }
  // async getGallery(req, res) {
  //   try {
  //     // 1. URL se Query Params nikalna (sort yahan naya add kiya hai)
  //     const {
  //       categoryId,
  //       color,
  //       minPrice,
  //       maxPrice,
  //       page,
  //       limit,
  //       sort,
  //       type,
  //       tags,
  //       isPremium,
  //       material,
  //       fabricType,
  //       q,
  //     } = req.query;

  //     // 2. Filters object taiyar karna
  //     const filters = {
  //       categoryId,
  //       color,
  //       minPrice,
  //       maxPrice,
  //       sort, // Frontend se aane wala sorting order yahan pass hoga
  //       type,
  //       tags,
  //       isPremium,
  //       material,
  //       fabricType,
  //       q,
  //     };

  //     // 3. Pagination values set karna (default page 1, limit 12)
  //     const pageNumber = page ? parseInt(page) : 1;
  //     const limitNumber = limit ? parseInt(limit) : 12;

  //     // 4. Service ko call karna
  //     const result = await galleryService.getDisplayItems(filters, pageNumber, limitNumber);

  //     // 5. Success Response
  //     res.status(200).json({
  //       success: true,
  //       data: result.items,
  //       pagination: result.pagination
  //     });

  //   } catch (error) {
  //     console.error("Gallery Fetch Error:", error);
  //     res.status(500).json({ 
  //       success: false, 
  //       message: "Failed to fetch gallery items",
  //       error: error.message 
  //     });
  //   }
  // }

  async getFabricFacets(req, res) {
    try {
      const facets = await galleryService.getFabricFacets();
      res.status(200).json({
        success: true,
        data: facets,
      });
    } catch (error) {
      console.error("Fabric Facets Error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch fabric facets",
        error: error.message,
      });
    }
  }

  // 👁️ INCREMENT VIEW CONTROLLER
  async incrementView(req, res) {
    try {
      const { id } = req.params; // URL se Item ID aayegi
      const newViewsCount = await galleryService.incrementItemView(id);

      return res.status(200).json({
        success: true,
        message: "View count updated",
        viewsCount: newViewsCount
      });
    } catch (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  // ❤️ TOGGLE LIKE CONTROLLER
  async toggleLike(req, res) {
    try {
      // Auth middleware (protect) se user_id aayega
      const userId = req.user ? req.user.user_id : null; 
      const { id } = req.params; // URL se Item ID aayegi

      if (!userId) {
        return res.status(401).json({ success: false, message: "Please login to like items." });
      }

      const result = await galleryService.toggleItemLike(userId, id);

      return res.status(200).json({
        success: true,
        message: result.message,
        liked: result.liked
      });
    } catch (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }
}

module.exports = new GalleryController();





