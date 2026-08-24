import express from 'express';
import { uploadMiddleware, uploadFileToCloudinary, handleUploadError, getCompanyDocuments, getDocumentDetails, downloadDocument, updateDocumentStatus, deleteDocument } from '../controllers/uploadController.js';
import { protect } from '../middleware/authMiddleware.js';
import { requireCompanyAccess } from '../middleware/companyAuthorization.middleware.js';

const router = express.Router();

router.post('/:ticker/documents', protect, requireCompanyAccess(), uploadMiddleware, handleUploadError, uploadFileToCloudinary);
router.get('/:ticker/documents', protect, requireCompanyAccess(), getCompanyDocuments)
router.get('/documents/:id', protect, getDocumentDetails)
router.get('/documents/:id/download', protect, downloadDocument)
router.patch('/documents/:id/status', protect, updateDocumentStatus)
router.patch('/documents/:id', protect, deleteDocument)

export default router;
