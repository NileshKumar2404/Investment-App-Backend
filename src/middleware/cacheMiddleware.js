import { getCache, setCache, clearCacheByPattern, CACHE_KEYS } from "../services/redisCacheService.js";
import { isRedisReady } from "../config/redis.js";

/**
 * High-performance Redis Route Caching Middleware
 *
 * @param {number} ttlInSeconds - Time to live in seconds (default 300s = 5m)
 * @param {Function} customKeyBuilder - Optional custom function (req) => string
 */
export const cacheMiddleware = (ttlInSeconds = 300, customKeyBuilder = null) => {
  return async (req, res, next) => {
    // Only cache safe GET requests
    if (req.method !== "GET" || !isRedisReady()) {
      res.setHeader("X-Cache", "BYPASS");
      return next();
    }

    // Generate unique cache key based on route, query params, and user context
    const userIdentifier = req.user?._id ? String(req.user._id) : "public";
    const cacheKey = customKeyBuilder
      ? customKeyBuilder(req)
      : CACHE_KEYS.route(req.originalUrl || req.url, userIdentifier);

    try {
      const cached = await getCache(cacheKey);

      if (cached !== null && cached !== undefined) {
        res.setHeader("X-Cache", "HIT");
        res.setHeader("X-Cache-TTL", String(ttlInSeconds));
        return res.status(200).json(cached);
      }

      // Intercept res.json to capture and cache response payload
      res.setHeader("X-Cache", "MISS");
      const originalJson = res.json.bind(res);

      res.json = (body) => {
        // Restore original method
        res.json = originalJson;

        // Cache successful responses (2xx)
        if (res.statusCode >= 200 && res.statusCode < 300 && body) {
          setCache(cacheKey, body, ttlInSeconds).catch((err) => {
            console.error(`[Redis Middleware Error]: ${err.message}`);
          });
        }

        return originalJson(body);
      };

      next();
    } catch (error) {
      console.warn(`[Redis Cache Middleware]: ${error.message} - falling back to live handler`);
      next();
    }
  };
};

/**
 * Middleware to invalidate cache keys on successful mutations (POST, PUT, PATCH, DELETE)
 *
 * @param {string|string[]|Function} patterns - Pattern(s) or callback (req) => string[]
 */
export const invalidateCacheMiddleware = (patterns) => {
  return (req, res, next) => {
    res.on("finish", () => {
      // Only invalidate when the operation succeeded (2xx or 3xx)
      if (res.statusCode >= 200 && res.statusCode < 400 && isRedisReady()) {
        const resolvedPatterns = typeof patterns === "function" ? patterns(req) : patterns;
        const patternList = Array.isArray(resolvedPatterns) ? resolvedPatterns : [resolvedPatterns];

        patternList.filter(Boolean).forEach((pat) => {
          clearCacheByPattern(pat).catch((err) => {
            console.error(`[Cache Invalidation Error for ${pat}]:`, err.message);
          });
        });
      }
    });

    next();
  };
};

export default cacheMiddleware;
