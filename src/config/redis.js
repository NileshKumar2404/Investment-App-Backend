import { createClient } from 'redis';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

const redisClient = createClient({
  url: redisUrl,
  socket: {
    reconnectStrategy: (retries) => {
      // Exponential backoff capped at 3s, stop spamming after 10 attempts
      if (retries > 10) {
        console.warn('[Redis] Reconnection limit reached. Operating in bypass mode.');
        return false;
      }
      const delay = Math.min(retries * 200, 3000);
      return delay;
    },
    connectTimeout: 5000,
  }
});

redisClient.on('connect', () => {
  console.log('[Redis] Connecting...');
});

redisClient.on('ready', () => {
  console.log('[Redis] Ready and accepting commands');
});

redisClient.on('reconnecting', () => {
  console.warn('[Redis] Reconnecting...');
});

redisClient.on('end', () => {
  console.warn('[Redis] Connection closed');
});

redisClient.on('error', (error) => {
  console.error('[Redis Error]:', error.message);
});

/**
 * Connect to Redis gracefully without blocking server startup on failure
 */
export const connectRedis = async () => {
  if (redisClient.isOpen) {
    return redisClient;
  }

  try {
    await redisClient.connect();
    console.log(`[Redis] Connected successfully to ${redisUrl.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')}`);
    return redisClient;
  } catch (error) {
    console.warn(`[Redis] Connection failed: ${error.message}`);
    console.warn('[Redis] Application will operate with in-memory / cache-bypass mode.');
    return null;
  }
};

/**
 * Disconnect from Redis cleanly during server shutdown
 */
export const disconnectRedis = async () => {
  if (!redisClient.isOpen) {
    return;
  }

  try {
    await redisClient.quit();
    console.log('[Redis] Disconnected gracefully');
  } catch (err) {
    console.warn('[Redis] Force disconnect:', err.message);
    try {
      await redisClient.disconnect();
    } catch (e) {}
  }
};

/**
 * Check if Redis connection is active and ready
 */
export const isRedisReady = () => {
  return Boolean(redisClient.isReady);
};

/**
 * Ping Redis and measure roundtrip latency
 */
export const pingRedis = async () => {
  if (!redisClient.isReady) {
    return { ready: false, latencyMs: null };
  }

  try {
    const start = Date.now();
    const reply = await redisClient.ping();
    return {
      ready: true,
      reply,
      latencyMs: Date.now() - start
    };
  } catch (err) {
    return { ready: false, error: err.message, latencyMs: null };
  }
};

export default redisClient;