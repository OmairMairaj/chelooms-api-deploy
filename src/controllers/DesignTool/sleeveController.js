const sleeveService = require('../../services/DesignTool/sleeveService');
// 👇 Apna Cloudinary helper yahan import zaroor karna
// const { uploadToCloudinary } = require('../../utils/cloudinary'); 

class SleeveController {

  // ==========================================
  // 📁 CATEGORY APIs (Parent)
  // ==========================================

  // 1. Create Category (With Cloudinary)
  async createCategory(req, res) {
    try {
      const payload = { ...req.body };
      let categoryImageUrl = [];

      // Handle File Upload (Multer)
      if (req.files && req.files.categoryImage && req.files.categoryImage.length > 0) {
        // const uploadRes = await uploadToCloudinary(req.files.categoryImage[0].path);
        // categoryImageUrl.push(uploadRes.secure_url);
        
        // ⚠️ (POC ke liye jab tak Cloudinary live nahi, main dummy path daal raha hun. 
        // Jab Cloudinary chalana ho, toh upar wali 2 lines uncomment kar dena)
        categoryImageUrl.push(req.files.categoryImage[0].path);
      }

      const finalData = {
        ...payload,
        image: categoryImageUrl.length > 0 ? categoryImageUrl : []
      };

      const newCategory = await sleeveService.createCategory(finalData);
      res.status(201).json({ success: true, message: "Category Created!", data: newCategory });

    } catch (error) {
      console.error("Create Category Error:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // 2. Get All Categories (For Admin Dropdown)
  async getAllCategories(req, res) {
    try {
      const categories = await sleeveService.getAllCategories();
      res.status(200).json({ success: true, data: categories });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // ==========================================
  // 👕 OPTION APIs (Child)
  // ==========================================

  // 3. Create Option (With Cloudinary & FormData Parsing)
  async createOption(req, res) {
    try {
      const payload = { ...req.body };

      // Strings ko wapis Array/JSON banate hain (Kyunki FormData se string aati hai)
      if (typeof payload.layers === 'string') payload.layers = JSON.parse(payload.layers);
      if (typeof payload.keywords === 'string') payload.keywords = JSON.parse(payload.keywords);
      if (typeof payload.tags === 'string') payload.tags = JSON.parse(payload.tags);
      
      // Booleans theek karna ('true' string -> actual true)
      payload.hasButtons = payload.hasButtons === 'true';
      payload.premium = payload.premium === 'true';

      let optionImagesUrl = [];

      // Handle Option Image Upload (Multer)
      if (req.files && req.files.images && req.files.images.length > 0) {
        // const uploadRes = await uploadToCloudinary(req.files.images[0].path);
        // optionImagesUrl.push(uploadRes.secure_url);
        
        // ⚠️ Dummy path for testing
        optionImagesUrl.push(req.files.images[0].path);
      }

      const finalData = {
        ...payload,
        images: optionImagesUrl.length > 0 ? optionImagesUrl : []
      };

      const newOption = await sleeveService.createOption(finalData);
      res.status(201).json({ success: true, message: "Option Created!", data: newOption });

    } catch (error) {
      console.error("Create Option Error:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // ==========================================
  // 🪄 THE MAGIC API (For Frontend List)
  // ==========================================

  // 4. Get All Sleeves (Grouped Parent-Child format)
  async getAllSleevesGrouped(req, res) {
    try {
      const groupedSleeves = await sleeveService.getAllSleevesGrouped();
      res.status(200).json({ success: true, data: groupedSleeves });
    } catch (error) {
      console.error("Get Grouped Sleeves Error:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async updateCategory(req, res) {
    try {
      const { id } = req.params;
      const payload = { ...req.body };
      
      // Agar nayi image aayi hai toh path add karo
      if (req.files && req.files.categoryImage && req.files.categoryImage.length > 0) {
        payload.image = [req.files.categoryImage[0].path]; 
      }

      // Call Service Layer (Make sure updateCategory service mein exist karta ho)
      // Note: Agar service mein updateCategory nahi banaya toh simple prisma.sleeveCategory.update laga lena service file mein.
      const updatedCategory = await sleeveService.updateCategory(id, payload);

      res.status(200).json({ success: true, message: "Category Updated Successfully!", data: updatedCategory });
    } catch (error) {
      console.error("Update Category Error:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // ==========================================
  // 👕 UPDATE OPTION
  // ==========================================
  async updateOption(req, res) {
    try {
      const { id } = req.params;
      const payload = { ...req.body };

      // 1. FormData ki strings ko wapis Arrays/Booleans mein convert karna
      if (typeof payload.layers === 'string') payload.layers = JSON.parse(payload.layers);
      if (typeof payload.keywords === 'string') payload.keywords = JSON.parse(payload.keywords);
      if (typeof payload.tags === 'string') payload.tags = JSON.parse(payload.tags);
      
      if (payload.hasButtons !== undefined) payload.hasButtons = payload.hasButtons === 'true';
      if (payload.premium !== undefined) payload.premium = payload.premium === 'true';

      // 2. Agar naya Option Thumbnail (Image) upload hua hai
      if (req.files && req.files.images && req.files.images.length > 0) {
        payload.images = [req.files.images[0].path]; 
      }

      // 3. Call the Service Layer (Jo code aapne bheja hai, wo ab yahan call hoga)
      const updatedOption = await sleeveService.updateOption(id, payload);

      res.status(200).json({ 
        success: true, 
        message: "Option Updated Successfully!", 
        data: updatedOption 
      });

    } catch (error) {
      console.error("Update Option Error:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  }


  
}

module.exports = new SleeveController();