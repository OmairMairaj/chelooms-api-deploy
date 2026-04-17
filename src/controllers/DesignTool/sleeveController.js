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
  // async createOption(req, res) {
  //   try {
  //     const payload = { ...req.body };

  //     // Strings ko wapis Array/JSON banate hain (Kyunki FormData se string aati hai)
  //     if (typeof payload.layers === 'string') payload.layers = JSON.parse(payload.layers);
  //     if (typeof payload.keywords === 'string') payload.keywords = JSON.parse(payload.keywords);
  //     if (typeof payload.tags === 'string') payload.tags = JSON.parse(payload.tags);
      
  //     // Booleans theek karna ('true' string -> actual true)
  //     payload.hasButtons = payload.hasButtons === 'true';
  //     payload.premium = payload.premium === 'true';

  //     let optionImagesUrl = [];

  //     // Handle Option Image Upload (Multer)
  //     if (req.files && req.files.images && req.files.images.length > 0) {
  //       // const uploadRes = await uploadToCloudinary(req.files.images[0].path);
  //       // optionImagesUrl.push(uploadRes.secure_url);
        
  //       // ⚠️ Dummy path for testing
  //       optionImagesUrl.push(req.files.images[0].path);
  //     }

  //     const finalData = {
  //       ...payload,
  //       images: optionImagesUrl.length > 0 ? optionImagesUrl : []
  //     };

  //     const newOption = await sleeveService.createOption(finalData);
  //     res.status(201).json({ success: true, message: "Option Created!", data: newOption });

  //   } catch (error) {
  //     console.error("Create Option Error:", error);
  //     res.status(500).json({ success: false, error: error.message });
  //   }
  // }

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
  // REORDER CATEGORIES
  // ==========================================
  async reorderCategories(req, res) {
    try {
      const { orderedIds } = req.body;
      if (!orderedIds || !Array.isArray(orderedIds)) {
        return res.status(400).json({ success: false, message: "Invalid orderedIds array." });
      }
      await sleeveService.reorderCategories(orderedIds);
      res.status(200).json({ success: true, message: "Categories reordered successfully!" });
    } catch (error) {
      console.error("Reorder Sleeve Categories Error:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // ==========================================
  // REORDER OPTIONS
  // ==========================================
  async reorderOptions(req, res) {
    try {
      const { orderedIds } = req.body;
      if (!orderedIds || !Array.isArray(orderedIds)) {
        return res.status(400).json({ success: false, message: "Invalid orderedIds array." });
      }
      await sleeveService.reorderOptions(orderedIds);
      res.status(200).json({ success: true, message: "Options reordered successfully!" });
    } catch (error) {
      console.error("Reorder Sleeve Options Error:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // ==========================================
  // 👕 UPDATE OPTION
  // ==========================================
  // async updateOption(req, res) {
  //   try {
  //     const { id } = req.params;
  //     const payload = { ...req.body };

  //     // 1. FormData ki strings ko wapis Arrays/Booleans mein convert karna
  //     if (typeof payload.layers === 'string') payload.layers = JSON.parse(payload.layers);
  //     if (typeof payload.keywords === 'string') payload.keywords = JSON.parse(payload.keywords);
  //     if (typeof payload.tags === 'string') payload.tags = JSON.parse(payload.tags);
      
  //     if (payload.hasButtons !== undefined) payload.hasButtons = payload.hasButtons === 'true';
  //     if (payload.premium !== undefined) payload.premium = payload.premium === 'true';

  //     // 2. Agar naya Option Thumbnail (Image) upload hua hai
  //     if (req.files && req.files.images && req.files.images.length > 0) {
  //       payload.images = [req.files.images[0].path]; 
  //     }

  //     // 3. Call the Service Layer (Jo code aapne bheja hai, wo ab yahan call hoga)
  //     const updatedOption = await sleeveService.updateOption(id, payload);

  //     res.status(200).json({ 
  //       success: true, 
  //       message: "Option Updated Successfully!", 
  //       data: updatedOption 
  //     });

  //   } catch (error) {
  //     console.error("Update Option Error:", error);
  //     res.status(500).json({ success: false, error: error.message });
  //   }
  // }

  async createOption(req, res) {
    console.log("👉 [CREATE SLEEVE] Step 1: Request hit the controller!");
    
    try {
      console.log("👉 [CREATE SLEEVE] Step 2: Files received:", req.files ? Object.keys(req.files) : "No files");
      
      const payload = { ...req.body };

      // 1. Strings ko wapis Array/JSON banate hain
      if (typeof payload.layers === 'string') payload.layers = JSON.parse(payload.layers);
      if (typeof payload.keywords === 'string') payload.keywords = JSON.parse(payload.keywords);
      if (typeof payload.tags === 'string') payload.tags = JSON.parse(payload.tags);
      console.log("👉 [CREATE SLEEVE] Step 3: JSON Parsing successful.");
      
      // 2. Booleans theek karna (Sleeves specific toggles)
      payload.hasButtons = payload.hasButtons === 'true';
      payload.premium = payload.premium === 'true';

      // 3. Handle Main Option Images (Thumbnail)
      let optionImagesUrl = [];
      if (req.files && req.files.images && req.files.images.length > 0) {
        optionImagesUrl = req.files.images.map(file => file.path); 
        console.log("👉 [CREATE SLEEVE] Step 4: Main images mapped.");
      }

      // 4. 🚀 Handle Layer SVGs/Images & Booleans
      // Admin sends layers as a JSON.stringify'd array, so booleans usually
      // round-trip cleanly. We still coerce defensively in case a non-admin
      // caller (Postman, scripts) sends string "true"/"false" per layer —
      // this matches the necklineController behaviour.
      if (Array.isArray(payload.layers)) {
        payload.layers = payload.layers.map((layer, index) => {
          // A. Coerce every per-layer flag to a real boolean
          ['isCutout', 'isInterior', 'isButton', 'isButtonThread', 'isShadow'].forEach((flag) => {
            if (layer[flag] !== undefined) {
              layer[flag] = layer[flag] === true || layer[flag] === 'false';
            }
          });

          // B. Map uploaded SVG/PNG file to this layer's svgUrl (if present).
          // Admin sends placeholder.svg for layers with no new upload (to keep array
          // indices aligned) — ignore those so existing svgUrl is preserved.
          const uploadedFile = req.files && req.files.layerFiles && req.files.layerFiles[index];
          if (uploadedFile && uploadedFile.originalname !== 'placeholder.svg') {
            layer.svgUrl = uploadedFile.path;
          }
          return layer;
        });
        console.log("👉 [CREATE SLEEVE] Step 5: Layer flags + SVG files mapped.");
      }

      // 5. Finalize data and pass to service
      const finalData = { ...payload, images: optionImagesUrl };
      
      console.log("👉 [CREATE SLEEVE] Step 6: Sending data to Service layer...");
      const newOption = await sleeveService.createOption(finalData);
      
      console.log("✅ [CREATE SLEEVE] Step 7: Success! Sleeve Option Created.");
      res.status(201).json({ success: true, message: "Sleeve Option Created!", data: newOption });

    } catch (error) {
      console.error("❌ CRITICAL ERROR IN SLEEVE CREATE CONTROLLER:");
      console.error(error.stack);
      res.status(500).json({ success: false, error: error.message, stack: error.stack });
    }
  }

  async updateOption(req, res) {
    console.log(`👉 [UPDATE SLEEVE] Step 1: Request hit for ID: ${req.params.id}`);

    try {
      const { id } = req.params;
      console.log("👉 [UPDATE SLEEVE] Step 2: Files received:", req.files ? Object.keys(req.files) : "No files");
      
      const payload = { ...req.body };

      // 1. Strings ko wapis Array/JSON banate hain
      if (typeof payload.layers === 'string') payload.layers = JSON.parse(payload.layers);
      if (typeof payload.keywords === 'string') payload.keywords = JSON.parse(payload.keywords);
      if (typeof payload.tags === 'string') payload.tags = JSON.parse(payload.tags);
      console.log("👉 [UPDATE SLEEVE] Step 3: JSON Parsing successful.");
      
      // 2. Booleans theek karna
      if (payload.hasButtons !== undefined) payload.hasButtons = payload.hasButtons === 'true';
      if (payload.premium !== undefined) payload.premium = payload.premium === 'true';

      // 3. Handle Main Option Images (Thumbnail)
      if (req.files && req.files.images && req.files.images.length > 0) {
        payload.images = [req.files.images[0].path]; 
        console.log("👉 [UPDATE SLEEVE] Step 4: New Main Image mapped.");
      }

      // 4. 🚀 Handle Layer SVGs/Images & Booleans for Update
      if (Array.isArray(payload.layers)) {
        payload.layers = payload.layers.map((layer, index) => {
          // A. Coerce per-layer flags (defensive — admin already sends booleans)
          ['isCutout', 'isInterior', 'isButton', 'isButtonThread', 'isShadow'].forEach((flag) => {
            if (layer[flag] !== undefined) {
              layer[flag] = layer[flag] === true || layer[flag] === 'true';
            }
          });

          // B. Map uploaded SVG file — skip admin placeholder.svg to preserve existing svgUrl
          const uploadedFile = req.files && req.files.layerFiles && req.files.layerFiles[index];
          if (uploadedFile && uploadedFile.originalname !== 'placeholder.svg') {
            layer.svgUrl = uploadedFile.path;
          }
          return layer;
        });
        console.log("👉 [UPDATE SLEEVE] Step 5: Layer flags + new SVGs mapped.");
      }

      // 5. Pass to Service Layer
      console.log("👉 [UPDATE SLEEVE] Step 6: Sending data to Service layer...");
      const updatedOption = await sleeveService.updateOption(id, payload);
      
      console.log("✅ [UPDATE SLEEVE] Step 7: Success! Sleeve Option Updated.");
      res.status(200).json({ success: true, message: "Sleeve Option Updated Successfully!", data: updatedOption });
      
    } catch (error) {
      console.error("❌ CRITICAL ERROR IN SLEEVE UPDATE CONTROLLER:");
      console.error(error.stack);
      res.status(500).json({ success: false, error: error.message, stack: error.stack });
    }
  }


  
}

module.exports = new SleeveController();