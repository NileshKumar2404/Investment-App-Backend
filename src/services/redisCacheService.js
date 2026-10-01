import redisClient, { isRedisReady, pingRedis } from "../config/redis.js";

const CACHE_PREFIX = "startup-iq";

/**
 * Standardized Cache Key Builder
 */
export const buildCacheKey = (key) => {
  return `${CACHE_PREFIX}:${key}`;
};

/**
 * Common Domain Cache Key Factories
 */
export const CACHE_KEYS = {
  // Company & Telemetry
  companiesList: (userId) => `companies:user:${userId || "all"}`,
  companyDetail: (ticker) => `company:${String(ticker).toUpperCase()}`,
  companyKyc: (ticker) => `kyc:${String(ticker).toUpperCase()}`,
  companyFunding: (ticker) => `funding:${String(ticker).toUpperCase()}`,
  companySwot: (ticker) => `swot:${String(ticker).toUpperCase()}`,
  startupHealth: (ticker) => `health:${String(ticker).toUpperCase()}`,
  startupProfile: (ticker) => `profile:${String(ticker).toUpperCase()}`,
  metricRelationships: (ticker) => `metrics:${String(ticker).toUpperCase()}`,

  // Learning & Curriculum
  curriculumSummary: () => `learning:summary`,
  learningCategories: () => `learning:categories`,
  learningLessons: (category, difficulty) =>
    `learning:lessons:${category || "all"}:${difficulty || "all"}`,
  learningLesson: (id) => `learning:lesson:${id}`,

  // Marketing & Indexes
  marketingTerms: () => `marketing:terms`,

  // System & Route Cache
  route: (url, userKey = "anon") => `route:${url}:u:${userKey}`,
};

/**
 * Retrieve cached JSON object from Redis
 */
export const getCache = async (key) => {
  try {
    if (!isRedisReady()) {
      return null;
    }

    const cacheKey = buildCacheKey(key);
    const value = await redisClient.get(cacheKey);

    if (value === null) {
      return null;
    }

    return JSON.parse(value);
  } catch (error) {
    console.error(`[Redis GET Error]: ${error.message}`);
    return null;
  }
};

/**
 * Store a serializable value into Redis with TTL expiration
 */
export const setCache = async (key, value, expirationInSeconds = 300) => {
  try {
    if (!isRedisReady() || value === undefined) {
      return false;
    }

    const cacheKey = buildCacheKey(key);
    await redisClient.set(cacheKey, JSON.stringify(value), {
      EX: expirationInSeconds,
    });

    return true;
  } catch (error) {
    console.error(`[Redis SET Error]: ${error.message}`);
    return false;
  }
};

/**
 * Delete a specific cache key
 */
export const deleteCache = async (key) => {
  try {
    if (!isRedisReady()) {
      return false;
    }

    const cacheKey = buildCacheKey(key);
    await redisClient.del(cacheKey);
    return true;
  } catch (error) {
    console.error(`[Redis DELETE Error]: ${error.message}`);
    return false;
  }
};

/**
 * Delete multiple keys at once
 */
export const deleteCacheKeys = async (keys = []) => {
  try {
    if (!isRedisReady() || !Array.isArray(keys) || keys.length === 0) {
      return 0;
    }

    const fullKeys = keys.map((k) => (k.startsWith(CACHE_PREFIX) ? k : buildCacheKey(k)));
    return await redisClient.del(fullKeys);
  } catch (error) {
    console.error(`[Redis BATCH DELETE Error]: ${error.message}`);
    return 0;
  }
};

/**
 * Cache-aside pattern: Fetch from cache or execute fallback loader and cache result
 */
export const getOrSetCache = async (
  key,
  fetchFunction,
  expirationInSeconds = 300
) => {
  const cachedValue = await getCache(key);

  if (cachedValue !== null) {
    return {
      data: cachedValue,
      cached: true,
    };
  }

  const freshValue = await fetchFunction();

  if (freshValue !== null && freshValue !== undefined) {
    await setCache(key, freshValue, expirationInSeconds);
  }

  return {
    data: freshValue,
    cached: false,
  };
};

/**
 * Clear all cache keys matching a pattern (e.g. "company:TELEDU*" or "learning:*")
 */
export const clearCacheByPattern = async (pattern) => {
  try {
    if (!isRedisReady()) {
      return false;
    }

    const searchPattern = buildCacheKey(pattern.endsWith("*") ? pattern : `${pattern}*`);
    const keys = [];

    for await (const chunk of redisClient.scanIterator({
      MATCH: searchPattern,
      COUNT: 100,
    })) {
      if (Array.isArray(chunk)) {
        keys.push(...chunk);
      } else if (typeof chunk === "string") {
        keys.push(chunk);
      }
    }

    if (keys.length === 0) {
      return true;
    }

    const flatKeys = keys.filter((k) => typeof k === "string");
    if (flatKeys.length > 0) {
      await redisClient.del(flatKeys);
    }
    console.log(`[Redis] Cleared ${flatKeys.length} keys matching: ${searchPattern}`);
    return true;
  } catch (error) {
    console.error(`[Redis PATTERN DELETE Error]: ${error.message}`);
    return false;
  }
};

/**
 * Invalidate all cache layers related to a specific startup/company
 */
export const invalidateCompanyCache = async (ticker, userId = null) => {
  if (!ticker) return;
  const cleanTicker = String(ticker).toUpperCase();

  await Promise.allSettled([
    deleteCache(CACHE_KEYS.companyDetail(cleanTicker)),
    deleteCache(CACHE_KEYS.companyKyc(cleanTicker)),
    deleteCache(CACHE_KEYS.companyFunding(cleanTicker)),
    deleteCache(CACHE_KEYS.companySwot(cleanTicker)),
    deleteCache(CACHE_KEYS.startupHealth(cleanTicker)),
    deleteCache(CACHE_KEYS.startupProfile(cleanTicker)),
    deleteCache(CACHE_KEYS.metricRelationships(cleanTicker)),
    clearCacheByPattern(`route:*/companies/${cleanTicker}*`),
    clearCacheByPattern(`route:*/startup-health/${cleanTicker}*`),
    clearCacheByPattern(`route:*/startup-profile/${cleanTicker}*`),
    clearCacheByPattern(`route:*/metric-relationships/${cleanTicker}*`),
    // Invalidate company lists
    clearCacheByPattern("companies:user:*"),
    clearCacheByPattern("route:*/companies*"),
  ]);

  if (userId) {
    await deleteCache(CACHE_KEYS.companiesList(userId));
  }
};

/**
 * Return Redis diagnostic stats and health
 */
export const getRedisHealth = async () => {
  const ready = isRedisReady();
  const ping = await pingRedis();

  let keysCount = 0;
  if (ready) {
    try {
      let count = 0;
      for await (const chunk of redisClient.scanIterator({
        MATCH: `${CACHE_PREFIX}:*`,
        COUNT: 100,
      })) {
        const batch = Array.isArray(chunk) ? chunk : [chunk];
        count += batch.length;
        if (count > 500) break; // cap inspection
      }
      keysCount = count;
    } catch (e) {}
  }

  return {
    ready,
    ping,
    prefix: CACHE_PREFIX,
    activeKeysEstimate: keysCount,
  };
};

export default {
  getCache,
  setCache,
  deleteCache,
  deleteCacheKeys,
  getOrSetCache,
  clearCacheByPattern,
  invalidateCompanyCache,
  getRedisHealth,
  CACHE_KEYS,
  buildCacheKey,
};
