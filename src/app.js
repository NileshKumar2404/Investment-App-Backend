import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

import authRoutes from './routes/authRoutes.js';
import companyRoutes from './routes/companyRoutes.js';
import { ApiError } from './utils/ApiError.js';
import { ApiResponse } from './utils/ApiResponse.js';

const app = express();

// 1. Security Headers & CORS Configuration
app.use(helmet());
app.use(cors({ origin: '*', credentials: true }));

// 2. Rate Limiter (200 requests per 15-minute window)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: new ApiError(429, 'Too many requests from this IP, please try again later.'),
});
app.use('/api/', limiter);

// 3. Body Parsing Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 4. API Health Check Endpoint
app.get('/health', (req, res) => {
  res.status(200).json(new ApiResponse(200, {
    status: 'online',
    system: 'Investment Intelligence OS Backend',
    timestamp: new Date().toISOString(),
  }, 'Health check passed'));
});

app.get('/api/v1/health', (req, res) => {
  res.status(200).json(new ApiResponse(200, {
    status: 'online',
    version: '1.0.0',
    system: 'Investment Intelligence OS REST API',
  }, 'API v1 Health check passed'));
});

// 5. App Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/companies', companyRoutes);

// 6. 404 Route Handler
app.use((req, res, next) => {
  next(new ApiError(404, `Route not found: ${req.originalUrl}`));
});

// 7. Global Error Handler Middleware
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  const errors = err.errors || [];

  res.status(statusCode).json({
    statusCode,
    success: false,
    message,
    errors,
    data: null,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
});

export default app;