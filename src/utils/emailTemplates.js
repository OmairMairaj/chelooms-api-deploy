// Styles (Common CSS)
const style = `
    font-family: Arial, sans-serif; 
    color: #333; 
    padding: 20px; 
    border: 1px solid #ddd; 
    border-radius: 8px;
`;

// 1. Verification Email Template
const verifyEmailTemplate = (name, link) => {
    return `
    <div style="${style}">
        <h2>Welcome to Chelooms, ${name}! 🎉</h2>
        <p>Thank you for registering. Please verify your email address to activate your account.</p>
        <a href="${link}" style="background-color: #007BFF; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Verify Email</a>
        <p>Or copy this link: ${link}</p>
        <p><small>This link expires in 24 hours.</small></p>
    </div>
    `;
};

// 2. Reset Password Template
const resetPasswordTemplate = (name, link) => {
    return `
    <div style="${style}">
        <h2>Reset Your Password 🔒</h2>
        <p>Hi ${name}, we received a request to reset your password.</p>
        <a href="${link}" style="background-color: #DC3545; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reset Password</a>
        <p>If you didn't request this, please ignore this email.</p>
    </div>
    `;
};

// 3. OTP Template (Future Use)
const otpTemplate = (otp) => {
    return `
    <div style="${style}">
        <h2>Your Verification Code</h2>
        <h1>${otp}</h1>
        <p>Use this code to complete your login/verification.</p>
    </div>
    `;
};


const styles = `
    font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
    max-width: 600px;
    margin: 0 auto;
    padding: 20px;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    background-color: #ffffff;
`;

const headerStyle = `
    text-align: center;
    padding-bottom: 20px;
    border-bottom: 1px solid #eeeeee;
`;

const footerStyle = `
    margin-top: 30px;
    text-align: center;
    font-size: 12px;
    color: #888888;
`;

// 👇 NEW WELCOME TEMPLATE
const welcomeTemplate = (firstName) => {
    return `
    <div style="${styles}">
        <div style="${headerStyle}">
            <h1 style="color: #333;">Welcome to Chelooms! 🧵</h1>
        </div>
        
        <div style="padding: 20px 0;">
            <p style="font-size: 16px; color: #555;">Hi <strong>${firstName}</strong>,</p>
            
            <p style="font-size: 16px; line-height: 1.6; color: #555;">
                We are thrilled to have you on board! Your account has been successfully created.
            </p>
            
            <p style="font-size: 16px; line-height: 1.6; color: #555;">
                At Chelooms, we bring your fashion ideas to life. You can now explore our inventory, customize your designs, and place orders directly.
            </p>

            <div style="background-color: #f9f9f9; padding: 15px; border-left: 4px solid #007BFF; margin: 20px 0;">
                <p style="margin: 0; color: #333;"><strong>What's Next?</strong><br> Start exploring our latest fabric collection.</p>
            </div>

            <p style="font-size: 16px; color: #555;">Happy Designing!</p>
            <p style="font-size: 16px; color: #555;">- The Chelooms Team</p>
        </div>

        <div style="${footerStyle}">
            <p>&copy; ${new Date().getFullYear()} Chelooms. All rights reserved.</p>
        </div>
    </div>
    `;
};

const forgotPasswordTemplate = (firstName, otp) => {
    return `
    <div style="${style}">
        <div style="${headerStyle}">
            <h2 style="color: #333;">Reset Password Request 🔒</h2>
        </div>
        
        <div style="padding: 20px 0;">
            <p>Hi ${firstName},</p>
            <p>You requested to reset your password for your Chelooms account.</p>
            
            <p>Use the following verification code to reset your password:</p>
            
            <div style="background-color: #f4f4f4; border-radius: 5px; padding: 15px; text-align: center; margin: 20px 0;">
                <span style="font-size: 24px; font-weight: bold; letter-spacing: 5px; color: #007BFF;">${otp}</span>
            </div>

            <p>This code is valid for <strong>15 minutes</strong>.</p>
            <p style="color: #999; font-size: 12px;">If you didn't request this, please ignore this email.</p>
        </div>
        
        <div style="${footerStyle}">
            <p>&copy; Chelooms Security Team</p>
        </div>
    </div>
    `;
};

module.exports = { verifyEmailTemplate, resetPasswordTemplate, otpTemplate, welcomeTemplate, forgotPasswordTemplate };