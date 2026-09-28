import dotenv from 'dotenv';
import app from './src/app.js';
import { connectDB } from './src/config/db.js';
import { connectRedis } from './src/config/redis.js'

// Load Environment Variables
dotenv.config();

const PORT = process.env.PORT || 3000;

// Connect to MongoDB and start HTTP Server
connectDB().then(async() => {
  await connectRedis()

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`=======================================================`);
    console.log(`🚀 Investment Intelligence OS Backend Running`);
    console.log(`📡 PORT: ${PORT}`);
    console.log(`🌍 URL: http://localhost:${PORT}/api/v1/health`);
    console.log(`=======================================================`);
  });
});
