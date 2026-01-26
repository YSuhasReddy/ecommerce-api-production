const Redis = require('ioredis');
const logger = require('./logger');

let redisClient = null;
let isRedisEnabled = false;

function initializeRedis() {
const redisUrl = process.env.REDIS_URL;

if (!redisUrl) {
logger.warn('Redis', 'REDIS_URL not configured, running without cache/distributed features');
isRedisEnabled = false;
return null;
}

try {
redisClient = new Redis(redisUrl, {
maxRetriesPerRequest: 3,
retryStrategy: (times) => {
const delay = Math.min(times * 50, 2000);
return delay;
},
enableReadyCheck: true,
lazyConnect: true,
});

redisClient.on('connect', () => {
logger.info('Redis', 'Connected to Redis server');
isRedisEnabled = true;
});

redisClient.on('ready', () => {
logger.info('Redis', 'Redis client is ready');
});

redisClient.on('error', (err) => {
logger.error('Redis', 'Redis connection error', { error: err.message });
isRedisEnabled = false;
});

redisClient.on('close', () => {
logger.warn('Redis', 'Redis connection closed');
isRedisEnabled = false;
});

redisClient.on('reconnecting', () => {
logger.info('Redis', 'Reconnecting to Redis...');
});

// Connect
redisClient.connect().catch((err) => {
logger.error('Redis', 'Failed to connect to Redis', { error: err.message });
isRedisEnabled = false;
});

return redisClient;
} catch (error) {
logger.error('Redis', 'Error initializing Redis', { error: error.message });
isRedisEnabled = false;
return null;
}
}

// Cache wrapper with fallback
async function getCached(key, fetchFn, ttl = 300) {
if (!isRedisEnabled || !redisClient) {
logger.debug('Cache', 'Cache disabled, fetching from source', { key });
return fetchFn();
}

try {
const cached = await redisClient.get(key);
if (cached) {
logger.debug('Cache', 'Cache hit', { key });
return JSON.parse(cached);
}

logger.debug('Cache', 'Cache miss', { key });
const data = await fetchFn();

// Don't cache null/undefined
if (data !== null && data !== undefined) {
await redisClient.setex(key, ttl, JSON.stringify(data));
}

return data;
} catch (error) {
logger.error('Cache', 'Cache error, falling back to source', {
key,
error: error.message,
});
return fetchFn();
}
}

// Invalidate cache keys
async function invalidateCache(...keys) {
if (!isRedisEnabled || !redisClient) {
return;
}

try {
if (keys.length > 0) {
await redisClient.del(...keys);
logger.debug('Cache', 'Cache invalidated', { keys });
}
} catch (error) {
logger.error('Cache', 'Error invalidating cache', {
keys,
error: error.message,
});
}
}

// Invalidate by pattern
async function invalidateCachePattern(pattern) {
if (!isRedisEnabled || !redisClient) {
return;
}

try {
const keys = await redisClient.keys(pattern);
if (keys.length > 0) {
await redisClient.del(...keys);
logger.debug('Cache', 'Cache pattern invalidated', { pattern, count: keys.length });
}
} catch (error) {
logger.error('Cache', 'Error invalidating cache pattern', {
pattern,
error: error.message,
});
}
}

// Close Redis connection
async function closeRedis() {
if (redisClient) {
try {
await redisClient.quit();
logger.info('Redis', 'Redis connection closed gracefully');
} catch (error) {
logger.error('Redis', 'Error closing Redis connection', { error: error.message });
}
}
}

// Get Redis client instance
function getRedisClient() {
return redisClient;
}

// Check if Redis is enabled
function isRedisAvailable() {
return isRedisEnabled && redisClient !== null;
}

module.exports = {
initializeRedis,
getCached,
invalidateCache,
invalidateCachePattern,
closeRedis,
getRedisClient,
isRedisAvailable,
};
