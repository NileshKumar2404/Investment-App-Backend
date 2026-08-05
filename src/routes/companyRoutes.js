import express from 'express';
import {
  getCompanies,
  searchCompanies,
  getCompanyByTicker,
  saveCompany,
  deleteCompany,
  updateSwot,
  updatePestle,
  getTeamMembers,
  addTeamMember,
} from '../controllers/companyController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', protect, getCompanies);
router.get('/search', protect, searchCompanies);
router.get('/:ticker', protect, getCompanyByTicker);
router.post('/', protect, saveCompany);
router.delete('/:ticker', protect, deleteCompany);

// Strategic Analysis Routes
router.post('/:ticker/swot', protect, updateSwot);
router.post('/:ticker/pestle', protect, updatePestle);

// Team Roster & Access Management Routes
router.get('/:ticker/members', protect, getTeamMembers);
router.post('/:ticker/members', protect, addTeamMember);

export default router;
