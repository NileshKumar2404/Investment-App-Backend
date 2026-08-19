import multer from "multer";
import cloudinary from "../config/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { set } from "mongoose";
import path from "path";

const storage = multer.memoryStorage();

const ALLOWED_MIME_TYPES = new set([
  "application/pdf",
  "image/jpeg",
  "image/png",
]);

const ALLOWED_EXTENSIONS = new set([".pdf", ".jpg", ".jpeg", ".png"]);

const fileFilter = (req, file, callback) => {
  try {
    const extension = path.extname(file.originalname).toLowerCase();

    const mimeType = file.mimeType.toLowerCase();

    const isValidMimeType = ALLOWED_MIME_TYPES.has(mimeType);

    const isValidExtenstion = ALLOWED_EXTENSIONS.has(extension);

    if (!isValidMimeType || !isValidExtension) {
      return callback(
        new ApiError(
          400,
          "Invalid file type. Only PDF, JPG, JPEG and PNG files are allowed.",
        ),
        false,
      );
    }

    callback(null, true);
  } catch (error) {
    callback(null, false);
  }
};

export const uploadMiddleware = multer({
  storage,
  limits: { fileSize: 3 * 1024 * 1024 },
  fileFilter,
}).single("file");

export const uploadFileToCloudinary = async (req, res, next) => {
  try {
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

    const documentType = req.body?.documentType?.trim();

    if (!documentType) {
      return res
        .status(400)
        .json(new ApiError(400, "Document type is required."));
    }

    const originalFileName = req.file.originalname;

    const extension = path.extname(originalFileName).toLowerCase();

    const mimeType = req.file.mimetype.toLowerCase();

    const fileSize = req.file.size;

    if (
      !ALLOWED_MIME_TYPES.has(mimeType) ||
      !ALLOWED_EXTENSIONS.has(extension)
    ) {
      return res
        .status(400)
        .json(
          new ApiError(
            400,
            "Invalid document format. Only PDF, JPG, JPEG and PNG files are allowed.",
          ),
        );
    }

    const MAX_FILE_SIZE = 3 * 1024 * 1024;

    if (fileSize > MAX_FILE_SIZE) {
      return res
        .status(400)
        .json(new ApiError(400, "File size cannot exceed 3 MB."));
    }

    const sanitizedName = originalFileName
      .replace(/[^a-zA-Z0-9_.-]/g, "_")
      .replace(/_+/g, "_");

    const baseName = path.basename(sanitizedName, extension);

    const companyId = req.company._id.toString();

    const publicId = `${Date.now()}_${baseName}`;

    const folder = `statutory_docs/company_${companyId}`;

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

    const document = await Document.create({
      companyId: req.company._id,

      /**
       * Always take uploader identity from
       * the authenticated JWT.
       */
      userId: req.user._id,

      documentType,

      documentName: req.body?.documentName?.trim() || baseName,

      originalFileName,

      /**
       * Do not expose a public URL.
       *
       * The document will be accessed through
       * an authorized document endpoint later.
       */
      fileUrl: "",

      cloudinaryPublicId: uploadResult.public_id,

      resourceType: uploadResult.resource_type || "raw",

      cloudinaryVersion: uploadResult.version || null,

      mimeType,

      fileSize,

      status: "ACTIVE",

      uploadedAt: new Date(),
    });

    return res.status(201).json(
      new ApiResponse(
        201,

        {
          document: {
            id: document._id,

            companyId: document.companyId,

            documentType: document.documentType,

            documentName: document.documentName,

            originalFileName: document.originalFileName,

            mimeType: document.mimeType,

            fileSize: document.fileSize,

            status: document.status,

            uploadedAt: document.uploadedAt,
          },
        },

        "Document uploaded successfully.",
      ),
    );
  } catch (error) {
    console.error("Document upload error:", error);

    next(error);
  }
};
