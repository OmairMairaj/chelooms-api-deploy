const galleryService = require('../services/galleryService');

class GalleryController {
  
  async getGallery(req, res) {
    try {
      // 1. URL se Query Params nikalna (sort yahan naya add kiya hai)
      const { categoryId, color, minPrice, maxPrice, page, limit, sort } = req.query;

      // 2. Filters object taiyar karna
      const filters = {
        categoryId,
        color,
        minPrice,
        maxPrice,
        sort // Frontend se aane wala sorting order yahan pass hoga
      };

      // 3. Pagination values set karna (default page 1, limit 12)
      const pageNumber = page ? parseInt(page) : 1;
      const limitNumber = limit ? parseInt(limit) : 12;

      // 4. Service ko call karna
      const result = await galleryService.getDisplayItems(filters, pageNumber, limitNumber);

      // 5. Success Response
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
}

module.exports = new GalleryController();



// const galleryService = require('../services/galleryService');

// class GalleryController {
  
//   async getGallery(req, res) {
//     try {
//       // 1. URL se Query Params nikalna
//       const { categoryId, color, minPrice, maxPrice, page, limit } = req.query;

//       // 2. Filters object taiyar karna 
//       const filters = {
//         categoryId,
//         color,
//         minPrice,
//         maxPrice
//       };

//       // 3. Pagination values set karna (default page 1, limit 12)
//       const pageNumber = page ? parseInt(page) : 1;
//       const limitNumber = limit ? parseInt(limit) : 12;

//       // 4. Service ko call karna
//       const result = await galleryService.getDisplayItems(filters, pageNumber, limitNumber);

//       // 5. Success Response
//       res.status(200).json({
//         success: true,
//         data: result.items,
//         pagination: result.pagination
//       });

//     } catch (error) {
//       console.error("Gallery Fetch Error:", error);
//       res.status(500).json({ 
//         success: false, 
//         message: "Failed to fetch gallery items",
//         error: error.message 
//       });
//     }
//   }
// }

// module.exports = new GalleryController();

