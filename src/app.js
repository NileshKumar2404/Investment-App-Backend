import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

import authRoutes from "./routes/authRoutes.js";
import companyRoutes from "./routes/companyRoutes.js";
import ledgerRoutes from "./routes/ledgerRoutes.js";
import uploadRoutes from "./routes/uploadRoutes.js";
import investmentRoutes from './routes/investmentRoutes.js'
import watchlistRoutes from './routes/watchlistRoutes.js'
import reportRoutes from './routes/reportRoutes.js'

import { ApiError } from "./utils/ApiError.js";
import { ApiResponse } from "./utils/ApiResponse.js";

const app = express();

// ============================================================
// ENVIRONMENT
// ============================================================

const isProduction = process.env.NODE_ENV === "production";

// ============================================================
// TRUST PROXY
// ============================================================

/**
 * Required when running behind:
 *
 * - Render
 * - Cloudflare
 * - Nginx
 * - other reverse proxies
 *
 * This allows Express to correctly determine
 * the client's IP for rate limiting and logging.
 */
app.set("trust proxy", 1);

// ============================================================
// SECURITY HEADERS
// ============================================================

app.use(
  helmet({
    crossOriginResourcePolicy: {
      policy: "cross-origin",
    },
  }),
);

// ============================================================
// CORS
// ============================================================

/**
 * NEVER use:
 *
 * origin: '*'
 * credentials: true
 *
 * together for a production application.
 *
 * Configure allowed frontend origins through:
 *
 * FRONTEND_URL
 *
 * Example:
 *
 * FRONTEND_URL=https://your-frontend.com
 *
 * Multiple origins can be separated with commas.
 */

const configuredOrigins = (
  process.env.FRONTEND_URL || "http://localhost:3000,http://localhost:5173"
)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      /**
       * Allow requests without an Origin header.
       *
       * This includes:
       * - Postman
       * - server-to-server requests
       * - some mobile/native clients
       */
      if (!origin) {
        return callback(null, true);
      }

      if (configuredOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new ApiError(403, "Origin is not allowed"));
    },

    credentials: true,

    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],

    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "X-Device-Name",
    ],
  }),
);

// ============================================================
// GENERAL API RATE LIMITER
// ============================================================

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,

  /**
   * General API limit.
   *
   * Authentication endpoints have a stricter
   * limiter below.
   */
  max: Number(process.env.API_RATE_LIMIT || 200),

  standardHeaders: true,
  legacyHeaders: false,

  message: {
    statusCode: 429,
    success: false,
    message: "Too many requests. Please try again later.",
    data: null,
  },

  skip: (req) => {
    /**
     * Health checks shouldn't consume API quota.
     */
    return req.path === "/health" || req.path === "/v1/health";
  },
});

app.use("/api/", apiLimiter);

// ============================================================
// STRICT AUTHENTICATION RATE LIMITER
// ============================================================

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,

  /**
   * Authentication endpoints are much more sensitive
   * to brute-force and credential-stuffing attacks.
   */
  max: Number(process.env.AUTH_RATE_LIMIT || 20),

  standardHeaders: true,
  legacyHeaders: false,

  message: {
    statusCode: 429,
    success: false,
    message: "Too many authentication attempts. Please try again later.",
    data: null,
  },
});

// ============================================================
// BODY PARSING
// ============================================================

/**
 * Keep JSON payloads reasonably limited.
 *
 * File uploads are handled separately through
 * multipart middleware in upload routes.
 */
app.use(
  express.json({
    limit: process.env.JSON_BODY_LIMIT || "1mb",
  }),
);

app.use(
  express.urlencoded({
    extended: true,
    limit: process.env.URLENCODED_BODY_LIMIT || "1mb",
  }),
);

// ============================================================
// HEALTH CHECK
// ============================================================

app.get("/health", (req, res) => {
  return res.status(200).json(
    new ApiResponse(
      200,
      {
        status: "online",
        system: "Investment Intelligence OS Backend",
        timestamp: new Date().toISOString(),
      },
      "Health check passed",
    ),
  );
});

app.get("/api/v1/health", (req, res) => {
  return res.status(200).json(
    new ApiResponse(
      200,
      {
        status: "online",
        version: "1.0.0",
        system: "Investment Intelligence OS REST API",
      },
      "API v1 health check passed",
    ),
  );
});

// ============================================================
// REQUEST LOGGING
// ============================================================

/**
 * Basic request logging.
 *
 * Do NOT log:
 * - Authorization headers
 * - passwords
 * - refresh tokens
 * - request bodies containing credentials
 * - uploaded file contents
 */
app.use((req, res, next) => {
  const startTime = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - startTime;

    console.log(
      `[API] ${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`,
    );
  });

  next();
});

// ============================================================
// AUTHENTICATION ROUTES
// ============================================================

/**
 * Authentication endpoints receive a stricter
 * rate limit than normal API endpoints.
 */
app.use("/api/v1/auth", authLimiter, authRoutes);

// ============================================================
// COMPANY ROUTES
// ============================================================

app.use("/api/v1/companies", companyRoutes);

// ============================================================
// LEDGER ROUTES
// ============================================================

app.use("/api/v1/ledger", ledgerRoutes);

// ============================================================
// UPLOAD ROUTES
// ============================================================

app.use("/api/v1/upload", uploadRoutes);

// ============================================================
// UPLOAD ROUTES
// ============================================================

app.use("/api/v1/investments", investmentRoutes);


app.use("/api/v1/watchlist", watchlistRoutes);


app.use("/api/v1/report", reportRoutes);

// ============================================================
// 404 HANDLER
// ============================================================

app.use((req, res, next) => {
  next(new ApiError(404, "The requested resource was not found"));
});

// ============================================================
// GLOBAL ERROR HANDLER
// ============================================================

app.use((err, req, res, next) => {
  /**
   * Keep Express happy even though next is not
   * currently used inside this handler.
   */
  void next;

  let statusCode = err.statusCode || 500;

  /**
   * Never expose internal errors in production.
   */
  let message = err.message || "Internal Server Error";

  let errors = err.errors || [];

  // ========================================================
  // MONGOOSE VALIDATION ERROR
  // ========================================================

  if (err.name === "ValidationError") {
    statusCode = 400;

    message = "Validation failed";

    errors = Object.values(err.errors || {}).map((error) => ({
      field: error.path,
      message: error.message,
    }));
  }

  // ========================================================
  // MONGOOSE DUPLICATE KEY ERROR
  // ========================================================

  if (err.code === 11000) {
    statusCode = 409;

    const duplicateFields = Object.keys(err.keyPattern || {});

    message =
      duplicateFields.length > 0
        ? `A record with the specified ${duplicateFields.join(
            ", ",
          )} already exists.`
        : "A record with the specified value already exists.";

    errors = [];
  }

  // ========================================================
  // JWT ERRORS
  // ========================================================

  if (err.name === "JsonWebTokenError") {
    statusCode = 401;
    message = "Authentication token is invalid.";
    errors = [];
  }

  if (err.name === "TokenExpiredError") {
    statusCode = 401;
    message = "Authentication token has expired.";
    errors = [];
  }

  // ========================================================
  // CAST ERROR
  // ========================================================

  if (err.name === "CastError") {
    statusCode = 400;

    message = "Invalid resource identifier.";

    errors = [];
  }

  // ========================================================
  // CORS ERROR
  // ========================================================

  if (message === "Origin is not allowed") {
    statusCode = 403;
    errors = [];
  }

  // ========================================================
  // PRODUCTION ERROR SANITIZATION
  // ========================================================

  if (isProduction && statusCode >= 500) {
    message = "Internal Server Error";

    errors = [];
  }

  // ========================================================
  // SERVER-SIDE LOGGING
  // ========================================================

  if (statusCode >= 500) {
    console.error("[SERVER ERROR]", {
      name: err.name,
      message: err.message,
      stack: err.stack,
      method: req.method,
      path: req.originalUrl,
    });
  }

  // ========================================================
  // RESPONSE
  // ========================================================

  const response = {
    statusCode,
    success: false,
    message,
    errors,
    data: null,
  };

  /**
   * Stack traces are only useful during local development.
   *
   * NEVER expose them in production.
   */
  if (!isProduction && err.stack) {
    response.stack = err.stack;
  }

  return res.status(statusCode).json(response);
});

export default app;
