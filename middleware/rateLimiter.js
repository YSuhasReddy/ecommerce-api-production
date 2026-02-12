const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const logger = require('../utils/logger');
const { getRedisClient, isRedisAvailable } = require('../utils/redisClient');

// Fallback in-memory store for when Redis is not available
class MemoryStore {
constructor() {
this.hits = new Map();
this.resetTime = new Map();

// Cleanup old entries every minute
setInterval(() => {
const now = Date.now();
for (const [key, resetAt] of this.resetTime.entries()) {
if (now > resetAt) {
this.hits.delete(key);
this.resetTime.delete(key);
}
}
}, 60 * 1000);
}

async increment(key) {
const now = Date.now();
const windowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10);

if (!this.resetTime.has(key) || now > this.resetTime.get(key)) {
this.hits.set(key, 1);
this.resetTime.set(key, now + windowMs);
return {
totalHits: 1,
resetTime: new Date(now + windowMs),
};
}

const hits = (this.hits.get(key) || 0) + 1;
this.hits.set(key, hits);

return {
totalHits: hits,
resetTime: new Date(this.resetTime.get(key)),
};
}

async decrement(key) {
const hits = Math.max(0, (this.hits.get(key) || 1) - 1);
this.hits.set(key, hits);
}

async resetKey(key) {
this.hits.delete(key);
this.resetTime.delete(key);
}
}

const memoryStore = new MemoryStore();

// Create rate limiter with Redis or fallback to memory
function createRateLimiterMiddleware(options = {}) {
const windowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10);
const max = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10);

const config = {
windowMs: options.windowMs || windowMs,
max: options.max || max,
standardHeaders: true,
legacyHeaders: false,
handler: (req, res) => {
const { recordRateLimitExceeded } = require('../utils/metrics');
logger.warn('RateLimiter', 'Rate limit exceeded', {
ip: req.ip,
path: req.path,
});
recordRateLimitExceeded(req.ip || 'unknown');
res.status(429).json({
success: false,
error: 'Too many requests, please try again later',
retryAfter: Math.ceil((req.rateLimit?.resetTime?.getTime() - Date.now()) / 1000) || 60,
});
},
skip: (req) => {
// Skip rate limiting for health checks
return req.path === '/health' || req.path === '/metrics' || req.path === '/api-tester';
},
validate: { trustProxy: false },
};

// Use Redis if available
if (isRedisAvailable()) {
const redis = getRedisClient();
logger.info('RateLimiter', 'Using Redis-based rate limiter');
config.store = new RedisStore({
client: redis,
prefix: 'rl:',
sendCommand: (...args) => redis.call(...args),
});
} else {
// Fallback to memory store
logger.warn('RateLimiter', 'Redis not available, using in-memory rate limiter (not recommended for production)');
config.store = memoryStore;
}

return rateLimit(config);
}

// Global rate limiter middleware
const globalRateLimiterMiddleware = createRateLimiterMiddleware();

module.exports = {
createRateLimiterMiddleware,
globalRateLimiterMiddleware,
};
