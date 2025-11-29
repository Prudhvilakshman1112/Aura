import { z } from 'zod';

// Validation schemas
export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters')
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required')
});

export const profileUpdateSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  linkedin_handle: z.string().max(100).optional(),
  leetcode_handle: z.string().max(100).optional(),
  codechef_handle: z.string().max(100).optional(),
  codeforces_handle: z.string().max(100).optional(),
  height_cm: z.number().positive().max(300).optional(),
  weight_kg: z.number().positive().max(500).optional(),
  age: z.number().int().min(1).max(150).optional(),
  gender: z.enum(['Male', 'Female', 'Other']).optional(),
  study_domain: z.string().max(100).optional(),
  study_year: z.number().int().min(1).max(10).optional(),
  skills: z.array(z.string()).optional(),
  profile_image_url: z.string().url().optional()
});

export const goalsSchema = z.object({
  monthly_coding_goal: z.number().int().min(1).max(1000).optional(),
  daily_study_goal_minutes: z.number().int().min(1).max(1440).optional()
});

// Validation middleware
export const validateRequest = (schema) => {
  return (req, res, next) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }))
      });
    }
  };
};
