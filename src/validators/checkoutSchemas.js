const { z } = require('zod');

const trimOrUndef = (v) => {
  if (v === null || v === undefined) return undefined;
  if (typeof v !== 'string') return v;
  const t = v.trim();
  return t === '' ? undefined : t;
};

const optionalEmail = z.preprocess(
  trimOrUndef,
  z.string().email('Invalid email').optional()
);

/** Saved address path: savedAddressId + optional email override. New path: required contact + address core fields. */
const checkoutShippingSchema = z
  .object({
    savedAddressId: z.preprocess(trimOrUndef, z.string().uuid('Invalid saved address id').optional()),
    label: z.preprocess(
      (v) => (v === null ? undefined : v),
      z.string().max(100).optional()
    ),
    fullName: z.preprocess((v) => (v === null ? undefined : v), z.string().optional()),
    phone: z.preprocess((v) => (v === null ? undefined : v), z.string().optional()),
    email: optionalEmail,
    addressLine1: z.preprocess((v) => (v === null ? undefined : v), z.string().optional()),
    addressLine2: z.preprocess((v) => (v === null ? undefined : v), z.string().optional()),
    city: z.preprocess((v) => (v === null ? undefined : v), z.string().optional()),
    province: z.preprocess((v) => (v === null ? undefined : v), z.string().optional()),
    postalCode: z.preprocess((v) => (v === null ? undefined : v), z.string().optional()),
    country: z.preprocess((v) => (v === null ? undefined : v), z.string().max(100).optional()),
  })
  .superRefine((data, ctx) => {
    if (data.savedAddressId) return;

    const fullName = typeof data.fullName === 'string' ? data.fullName.trim() : '';
    const phone = typeof data.phone === 'string' ? data.phone.trim() : '';
    const addressLine1 = typeof data.addressLine1 === 'string' ? data.addressLine1.trim() : '';
    const city = typeof data.city === 'string' ? data.city.trim() : '';

    if (!fullName) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Full name is required',
        path: ['fullName'],
      });
    }
    if (!phone || phone.length < 7) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Valid phone is required',
        path: ['phone'],
      });
    }
    if (!addressLine1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Address line 1 is required',
        path: ['addressLine1'],
      });
    }
    if (!city) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'City is required',
        path: ['city'],
      });
    }
  });

const checkoutVerifyOtpSchema = z.object({
  code: z.preprocess(
    (v) => (v === null || v === undefined ? undefined : trimOrUndef(String(v))),
    z.string().min(4, 'Code is required').max(20)
  ),
});

const paymentMethodEnum = z.enum(['COD', 'CREDIT_CARD', 'BANK_TRANSFER']);

const checkoutPlaceOrderSchema = z.object({
  paymentMethod: z.preprocess(
    (v) => (v === null || v === undefined || v === '' ? undefined : v),
    paymentMethodEnum.optional()
  ),
});

module.exports = {
  checkoutShippingSchema,
  checkoutVerifyOtpSchema,
  checkoutPlaceOrderSchema,
};
