const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const checkoutController = {

  // STEP 1: SAVE SHIPPING ADDRESS
  saveShippingAddress: async (req, res) => {
    try {
      const userId = req.user.user_id; // Token se user ID
      const { 
        fullName, phone, email, 
        addressLine1, addressLine2, city, province, postalCode, country 
      } = req.body;

      // 1. Validation
      if (!fullName || !phone || !addressLine1 || !city) {
        return res.status(400).json({ 
          success: false, 
          message: "Please fill all required fields (Name, Phone, Address, City)" 
        });
      }

      // 2. Draft Order Dhoondo
      const order = await prisma.order.findFirst({
        where: {
          user_id: userId,
          operationalStatus: 'checkout_draft'
        }
      });

      if (!order) {
        return res.status(404).json({ success: false, message: "No active cart found" });
      }

      // 3. Address aur Contact Info Save Karo (Order Table Mein Snapshot)
      // Note: Hum alag se Address table mein bhi save kar sakte hain, 
      // lekin Figma ke mutabiq order ke sath snapshot hona zaroori hai.
      
      const shippingData = {
        addressLine1,
        addressLine2,
        city,
        province,
        postalCode,
        country: country || 'Pakistan'
      };

      const contactData = {
        fullName,
        phone,
        email
      };

      // 4. Update Order
      const updatedOrder = await prisma.order.update({
        where: { id: order.id },
        data: {
          shippingAddressData: shippingData, // JSON field update
          contactDetails: contactData,       // JSON field update
          // User Address Book mein bhi entry daal dete hain (Future use ke liye)
          // Lekin abhi focus sirf Order update par hai
        }
      });

      res.status(200).json({
        success: true,
        message: "Shipping details saved",
        orderId: updatedOrder.id
      });

    } catch (error) {
      console.error("Save Address Error:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  },


  // --- STEP 2: SEND OTP (Figma Screen 2) ---
  sendOTP: async (req, res) => {
    try {
      const userId = req.user.user_id;
      
      // Active Order dhoondo taake phone number mil sake
      const order = await prisma.order.findFirst({
        where: { user_id: userId, operationalStatus: 'checkout_draft' }
      });

      if (!order || !order.contactDetails) {
        return res.status(404).json({ success: false, message: "No active order or contact details found" });
      }

      // 4-Digit Random Code Generate karo
      const otpCode = Math.floor(1000 + Math.random() * 9000).toString();
      const phone = order.contactDetails.phone;

      // DB mein save karo (VerificationCode Table)
      await prisma.verificationCode.create({
        data: {
          identifier: phone,
          code: otpCode,
          type: 'mobile_otp',
          expires_at: new Date(Date.now() + 10 * 60000) // 10 minutes expiry
        }
      });

      // TODO: Real SMS API yahan call hogi (Twilio/Local SMS)
      console.log(`🔔 [SMS SIMULATION] Sending OTP ${otpCode} to ${phone}`);

      res.status(200).json({ success: true, message: "OTP sent to your mobile" });

    } catch (error) {
      console.error("Send OTP Error:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  
  // --- STEP 3: VERIFY OTP & AUTO-REGISTER USER ---
  verifyOTP: async (req, res) => {
    try {
      // Identify User or Guest
      const userId = req.user ? req.user.user_id : null;
      const guestId = req.user ? null : req.guestId;

      const { code } = req.body;

      // 1. Find Order (Guest ka ya User ka)
      const order = await prisma.order.findFirst({
        where: {
          OR: [
            { user_id: userId ? userId : undefined },
            { guestId: guestId ? guestId : undefined }
          ],
          operationalStatus: 'checkout_draft'
        }
      });

      if (!order) return res.status(404).json({ success: false, message: "Order not found" });

      const phone = order.contactDetails.phone;

      // 2. Verify Code
      const validCode = await prisma.verificationCode.findFirst({
        where: { identifier: phone, code: code, is_used: false }
      });

      if (!validCode) {
        return res.status(400).json({ success: false, message: "Invalid OTP" });
      }

      // Code Used Mark karo
      await prisma.verificationCode.update({ where: { code_id: validCode.code_id }, data: { is_used: true } });

      // ============================================================
      // 🚀 THE MAGIC: GUEST CONVERSION TO REGISTERED USER
      // ============================================================
      
      let finalUserId = order.user_id; // Agar pehle se login tha to wahi rahega

      if (!finalUserId) {
        // Agar Guest tha (user_id null tha), to check karo user exist karta hai?
        let user = await prisma.user.findFirst({
          where: { 
            OR: [
              { mobile_number: phone },
              { email: order.contactDetails.email }
            ]
          }
        });

        if (!user) {
          // SCENARIO A: Brand New User -> Create Account
          console.log("🆕 Creating new account for Guest...");
          
          // Name split logic (First/Last)
          const fullNameParts = order.contactDetails.fullName.split(' ');
          const firstName = fullNameParts[0];
          const lastName = fullNameParts.slice(1).join(' ') || '';

          user = await prisma.user.create({
            data: {
              first_name: firstName,
              last_name: lastName,
              email: order.contactDetails.email,
              mobile_number: phone,
              is_mobile_verified: true, // OTP abhi verify hua hai!
              role: 'Registered',
              password_hash: null // Password user baad mein set karega
            }
          });
        } else {
          // SCENARIO B: User pehle se tha lekin Guest ban kar aaya -> Link kar do
          console.log("🔗 Linking Guest Order to existing User...");
        }

        finalUserId = user.user_id;

        // Order ko Naye User ke sath Link kardo (Guest ID hata do)
        await prisma.order.update({
          where: { id: order.id },
          data: { 
            user_id: finalUserId,
            guestId: null, // Guest ID ab khatam, ab ye pakka user hai
            isContactVerified: true
          }
        });
      } else {
        // Agar pehle se logged in tha, bas verified mark kardo
        await prisma.order.update({
          where: { id: order.id },
          data: { isContactVerified: true }
        });
      }
      // ============================================================

      res.status(200).json({ 
        success: true, 
        message: "Phone verified & Account Linked!",
        userId: finalUserId // Frontend ko batao ke user ID kya hai (taake wo login state update kare)
      });

    } catch (error) {
      console.error("Verify OTP Error:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // --- STEP 4: PLACE FINAL ORDER (Figma Screen 3 - The Big One) ---
  placeOrder: async (req, res) => {
    try {
      const userId = req.user.user_id;
      const { paymentMethod } = req.body; // e.g., "COD"

      // 1. Order aur Items nikalo
      const order = await prisma.order.findFirst({
        where: { user_id: userId, operationalStatus: 'checkout_draft' },
        include: { items: true }
      });

      if (!order) return res.status(404).json({ success: false, message: "Cart not found" });

      // RULE: OTP Verification Zaroori Hai
      if (!order.isContactVerified) {
        return res.status(403).json({ success: false, message: "Please verify your phone number first." });
      }

      // RULE: Generate Readable ID (e.g., JT-20260224-0042)
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, ''); // 20260224
      const randomSuffix = Math.floor(1000 + Math.random() * 9000); // 4 digit random
      const readableId = `JT-${dateStr}-${randomSuffix}`;

      // --- ATOMIC TRANSACTION START (Sab kuch ek saath hoga) ---
      // Agar inventory minus nahi hui, toh order place nahi hoga.
      await prisma.$transaction(async (tx) => {
        
        // A. Inventory Lock (Stock Minus Karo) - "Read Must" Rule
        for (const item of order.items) {
          if (item.inventoryItemId) {
            await tx.inventoryItem.update({
              where: { id: item.inventoryItemId },
              data: { 
                stockQuantity: { decrement: item.quantity } // Stock kam karo
              }
            });
          }
        }

        // B. Finalize Order Status
        await tx.order.update({
          where: { id: order.id },
          data: {
            readableId: readableId,
            operationalStatus: 'pending_payment', // Draft se hat kar asal Order ban gaya
            paymentMethod: paymentMethod || 'COD',
            paymentStatus: 'unpaid',
            placedAt: new Date()
          }
        });

        // C. Create Timeline Event (Audit Trail)
        await tx.orderTimeline.create({
          data: {
            orderId: order.id,
            statusFrom: 'checkout_draft',
            statusTo: 'pending_payment',
            description: `Order Placed successfully via ${paymentMethod || 'COD'}`,
            actorName: 'User'
          }
        });

      }); 
      // --- TRANSACTION END ---

      // Success Response (Figma Screen 6 walo ke liye)
      res.status(200).json({
        success: true,
        message: "Order Placed Successfully! 🎉",
        orderId: readableId,
        nextStep: "Show Thank You Screen"
      });

    } catch (error) {
      console.error("Place Order Error:", error);
      // Prisma P2025 error tab aata hai agar stock minus karte waqt item na mile
      // Ya agar stock negative hone lage (Check Constraint)
      res.status(500).json({ success: false, error: "Order Failed: " + error.message });
    }
  }

};

module.exports = checkoutController;