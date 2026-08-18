import express from 'express';
import {
  registerUser,
  loginUser,
  getMe,
  logoutUser,
  changePassword,
  forgotPassword,
  resetPassword,
  refreshToken,
  logoutAllDevices,
} from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/logout', protect, logoutUser);
router.post('/logout-all', protect, logoutAllDevices);
router.get('/me', protect, getMe);
router.post('/refresh', refreshToken);
router.post('/change-password', protect, changePassword);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

export default router;
