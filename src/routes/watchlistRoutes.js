import express from 'express'
import { protect } from '../middleware/authMiddleware.js'
import { addToWatchlist, getMyWatchlist, getWatchHistory, getWatchlistStatus, removeFromWatchlist, updateWatchlistEntry } from '../controllers/watchlistController.js';

const router = express.Router()

router.get("/", protect, getMyWatchlist)
router.get("/:ticker/status", protect, getWatchlistStatus)
router.get("/:ticker", protect, getWatchHistory)
router.post("/:ticker", protect, addToWatchlist)
router.patch("/:ticker", protect, updateWatchlistEntry)
router.delete("/:ticker", protect, removeFromWatchlist)

export default router