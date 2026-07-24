import { createClient } from 'redis';

export const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
  socket: {
    // Caching is best-effort: fail fast and don't keep retrying forever
    // when Redis is unreachable, instead of hanging every request.
    reconnectStrategy: false,
    connectTimeout: 2000,
  },
});

redisClient.on('error', (err) => {
  console.error('Redis client error:', err.message);
});

let connecting = null;

export function connectRedis() {
  if (redisClient.isOpen) {
    return Promise.resolve();
  }

  if (!connecting) {
    connecting = redisClient.connect().catch((err) => {
      connecting = null;
      throw err;
    });
  }

  return connecting;
}

// A held-open Redis connection keeps the event loop alive, which hangs
// `node --test` after all tests finish (it waits for the loop to drain
// instead of exiting). Test files that touch a real Redis must call this
// once they're done.
export async function closeRedis() {
  connecting = null;
  if (redisClient.isOpen) {
    await redisClient.quit();
  }
}
