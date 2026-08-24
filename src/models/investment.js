import mongoose from 'mongoose'

const investmentSchema = new mongoose.Schema({
    investorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    companyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Company",
        required: true,
        index: true,
    },
    amount: {
        type: Number,
        required: true,
        min: [
            0.01,
            "Investment amount must be greater than 0.",
        ],
    },
    equity: {
        type: Number,
        required: true,
        min: 0,
        max: 100,
    },
    investmentDate: {
        type: Date,
        required: true,
        default: Date.now,
        index: true,
    },
    currentValue: {
        type: Number,
        required: true,
        min: 0,
    },
    roi: {
        type: Number,
        default: 0,
    },
    status: {
        type: String,
        required: true,
        trim: true,
        enum: [
            'Active',
            'Exited',
            'Pending'
        ],
        default: 'Active',
        index: true
    },
    round: {
        type: String,
        trim: true,
        default: "",
    },
},{timestamps: true})

investmentSchema.index({
    investorId: 1,
    investmentDate: -1,
});

investmentSchema.index({
    companyId: 1,
    investmentDate: -1,
});

investmentSchema.index({
    investorId: 1,
    status: 1,
});

investmentSchema.index({
    companyId: 1,
    status: 1,
});

export const Investment = mongoose.model('Investment', investmentSchema)