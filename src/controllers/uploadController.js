import multer from 'multer';
import cloudinary from '../config/cloudinary.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';

const storage = multer.memoryStorage();

export const uploadMiddleware = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB max size
}).single('file');

export const uploadFileToCloudinary = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json(new ApiError(400, 'No document file provided for upload.'));
    }

    const sanitizedName = req.file.originalname.replaceAll(/[^a-zA-Z0-9_\.]/g, '_');

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: 'statutory_docs',
        resource_type: 'auto',
        public_id: `${Date.now()}_${sanitizedName}`,
      },
      (error, result) => {
        if (error) {
          console.error('Cloudinary API Upload Error:', error);
          return res.status(500).json(new ApiError(500, `Cloudinary upload failed: ${error.message}`));
        }

        return res.status(200).json(new ApiResponse(200, {
          fileName: req.file.originalname,
          size: `${(req.file.size / 1024).toFixed(1)} KB`,
          url: result.secure_url,
          publicId: result.public_id,
          format: result.format,
          resourceType: result.resource_type,
        }, 'File uploaded to Cloudinary successfully!'));
      }
    );

    uploadStream.end(req.file.buffer);
  } catch (error) {
    next(error);
  }
};
