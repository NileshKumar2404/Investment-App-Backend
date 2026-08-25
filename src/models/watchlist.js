import mongoose from 'mongoose';

const watchlistSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    companyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Company',
        required: true,
        index: true
    },
    note: {
        type: String,
        trim: true,
        maxlength: 500,
        default: ''
    }
}, { timestamps: true });

watchlistSchema.index({
    userId: 1,
    companyId: 1
}, {unique: true})

watchlistSchema.index({
    userId: -1,
    createdAt: -1
})

export const Watchlist = mongoose.model('Watchlist', watchlistSchema);