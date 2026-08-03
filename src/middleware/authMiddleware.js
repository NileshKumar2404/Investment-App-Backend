import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';

export const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'investment_os_super_secret_jwt_key_2026');

      req.user = await User.findById(decoded.id).select('-password');
      return next();
    } catch (error) {
      return next(new ApiError(401, 'Not authorized, token invalid or expired'));
    }
  }

  // Allow optional unauthenticated demo access if token is missing (falls back to guest mode)
  req.user = null;
  next();
};

export const requireAuth = (req, res, next) => {
  if (!req.user) {
    return next(new ApiError(401, 'Authentication required. Please login.'));
  }
  next();
};
