import mongoose from 'mongoose';

const documentSchema = new mongoose.Schema({
    companyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Company',
        required: true,
        index: true
    },
    uploadedByUserId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    originalFileName: {
        type: String,
        required: true,
        trim: true
    },
    storedFileName: {
        type: String,
        required: true,
        trim: true,
        unique: true
    },
    storageKey: {
        type: String,
        required: true,
        trim: true
    },
    category: {
        type: String,
        required: true,
        trim: true,
        index: true
    },
    mimeType: {
        type: String,
        required: true,
        trim: true
    },
    extension: {
        type: String,
        required: true,
        trim: true,
        lowercase: true
    },
    size: {
        type: Number,
        required: true,
        min: 1
    },
    status: {
        type: String,
        enum: [
            'Draft',
            'Submitted',
            'Pending',
            'Verified',
            'Rejected'
        ],
        default: 'Draft',
        index: true
    },
    reviewedByUserId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
    },
    reviewedAt: {
        type: Date,
        default: null,
    },
    reviewNotes: {
        type: String,
        trim: true,
        default: "",
    },
    isDeleted: {
        type: Boolean,
        default: false,
        index: true,
    },
    deletedByUserId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
    },
    deletedAt: {
        type: Date,
        default: null,
    },
}, { timestamps: true });

documentSchema.index({
    companyId: 1,
    isDeleted: 1,
    createdAt: -1,
});


// Documents uploaded by a particular user.
documentSchema.index({
    uploadedByUserId: 1,
    isDeleted: 1,
    createdAt: -1,
});


// Company + status filtering.
documentSchema.index({
    companyId: 1,
    status: 1,
    isDeleted: 1,
});


// Company + category filtering.
documentSchema.index({
    companyId: 1,
    category: 1,
    isDeleted: 1,
});


export const Document = mongoose.model('Document', documentSchema);
