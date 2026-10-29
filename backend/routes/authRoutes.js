import express from 'express';
import { body } from 'express-validator';
import { registerUser, loginUser, getMe } from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';
import validateRequest from '../middleware/validateRequest.js';

const router = express.Router();

router.post(
  '/register',
  [
    body('name', 'Name is required').trim().notEmpty(),
    body('email', 'Please include a valid email').trim().isEmail().normalizeEmail(),
    body('password', 'Password must be at least 8 characters').isLength({ min: 8 }),
  ],
  validateRequest,
  registerUser
);

router.post(
  '/login',
  [
    body('email', 'Please include a valid email').trim().isEmail().normalizeEmail(),
    body('password', 'Password is required').notEmpty(),
  ],
  validateRequest,
  loginUser
);

router.get('/me', protect, getMe);

export default router;
