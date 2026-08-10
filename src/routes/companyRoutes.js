import express from 'express';
import {
  getCompanies,
  searchCompanies,
  getCompanyByTicker,
  saveCompany,
  deleteCompany,
  getKyc,
  updateKyc,
  getFunding,
  updateFunding,
  updateSwot,
  updatePestle,
  submitAssessment,
  getTeamMembers,
  addTeamMember,
  getTimeline,
} from '../controllers/companyController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', protect, getCompanies);
router.get('/search', protect, searchCompanies);
router.get('/:ticker', protect, getCompanyByTicker);
router.post('/', protect, saveCompany);
router.delete('/:ticker', protect, deleteCompany);

// KYC Statutory Registration Routes
router.get('/:ticker/kyc', protect, getKyc);
router.put('/:ticker/kyc', protect, updateKyc);

// Funding & Investment Profile Routes
router.get('/:ticker/funding', protect, getFunding);
router.put('/:ticker/funding', protect, updateFunding);

// Strategic Analysis Routes
router.post('/:ticker/swot', protect, updateSwot);
router.post('/:ticker/pestle', protect, updatePestle);

// Founder Competency Assessment Routes
router.post('/:ticker/assessment', protect, submitAssessment);

// Team Roster & Access Management Routes
router.get('/:ticker/members', protect, getTeamMembers);
router.post('/:ticker/members', protect, addTeamMember);

// Activity Timeline Log Route
router.get('/:ticker/timeline', protect, getTimeline);

export default router;
