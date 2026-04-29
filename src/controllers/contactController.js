const contactService = require('../services/contactService');

class ContactController {
  
  // 📝 USER API: Form Submit Karna
  async submitContactForm(req, res) {
    try {
      const { subject, name, email, message } = req.body;

      // 🚨 Basic Validation
      if (!subject || !name || !email || !message) {
        return res.status(400).json({ success: false, message: "All fields are required." });
      }

      // Email Format Check
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ success: false, message: "Please provide a valid email address." });
      }

      // Message Length Check (Frontend pe 10 likha tha)
      if (message.trim().length < 10) {
        return res.status(400).json({ success: false, message: "Message must be at least 10 characters long." });
      }

      // Save to DB
      const newMessage = await contactService.createMessage({ subject, name, email, message });

      return res.status(201).json({
        success: true,
        message: "Your message has been sent successfully! We will get back to you soon.",
        data: newMessage
      });

    } catch (error) {
      console.error("🔥 Error in submitContactForm:", error);
      return res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
  }

  // 🛡️ ADMIN API: Get All Messages
  async getAdminMessages(req, res) {
    try {
      const { page, limit, status } = req.query;
      
      const pageNumber = page ? parseInt(page) : 1;
      const limitNumber = limit ? parseInt(limit) : 10;

      const result = await contactService.getAllMessages(pageNumber, limitNumber, status);

      return res.status(200).json({ success: true, ...result });
    } catch (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  // 🛡️ ADMIN API: Update Status
  async updateMessageStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body; // e.g., 'READ' ya 'RESOLVED'

      if (!status) {
        return res.status(400).json({ success: false, message: "Status is required." });
      }

      const updatedMessage = await contactService.updateMessageStatus(id, status);

      return res.status(200).json({ 
        success: true, 
        message: `Message status updated to ${status}`, 
        data: updatedMessage 
      });
    } catch (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }
}

module.exports = new ContactController();