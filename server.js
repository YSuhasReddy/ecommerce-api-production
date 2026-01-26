require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const cron = require('node-cron');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const { v4: uuidv4 } = require('uuid');
const Sentry = require('@sentry/node');

const { initializeDatabase, resetDatabase } = require('./database/seedData');
const { closePool, getPoolStats } = require('./database/connection');
const { createDatabaseIfNotExists } = require('./database/initializeDb');
const { globalRateLimiterMiddleware } = require('./middleware/rateLimiter');
const { sendErrorResponse } = require('./utils/errorHandler');
const { initializeRedis, closeRedis, isRedisAvailable } = require('./utils/redisClient');
const { metricsMiddleware, getMetrics, updateDbPoolMetrics } = require('./utils/metrics');
const logger = require('./utils/logger');

const app = express();
const PORT = parseInt(process.env.PORT || '5000', 10);

// ============================================
// 1. SENTRY ERROR TRACKING (Must be first)
// ============================================
if (process.env.SENTRY_DSN) {
Sentry.init({
dsn: process.env.SENTRY_DSN,
environment: process.env.NODE_ENV || 'development',
tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
integrations: [
new Sentry.Integrations.Http({ tracing: true }),
new Sentry.Integrations.Express({ app }),
],
});
app.use(Sentry.Handlers.requestHandler());
app.use(Sentry.Handlers.tracingHandler());
logger.info('Sentry', 'Error tracking initialized');
} else {
logger.warn('Sentry', 'SENTRY_DSN not configured, error tracking disabled');
}

// ============================================
// 2. SECURITY MIDDLEWARE
// ============================================
app.use(helmet({
contentSecurityPolicy: {
directives: {
defaultSrc: ["'self'"],
styleSrc: ["'self'", "'unsafe-inline'"],
scriptSrc: ["'self'"],
imgSrc: ["'self'", "data:", "https:"],
},
},
hsts: {
maxAge: 31536000,
includeSubDomains: true,
preload: true,
},
}));

// ============================================
// 3. COMPRESSION
// ============================================
app.use(compression({
filter: (req, res) => {
if (req.headers['x-no-compression']) return false;
return compression.filter(req, res);
},
level: 6,
threshold: 1024,
}));

// ============================================
// 4. CORS
// ============================================
app.use(cors({
origin: process.env.CORS_ORIGIN || '*',
credentials: true,
maxAge: 3600,
methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ============================================
// 5. REQUEST ID & LOGGING (Must be before body parsers for request ID in error handling)
// ============================================
app.use((req, res, next) => {
req.id = uuidv4();
res.setHeader('X-Request-ID', req.id);
logger.debug('Request', `${req.method} ${req.path}`, {
requestId: req.id,
ip: req.ip,
userAgent: req.get('user-agent'),
});
next();
});

// ============================================
// 6. BODY PARSERS
// ============================================
app.use(express.json({ limit: '100kb' })); // Reduced from 10mb for security
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

// JSON parsing error handler (must be immediately after body parser)
app.use((err, req, res, next) => {
if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
return res.status(400).json({
success: false,
error: 'Invalid JSON format in request body',
code: 'INVALID_JSON',
requestId: req.id,
});
}
next(err);
});

// ============================================
// 7. PROMETHEUS METRICS
// ============================================
app.use(metricsMiddleware);

// ============================================
// 8. RATE LIMITING
// ============================================
app.use(globalRateLimiterMiddleware);

// Swagger configuration
const swaggerOptions = {
definition: {
openapi: '3.0.0',
info: {
title: 'Ecommerce API',
version: '1.0.0',
description: 'Complete Ecommerce API with Products and Categories - Auto-reset nightly at 2:00 AM',
contact: {
name: 'API Support',
},
},
servers: [
{
url: `http://${process.env.SWAGGER_HOST || 'localhost:5000'}`,
description: 'Development server',
},
],
tags: [
{
name: 'Categories',
description: 'Category management endpoints',
},
{
name: 'Products',
description: 'Product management endpoints',
},
],
},
apis: ['./routes/*.js'],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

// Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
explorer: true,
customCss: '.swagger-ui .topbar { display: none }',
}));

// ============================================
// HEALTH CHECK & METRICS ENDPOINTS
// ============================================

/**
* @swagger
* /health:
* get:
* summary: Health check endpoint with detailed status
* tags: [Health]
* responses:
* 200:
* description: Server is healthy
* 503:
* description: Server is unhealthy
*/
app.get('/health', async (req, res) => {
try {
const poolStats = getPoolStats();
const redisAvailable = isRedisAvailable();

// Check if system is healthy
const isHealthy = poolStats.primary.waiting < 5 &&
poolStats.primary.total < parseInt(process.env.DB_POOL_MAX || '20', 10) * 0.9;

// Update Prometheus metrics
updateDbPoolMetrics(
poolStats.primary.total,
poolStats.primary.idle,
poolStats.primary.waiting
);

res.status(isHealthy ? 200 : 503).json({
success: true,
status: isHealthy ? 'healthy' : 'degraded',
timestamp: new Date().toISOString(),
environment: process.env.NODE_ENV || 'development',
uptime: process.uptime(),
database: {
primary: poolStats.primary,
replica: poolStats.replica,
},
redis: {
available: redisAvailable,
},
memory: {
used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
unit: 'MB',
},
});
} catch (error) {
logger.error('Health', 'Health check failed', { error: error.message });
res.status(503).json({
success: false,
status: 'unhealthy',
timestamp: new Date().toISOString(),
error: 'Health check failed',
});
}
});

/**
* @swagger
* /metrics:
* get:
* summary: Prometheus metrics endpoint
* tags: [Monitoring]
* responses:
* 200:
* description: Prometheus metrics in text format
*/
app.get('/metrics', getMetrics);

// Import routes
const categoryRoutes = require('./routes/categories');
const productRoutes = require('./routes/products');

// Use routes
app.use('/api/categories', categoryRoutes);
app.use('/api/products', productRoutes);

// Root endpoint
app.get('/', (req, res) => {
res.json({
message: 'Welcome to Ecommerce API',
version: '1.0.0',
documentation: `http://${process.env.SWAGGER_HOST || 'localhost:5000'}/api-docs`,
endpoints: {
categories: '/api/categories',
products: '/api/products',
health: '/health',
},
});
});

// 404 handler for unknown routes
app.use((req, res) => {
res.status(404).json({
success: false,
error: 'Route not found',
path: req.path,
requestId: req.id,
});
});

// Sentry error handler (must be before custom error handler)
if (process.env.SENTRY_DSN) {
app.use(Sentry.Handlers.errorHandler());
}

// Global error handler (must be last)
app.use((err, req, res, next) => {
sendErrorResponse(err, req, res);
});

// Schedule nightly database reset at 2:00 AM
const dbResetTask = cron.schedule('0 2 * * *', async () => {
logger.info('CronJob', 'Running scheduled nightly database reset');
try {
await resetDatabase();
logger.info('CronJob', 'Nightly database reset completed successfully');
} catch (error) {
logger.error('CronJob', 'Nightly database reset failed', { error: error.message });
}
});

// Server instance
let server;

// Graceful shutdown handler
async function gracefulShutdown(signal) {
logger.info('Server', `Received ${signal}, shutting down gracefully...`);

// Stop accepting new requests
if (dbResetTask) {
dbResetTask.stop();
logger.info('Server', 'Cron job stopped');
}

if (server) {
server.close(async () => {
logger.info('Server', 'HTTP server closed');

try {
// Close Redis connection
await closeRedis();
logger.info('Server', 'Redis connection closed');

// Close database pools
await closePool();
logger.info('Server', 'Database pools closed');

// Flush Sentry events
if (process.env.SENTRY_DSN) {
await Sentry.close(2000);
logger.info('Server', 'Sentry events flushed');
}

logger.info('Server', 'Graceful shutdown completed');
process.exit(0);
} catch (error) {
logger.error('Server', 'Error during shutdown', { error: error.message });
process.exit(1);
}
});

// Force shutdown after 30 seconds
setTimeout(() => {
logger.error('Server', 'Forced shutdown due to timeout');
process.exit(1);
}, 30000);
}
}

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
logger.error('Process', 'Unhandled Rejection at:', {
promise: promise.toString(),
reason: reason instanceof Error ? reason.message : String(reason),
});
});

process.on('uncaughtException', (error) => {
logger.error('Process', 'Uncaught Exception', { error: error.message, stack: error.stack });
process.exit(1);
});

// Initialize database and start server
async function startServer() {
try {
logger.info('Server', 'Starting Ecommerce API Server...');

// Initialize Redis
logger.info('Server', 'Initializing Redis connection...');
initializeRedis();

// Create database if it doesn't exist
logger.info('Server', 'Checking database...');
await createDatabaseIfNotExists();

// Initialize database tables
logger.info('Server', 'Initializing database tables...');
await initializeDatabase();

// Initialize audit logging table
logger.info('Server', 'Initializing audit logging...');
const fs = require('fs');
const path = require('path');
try {
const auditSQL = fs.readFileSync(path.join(__dirname, 'database/auditSchema.sql'), 'utf8');
const { pool } = require('./database/connection');
await pool.query(auditSQL);
logger.info('Server', 'Audit logging initialized');
} catch (error) {
logger.warn('Server', 'Audit schema initialization skipped', { error: error.message });
}

// Populate with seed data on startup
if (process.env.SEED_ON_STARTUP !== 'false') {
logger.info('Server', 'Loading seed data...');
await resetDatabase();
}

// Start Express server
server = app.listen(PORT, () => {
logger.info('Server', 'Server started successfully', {
port: PORT,
environment: process.env.NODE_ENV || 'development',
nodeVersion: process.version,
redis: isRedisAvailable() ? 'connected' : 'disabled',
});
logger.info('Server', `API Documentation: http://localhost:${PORT}/api-docs`);
logger.info('Server', `Health Check: http://localhost:${PORT}/health`);
logger.info('Server', `Metrics Endpoint: http://localhost:${PORT}/metrics`);

if (process.env.SENTRY_DSN) {
logger.info('Server', 'Sentry error tracking: ENABLED');
}
});
} catch (error) {
logger.error('Server', 'Failed to start server', { error: error.message, stack: error.stack });
if (process.env.SENTRY_DSN) {
Sentry.captureException(error);
await Sentry.close(2000);
}
process.exit(1);
}
}

startServer();
