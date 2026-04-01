const { z } = require('zod');

const userRoleEnum = z.enum(['Administrator', 'Inventory_Manager', 'Registered']);

const trimOrUndef = (v) => {
  if (v === null || v === undefined) return undefined;
  if (typeof v !== 'string') return v;
  const t = v.trim();
  return t === '' ? undefined : t;
};

const optionalMobile = z.preprocess(
  trimOrUndef,
  z.string().min(7, 'Valid mobile number is required').max(20).optional()
);

/** Admin POST /users/create */
const adminCreateUserSchema = z.object({
  first_name: z.string().trim().min(1, 'First name is required').max(50),
  last_name: z
    .preprocess((v) => (v === null || v === undefined ? '' : String(v).trim()), z.string().max(50))
    .default(''),
  email: z.string().trim().min(1, 'Email is required').email('Invalid email'),
  mobile_number: optionalMobile,
  role: userRoleEnum,
});

/**
 * Admin PUT /users/:id — service only updates these fields; at least one must be sent.
 * Unknown keys rejected (.strict) so email etc. cannot be sneaked in.
 */
const adminUpdateUserSchema = z
  .object({
    first_name: z.string().trim().min(1).max(50).optional(),
    last_name: z.string().trim().max(50).optional(),
    mobile_number: optionalMobile,
    role: userRoleEnum.optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    const has =
      data.first_name !== undefined ||
      data.last_name !== undefined ||
      data.mobile_number !== undefined ||
      data.role !== undefined;
    if (!has) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'At least one of first_name, last_name, mobile_number, or role is required',
        path: ['first_name'],
      });
    }
  });

module.exports = {
  adminCreateUserSchema,
  adminUpdateUserSchema,
};
