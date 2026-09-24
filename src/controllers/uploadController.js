import { createAuditLogFromRequest } from "./auditLogController.js";
import multer from "multer";
import cloudinary from "../config/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import path from "path";
import { Document } from "../models/document.js";
import crypto from "crypto";
import mongoose from "mongoose";
import CompanyMember from "../models/CompanyMember.js";
import Company from "../models/Company.js";

const storage = multer.memoryStorage();

const MAX_FILE_SIZE = 3 * 1024 * 1024;

const ALLOWED_FILE_TYPES = {
  ".pdf": ["application/pdf"],

  ".docx": [
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ],

  ".xlsx": [
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ],

  ".csv": ["text/csv", "application/csv", "application/vnd.ms-excel"],

  ".png": ["image/png"],

  ".jpg": ["image/jpeg"],

  ".jpeg": ["image/jpeg"],
};

const ALLOWED_MIME_TYPES = ["application/pdf", "image/jpeg", "image/png"];

const ALLOWED_EXTENSIONS = Object.keys(ALLOWED_FILE_TYPES);

const fileFilter = (req, file, callback) => {
  try {
    const extension = path.extname(file.originalname).toLowerCase();

    const mimeType = String(file.mimetype || "")
      .trim()
      .toLowerCase();

    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      return callback(
        new ApiError(
          400,
          "Invalid file extension. Allowed formats are PDF, DOCX, XLSX, CSV, PNG, JPG and JPEG.",
        ),
        false,
      );
    }

    const allowedMimeTypes = ALLOWED_FILE_TYPES[extension] || [];

    if (!allowedMimeTypes.includes(mimeType)) {
      return callback(
        new ApiError(
          400,
          "Invalid file MIME type for the selected file extension.",
        ),
        false,
      );
    }

    return callback(null, true);
  } catch (error) {
    return callback(
      new ApiError(400, "Unable to validate uploaded file."),
      false,
    );
  }
};

const sanitizeFileName = (fileName) => {
  return String(fileName || "")
    .replace(/[^a-zA-Z0-9_.-]/g, "_")
    .replace(/_+/g, "_")
    .trim();
};

const generateStoredFileName = (originalFileName, extension) => {
  const sanitized = sanitizeFileName(originalFileName);

  const baseName = path.basename(sanitized, extension);

  const randomId = crypto.randomBytes(16).toString("hex");

  return `${baseName}_${Date.now()}_${randomId}${extension}`;
};

export const uploadMiddleware = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter,
}).single("file");

export const uploadFileToCloudinary = async (req, res, next) => {
  try {
    if (!req.user) {
      return next(new ApiError(401, "Authentication required."));
    }

    if (!req.file) {
      return res
        .status(400)
        .json(new ApiError(400, "No document file provided for upload."));
    }

    if (!req.company || !req.company._id) {
      return res
        .status(403)
        .json(
          new ApiError(403, "Company access is required to upload documents."),
        );
    }

    const category = String(
      req.body?.category || req.body?.documentType || "",
    ).trim();

    if (!category) {
      return next(new ApiError(400, "Document category is required."));
    }

    const originalFileName = req.file.originalname;

    const extension = path.extname(originalFileName).toLowerCase();

    const mimeType = String(req.file.mimetype || "")
      .trim()
      .toLowerCase();

    const fileSize = req.file.size;

    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      return res
        .status(400)
        .json(
        new ApiError(
          400,
          "Invalid document format. Allowed formats are PDF, DOCX, XLSX, CSV, PNG, JPG and JPEG.",
        ),
        );
    }

    const allowedMimeTypes = ALLOWED_FILE_TYPES[extension] || [];

    if (!allowedMimeTypes.includes(mimeType)) {
      return next(new ApiError(400, "Invalid document MIME type."));
    }

    if (!Number.isFinite(fileSize) || fileSize <= 0) {
      return next(new ApiError(400, "Invalid file size."));
    }

    if (fileSize > MAX_FILE_SIZE) {
      return next(new ApiError(400, "File size cannot exceed 3 MB."));
    }

    const storedFileName = generateStoredFileName(originalFileName, extension);

    const companyId = req.company._id.toString();

    const folder = `document/company_${companyId}`;

    const publicId = path.basename(storedFileName, extension);

    const uploadResult = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,

          /**
           * Keep the actual resource type based
           * on the uploaded document.
           */
          resource_type: "auto",

          /**
           * IMPORTANT:
           *
           * Authenticated delivery prevents the
           * document from being available through
           * an unrestricted public Cloudinary URL.
           */
          type: "authenticated",

          public_id: publicId,
        },

        (error, result) => {
          if (error) {
            return reject(error);
          }

          resolve(result);
        },
      );

      uploadStream.end(req.file.buffer);
    });

    const storageKey = uploadResult.public_id;

    const document = await Document.create({
      companyId: req.company._id,

      uploadedByUserId: req.user._id,

      originalFileName,

      storedFileName,

      storageKey,

      category,

      mimeType,

      extension,

      size: fileSize,

      /**
       * Newly uploaded documents start
       * in Pending state.
       *
       * Reviewer can later move them to:
       *
       * Verified
       * Rejected
       */
      status: "Pending",
    });

    return res.status(201).json(
      new ApiResponse(
        201,

        {
          document: {
            id: document._id,

            companyId: document.companyId,

            uploadedByUserId: document.uploadedByUserId,

            originalFileName: document.originalFileName,

            category: document.category,

            mimeType: document.mimeType,

            extension: document.extension,

            size: document.size,

            status: document.status,

            createdAt: document.createdAt,
          },
        },

        "Document uploaded successfully.",
      ),
    );
  } catch (error) {
    console.error("Document upload error:", error);

    return next(
      error instanceof ApiError
        ? error
        : new ApiError(500, "Document upload failed."),
    );
  }
};

export const handleUploadError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return next(new ApiError(400, "File size cannot exceed 3 MB."));
    }
    return next(new ApiError(400, `File upload error: ${error.message}`));
  }

  return next(error);
};

const getDocumentById = async (documentId) => {
  if (!documentId || !mongoose.Types.ObjectId.isValid(documentId)) {
    throw new ApiError(400, "Invalid document ID.");
  }

  const document = await Document.findOne({
    _id: documentId,
    isDeleted: false,
  });

  if (!document) {
    throw new ApiError(404, "Document not found.");
  }

  return document;
};

const verifyDocumentCompanyAccess = async (userOrId, companyId) => {
  const userId = userOrId?._id || userOrId;
  const userRole = userOrId?.role || "";

  const membership = await CompanyMember.findOne({
    userId,
    companyId,
    status: "ACTIVE",
  });

  if (membership) {
    return membership;
  }

  const company = await Company.findById(companyId);
  if (!company) {
    throw new ApiError(404, "Company not found.");
  }

  // If user is registered company owner
  if (company.userId && String(company.userId) === String(userId)) {
    return {
      userId,
      companyId,
      roleOnCompany: "OWNER",
      status: "ACTIVE",
    };
  }

  // Platform admins have full management access
  if (["admin", "super_admin"].includes(userRole)) {
    return {
      userId,
      companyId,
      roleOnCompany: "OWNER",
      status: "ACTIVE",
    };
  }

  // Preset companies or authorized investment viewers have read access
  if (company.isPreset || ["investor", "analyst", "advisor"].includes(userRole)) {
    return {
      userId,
      companyId,
      roleOnCompany: "VIEWER",
      status: "ACTIVE",
    };
  }

  throw new ApiError(
    403,
    "You do not have access to this company's documents.",
  );
};

export const getCompanyDocuments = async (req, res, next) => {
  try {
    if (!req.user) {
      return next(new ApiError(401, "Authentication required"));
    }

    if (!req.company || !req.company._id) {
      return next(new ApiError(403, "Company access is required."));
    }

    const { category, status } = req.query;

    const filter = {
      companyId: req.company._id,
      isDeleted: false,
    };

    if (category) {
      filter.category = String(category).trim();
    }

    if (status) {
      const allowedStatuses = [
        "Draft",
        "Submitted",
        "Pending",
        "Verified",
        "Rejected",
      ];

      if (!allowedStatuses.includes(String(status).trim())) {
        return next(new ApiError(400, "Invalid document status."));
      }

      filter.status = String(status).trim();
    }

    const documents = await Document.find(filter)
      .populate("uploadedByUserId", "fullName email")
      .populate("reviewedByUserId", "fullName email")
      .select("-storageKey")
      .sort({
        createdAt: -1,
      });

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          documents,
          "Company documents reterieved successfully.",
        ),
      );
  } catch (error) {
    return next(error);
  }
};

export const getDocumentDetails = async (req, res, next) => {
  try {
    if (!req.user) {
      return next(new ApiError(401, "Authentication required."));
    }

    const document = await getDocumentById(req.params.id);

    await verifyDocumentCompanyAccess(req.user, document.companyId);

    const result = await Document.findById(document._id)
      .populate("uploadedByUserId", "fullName email")
      .populate("reviewedByUserId", "fullName email")
      .select("-storageKey");

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          result,
          "Document details retrieved successfully.",
        ),
      );
  } catch (error) {
    return next(error);
  }
};

export const downloadDocument = async (req, res, next) => {
  try {
    if (!req.user) {
      return next(new ApiError(401, "Authentication required."));
    }

    const document = await getDocumentById(req.params.id);

    await verifyDocumentCompanyAccess(req.user, document.companyId);

    if (!document.storageKey) {
      return next(new ApiError(404, "Document storage reference not found"));
    }

    const downloadUrl = cloudinary.url(document.storageKey, {
      resource_type: document.extension === ".pdf" ? "raw" : "auto",

      type: "authenticated",
      secure: true,
      sign_url: true,
      attachment: false,
    });

    void createAuditLogFromRequest({
      req,
      action: "DOWNLOAD_DOCUMENT",
      resourceType: "DOCUMENT",
      resourceId: document._id,
      companyId: document.companyId,
      message: `User downloaded document ${document.originalFileName}`,
      metadata: {
        fileName: document.originalFileName,
        mimeType: document.mimeType,
        size: document.size,
      },
    }).catch((err) => console.error("Audit log error:", err));

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          url: downloadUrl,

          fileName: document.originalFileName,

          mimeType: document.mimeType,

          size: document.size,
        },
        "Authorized document URL generated successfully.",
      ),
    );
  } catch (error) {
    return next(error);
  }
};

export const updateDocumentStatus = async (req, res, next) => {
  try {
    if (!req.user) {
      return next(new ApiError(401, "Authentication required."));
    }

    const document = await getDocumentById(req.params.id);

    const membership = await verifyDocumentCompanyAccess(
      req.user,
      document.companyId,
    );

    const { status, reviewNotes } = req.body;

    const allowedStatuses = [
      "Draft",
      "Submitted",
      "Pending",
      "Verified",
      "Rejected",
    ];

    if (!status || !allowedStatuses.includes(String(status).trim())) {
      return next(new ApiError(400, "A valid document status is required."));
    }

    const nextStatus = String(status).trim();

    const managementRoles = ["OWNER", "MEMBER", "CO_FOUNDER", "FINANCE"];

    const companyRole = String(membership.roleOnCompany || "")
      .trim()
      .toUpperCase();

    if (
      (nextStatus === "Verified" || nextStatus === "Rejected") &&
      !managementRoles.includes(companyRole)
    ) {
      return next(
        new ApiError(
          403,
          "You do not have permission to review this document.",
        ),
      );
    }

    document.status = nextStatus;

    if (nextStatus === "Verified" || nextStatus === "Rejected") {
      document.reviewedByUserId = req.user._id;

      document.reviewedAt = new Date();

      document.reviewNotes = String(reviewNotes || "").trim();
    }

    await document.save();

    const response = await Document.findById(document._id)
      .populate("uploadedByUserId", "fullName email")
      .populate("reviewedByUserId", "fullName email")
      .select("-storageKey");

    return res
      .status(200)
      .json(
        new ApiResponse(200, response, "Document status updated successfully."),
      );
  } catch (error) {
    return next(error);
  }
};

export const deleteDocument = async (req, res, next) => {
  try {
    if (!req.user) {
      return next(new ApiError(401, "Authentication required."));
    }

    const document = await getDocumentById(req.params.id);

    const membership = await verifyDocumentCompanyAccess(
      req.user,
      document.companyId,
    );

    const managementRoles = ["OWNER", "FOUNDER", "CO_FOUNDER", "FINANCE"];

    const companyRole = String(membership.roleOnCompany || "")
      .trim()
      .toUpperCase();

    if (!managementRoles.includes(companyRole)) {
      return next(
        new ApiError(
          403,
          "You do not have permission to delete this document.",
        ),
      );
    }

    document.isDeleted = true;

    document.deletedByUserId = req.user._id;

    document.deletedAt = new Date();

    await document.save();

    return res
      .status(200)
      .json(new ApiResponse(200, null, "Document deleted successfully."));
  } catch (error) {
    return next(error);
  }
};
