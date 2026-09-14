import { createAuditLogFromRequest } from "../controllers/auditLogController.js";

const AUDITED_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

const RESOURCE_MAP = [
  ["/api/v1/companies", "COMPANY"],
  ["/api/v1/ledger", "LEDGER"],
  ["/api/v1/upload", "DOCUMENT"],
  ["/api/v1/investments", "INVESTMENT"],
  ["/api/v1/watchlists", "WATCHLIST"],
  ["/api/v1/reports", "REPORT"],
  ["/api/v1/notifications", "NOTIFICATION"],
];

const getResourceType = (url) => {
  const match = RESOURCE_MAP.find(([prefix]) => url.startsWith(prefix));
  return match?.[1] || "API";
};

const getResourceId = (req) => {
  if (req.params?.id) {
    return req.params.id;
  }

  return null;
};

const getAction = (method, resourceType) =>
  `${method}_${resourceType}_REQUEST`;

export const auditRequestMiddleware = (req, res, next) => {
  if (!AUDITED_METHODS.has(req.method)) {
    return next();
  }

  if (req.originalUrl.startsWith("/api/v1/audit-logs")) {
    return next();
  }

  res.on("finish", () => {
    if (!req.user) {
      return;
    }

    const resourceType = getResourceType(req.originalUrl);
    const resourceId = getResourceId(req);

    void createAuditLogFromRequest({
      req,
      action: getAction(req.method, resourceType),
      resourceType,
      resourceId,
      success: res.statusCode < 400,
      statusCode: res.statusCode,
      message: `${req.method} ${req.originalUrl} completed with status ${res.statusCode}`,
      metadata: {
        route: req.route?.path || null,
        ticker: req.params?.ticker || null,
      },
    }).catch((error) => {
      console.error("[AUDIT LOG] Request audit middleware error:", error);
    });
  });

  next();
};
