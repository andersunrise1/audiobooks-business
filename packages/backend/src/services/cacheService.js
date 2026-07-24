import { createHash } from 'node:crypto';
import { redisClient, connectRedis } from '../config/redis.js';

const DEFAULT_TTL_SECONDS = 60 * 60 * 24; // 24h

export function hashKey(value) {
  return createHash('sha1').update(value).digest('hex');
}

export async function getCache(key) {
  try {
    await connectRedis();
    const raw = await redisClient.get(key);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    console.error(`Redis GET failed for "${key}", skipping cache:`, err.message);
    return null;
  }
}

export async function setCache(key, value, ttlSeconds = DEFAULT_TTL_SECONDS) {
  try {
    await connectRedis();
    await redisClient.set(key, JSON.stringify(value), { EX: ttlSeconds });
  } catch (err) {
    console.error(`Redis SET failed for "${key}", skipping cache:`, err.message);
  }
}

export async function deleteCache(key) {
  try {
    await connectRedis();
    await redisClient.del(key);
  } catch (err) {
    console.error(`Redis DEL failed for "${key}":`, err.message);
  }
}
