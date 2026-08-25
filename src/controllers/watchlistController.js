import mongoose from 'mongoose'

import { Watchlist } from '../models/watchlist.js'
import Company from '../models/Company.js'

import { ApiResponse } from '../utils/ApiResponse.js'
import { ApiError } from '../utils/ApiError.js'
import { asyncHandler } from '../utils/asyncHandler.js'

export const getMyWatchlist = asyncHandler(async(req, res) => {
    try {
        if (!req.user) {
            throw new ApiError(401, 'Authentication required. Please login.')
        }

        const watchlist = await Watchlist.find({
            userId: req.user._id
        }).populate({
            path: 'companyId',
            select: 'ticker companyName logo sector industry currentSharePrice valuation expectedROI'
        }).sort({
            createdAt: -1
        })

        return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                watchlist,
                'Watchlist retrieved successfully.'
            )
        )
    } catch (error) {
        console.log(`Failed to get watchlist: ${error}`);
        throw new ApiError(`Failed to get watchlist: ${error}`)
    }
});

export const getWatchHistory = asyncHandler(async(req, res) => {
    try {
        if (!req.user) {
            throw new ApiError(401, 'Authentication required. Please login.')
        }
    
        const ticker = String(req.params.ticker || '')
            .trim()
            .toUpperCase()
    
        if (!ticker) {
            throw new ApiError(400, 'Company ticker is required.')
        }
    
        const company = await Company.findOne({
            ticker
        }).select('_id ticker companyName logo sector industry currentSharePrice valuation expectedROI')
    
        if (!company) {
            throw new ApiError(404, 'Company not found.')
        }
    
        const watchlist = await Watchlist.findOne({
            userId: req.user._id,
            companyId: req.company._id
        }).populate({
            path: 'companyId',
            select: 'ticker companyName logo sector industry currentSharePrice valuation expectedROI'
        })
    
        if (!watchlist) {
            throw new ApiError(404, 'Company is not in your watchlist.')
        }
    
        return res
        .status(200)
        .json(new ApiResponse(
            200,
            watchlist,
            'Watchlist entry retrieved successfully.'
        ))
    } catch (error) {
        console.log(`Failed to get watchlist history: ${error}`);
        throw new ApiError(`Failed to get watchlist history: ${error}`)
    }
});

export const addToWatchlist = asyncHandler(async(req, res) => {
    try {
        if (!req.user) {
            throw new ApiError(401, 'Authentication required. Please login.')
        }

        const ticker = String(
            req.params.ticker || ""
        )
        .trim()
        .toUpperCase()

        if (!ticker) {
            throw new ApiError(400, 'Company ticker is required.')
        }

        const company = await Company.findOne({
            ticker
        }).select('_id ticker companyName logo sector industry currentSharePrice valuation expectedROI')

        if (!company) {
            throw new ApiError(401, `Company with ticker ${ticker} not found.`)
        }

        const note = String(
            req.body?.note || "",
        ).trim();


        if (note.length > 500) {
            throw new ApiError(400, 'Watchlist note cannot exceed 500 characters.')
        }

        const existing = await Watchlist.findOne({
            userId: req.user._id,
            companyId: company._id,
        });


        if (existing) {
            throw new ApiError(409, 'This company is already in your watchlist.')
        }


        const watchlist = await Watchlist.create({
            userId: req.user._id,
            companyId: company._id,
            note,
        });

        await watchlist.populate({
            path: "companyId",
            select: "ticker companyName logo sector industry currentSharePrice valuation expectedROI",
        });

        return res
        .status(201)
        .json( new ApiResponse(
                201,
                watchlist,
                "Company added to watchlist successfully.",
            ),
        );
    } catch (error) {
        console.log(`Failed to add watch history: ${error}`);
        throw new ApiError(`Failed to add watch history: ${error}`)
    }
});

export const updateWatchlistEntry = asyncHandler(async(req, res) => {
try {
        if (!req.user) {
            throw new ApiError(
                401,
                'Authentication required. Please login.'
            )
        }
    
        const ticker = String(
            req.params.ticker || ''
        )
        .trim()
        .toUpperCase()
    
        if (!ticker) {
            throw new ApiError(
                400,
                'Company ticker is required.'
            )
        }
    
        const company = await Company.findOne({
            ticker
        }).select(
            '_id ticker'
        )
    
        if (!company) {
            throw new ApiError(
                404,
                `Company with ticker ${ticker} not found.`
            )
        }
    
        const watchlist = await Watchlist.findOne({
            userId: req.user._id,
            companyId: req.company._id
        })
    
        if (!watchlist) {
            throw new ApiError(
                404,
                'Company is not in your watchlist.'
            )
        }
    
        if (req.body?.note === undefined) {
            throw new ApiError(
                400,
                'No watchlist fields were provided for update.'
            )
        }
    
        const note = String(
            req.body?.note || ''
        ).trim()
    
        if (note.length > 500) {
            throw new ApiError(
                400,
                'Watchlist note cannot exceed 500 characters.'
            )
        }
    
        watchlist.note = note
    
        await watchlist.save()
    
        await watchlist.populate({
            path: 'companyId',
            select: 'ticker companyName logo sector industry currentSharePrice valuation expectedROI'
        })
    
        return res
        .status(200)
        .json(new ApiResponse(
            200,
            watchlist,
            'Watchlist entry updated successfully.'
        ))
} catch (error) {
    console.log(`Failed to update watch history: ${error}`);
    throw new ApiError(`Failed to update watch history: ${error}`)
}
});

export const removeFromWatchlist = asyncHandler(async (req, res,) => {
    try {
        if (!req.user) {
            throw new ApiError(
                401,
                'Authentication required. Please login.'
            )
        }

        const ticker = String(
            req.params.ticker || "",
        )
            .trim()
            .toUpperCase();

        if (!ticker) {
            throw new ApiError(
                400,
                'Company ticker is required.'
            )    
        }

        const company = await Company.findOne({
            ticker,
        }).select(
            "_id ticker",
        );


        if (!company) {
            throw new ApiError(
                404,
                `Company with ticker ${ticker} not found.`
            )
        }

        const deleted = await Watchlist.findOneAndDelete({
            userId: req.user._id,
            companyId: company._id,
        });


        if (!deleted) {
            throw new ApiError(
                404,
                'Company is not in your watchlist.'
            )
        }

        return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                {
                    ticker: company.ticker,
                    companyId: company._id,
                },
                "Company removed from watchlist successfully.",
            ),
        );
    } catch (error) {
        console.log(`Failed to remove watch history: ${error}`);
        throw new ApiError(`Failed to remove watch history: ${error}`)
    }
});

export const getWatchlistStatus = asyncHandler(async(req, res) => {
    try {

        if (!req.user) {
            throw new ApiError(
                401,
                'Authentication required. Please login.'
            )
        }

        const ticker = String(
            req.params.ticker || "",
        )
            .trim()
            .toUpperCase();

        if (!ticker) {
            throw new ApiError(
                400,
                'Company ticker is required.'
            )
        }

        const company = await Company.findOne({
            ticker,
        }).select(
            "_id ticker",
        );


        if (!company) {
            throw new ApiError(
                404,
                `Company with ticker ${ticker} not found`
            )
        }

        const exists = await Watchlist.exists({
            userId: req.user._id,
            companyId: company._id,
        });

        return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                {
                    ticker: company.ticker,
                    companyId: company._id,
                    isWatchlisted: Boolean(exists),
                },
                "Watchlist status retrieved successfully.",
            ),
        );
    } catch (error) {
        console.log(`Failed to get watch history: ${error}`);
        throw new ApiError(`Failed to get watch history: ${error}`)
    }
});