const { z } = require('zod');

const trimmed = (schema) => z.preprocess((v) => (typeof v === 'string' ? v.trim() : v), schema);

/** null, undefined, '', or whitespace-only → undefined (optional fields) */
const optionalEmailField = z.preprocess(
  (v) => {
    if (v === null || v === undefined) return undefined;
    if (typeof v !== 'string') return v;
    const t = v.trim();
    return t === '' ? undefined : t;
  },
  z.string().email('Invalid email').optional()
);

const optionalMobileField = z.preprocess(
  (v) => {
    if (v === null || v === undefined) return undefined;
    if (typeof v !== 'string') return v;
    const t = v.trim();
    return t === '' ? undefined : t;
  },
  z.string().min(7, 'Mobile number too short').max(20).optional()
);

const registerSchema = z
  .object({
    first_name: trimmed(z.string().min(1, 'First name is required').max(50)),
    last_name: trimmed(z.string().min(1, 'Last name is required').max(50)),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    email: optionalEmailField,
    mobile_number: optionalMobileField,
  })
  .refine((d) => Boolean(d.email) || Boolean(d.mobile_number), {
    message: 'Please provide either an Email or a Mobile Number.',
    path: ['email'],
  });

const loginSchema = z
  .object({
    email: optionalEmailField,
    mobile_number: optionalMobileField,
    password: z.string().min(1, 'Password is required'),
  })
  .refine((d) => Boolean(d.email) || Boolean(d.mobile_number), {
    message: 'Please provide Email or Mobile Number along with Password',
    path: ['email'],
  });

const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

const logoutSchema = refreshTokenSchema;

const checkUserSchema = z
  .object({
    email: optionalEmailField,
    mobile_number: optionalMobileField,
  })
  .refine((d) => Boolean(d.email) || Boolean(d.mobile_number), {
    message: 'Please provide either Email or Mobile Number.',
    path: ['email'],
  });

const socialProviderEnum = z.enum(['Google', 'Facebook']);

const socialLoginSchema = z.object({
  provider: socialProviderEnum,
  token: z.string().min(1, 'Token is required'),
});

const forgotPasswordSchema = z.object({
  email: z.string().trim().min(1, 'Email is required').email('Invalid email'),
});

const verifyOTPSchema = z.object({
  email: z.string().trim().min(1, 'Email is required').email('Invalid email'),
  code: z.string().trim().min(1, 'Code is required').max(20),
});

const resetPasswordSchema = z.object({
  resetToken: z.string().min(1, 'Token is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
});

const sendMobileVerificationSchema = z.object({
  userId: z.string().uuid('User ID must be a valid UUID'),
});

const mobileNumberField = trimmed(
  z.string().min(7, 'Mobile number is required').max(20)
);

const verifyMobileLoginSchema = z.object({
  mobileNumber: mobileNumberField,
  code: z.string().trim().min(1, 'Code is required').max(20),
});

const sendMobileOtpSchema = z.object({
  mobileNumber: mobileNumberField,
});

const verifyCodeOnlySchema = verifyMobileLoginSchema;

module.exports = {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  logoutSchema,
  checkUserSchema,
  socialLoginSchema,
  forgotPasswordSchema,
  verifyOTPSchema,
  resetPasswordSchema,
  sendMobileVerificationSchema,
  verifyMobileLoginSchema,
  sendMobileOtpSchema,
  verifyCodeOnlySchema,
};
