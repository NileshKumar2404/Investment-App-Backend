import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

import authRoutes from './routes/authRoutes.js';
import companyRoutes from './routes/companyRoutes.js';
import ledgerRoutes from './routes/ledgerRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';
import { ApiError } from './utils/ApiError.js';
import { ApiResponse } from './utils/ApiResponse.js';

const app = express();

// 1. Trust Proxy Configuration for Render / Cloudflare / Nginx
app.set('trust proxy', 1);

// 2. Security Headers & CORS Configuration
app.use(helmet());
app.use(cors({ origin: '*', credentials: true }));

// 3. Rate Limiter (200 requests per 15-minute window)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: new ApiError(429, 'Too many requests from this IP, please try again later.'),
});
app.use('/api/', limiter);

// 4. Body Parsing Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 5. API Health Check Endpoint
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

// Logging Middleware
app.use((req, res, next) => {
  console.log('➡️ Incoming request:', req.method, req.originalUrl);
  next();
});

// 6. App Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/companies', companyRoutes);
app.use('/api/v1/ledger', ledgerRoutes);
app.use('/api/v1/upload', uploadRoutes);

// 7. 404 Route Handler
app.use((req, res, next) => {
  next(new ApiError(404, `Route not found: ${req.originalUrl}`));
});

// 8. Global Error Handler Middleware
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