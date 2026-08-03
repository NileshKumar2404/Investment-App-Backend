import express from 'express';
import {
  getCompanies,
  searchCompanies,
  getCompanyByTicker,
  saveCompany,
  deleteCompany,
} from '../controllers/companyController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', protect, getCompanies);
router.get('/search', protect, searchCompanies);
router.get('/:ticker', protect, getCompanyByTicker);
router.post('/', protect, saveCompany);
router.delete('/:ticker', protect, deleteCompany);

export default router;
