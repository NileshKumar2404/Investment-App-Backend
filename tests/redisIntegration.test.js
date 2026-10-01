import redisClient, { connectRedis, pingRedis, isRedisReady } from "../src/config/redis.js";
import {
  getCache,
  setCache,
  deleteCache,
  getOrSetCache,
  clearCacheByPattern,
  invalidateCompanyCache,
  getRedisHealth,
  CACHE_KEYS
} from "../src/services/redisCacheService.js";

async function runVerification() {
  console.log("=== STARTING COMPREHENSIVE REDIS VERIFICATION ===");
  
  // 1. Connect
  await connectRedis();
  console.log("1. isRedisReady():", isRedisReady());

  // 2. Ping
  const pingRes = await pingRedis();
  console.log("2. pingRedis():", pingRes);

  // 3. Set & Get
  const testKey = "test:verification:startup";
  const payload = { ticker: "TELEDU", name: "Teledu AI", round: "Series A", valuation: 15000000 };
  await setCache(testKey, payload, 30);
  const fetched = await getCache(testKey);
  console.log("3. getCache() match:", fetched.ticker === "TELEDU" && fetched.valuation === 15000000 ? "PASS" : "FAIL");

  // 4. Cache-aside getOrSetCache
  let dbCallCount = 0;
  const mockFetch = async () => {
    dbCallCount++;
    return { calculatedMetrics: [88, 92, 75], source: "db" };
  };

  const key2 = "test:verification:calc";
  await deleteCache(key2);

  const res1 = await getOrSetCache(key2, mockFetch, 60);
  console.log("4a. getOrSetCache first call (cache MISS):", res1.cached === false && dbCallCount === 1 ? "PASS" : "FAIL");

  const res2 = await getOrSetCache(key2, mockFetch, 60);
  console.log("4b. getOrSetCache second call (cache HIT):", res2.cached === true && dbCallCount === 1 ? "PASS" : "FAIL");

  // 5. Pattern Cleared
  await setCache("test:pattern:1", { id: 1 }, 30);
  await setCache("test:pattern:2", { id: 2 }, 30);
  await clearCacheByPattern("test:pattern:*");
  const p1 = await getCache("test:pattern:1");
  const p2 = await getCache("test:pattern:2");
  console.log("5. clearCacheByPattern():", p1 === null && p2 === null ? "PASS" : "FAIL");

  // 6. Domain Invalidation
  await setCache(CACHE_KEYS.companyDetail("TELEDU"), { active: true }, 60);
  await setCache(CACHE_KEYS.startupHealth("TELEDU"), { score: 94 }, 60);
  await invalidateCompanyCache("TELEDU", "usr_123");
  const c1 = await getCache(CACHE_KEYS.companyDetail("TELEDU"));
  const h1 = await getCache(CACHE_KEYS.startupHealth("TELEDU"));
  console.log("6. invalidateCompanyCache():", c1 === null && h1 === null ? "PASS" : "FAIL");

  // 7. Health Check
  const health = await getRedisHealth();
  console.log("7. getRedisHealth():", health.ready === true && health.ping.ready === true ? "PASS" : "FAIL", health);

  // Clean up
  await deleteCache(testKey);
  await deleteCache(key2);
  await redisClient.quit();

  console.log("=== ALL REDIS CHECKS COMPLETED SUCCESSFULLY ===");
}

runVerification().catch(err => {
  console.error("Verification failed:", err);
  process.exit(1);
});
