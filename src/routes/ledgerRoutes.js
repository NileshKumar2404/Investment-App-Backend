import express from 'express';
import { getTransactions, addTransaction, deleteTransaction } from '../controllers/ledgerController.js';
import { protect } from '../middleware/authMiddleware.js';
import { requireCompanyAccess, requrieCompanyPermission } from '../middleware/companyAuthorization.middleware.js'

const router = express.Router();

router.get('/:ticker', protect, requireCompanyAccess(), requrieCompanyPermission("VIEW"), getTransactions);
router.post('/:ticker', protect, requireCompanyAccess(), requrieCompanyPermission('CREATE'), addTransaction);
router.delete('/entry/:id', protect, deleteTransaction);

export default router;
