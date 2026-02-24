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

  // 1. ADD TO CART (Logic: Draft Order Banao ya Update karo)
  addToCart: async (req, res) => {
    try {
        const userId = req.user ? req.user.user_id : null;
        const guestId = req.user ? null : req.guestId;

      const { itemId, quantity, itemType } = req.body; 

      
      // A. Check Logic: Kya is user ka pehle se koi khula hua Cart (Draft Order) hai?
      let order = await prisma.order.findFirst({
        where: {
          OR: [
            { user_id: userId ? userId : undefined }, // Agar User hai
            { guestId: guestId ? guestId : undefined } // Agar Guest hai
          ],
          operationalStatus: 'checkout_draft'
        }
      });

      // Agar cart nahi hai, toh naya banao
      if (!order) {
        order = await prisma.order.create({
          data: {
            user_id: userId,
            operationalStatus: 'checkout_draft',
            currency: 'PKR'
          }
        });
      }

      // B. Inventory Check: Item dhoondo aur Stock check karo
      const inventoryItem = await prisma.inventoryItem.findUnique({
        where: { id: itemId }
      });

      if (!inventoryItem) {
        return res.status(404).json({ success: false, message: "Item not found" });
      }

      if (inventoryItem.stockQuantity < quantity) {
        return res.status(400).json({ 
          success: false, 
          message: `Out of Stock! Only ${inventoryItem.stockQuantity} units available.` 
        });
      }

      // C. Cart Item Logic: Kya ye item pehle se cart mein hai?
      const existingItem = await prisma.orderItem.findFirst({
        where: {
          orderId: order.id,
          inventoryItemId: itemId
        }
      });

      const unitPrice = parseFloat(inventoryItem.price); // Price DB se uthao (Secure)
      const totalPrice = unitPrice * quantity;

      if (existingItem) {
        // Agar pehle se hai, to quantity update karo
        await prisma.orderItem.update({
          where: { id: existingItem.id },
          data: {
            quantity: existingItem.quantity + quantity, // Purani + Nayi Quantity
            totalLinePrice: (existingItem.quantity + quantity) * unitPrice
          }
        });
      } else {
        // Agar naya hai, to insert karo
        await prisma.orderItem.create({
          data: {
            orderId: order.id,
            itemType: itemType || 'fabric', // Default fabric
            inventoryItemId: itemId,
            nameAtPurchase: inventoryItem.name, // Name freeze kar rahe hain
            unitPrice: unitPrice,               // Price freeze kar rahe hain
            quantity: parseFloat(quantity),
            totalLinePrice: totalPrice
          }
        });
      }

      // D. Total Recalculate karo
      await calculateOrderTotal(order.id);

      // E. Updated Cart wapis bhejo
      const updatedCart = await prisma.order.findUnique({
        where: { id: order.id },
        include: { items: true } // Items bhi sath bhejo
      });

      res.status(200).json({
        success: true,
        message: "Item added to cart",
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
            OR: [
              { user_id: userId ? userId : undefined }, // Agar User hai
              { guestId: guestId ? guestId : undefined } // Agar Guest hai
            ],
            operationalStatus: 'checkout_draft'
          },
        include: { inventoryItem: true } // Stock check karne ke liye inventory data chahiye
      });

      if (!orderItem) {
        return res.status(404).json({ success: false, message: "Item not found in cart" });
      }

      // 3. Check Stock (Inventory)
      if (orderItem.inventoryItem.stockQuantity < quantity) {
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