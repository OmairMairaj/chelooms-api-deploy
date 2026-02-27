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