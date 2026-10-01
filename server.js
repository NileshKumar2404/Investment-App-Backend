import dotenv from 'dotenv';
import app from './src/app.js';
import { connectDB } from './src/config/db.js';
import { connectRedis, disconnectRedis } from './src/config/redis.js';

// Load Environment Variables
dotenv.config();

const PORT = process.env.PORT || 3000;

// Connect to MongoDB and start HTTP Server
connectDB().then(async () => {
  try {
    await connectRedis();
  } catch (err) {
    console.warn('[Redis] Connection skipped:', err.message);
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`=======================================================`);
    console.log(`🚀 Investment Intelligence OS Backend Running`);
    console.log(`📡 PORT: ${PORT}`);
    console.log(`🌍 URL: http://localhost:${PORT}/api/v1/health`);
    console.log(`=======================================================`);
  });

  const handleShutdown = async (signal) => {
    console.log(`\n[Server] Received ${signal}. Initiating graceful shutdown...`);
    server.close(async () => {
      console.log('[Server] HTTP server closed');
      await disconnectRedis();
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => handleShutdown('SIGTERM'));
  process.on('SIGINT', () => handleShutdown('SIGINT'));
});
