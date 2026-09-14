import { asyncHandler } from '../utils/asyncHandler.js'
import { ApiResponse } from '../utils/ApiResponse.js'
import { ApiError } from '../utils/ApiError.js'
import { Report } from '../models/report.js'
import Company from '../models/Company.js'
import CompanyMember from '../models/CompanyMember.js'
import mongoose from 'mongoose'

const findCompanyByTicker = async (ticker) => {
    const normalizedTicker = String(ticker || '').trim().toUpperCase()

    if (!normalizedTicker) {
        throw new ApiError(400, 'Company ticker is required.')
    }

    const company = await Company.findOne({
        ticker: normalizedTicker,
    }).select('_id ticker companyName logo')

    if (!company) {
        throw new ApiError(
            404,
            `Company with ticker ${normalizedTicker} not found.`,
        )
    }

    return company
}

const verifyCompanyAccess = async (userId, companyId) => {
    const membership = await CompanyMember.findOne({
        userId,
        companyId,
        status: 'ACTIVE',
    })

    if (!membership) {
        throw new ApiError(
            403,
            'You do not have access to this company.',
        )
    }

    return membership
}

const findReportById = async (reportId) => {
    if (!reportId || !mongoose.Types.ObjectId.isValid(reportId)) {
        throw new ApiError(400, 'Invalid report ID.')
    }

    const report = await Report.findOne({
        _id: reportId,
        isDeleted: false,
    })

    if (!report) {
        throw new ApiError(404, 'Report not found.')
    }

    return report
}

const REPORT_MANAGEMENT_ROLES = [
    'OWNER',
    'FOUNDER',
    'CO_FOUNDER',
    'FINANCE',
]

export const getCompanyReports = asyncHandler(async (req, res) => {
    const company = await findCompanyByTicker(req.params.ticker)

    await verifyCompanyAccess(req.user._id, company._id)

    const filter = {
        companyId: company._id,
        isDeleted: false,
    }

    if (req.query.type) {
        filter.type = String(req.query.type).trim()
    }

    if (req.query.status) {
        filter.status = String(req.query.status).trim()
    }

    const reports = await Report.find(filter)
        .populate('createdByUserId', 'fullName email')
        .select('-storageKey')
        .sort({ createdAt: -1 })

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                company: {
                    id: company._id,
                    ticker: company.ticker,
                    companyName: company.companyName,
                },
                reports,
            },
            'Company reports retrieved successfully.',
        ),
    )
})

export const getReport = asyncHandler(async (req, res) => {
    const report = await findReportById(req.params.id)

    await verifyCompanyAccess(req.user._id, report.companyId)

    const result = await Report.findById(report._id)
        .populate('companyId', 'ticker companyName logo')
        .populate('createdByUserId', 'fullName email')
        .populate('deletedByUserId', 'fullName email')
        .select('-storageKey')

    return res.status(200).json(
        new ApiResponse(
            200,
            result,
            'Report retrieved successfully.',
        ),
    )
})

export const createReport = asyncHandler(async (req, res) => {
    const company = await findCompanyByTicker(req.params.ticker)

    const membership = await verifyCompanyAccess(
        req.user._id,
        company._id,
    )

    const companyRole = String(membership.roleOnCompany || '')
        .trim()
        .toUpperCase()

    if (!REPORT_MANAGEMENT_ROLES.includes(companyRole)) {
        throw new ApiError(
            403,
            'You are not authorized to create a report.',
        )
    }

    const {
        title,
        type,
        description,
        status,
        period,
        metadata,
    } = req.body

    if (!title || !String(title).trim()) {
        throw new ApiError(400, 'Report title is required.')
    }

    if (!type || !String(type).trim()) {
        throw new ApiError(400, 'Report type is required.')
    }

    const report = await Report.create({
        companyId: company._id,
        createdByUserId: req.user._id,
        title: String(title).trim(),
        type: String(type).trim(),
        description: String(description || '').trim(),
        status: status || 'Draft',
        period: period || {},
        metaData: metadata || {},
    })

    const result = await Report.findById(report._id)
        .populate('companyId', 'ticker companyName logo')
        .populate('createdByUserId', 'fullName email')
        .select('-storageKey')

    return res.status(201).json(
        new ApiResponse(
            201,
            result,
            'Report created successfully.',
        ),
    )
})

export const updateReport = asyncHandler(async (req, res) => {
    const report = await findReportById(req.params.id)

    const membership = await verifyCompanyAccess(
        req.user._id,
        report.companyId,
    )

    const companyRole = String(membership.roleOnCompany || '')
        .trim()
        .toUpperCase()

    if (!REPORT_MANAGEMENT_ROLES.includes(companyRole)) {
        throw new ApiError(
            403,
            'You are not authorized to update reports.',
        )
    }

    const allowedFields = [
        'title',
        'type',
        'description',
        'status',
        'period',
        'metaData',
        'generatedAt',
    ]

    const providedFields = Object.keys(req.body || {})
    const hasAllowedField = providedFields.some((field) =>
        allowedFields.includes(field),
    )

    if (!hasAllowedField) {
        throw new ApiError(
            400,
            'No valid report fields were provided for update.',
        )
    }

    for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
            report[field] = req.body[field]
        }
    }

    if (report.title && !String(report.title).trim()) {
        throw new ApiError(400, 'Report title is required.')
    }

    await report.save()

    const result = await Report.findById(report._id)
        .populate('companyId', 'ticker companyName logo')
        .populate('createdByUserId', 'fullName email')
        .select('-storageKey')

    return res.status(200).json(
        new ApiResponse(
            200,
            result,
            'Report updated successfully.',
        ),
    )
})

export const deleteReport = asyncHandler(async (req, res) => {
    const report = await findReportById(req.params.id)

    const membership = await verifyCompanyAccess(
        req.user._id,
        report.companyId,
    )

    const companyRole = String(membership.roleOnCompany || '')
        .trim()
        .toUpperCase()

    if (!REPORT_MANAGEMENT_ROLES.includes(companyRole)) {
        throw new ApiError(
            403,
            'You are not authorized to delete this report.',
        )
    }

    report.isDeleted = true
    report.deletedAt = new Date()
    report.deletedByUserId = req.user._id

    await report.save()

    return res.status(200).json(
        new ApiResponse(
            200,
            null,
            'Report deleted successfully.',
        ),
    )
})
