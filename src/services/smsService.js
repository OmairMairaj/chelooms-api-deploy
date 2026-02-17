// Future mein yahan Twilio import hoga
// const client = require('twilio')(accountSid, authToken);

const sendSMS = async (to, message) => {
    // 🛑 ABHI KE LIYE: Sirf Console mein dikhao (Mocking)
    console.log("==========================================");
    console.log(`📲 MOCK SMS TO: ${to}`);
    console.log(`💬 MESSAGE: ${message}`);
    console.log("==========================================");

    // Jab Twilio aayega, to ye code uncomment hoga:
    /*
    await client.messages.create({
        body: message,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: to
    });
    */

    return true; // Assume success
};

module.exports = { sendSMS };