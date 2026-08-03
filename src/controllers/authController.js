import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'investment_os_super_secret_jwt_key_2026', {
    expiresIn: process.env.JWT_EXPIRES_IN || '30d',
  });
};

// @desc    Register new user
// @route   POST /api/v1/auth/register
export const registerUser = asyncHandler(async (req, res) => {
  const { email, password, fullName } = req.body;

  if (!email || !password || !fullName) {
    throw new ApiError(400, 'Please provide email, password, and full name');
  }

  const userExists = await User.findOne({ email });
  if (userExists) {
    throw new ApiError(400, 'User with this email already exists');
  }

  const user = await User.create({ email, password, fullName });
  const token = generateToken(user._id);

  const responseData = {
    token,
    user: {
      id: user._id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
    },
  };

  return res.status(201).json(new ApiResponse(201, responseData, 'User registered successfully'));
});

// @desc    Login user
// @route   POST /api/v1/auth/login
export const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new ApiError(400, 'Please provide email and password');
  }

  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.matchPassword(password))) {
    throw new ApiError(401, 'Invalid email or password');
  }

  const token = generateToken(user._id);
  const responseData = {
    token,
    user: {
      id: user._id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
    },
  };

  return res.status(200).json(new ApiResponse(200, responseData, 'User logged in successfully'));
});

// @desc    Get current user profile
// @route   GET /api/v1/auth/me
export const getMe = asyncHandler(async (req, res) => {
  if (!req.user) {
    throw new ApiError(401, 'Not authenticated');
  }
  return res.status(200).json(new ApiResponse(200, req.user, 'User profile fetched successfully'));
});

// @desc    Refresh token
// @route   POST /api/v1/auth/refresh
export const refreshToken = asyncHandler(async (req, res) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.body && req.body.token) {
    token = req.body.token;
  }

  if (!token) {
    throw new ApiError(401, 'No token provided');
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'investment_os_super_secret_jwt_key_2026', {
      ignoreExpiration: true,
    });

    const user = await User.findById(decoded.id);
    if (!user) {
      throw new ApiError(401, 'User not found');
    }

    const newToken = generateToken(user._id);
    return res.status(200).json(new ApiResponse(200, { token: newToken }, 'Token refreshed successfully'));
  } catch (error) {
    throw new ApiError(401, 'Invalid or corrupted token');
  }
});
