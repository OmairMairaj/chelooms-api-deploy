const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const sizingController = {

  // 1. ADMIN: Create Standard Size (e.g., S, M, L)
  createStandardSize: async (req, res) => {
    try {
      const { sizeCode, label, recommendations, measurements, displayOrder } = req.body;

      // Validation
      if (!sizeCode || !label || !measurements) {
        return res.status(400).json({ 
          success: false, 
          message: "sizeCode, label, and measurements are required" 
        });
      }

      // Check if size already exists
      const existingSize = await prisma.standardSize.findUnique({
        where: { sizeCode }
      });

      if (existingSize) {
        return res.status(400).json({ success: false, message: "Size code already exists" });
      }

      const newSize = await prisma.standardSize.create({
        data: {
          sizeCode,
          label,
          recommendations: recommendations || {}, // Optional body guidelines
          measurements,                           // Exact sizing
          displayOrder: displayOrder || 0         // 1 for S, 2 for M etc.
        }
      });

      res.status(201).json({ success: true, message: "Standard size created", data: newSize });
    } catch (error) {
      console.error("Create Standard Size Error:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // 3. ADMIN: Get All Standard Sizes (Active + Inactive dono aayenge)
  getAdminStandardSizes: async (req, res) => {
    try {
      const sizes = await prisma.standardSize.findMany({
        orderBy: { displayOrder: 'asc' } // S, M, L tarteeb mein
      });

      res.status(200).json({ 
        success: true, 
        message: "All standard sizes fetched for Admin",
        data: sizes 
      });
    } catch (error) {
      console.error("Get Admin Sizes Error:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // 4. ADMIN: Update Standard Size Details (e.g. Chest 38 to 39)
  updateStandardSize: async (req, res) => {
    try {
      const { id } = req.params;
      const { label, recommendations, measurements, displayOrder } = req.body;
      
      // Note: Hum sizeCode (jaise 'M') ko update karne ki ijazat nahi de rahe taake purana data kharab na ho.
      // Sirf measurements aur label update honge.

      const sizeId = parseInt(id, 10);
      if (isNaN(sizeId)) return res.status(400).json({ success: false, message: "Invalid ID format" });

      const existingSize = await prisma.standardSize.findUnique({ where: { id: sizeId } });
      if (!existingSize) return res.status(404).json({ success: false, message: "Standard Size not found" });

      const updatedSize = await prisma.standardSize.update({
        where: { id: sizeId },
        data: {
          label: label !== undefined ? label : existingSize.label,
          recommendations: recommendations !== undefined ? recommendations : existingSize.recommendations,
          measurements: measurements !== undefined ? measurements : existingSize.measurements,
          displayOrder: displayOrder !== undefined ? displayOrder : existingSize.displayOrder
        }
      });

      res.status(200).json({ 
        success: true, 
        message: "Standard size updated successfully", 
        data: updatedSize 
      });
    } catch (error) {
      console.error("Update Standard Size Error:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // 5. ADMIN: Toggle Standard Size Status (Hide / Unhide)
  toggleStandardSizeStatus: async (req, res) => {
    try {
      const { id } = req.params;
      const sizeId = parseInt(id, 10);

      const existingSize = await prisma.standardSize.findUnique({ where: { id: sizeId } });
      if (!existingSize) return res.status(404).json({ success: false, message: "Standard Size not found" });

      const updatedSize = await prisma.standardSize.update({
        where: { id: sizeId },
        data: { isActive: !existingSize.isActive } // True ko False, False ko True karega
      });

      res.status(200).json({ 
        success: true, 
        message: `Standard size is now ${updatedSize.isActive ? 'Active' : 'Inactive (Hidden)'}`, 
        data: updatedSize 
      });
    } catch (error) {
      console.error("Toggle Standard Size Error:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // 2. PUBLIC: Get All Standard Sizes (Dropdown ke liye)
  getAllStandardSizes: async (req, res) => {
    try {
      const sizes = await prisma.standardSize.findMany({
        where: { isActive: true },
        orderBy: { displayOrder: 'asc' } // S, phir M, phir L (order ke mutabiq)
      });

      res.status(200).json({ success: true, data: sizes });
    } catch (error) {
      console.error("Get Standard Sizes Error:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // ==========================================
  //  USER SIZING PROFILES
  // ==========================================

  // 3. USER: Create a Sizing Profile
  createUserProfile: async (req, res) => {
    try {
      const userId = req.user.user_id; // Auth middleware se aayega
      const { profileNickname, method, standardSizeId, customMeasurements, isDefault } = req.body;

      // Validation
      if (!profileNickname || !method) {
        return res.status(400).json({ success: false, message: "Profile Nickname and Method are required" });
      }

      if (method === 'Standard_Preset' && !standardSizeId) {
        return res.status(400).json({ success: false, message: "Standard Size ID is required for preset method" });
      }

      if (method === 'Jute_Fit_Custom' && !customMeasurements) {
        return res.status(400).json({ success: false, message: "Custom Measurements are required for Jute Fit" });
      }

      // Agar user isko Default banana chahta hai, to baaki sabko non-default kardo
      if (isDefault) {
        await prisma.userSizingProfile.updateMany({
          where: { userId: userId },
          data: { isDefault: false }
        });
      }

      // Profile Create karo
      const newProfile = await prisma.userSizingProfile.create({
        data: {
          userId,
          profileNickname,
          method,
          standardSizeId: method === 'Standard_Preset' ? standardSizeId : null,
          customMeasurements: method === 'Jute_Fit_Custom' ? customMeasurements : null,
          isDefault: isDefault || false
        }
      });

      res.status(201).json({ success: true, message: "Profile saved successfully", data: newProfile });

    } catch (error) {
      console.error("Create Sizing Profile Error:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // 4. USER: Get all my Sizing Profiles
  getUserProfiles: async (req, res) => {
    try {
      const userId = req.user.user_id;

      const profiles = await prisma.userSizingProfile.findMany({
        where: { userId },
        include: {
          standardSize: true // Agar standard size hai to uski detail bhi le aao
        },
        orderBy: { createdAt: 'desc' }
      });

      res.status(200).json({ success: true, count: profiles.length, data: profiles });

    } catch (error) {
      console.error("Get Sizing Profiles Error:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

};

module.exports = sizingController;