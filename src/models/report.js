import mongoose from 'mongoose';

const reportSchema = new mongoose.Schema({
    companyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Company',
        index: true,
        required: true
    },
    createdByUserId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    title: {
        type: String,
        required: true,
        trim: true,
        maxLength: 200
    },
    type: {
        type: String,
        required: true,
        enum: [
            'Financial',
            'Investment',
            'Risk',
            'Performance',
            'Valuation',
            'Assessment',
            'Compliance',
            'Other',
        ],
        index: true
    },
    description: {
        type: String,
        trim: true,
        maxLength: 200,
        default: ''
    },
    status: {
        type: String,
        enum: [
            'Draft',
            'Generating',
            'Ready',
            'Failed',
            'Archieved',
        ],
        default: 'Draft',
        index: true
    },
    period: {
        from: {
            type: Date
        },
        to: {
            type: Date
        }
    },
    generatedAt: {
        type: Date,
        default: null
    },
    metaData: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    storageKey: {
        type: String,
        default: null,
        select: false
    },
    originalFileName: {
        type: String,
        trim: true,
        maxLength: 255,
        default: null
    },
    mimeType: {
        type: String,
        trim: true,
        maxLength: 100,
        default: null
    },
    size: {
        type: Number,
        min: 0,
        default: null
    },
    isDeleted: {
        type: Boolean,
        default: false,
        index: true
    },
    deletedAt: {
        type: Date,
        default: null
    },
    deletedByUserId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    }
}, { timestamps: true });

reportSchema.index({
    companyId: 1,
    createdAt: -1,
});

reportSchema.index({
    companyId: 1,
    type: 1,
    status: 1,
});

reportSchema.pre( "validate", function (next) {
    if (
        this.period?.from &&
        this.period?.to &&
        this.period.from >
        this.period.to
    ) {
        return next(
            new Error(
            "Report period start date cannot be after the end date.",
            ),
        );
    }

    next();
});

export const Report = mongoose.model('Report', reportSchema);