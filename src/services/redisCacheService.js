import redisClient from '../config/redis.js'

export const getCache = async(key) => {
    try {
        return await redisClient.get(key)
    } catch (error) {
        console.error(`[Redis GET error]: ${error.message}`);
        return null
    }
}

export const setCache = async (key, value, expirationInSeconds = 300) => {
    try {
        await redisClient.set(key, JSON.stringify(value), {
            EX: expirationInSeconds,
        });

        return true;
    } catch (error) {
        console.error(`[Redis SET Error]: ${error.message}`);
        return false;
    }
};

export const deleteCache = async (key) => {
    try {
        await redisClient.del(key);
        return true;
    } catch (error) {
        console.error(`[Redis DELETE Error]: ${error.message}`);
        return false;
    }
};