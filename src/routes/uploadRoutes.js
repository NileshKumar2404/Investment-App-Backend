import express from 'express';
import { uploadMiddleware, uploadFileToCloudinary } from '../controllers/uploadController.js';
import { protect } from '../middleware/authMiddleware.js';
import { requireCompanyAccess } from '../middleware/companyAuthorization.middleware.js';

const router = express.Router();

router.post('/:ticker/documents', protect, requireCompanyAccess(), uploadMiddleware, uploadFileToCloudinary);

export default router;
