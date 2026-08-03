import mongoose from 'mongoose';

export const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/investment_os');
    console.log(`[MongoDB] Connected successfully: ${conn.connection.host}`);
  } catch (error) {
    console.error(`[MongoDB Connection Error]: ${error.message}`);
    // If local MongoDB is not running, log instructions
    console.warn(`[MongoDB Warning]: Ensure MongoDB service is running locally or provide a MongoDB Atlas cloud URI in backend/.env`);
  }
};
