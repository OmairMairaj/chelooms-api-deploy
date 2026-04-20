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

const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/** @param {object} summary - same shape as checkoutController orderSummary */
const orderConfirmationTemplate = (summary) => {
  const name = escapeHtml(summary.customerName);
  const orderId = escapeHtml(summary.orderId);
  const placed = summary.date
    ? escapeHtml(new Date(summary.date).toLocaleString())
    : '';
  const pay = escapeHtml(summary.paymentMethod || '');
  const fin = summary.financials || {};
  const subtotal = fin.subtotal != null ? Number(fin.subtotal).toFixed(2) : '—';
  const shipping = fin.shipping != null ? Number(fin.shipping).toFixed(2) : '—';
  const tax = fin.tax != null ? Number(fin.tax).toFixed(2) : '—';
  const total = fin.total != null ? Number(fin.total).toFixed(2) : '—';

  const addr = summary.shippingAddress;
  let shipLines = '';
  if (addr && typeof addr === 'object') {
    const lines = [
      addr.addressLine1,
      addr.addressLine2,
      [addr.city, addr.province].filter(Boolean).join(', '),
      addr.postalCode,
      addr.country,
    ].filter(Boolean);
    shipLines = lines.map((l) => `<p style="margin:4px 0;">${escapeHtml(l)}</p>`).join('');
  }

  const itemRows = (summary.items || [])
    .map(
      (it) => `
      <tr>
        <td style="padding:8px;border-bottom:1px solid #eee;">${escapeHtml(it.name)}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;text-align:center;">${escapeHtml(String(it.quantity))}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;">${it.totalPrice != null ? Number(it.totalPrice).toFixed(2) : '—'}</td>
      </tr>`
    )
    .join('');

  return `
    <div style="${styles}">
        <div style="${headerStyle}">
            <h1 style="color: #333;">Order confirmed</h1>
        </div>
        <div style="padding: 20px 0;">
            <p style="font-size: 16px; color: #555;">Hi <strong>${name}</strong>,</p>
            <p style="font-size: 16px; line-height: 1.6; color: #555;">
              Thank you for your order. We have received it and will process it shortly.
            </p>
            <div style="background-color: #f9f9f9; padding: 15px; border-left: 4px solid #007BFF; margin: 20px 0;">
              <p style="margin: 0 0 8px 0;"><strong>Order ID:</strong> ${orderId}</p>
              <p style="margin: 0 0 8px 0;"><strong>Placed:</strong> ${placed}</p>
              <p style="margin: 0;"><strong>Payment:</strong> ${pay}</p>
            </div>
            <h3 style="color:#333;font-size:15px;">Shipping address</h3>
            ${shipLines || '<p style="color:#888;">—</p>'}
            <h3 style="color:#333;font-size:15px;margin-top:24px;">Items</h3>
            <table style="width:100%;border-collapse:collapse;font-size:14px;">
              <thead>
                <tr style="background:#f4f4f4;">
                  <th style="padding:8px;text-align:left;">Product</th>
                  <th style="padding:8px;text-align:center;">Qty</th>
                  <th style="padding:8px;text-align:right;">Line total</th>
                </tr>
              </thead>
              <tbody>${itemRows}</tbody>
            </table>
            <div style="margin-top:20px;padding-top:16px;border-top:1px solid #eee;font-size:14px;">
              <p style="margin:4px 0;">Subtotal: <strong>${subtotal}</strong></p>
              <p style="margin:4px 0;">Shipping: <strong>${shipping}</strong></p>
              <p style="margin:4px 0;">Tax: <strong>${tax}</strong></p>
              <p style="margin:12px 0 0;font-size:16px;">Total: <strong>${total}</strong></p>
            </div>
            <p style="margin-top:24px;font-size: 14px; color: #555;">— The Chelooms Team</p>
        </div>
        <div style="${footerStyle}">
            <p>&copy; ${new Date().getFullYear()} Chelooms. All rights reserved.</p>
        </div>
    </div>
    `;
};

const accountCreatedTemplateByAdmin = (firstName, email, defaultPassword) => {
    return `
    <div style="${style}">
        <div style="${headerStyle}">
            <h2 style="color: #333;">Welcome to Chelooms Team! 👔</h2>
        </div>
        
        <div style="padding: 20px 0;">
            <p>Hi ${firstName},</p>
            <p>An administrator has created an account for you at Chelooms.</p>
            
            <div style="background-color: #f8f9fa; border-left: 4px solid #28a745; padding: 15px; margin: 20px 0;">
                <p style="margin: 0; font-weight: bold; color: #333;">Your Login Credentials:</p>
                <p style="margin: 5px 0;">📧 Email: <strong>${email}</strong></p>
                <p style="margin: 5px 0;">🔑 Password: <strong>${defaultPassword}</strong></p>
            </div>

            <p style="color: #dc3545; font-weight: bold;">⚠️ Action Required:</p>
            <p>For security reasons, please login immediately and change your password.</p>
        </div>
        
        <div style="${footerStyle}">
            <p>&copy; Chelooms Admin System</p>
        </div>
    </div>
    `;
};

module.exports = {
  verifyEmailTemplate,
  resetPasswordTemplate,
  otpTemplate,
  welcomeTemplate,
  forgotPasswordTemplate,
  accountCreatedTemplateByAdmin,
  orderConfirmationTemplate,
};