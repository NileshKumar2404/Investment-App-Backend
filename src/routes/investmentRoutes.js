import express from 'express'
import { protect, authorizeRoles } from '../middleware/authMiddleware.js'
import { createInvestment, deleteInvestment, getCompanyInvestments, getMyInvestments, getMyPortfolio, updateInvestment } from '../controllers/investmentController.js';
import { 
    requireCompanyAccess,
    requireCompanyPermission
} from '../middleware/companyAuthorization.middleware.js'

const router = express.Router()

router.route('/my').get(protect, authorizeRoles('investor', 'admin', 'super_admin'), getMyInvestments)
router.route('/my/portfolio').get(protect, authorizeRoles('investor', 'admin', 'super_admin'), getMyPortfolio)
router.route('/company/:ticker').get(protect, getCompanyInvestments)
router.route('/:ticker').post(protect, requireCompanyAccess(), requireCompanyPermission('CREATE'), createInvestment)
router.route('/:id').put(protect, updateInvestment)
router.route('/:id').delete(protect, deleteInvestment)

export default router