const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Helper: Cart ka Total calculate karne ke liye
const calculateOrderTotal = async (orderId) => {
  const items = await prisma.orderItem.findMany({ where: { orderId } });
  
  let subtotal = 0;
  items.forEach(item => {
    subtotal += item.totalLinePrice;
  });

  // Abhi ke liye Tax aur Shipping 0 rakhte hain, baad mein logic lagayenge
  const totalAmount = subtotal;

  await prisma.order.update({
    where: { id: orderId },
    data: { 
      subtotal: subtotal,
      totalAmount: totalAmount
    }
  });
};

const cartController = {

  // 1. ADD TO CART (Phase 4 - Smart Cart with Sizing only for Designs)
  addToCart: async (req, res) => {
    try {
      const userId = req.user ? req.user.user_id : null;
      const guestId = req.user ? null : req.guestId;

      let { 
        itemId,       // Ye InventoryItem ID bhi ho sakti hai aur Design ID bhi
        quantity, 
        itemType,     // 'fabric', 'embellishment', ya 'design_bundle'
        sizingMethod, // 'Standard_Preset' ya 'Jute_Fit_Custom' (Sirf designs ke liye)
        standardSizeId, 
        customMeasurements 
      } = req.body;

      // 1. Normalize Item Type
      if (itemType) {
        itemType = itemType.toLowerCase();
        if (itemType.includes('embellish')) itemType = 'embellishment';
      } else {
        itemType = 'fabric';
      }

      // 2. Find or Create Cart (Draft Order)
      let searchFilter = { operationalStatus: 'checkout_draft' };
      if (userId) searchFilter.user_id = userId;
      else if (guestId) searchFilter.guestId = guestId;

      let order = null;
      if (userId || guestId) {
        order = await prisma.order.findFirst({ where: searchFilter });
      }

      if (!order) {
        order = await prisma.order.create({
          data: {
            user_id: userId,   
            guestId: guestId,  
            operationalStatus: 'checkout_draft',
            currency: 'PKR'
          }
        });
      } 
      
      // Zombie Cart Claim Fix
      if (order && !order.user_id && !order.guestId && guestId) {
        order = await prisma.order.update({
          where: { id: order.id },
          data: { guestId: guestId }
        });
      }

      // =========================================================
      // 🚀 THE LOGIC SPLIT: FABRIC vs DESIGN BUNDLE
      // =========================================================
      let unitPrice = 0;
      let itemName = "";
      let itemAttributes = {}; 
      let finalInventoryItemId = null;
      let finalDesignId = null;

      if (itemType === 'fabric' || itemType === 'embellishment') {
        
        // --- A. RAW MATERIAL FLOW (NO SIZING) ---
        const inventoryItem = await prisma.inventoryItem.findUnique({ where: { id: itemId } });
        if (!inventoryItem) return res.status(404).json({ success: false, message: "Material not found" });
        if (inventoryItem.stockQuantity < quantity) {
          return res.status(400).json({ success: false, message: "Out of stock" });
        }

        unitPrice = parseFloat(inventoryItem.price);
        itemName = inventoryItem.name;
        finalInventoryItemId = itemId;
        // Notice: Sizing attributes remain empty {}
        
      } else if (itemType === 'design_bundle') {
        
        // --- B. CUSTOM DESIGN FLOW (SIZING APPLIES HERE) ---
        // const design = await prisma.design.findUnique({ 
        //   where: { id: itemId },
        //   include: { product: true } // Base product price ke liye
        // });
        
        // if (!design) return res.status(404).json({ success: false, message: "Design not found" });

        // unitPrice = design.product ? parseFloat(design.product.base_stitching_price) : 5000; // Fallback price
        // itemName = design.name || "Custom Design Outfit";
        // finalDesignId = itemId;

        //for testing
        unitPrice = 5000; // Fake Price
        itemName = "Test Custom Outfit (Dummy)";
        finalDesignId = null;
////////////////////////////////////////////////////////////
        // Yahan Sizing Zaroori Hai!
        if (sizingMethod === 'Standard_Preset' && standardSizeId) {
          itemAttributes = { method: 'Standard_Preset', standardSizeId };
        } else if (sizingMethod === 'Jute_Fit_Custom' && customMeasurements) {
          itemAttributes = { method: 'Jute_Fit_Custom', customMeasurements };
        } else {
          return res.status(400).json({ success: false, message: "Please provide valid sizing details for your design." });
        }

      } else {
        return res.status(400).json({ success: false, message: "Invalid item type" });
      }

      const totalPrice = unitPrice * quantity;

      // =========================================================
      // 3. Add to Cart Items
      // =========================================================
      // Dhoondo ke kya EXACT same item cart mein pehle se hai?
      const existingItems = await prisma.orderItem.findMany({
        where: { 
          orderId: order.id, 
          itemType: itemType,
          ...(finalInventoryItemId && { inventoryItemId: finalInventoryItemId }),
          ...(finalDesignId && { designId: finalDesignId })
        }
      });

      // Match attributes (taake alag size ka kurta naya row banaye, quantity merge na ho)
      const exactMatchItem = existingItems.find(item => 
        JSON.stringify(item.attributes || {}) === JSON.stringify(itemAttributes)
      );

      if (exactMatchItem) {
        // Same kapda OR Same Design with Same Size -> Update Quantity
        await prisma.orderItem.update({
          where: { id: exactMatchItem.id },
          data: {
            quantity: exactMatchItem.quantity + quantity,
            totalLinePrice: (exactMatchItem.quantity + quantity) * unitPrice,
            attributes: itemAttributes
          }
        });
      } else {
        // Naya Material OR Naya Design OR Same Design with Different Size -> Create New Row
        await prisma.orderItem.create({
          data: {
            orderId: order.id,
            itemType: itemType,
            inventoryItemId: finalInventoryItemId,
            designId: finalDesignId, // 👈 Yahan Design ID jayegi
            nameAtPurchase: itemName,
            unitPrice: unitPrice,
            quantity: parseFloat(quantity),
            totalLinePrice: totalPrice,
            attributes: itemAttributes // 👈 Yahan Sizing jayegi (Sirf design ke case mein)
          }
        });
      }

      // 4. Recalculate & Response
      await calculateOrderTotal(order.id);

      const updatedCart = await prisma.order.findUnique({
        where: { id: order.id },
        include: { items: true }
      });

      res.status(200).json({
        success: true,
        message: "Item added to cart successfully!",
        cart: updatedCart
      });

    } catch (error) {
      console.error("Add to Cart Error:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // 2. GET CART (User apna cart dekh sake)
  getCart: async (req, res) => {
    try {
      const userId = req.user ? req.user.user_id : null;
      const guestId = req.user ? null : req.guestId;

      const cart = await prisma.order.findFirst({
        where: {
            OR: [
              { user_id: userId ? userId : undefined }, // Agar User hai
              { guestId: guestId ? guestId : undefined } // Agar Guest hai
            ],
            operationalStatus: 'checkout_draft'
          },
        include: {
          items: {
            include: {
              inventoryItem: { // Item ki photo dikhane ke liye details chahiye hongi
                select: { images: true, colorName: true }
              }
            }
          }
        }
      });

      if (!cart) {
        return res.status(200).json({ success: true, message: "Cart is empty", cart: null });
      }

      res.status(200).json({ success: true, data: cart });

    } catch (error) {
      console.error("Get Cart Error:", error);
      res.status(500).json({ success: false, error: error.message });
    }

    
  },

// 3. UPDATE ITEM QUANTITY
// updateCartItem: async (req, res) => {
//     try {
//         const userId = req.user ? req.user.user_id : null;
//         const guestId = req.user ? null : req.guestId;


//       const { itemId, quantity } = req.body; // itemId yahan OrderItem ki ID hai (Inventory ki nahi)

//       // 1. Validate Quantity
//       if (quantity < 1) {
//         return res.status(400).json({ success: false, message: "Quantity must be at least 1" });
//       }

//       // 2. Find Order Item & Verify Owner
//       const orderItem = await prisma.orderItem.findFirst({
//         where: {
//             OR: [
//               { user_id: userId ? userId : undefined }, // Agar User hai
//               { guestId: guestId ? guestId : undefined } // Agar Guest hai
//             ],
//             operationalStatus: 'checkout_draft'
//           },
//         include: { inventoryItem: true } // Stock check karne ke liye inventory data chahiye
//       });

//       if (!orderItem) {
//         return res.status(404).json({ success: false, message: "Item not found in cart" });
//       }

//       // 3. Check Stock (Inventory)
//       if (orderItem.inventoryItem.stockQuantity < quantity) {
//         return res.status(400).json({ 
//           success: false, 
//           message: `Stock limit exceeded! Only ${orderItem.inventoryItem.stockQuantity} available.` 
//         });
//       }

//       // 4. Update Item Price & Quantity
//       const unitPrice = orderItem.unitPrice;
//       await prisma.orderItem.update({
//         where: { id: itemId },
//         data: {
//           quantity: parseFloat(quantity),
//           totalLinePrice: parseFloat(quantity) * unitPrice
//         }
//       });

//       // 5. Recalculate Total Order Price
//       await calculateOrderTotal(orderItem.orderId);

//       res.status(200).json({ success: true, message: "Cart updated" });

//     } catch (error) {
//       console.error("Update Cart Error:", error);
//       res.status(500).json({ success: false, error: error.message });
//     }
//   },

updateCartItem: async (req, res) => {
  try {
    const userId = req.user ? req.user.user_id : null;
    const guestId = req.user ? null : req.guestId;

    const { itemId, quantity } = req.body; // itemId yahan OrderItem ki ID hai (Inventory ki nahi)

    // 1. Validate Quantity
    if (quantity < 1) {
      return res.status(400).json({ success: false, message: "Quantity must be at least 1" });
    }

    // 2. Find Order Item & Verify Owner
    const orderItem = await prisma.orderItem.findFirst({
      where: {
        id: itemId, // 👈 The Fix: Item ID match karo
        order: {    // 👈 The Fix: Parent table mein relation check karo
          OR: [
            { user_id: userId ? userId : undefined },
            { guestId: guestId ? guestId : undefined }
          ],
          operationalStatus: 'checkout_draft'
        }
      },
      include: { inventoryItem: true } 
    });

    if (!orderItem) {
      return res.status(404).json({ success: false, message: "Item not found in cart" });
    }

    // 3. Check Stock (Inventory)
    // Note: Agar design_bundle hoga toh inventoryItem null ho sakta hai, isliye optional chaining (?.) laga di hai safety ke liye.
    if (orderItem.inventoryItem && orderItem.inventoryItem.stockQuantity < quantity) {
      return res.status(400).json({ 
        success: false, 
        message: `Stock limit exceeded! Only ${orderItem.inventoryItem.stockQuantity} available.` 
      });
    }

    // 4. Update Item Price & Quantity
    const unitPrice = orderItem.unitPrice;
    await prisma.orderItem.update({
      where: { id: itemId },
      data: {
        quantity: parseFloat(quantity),
        totalLinePrice: parseFloat(quantity) * unitPrice
      }
    });

    // 5. Recalculate Total Order Price
    await calculateOrderTotal(orderItem.orderId);

    res.status(200).json({ success: true, message: "Cart updated" });

  } catch (error) {
    console.error("Update Cart Error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
},

  // 4. REMOVE ITEM FROM CART
  // 4. REMOVE ITEM FROM CART (Updated for Guest + User)
  removeFromCart: async (req, res) => {
    try {
      // 1. Identify: User hai ya Guest?
      const userId = req.user ? req.user.user_id : null;
      const guestId = req.guestId; // Middleware se aayega

      const { id } = req.params; // URL se Item ID aayi

      // 2. Find Item (Security Check)
      // Hum check karenge ke item jis order mein hai, wo order usi bande ka hona chahiye
      const deletedItem = await prisma.orderItem.findFirst({
        where: {
          id: id,
          order: {
            // Yahan MAGIC hai: User ID match kare YA Guest ID match kare
            OR: [
              { user_id: userId ? userId : undefined }, 
              { guestId: guestId ? guestId : undefined }
            ],
            operationalStatus: 'checkout_draft'
          }
        }
      });

      if (!deletedItem) {
        return res.status(404).json({ success: false, message: "Item not found in your cart" });
      }

      // 3. Delete action (Safe to delete now)
      await prisma.orderItem.delete({
        where: { id: id }
      });

      // 4. Recalculate Total (Order ka total price update karo)
     
      await calculateOrderTotal(deletedItem.orderId);

      res.status(200).json({ success: true, message: "Item removed from cart" });

    } catch (error) {
      console.error("Remove Cart Error:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
  
  
};

module.exports = cartController;