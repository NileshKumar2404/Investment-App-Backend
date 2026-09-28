import redisClient, { connectRedis } from "../src/config/redis.js";

await connectRedis();

await redisClient.set("docker_test", "Redis is working");

const value = await redisClient.get("docker_test");

console.log("Redis test value:", value);

await redisClient.del("docker_test");

await redisClient.quit();