import express from 'express';
import { getTransactions, addTransaction, deleteTransaction } from '../controllers/ledgerController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/:ticker', protect, getTransactions);
router.post('/:ticker', protect, addTransaction);
router.delete('/entry/:id', protect, deleteTransaction);

export default router;
