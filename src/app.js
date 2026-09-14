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
import notificationRoutes from './routes/notificationRoutes.js'
import auditLogRoutes from './routes/auditLogRoutes.js'
import assessmentRoutes from "./routes/assessmentRoutes.js";
import marketingRoutes from "./routes/marketingRoutes.js";
import { auditRequestMiddleware } from "./middleware/auditRequestMiddleware.js";

import { ApiError } from "./utils/ApiError.js";
import { ApiResponse } from "./utils/ApiResponse.js";

const app = express();

const isProduction = process.env.NODE_ENV === "production";

app.set("trust proxy", 1);

app.use(
  helmet({
    crossOriginResourcePolicy: {
      policy: "cross-origin",
    },
  }),
);

const configuredOrigins = (
  process.env.FRONTEND_URL || "http://localhost:3000,http://localhost:5173"
)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
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

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.API_RATE_LIMIT || 200),
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    statusCode: 429,
    success: false,
    message: "Too many requests. Please try again later.",
    data: null,
  },
  skip: (req) => req.path === "/health" || req.path === "/v1/health",
});

app.use("/api/", apiLimiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
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

// Centralized audit logging for state-changing requests across modules.
// Authentication events continue to use explicit auth-controller audit entries.
app.use(auditRequestMiddleware);

app.use("/api/v1/auth", authLimiter, authRoutes);
app.use("/api/v1/companies", companyRoutes);
app.use("/api/v1/ledger", ledgerRoutes);
app.use("/api/v1/upload", uploadRoutes);
app.use("/api/v1/investments", investmentRoutes);
app.use("/api/v1/watchlists", watchlistRoutes);
app.use("/api/v1/reports", reportRoutes);
app.use("/api/v1/notifications", notificationRoutes);
app.use("/api/v1/audit-logs", auditLogRoutes);
app.use("/api/v1/assessments", assessmentRoutes);
app.use("/api/v1/marketing", marketingRoutes);

app.use((req, res, next) => {
  next(new ApiError(404, "The requested resource was not found"));
});

app.use((err, req, res, next) => {
  void next;

  let statusCode = err.statusCode || 500;
  let message = err.message || "Internal Server Error";
  let errors = err.errors || [];

  if (err.name === "ValidationError") {
    statusCode = 400;
    message = "Validation failed";
    errors = Object.values(err.errors || {}).map((error) => ({
      field: error.path,
      message: error.message,
    }));
  }

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

  if (err.name === "CastError") {
    statusCode = 400;
    message = "Invalid resource identifier.";
    errors = [];
  }

  if (isProduction && statusCode >= 500) {
    message = "Internal Server Error";
    errors = [];
  }

  return res.status(statusCode).json(
    new ApiResponse(
      statusCode,
      null,
      message,
      errors,
    ),
  );
});

export default app;
