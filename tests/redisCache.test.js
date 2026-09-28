import redisClient, { connectRedis } from "../src/config/redis.js";
import {
  getCache,
  setCache,
  deleteCache,
} from "../src/services/redisCacheService.js";

await connectRedis();

const key = "test:redis-cache";

const testData = {
  name: "Startup IQ",
  status: "active",
};

await setCache(key, testData, 60);

const cachedData = await getCache(key);

console.log("Cached data:", cachedData);

await deleteCache(key);

const deletedData = await getCache(key);

console.log("After delete:", deletedData);

await redisClient.quit();