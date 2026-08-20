import AuditLog from "../models/auditLog.js";

export const writeAuditLog = async ({
  req,
  actorId = null,
  action,
  category = "SYSTEM",
  resourceType = "",
  resourceId = null,
  companyId = null,
  success = true,
  metadata = {},
}) => {
  try {
    await AuditLog.create({
      actorId: actorId || req?.user?._id || null,

      action,

      category,

      resourceType,

      resourceId,

      companyId,

      ipAddress: req?.ip || req?.headers?.["x-forwarded-for"] || "",

      userAgent: req?.headers?.["user-agent"] || "",

      success,

      metadata,
    });
  } catch (error) {
    /**
     * Audit logging should never crash the
     * business request.
     */
    console.error("Audit log error:", error.message);
  }
};
