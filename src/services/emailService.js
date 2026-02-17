const transporter = require('../config/emailConfig');
const { welcomeTemplate, forgotPasswordTemplate, accountCreatedTemplateByAdmin } = require('../utils/emailTemplates');

// Generic Sender Function (Internal Use)
const sendMail = async (to, subject, htmlContent) => {
    try {
        const info = await transporter.sendMail({
            from: `"Chelooms Support" <${process.env.SMTP_USER}>`, // Sender address
            to: to,
            subject: subject,
            html: htmlContent,
        });
        console.log("📨 Email sent: %s", info.messageId);
        return info;
    } catch (error) {
        console.error("❌ Error sending email:", error);
        throw new Error("Email sending failed");
    }
};

const sendWelcomeEmail = async (user) => {
    const html = welcomeTemplate(user.first_name);
    await sendMail(user.email, "Welcome to Chelooms! 🌟", html);
};


// 2. Send Password Reset Link
const sendPasswordResetOTP = async (user, otp) => {
    const html = forgotPasswordTemplate(user.first_name, otp);
    await sendMail(user.email, "Your Password Reset Code 🔑", html);
};


const sendAccountCredentials = async (email, firstName, password) => {
    const html = accountCreatedTemplateByAdmin(firstName, email, password);
    await sendMail(email, "Welcome to Chelooms - Account Details", html);
};



module.exports = { 
    sendWelcomeEmail, 
    sendPasswordResetOTP,
    sendAccountCredentials
};