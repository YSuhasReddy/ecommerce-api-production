const promClient = require('prom-client');
const logger = require('./logger');

// Create a Registry
const register = new promClient.Registry();

// Add default metrics (CPU, memory, etc.)
promClient.collectDefaultMetrics({
register,
prefix: 'ecommerce_api_',
gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5],
});

// Custom metrics

// HTTP request counter
const httpRequestCounter = new promClient.Counter({
name: 'ecommerce_api_http_requests_total',
help: 'Total number of HTTP requests',
labelNames: ['method', 'route', 'status_code'],
registers: [register],
});

// HTTP request duration histogram
const httpRequestDuration = new promClient.Histogram({
name: 'ecommerce_api_http_request_duration_seconds',
help: 'Duration of HTTP requests in seconds',
labelNames: ['method', 'route', 'status_code'],
buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10],
registers: [register],
});

// Database query counter
const dbQueryCounter = new promClient.Counter({
name: 'ecommerce_api_db_queries_total',
help: 'Total number of database queries',
labelNames: ['operation', 'table'],
registers: [register],
});

// Database query duration
const dbQueryDuration = new promClient.Histogram({
name: 'ecommerce_api_db_query_duration_seconds',
help: 'Duration of database queries in seconds',
labelNames: ['operation', 'table'],
buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2],
registers: [register],
});

// Cache hit/miss counter
const cacheCounter = new promClient.Counter({
name: 'ecommerce_api_cache_operations_total',
help: 'Total number of cache operations',
labelNames: ['operation', 'result'], // operation: get, set, delete; result: hit, miss, success, error
registers: [register],
});

// Product operations counter
const productOpsCounter = new promClient.Counter({
name: 'ecommerce_api_product_operations_total',
help: 'Total number of product operations',
labelNames: ['operation'], // create, update, delete, read
registers: [register],
});

// Category operations counter
const categoryOpsCounter = new promClient.Counter({
name: 'ecommerce_api_category_operations_total',
help: 'Total number of category operations',
labelNames: ['operation'], // create, update, delete, read
registers: [register],
});

// Database connection pool gauge
const dbPoolGauge = new promClient.Gauge({
name: 'ecommerce_api_db_pool_connections',
help: 'Number of database pool connections',
labelNames: ['state'], // total, idle, waiting
registers: [register],
});

// Active requests gauge
const activeRequestsGauge = new promClient.Gauge({
name: 'ecommerce_api_active_requests',
help: 'Number of active requests being processed',
registers: [register],
});

// Error counter
const errorCounter = new promClient.Counter({
name: 'ecommerce_api_errors_total',
help: 'Total number of errors',
labelNames: ['type', 'context'],
registers: [register],
});

// Rate limit counter
const rateLimitCounter = new promClient.Counter({
name: 'ecommerce_api_rate_limit_exceeded_total',
help: 'Total number of rate limit exceeded events',
labelNames: ['ip'],
registers: [register],
});

// Middleware to track HTTP metrics
function metricsMiddleware(req, res, next) {
const start = Date.now();

// Increment active requests
activeRequestsGauge.inc();

// Track response
res.on('finish', () => {
const duration = (Date.now() - start) / 1000;
const route = req.route?.path || req.path || 'unknown';
const method = req.method;
const statusCode = res.statusCode;

// Record metrics
httpRequestCounter.inc({ method, route, status_code: statusCode });
httpRequestDuration.observe({ method, route, status_code: statusCode }, duration);

// Decrement active requests
activeRequestsGauge.dec();
});

next();
}

// Helper functions to record metrics

function recordDbQuery(operation, table, duration) {
dbQueryCounter.inc({ operation, table });
dbQueryDuration.observe({ operation, table }, duration);
}

function recordCacheOperation(operation, result) {
cacheCounter.inc({ operation, result });
}

function recordProductOperation(operation) {
productOpsCounter.inc({ operation });
}

function recordCategoryOperation(operation) {
categoryOpsCounter.inc({ operation });
}

function updateDbPoolMetrics(total, idle, waiting) {
dbPoolGauge.set({ state: 'total' }, total);
dbPoolGauge.set({ state: 'idle' }, idle);
dbPoolGauge.set({ state: 'waiting' }, waiting);
}

function recordError(type, context) {
errorCounter.inc({ type, context });
}

function recordRateLimitExceeded(ip) {
rateLimitCounter.inc({ ip });
}

// Get metrics endpoint handler
async function getMetrics(req, res) {
try {
res.set('Content-Type', register.contentType);
const metrics = await register.metrics();
res.end(metrics);
} catch (error) {
logger.error('Metrics', 'Error generating metrics', { error: error.message });
res.status(500).json({ success: false, error: 'Failed to generate metrics' });
}
}

module.exports = {
register,
metricsMiddleware,
getMetrics,
recordDbQuery,
recordCacheOperation,
recordProductOperation,
recordCategoryOperation,
updateDbPoolMetrics,
recordError,
recordRateLimitExceeded,
};
