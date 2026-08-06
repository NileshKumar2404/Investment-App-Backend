import express from 'express';
import { uploadMiddleware, uploadFileToCloudinary } from '../controllers/uploadController.js';

const router = express.Router();

router.post('/', uploadMiddleware, uploadFileToCloudinary);

export default router;
