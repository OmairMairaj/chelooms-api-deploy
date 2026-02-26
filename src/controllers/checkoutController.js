const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const jwt = require('jsonwebtoken');

const checkoutController = {

  // STEP 1: SAVE SHIPPING ADDRESS
  saveShippingAddress: async (req, res) => {
    try {
      // 👇 FIX: User ya Guest Identify karo
      const userId = req.user ? req.user.user_id : null;
      const guestId = req.user ? null : req.guestId; 

      const { 
        fullName, phone, email, 
        addressLine1, addressLine2, city, province, postalCode, country 
      } = req.body;

      if (!fullName || !phone || !addressLine1 || !city) {
        return res.status(400).json({ success: false, message: "Please fill all required fields" });
      }

      // 👇 FIX: Order dhoondne ka logic (User OR Guest)
      const order = await prisma.order.findFirst({
        where: {
          OR: [
            { user_id: userId ? userId : undefined },
            { guestId: guestId ? guestId : undefined }
          ],
          operationalStatus: 'checkout_draft'
        }
      });

      if (!order) {
        return res.status(404).json({ success: false, message: "No active cart found" });
      }

      // Data Prep
      const shippingData = {
        addressLine1, addressLine2, city, province, postalCode, country: country || 'Pakistan'
      };

      const contactData = {
        fullName, phone, email
      };

      // Update Order
      const updatedOrder = await prisma.order.update({
        where: { id: order.id },
        data: {
          shippingAddressData: shippingData,
          contactDetails: contactData,
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

  // --- STEP 2: SEND OTP (Updated for Guest) ---
  sendOTP: async (req, res) => {
    try {
      // 👇 FIX: User ya Guest Identify karo
      const userId = req.user ? req.user.user_id : null;
      const guestId = req.user ? null : req.guestId;
      
      const order = await prisma.order.findFirst({
        where: { 
           OR: [
            { user_id: userId ? userId : undefined },
            { guestId: guestId ? guestId : undefined }
          ],
          operationalStatus: 'checkout_draft' 
        }
      });

      if (!order || !order.contactDetails) {
        return res.status(404).json({ success: false, message: "No active order or contact details found" });
      }

      const otpCode = Math.floor(1000 + Math.random() * 9000).toString();
      const phone = order.contactDetails.phone;

      // OTP Save
      await prisma.verificationCode.create({
        data: {
          identifier: phone,
          code: otpCode,
          type: 'mobile_otp',
          expires_at: new Date(Date.now() + 10 * 60000)
        }
      });

      console.log(`🔔 [SMS SIMULATION] Sending OTP ${otpCode} to ${phone}`);

      res.status(200).json({ success: true, message: "OTP sent to your mobile" });

    } catch (error) {
      console.error("Send OTP Error:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  
  // --- STEP 3: VERIFY OTP & AUTO-REGISTER USER ---
  // verifyOTP: async (req, res) => {
  //   try {
  //     // Identify User or Guest
  //     const userId = req.user ? req.user.user_id : null;
  //     const guestId = req.user ? null : req.guestId;

  //     const { code } = req.body;

  //     // 1. Find Order (Guest ka ya User ka)
  //     const order = await prisma.order.findFirst({
  //       where: {
  //         OR: [
  //           { user_id: userId ? userId : undefined },
  //           { guestId: guestId ? guestId : undefined }
  //         ],
  //         operationalStatus: 'checkout_draft'
  //       }
  //     });

  //     if (!order) return res.status(404).json({ success: false, message: "Order not found" });

  //     const phone = order.contactDetails.phone;

  //     // 2. Verify Code
  //     const validCode = await prisma.verificationCode.findFirst({
  //       where: { identifier: phone, code: code, is_used: false }
  //     });

  //     if (!validCode) {
  //       return res.status(400).json({ success: false, message: "Invalid OTP" });
  //     }

  //     // Code Used Mark karo
  //     await prisma.verificationCode.update({ where: { code_id: validCode.code_id }, data: { is_used: true } });

  //     // ============================================================
  //     // 🚀 THE MAGIC: GUEST CONVERSION TO REGISTERED USER
  //     // ============================================================
      
  //     let finalUserId = order.user_id; // Agar pehle se login tha to wahi rahega

  //     if (!finalUserId) {
  //       // Agar Guest tha (user_id null tha), to check karo user exist karta hai?
  //       let user = await prisma.user.findFirst({
  //         where: { 
  //           OR: [
  //             { mobile_number: phone },
  //             { email: order.contactDetails.email }
  //           ]
  //         }
  //       });

  //       if (!user) {
  //         // SCENARIO A: Brand New User -> Create Account
  //         console.log("🆕 Creating new account for Guest...");
          
  //         // Name split logic (First/Last)
  //         const fullNameParts = order.contactDetails.fullName.split(' ');
  //         const firstName = fullNameParts[0];
  //         const lastName = fullNameParts.slice(1).join(' ') || '';

  //         user = await prisma.user.create({
  //           data: {
  //             first_name: firstName,
  //             last_name: lastName,
  //             email: order.contactDetails.email,
  //             mobile_number: phone,
  //             is_mobile_verified: true, // OTP abhi verify hua hai!
  //             role: 'Registered',
  //             password_hash: null // Password user baad mein set karega
  //           }
  //         });
  //       } else {
  //         // SCENARIO B: User pehle se tha lekin Guest ban kar aaya -> Link kar do
  //         console.log("🔗 Linking Guest Order to existing User...");
  //       }

  //       finalUserId = user.user_id;

  //       // Order ko Naye User ke sath Link kardo (Guest ID hata do)
  //       await prisma.order.update({
  //         where: { id: order.id },
  //         data: { 
  //           user_id: finalUserId,
  //           guestId: null, // Guest ID ab khatam, ab ye pakka user hai
  //           isContactVerified: true
  //         }
  //       });
  //     } else {
  //       // Agar pehle se logged in tha, bas verified mark kardo
  //       await prisma.order.update({
  //         where: { id: order.id },
  //         data: { isContactVerified: true }
  //       });
  //     }
  //     // ============================================================

  //     res.status(200).json({ 
  //       success: true, 
  //       message: "Phone verified & Account Linked!",
  //       userId: finalUserId // Frontend ko batao ke user ID kya hai (taake wo login state update kare)
  //     });

  //   } catch (error) {
  //     console.error("Verify OTP Error:", error);
  //     res.status(500).json({ success: false, error: error.message });
  //   }
  // },

  // --- STEP 3: VERIFY OTP & AUTO-LOGIN (Updated with Token) ---
  verifyOTP: async (req, res) => {
    try {
      const userId = req.user ? req.user.user_id : null;
      const guestId = req.user ? null : req.guestId;
      const { code } = req.body;

      // 1. Order Dhoondo
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

      // 2. Code Verify
      const validCode = await prisma.verificationCode.findFirst({
        where: { identifier: order.contactDetails.phone, code: code, is_used: false }
      });

      if (!validCode) {
        return res.status(400).json({ success: false, message: "Invalid OTP" });
      }

      await prisma.verificationCode.update({ where: { code_id: validCode.code_id }, data: { is_used: true } });

      // 3. Guest Conversion Logic
      let finalUserId = order.user_id;

      if (!finalUserId) {
        let user = await prisma.user.findFirst({
          where: { 
            OR: [
              { mobile_number: order.contactDetails.phone },
              { email: order.contactDetails.email }
            ]
          }
        });

        if (!user) {
          // New User Create
          const fullNameParts = order.contactDetails.fullName.split(' ');
          user = await prisma.user.create({
            data: {
              first_name: fullNameParts[0],
              last_name: fullNameParts.slice(1).join(' ') || '',
              email: order.contactDetails.email,
              mobile_number: order.contactDetails.phone,
              is_mobile_verified: true,
              role: 'Registered'
            }
          });
        }
        
        finalUserId = user.user_id;

        // Link Order to User
        await prisma.order.update({
          where: { id: order.id },
          data: { user_id: finalUserId, guestId: null, isContactVerified: true }
        });
      } else {
        await prisma.order.update({
          where: { id: order.id },
          data: { isContactVerified: true }
        });
      }

      // ----------------------------------------------------
      // 🔥 NEW ADDITION: Generate JWT Token (Auto Login)
      // ----------------------------------------------------
      const token = jwt.sign(
        { user_id: finalUserId, role: 'Registered' },
        process.env.JWT_SECRET,
        { expiresIn: '30d' }
      );

      res.status(200).json({ 
        success: true, 
        message: "Phone verified & Account Linked!",
        token: token,  // 👈 Ye Token ab agle step mein kaam aayega
        user: {
          id: finalUserId,
          name: order.contactDetails.fullName
        }
      });

    } catch (error) {
      console.error("Verify OTP Error:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // --- STEP 4: PLACE FINAL ORDER (Figma Screen 3 - The Big One) ---
  // placeOrder: async (req, res) => {
  //   try {
  //     const userId = req.user.user_id;
  //     const { paymentMethod } = req.body; // e.g., "COD"

  //     // 1. Order aur Items nikalo
  //     const order = await prisma.order.findFirst({
  //       where: { user_id: userId, operationalStatus: 'checkout_draft' },
  //       include: { items: true }
  //     });

  //     if (!order) return res.status(404).json({ success: false, message: "Cart not found" });

  //     // RULE: OTP Verification Zaroori Hai
  //     if (!order.isContactVerified) {
  //       return res.status(403).json({ success: false, message: "Please verify your phone number first." });
  //     }

  //     // RULE: Generate Readable ID (e.g., JT-20260224-0042)
  //     const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, ''); // 20260224
  //     const randomSuffix = Math.floor(1000 + Math.random() * 9000); // 4 digit random
  //     const readableId = `JT-${dateStr}-${randomSuffix}`;

  //     // --- ATOMIC TRANSACTION START (Sab kuch ek saath hoga) ---
  //     // Agar inventory minus nahi hui, toh order place nahi hoga.
  //     await prisma.$transaction(async (tx) => {
        
  //       // A. Inventory Lock (Stock Minus Karo) - "Read Must" Rule
  //       for (const item of order.items) {
  //         if (item.inventoryItemId) {
  //           await tx.inventoryItem.update({
  //             where: { id: item.inventoryItemId },
  //             data: { 
  //               stockQuantity: { decrement: item.quantity } // Stock kam karo
  //             }
  //           });
  //         }
  //       }

  //       // B. Finalize Order Status
  //       await tx.order.update({
  //         where: { id: order.id },
  //         data: {
  //           readableId: readableId,
  //           operationalStatus: 'pending_payment', // Draft se hat kar asal Order ban gaya
  //           paymentMethod: paymentMethod || 'COD',
  //           paymentStatus: 'unpaid',
  //           placedAt: new Date()
  //         }
  //       });

  //       // C. Create Timeline Event (Audit Trail)
  //       await tx.orderTimeline.create({
  //         data: {
  //           orderId: order.id,
  //           statusFrom: 'checkout_draft',
  //           statusTo: 'pending_payment',
  //           description: `Order Placed successfully via ${paymentMethod || 'COD'}`,
  //           actorName: 'User'
  //         }
  //       });

  //     }); 
  //     // --- TRANSACTION END ---

  //     // Success Response (Figma Screen 6 walo ke liye)
  //     res.status(200).json({
  //       success: true,
  //       message: "Order Placed Successfully! 🎉",
  //       orderId: readableId,
  //       nextStep: "Show Thank You Screen"
  //     });

  //   } catch (error) {
  //     console.error("Place Order Error:", error);
  //     // Prisma P2025 error tab aata hai agar stock minus karte waqt item na mile
  //     // Ya agar stock negative hone lage (Check Constraint)
  //     res.status(500).json({ success: false, error: "Order Failed: " + error.message });
  //   }
  // }

  // --- STEP 4: PLACE FINAL ORDER (With Full Summary) ---
  placeOrder: async (req, res) => {
    try {
      const userId = req.user.user_id; // Token se aaya
      const { paymentMethod } = req.body; 

      // 1. Order aur Items nikalo
      const order = await prisma.order.findFirst({
        where: { user_id: userId, operationalStatus: 'checkout_draft' },
        include: { items: true }
      });

      if (!order) return res.status(404).json({ success: false, message: "Cart not found" });

      if (!order.isContactVerified) {
        return res.status(403).json({ success: false, message: "Please verify your phone number first." });
      }

      // Readable ID Generation
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const readableId = `JT-${dateStr}-${randomSuffix}`;

      // --- ATOMIC TRANSACTION (Stock Update + Status Change) ---
      await prisma.$transaction(async (tx) => {
        // A. Inventory Lock
        for (const item of order.items) {
          if (item.inventoryItemId) {
            await tx.inventoryItem.update({
              where: { id: item.inventoryItemId },
              data: { stockQuantity: { decrement: item.quantity } }
            });
          }
        }

        // B. Finalize Order
        await tx.order.update({
          where: { id: order.id },
          data: {
            readableId: readableId,
            operationalStatus: 'pending_payment',
            paymentMethod: paymentMethod || 'COD',
            paymentStatus: 'unpaid',
            placedAt: new Date()
          }
        });

        // C. Timeline
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

      // --- 🚀 NEW STEP: FETCH FULL ORDER SUMMARY (For Screenshot) ---
      // Transaction ke baad updated data uthao items aur images ke saath
      const fullOrder = await prisma.order.findUnique({
        where: { id: order.id },
        include: {
          items: {
            include: {
              inventoryItem: { // Image aur Original details ke liye
                select: { name: true, images: true, colorName: true }
              }
            }
          }
        }
      });

      // Response Structure (Screenshot ke mutabiq)
      const orderSummary = {
        orderId: fullOrder.readableId,
        date: fullOrder.placedAt,
        customerName: fullOrder.contactDetails?.fullName || "Valued Customer",
        email: fullOrder.contactDetails?.email,
        phone: fullOrder.contactDetails?.phone,
        
        // Shipping Section
        shippingAddress: fullOrder.shippingAddressData,
        
        // Payment Summary Section
        paymentMethod: fullOrder.paymentMethod, // e.g., "COD"
        financials: {
          subtotal: fullOrder.subtotal,
          shipping: fullOrder.shippingCost,
          tax: fullOrder.taxAmount,
          total: fullOrder.totalAmount
        },

        // Order Items Section
        items: fullOrder.items.map(item => ({
          name: item.nameAtPurchase,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalLinePrice,
          image: item.inventoryItem?.images?.thumbnail || null, // Image URL
          color: item.inventoryItem?.colorName || "Standard"
        }))
      };

      res.status(200).json({
        success: true,
        message: "Order Placed Successfully! 🎉",
        summary: orderSummary // 👈 Ye raha apka poora data
      });

    } catch (error) {
      console.error("Place Order Error:", error);
      res.status(500).json({ success: false, error: "Order Failed: " + error.message });
    }
  }

};

module.exports = checkoutController;