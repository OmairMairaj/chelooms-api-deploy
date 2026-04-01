/**
 * Runs a Zod schema against req.body. On success replaces body with parsed data.
 */
const validateBody = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);

  if (!result.success) {
    const issues = result.error.issues.map((i) => ({
      path: i.path.join('.'),
      message: i.message,
    }));
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: issues,
    });
  }

  req.body = result.data;
  next();
};

module.exports = { validateBody };
