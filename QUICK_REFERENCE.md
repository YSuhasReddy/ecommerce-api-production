# Quick Reference Guide - Production Enhancements

## Getting Started (3 Steps)

\`\`\`bash
# 1. Configure environment
cp .env.example .env
# Edit .env with your PostgreSQL credentials

# 2. Start server
npm start

# 3. Verify it's running
curl http://localhost:5000/health
\`\`\`

---

## Critical Bugs Fixed Summary

| # | Bug | Fix | Priority |
|---|-----|-----|----------|
| 1 | **ID Validation Missing** | Added `validateIdParam()` middleware | CRITICAL |
| 2 | **Query Timeouts Missing** | Added 30s timeout to connection pool | CRITICAL |
| 3 | **Error Info Disclosure** | Masked errors in production | CRITICAL |
| 4 | **No Rate Limiting** | Added IP-based DoS protection | CRITICAL |
| 5 | **No Transactions** | Wrapped multi-step operations | CRITICAL |
| 6 | **No Graceful Shutdown** | Added SIGTERM handlers | Warning: HIGH |
| 7 | **Promise Rejections Unhandled** | Added global error handlers | Warning: HIGH |
| 8 | **No Logging** | Added structured JSON logging | Warning: HIGH |
| 9 | **No Env Validation** | Validate required vars at startup | MEDIUM |
| 10 | **Type Safety Issues** | Explicit ID conversion & validation | MEDIUM |

---

## New Features Added

### 1. Error Handling (`utils/errorHandler.js`)
\`\`\`javascript
// Usage in controllers
throw new AppError('Invalid category', 404, 'CATEGORY_NOT_FOUND');

// Automatically handled by global error middleware
// Response masked in production, detailed in development
\`\`\`

### 2. Logging (`utils/logger.js`)
\`\`\`javascript
logger.info('Context', 'Message', { data: value });
logger.error('Context', 'Error message', { error: err.message });
logger.debug('Context', 'Debug info', { variable: value });

// Control via LOG_LEVEL environment variable
// Output: JSON structured logs for log aggregation
\`\`\`

### 3. Rate Limiting (`middleware/rateLimiter.js`)
\`\`\`javascript
// Automatically applied globally
// 100 requests per 15 minutes per IP
// Configurable via environment variables
// Response: HTTP 429 when exceeded
\`\`\`

### 4. Input Validation (`middleware/validation.js`)
\`\`\`javascript
// Added ID parameter validation
router.get('/:id', validateIdParam('id'), handleValidationErrors, ...);

// All fields validated with constraints
// Enhanced category name validation (no special chars)
// Price range: 0.01-999999.99
// Stock range: 0-999999
\`\`\`

---

## Environment Variables

### Required
\`\`\`bash
DB_USER=postgres
DB_PASSWORD=password
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ecommerce
\`\`\`

### Production Setup
\`\`\`bash
NODE_ENV=production
LOG_LEVEL=WARN
SEED_ON_STARTUP=false
CORS_ORIGIN=https://yourdomain.com
DB_POOL_MAX=50
RATE_LIMIT_MAX_REQUESTS=60
\`\`\`

### Development Setup
\`\`\`bash
NODE_ENV=development
LOG_LEVEL=DEBUG
SEED_ON_STARTUP=true
CORS_ORIGIN=*
DB_POOL_MAX=20
RATE_LIMIT_MAX_REQUESTS=100
\`\`\`

---

## Key Code Changes

### Before vs After: Input Validation
\`\`\`javascript
// BEFORE
router.get('/:id', async (req, res) => {
const product = await getProductById(req.params.id);
});

// AFTER
router.get('/:id', validateIdParam('id'), handleValidationErrors, 
asyncHandler(async (req, res, next) => {
const product = await getProductById(req.params.id);
if (!product) return res.status(404).json({ ... });
res.json({ success: true, data: product });
})
);
\`\`\`

### Before vs After: Error Handling
\`\`\`javascript
// BEFORE
try {
// ... code
res.json({ success: true, data: result });
} catch (error) {
console.error('Error:', error);
res.status(500).json({ success: false, error: error.message });
}

// AFTER
asyncHandler(async (req, res, next) => {
try {
// ... code
res.json({ success: true, data: result });
} catch (error) {
next(error); // Passes to global error handler
}
});
\`\`\`

### Before vs After: Database Operations
\`\`\`javascript
// BEFORE (Race condition)
const categoryCheck = await pool.query(...);
if (!categoryCheck.rows.length) throw new Error('Not found');
await pool.query('INSERT INTO products ...');

// AFTER (Atomic transaction)
const client = await pool.connect();
try {
await client.query('BEGIN');
const categoryCheck = await client.query(...);
if (!categoryCheck.rows.length) throw new AppError(...);
await client.query('INSERT INTO products ...');
await client.query('COMMIT');
} catch (error) {
await client.query('ROLLBACK');
throw error;
} finally {
client.release();
}
\`\`\`

---

## Testing Checklist

### Unit Tests
\`\`\`bash
# Test validation middleware
curl -X POST http://localhost:5000/api/products \
-H "Content-Type: application/json" \
-d '{"name":"A"}' # Too short, should fail

# Test ID validation
curl http://localhost:5000/api/products/not-a-number # Should fail
\`\`\`

### Rate Limiting
\`\`\`bash
# Test rate limit (100 per 15 minutes)
for i in {1..150}; do 
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
http://localhost:5000/api/products)
[ "$HTTP_CODE" = "429" ] && echo "Rate limited at request $i" && break
done
\`\`\`

### Graceful Shutdown
\`\`\`bash
# Start server
npm start

# In another terminal, send SIGTERM
kill -SIGTERM <PID>

# Check logs for graceful shutdown message
\`\`\`

### Health Check
\`\`\`bash
curl http://localhost:5000/health
# Response: 
# {
# "success": true,
# "status": "healthy",
# "timestamp": "2024-01-23T10:30:45.123Z",
# "environment": "production"
# }
\`\`\`

---

## Debugging

### Enable Debug Logging
\`\`\`bash
LOG_LEVEL=DEBUG npm start

# Output example:
# {"timestamp":"...","level":"DEBUG","context":"Request","message":"GET /api/products","data":{"ip":"127.0.0.1",...}}
\`\`\`

### Check Database Connection
\`\`\`bash
# Verify PostgreSQL is running and accessible
psql -U postgres -h localhost -c "SELECT 1;"

# Test database exists
psql -U postgres -l | grep ecommerce
\`\`\`

### Monitor Connection Pool
\`\`\`javascript
// Add to controller if debugging:
const poolStatus = await pool.query('SELECT count(*) FROM pg_stat_activity;');
console.log('Active connections:', poolStatus.rows[0].count);
\`\`\`

### Test Error Handling
\`\`\`bash
# Missing required fields
curl -X POST http://localhost:5000/api/products \
-H "Content-Type: application/json" \
-d '{"name":"Test"}'

# Response in dev mode includes error details
# Response in production mode is user-friendly
\`\`\`

---

## Performance Tuning

### Database Pool Settings
\`\`\`bash
# For light traffic (< 10 req/sec)
DB_POOL_MAX=10
DB_POOL_MIN=2

# For medium traffic (10-100 req/sec)
DB_POOL_MAX=20 # Default
DB_POOL_MIN=5 # Default

# For high traffic (> 100 req/sec)
DB_POOL_MAX=100
DB_POOL_MIN=25
\`\`\`

### Rate Limiting Settings
\`\`\`bash
# Strict (development/testing)
RATE_LIMIT_MAX_REQUESTS=50
RATE_LIMIT_WINDOW_MS=600000 # 10 minutes

# Standard (production, typical SaaS)
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_WINDOW_MS=900000 # 15 minutes (default)

# Relaxed (high-traffic API)
RATE_LIMIT_MAX_REQUESTS=500
RATE_LIMIT_WINDOW_MS=900000 # 15 minutes
\`\`\`

### Query Timeout Tuning
\`\`\`bash
# Default: 30 seconds
DB_STATEMENT_TIMEOUT=30000
DB_QUERY_TIMEOUT=30000

# For slow queries, increase to 60 seconds
DB_STATEMENT_TIMEOUT=60000
DB_QUERY_TIMEOUT=60000

# For very strict timeout (10 seconds)
DB_STATEMENT_TIMEOUT=10000
DB_QUERY_TIMEOUT=10000
\`\`\`

---

## Common Issues & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| **"Missing env vars"** | Missing .env file or values | Copy .env.example, fill database config |
| **"Connection refused"** | PostgreSQL not running | `psql -U postgres` to test |
| **"Too many requests"** | Rate limit exceeded | Increase `RATE_LIMIT_MAX_REQUESTS` |
| **"Query timeout"** | Slow database | Optimize query or increase `DB_QUERY_TIMEOUT` |
| **"Connection pool exhausted"** | Too many concurrent requests | Increase `DB_POOL_MAX` |
| **Silent crash** | Unhandled promise rejection | Check logs with `LOG_LEVEL=DEBUG` |
| **Port already in use** | Another process on port 5000 | Change `PORT` or kill other process |

---

## Documentation Map

| File | Purpose | When to Read |
|------|---------|--------------|
| **QUICK_REFERENCE.md** | This file | Quick answers |
| **BUG_ANALYSIS.md** | Detailed bug explanations | Understanding issues |
| **PRODUCTION_GUIDE.md** | Deployment & maintenance | Before going to production |
| **ENHANCEMENTS_SUMMARY.md** | Overview of all changes | Getting oriented |

---

## Success Checklist

- [ ] All 10 bugs understood and reviewed
- [ ] Environment variables configured
- [ ] Database running and accessible
- [ ] Server starts without errors
- [ ] Health endpoint returns 200
- [ ] API endpoints responding
- [ ] Rate limiting working (HTTP 429 after 100 requests)
- [ ] Graceful shutdown working (SIGTERM received)
- [ ] Logging appears in console
- [ ] Error handling working (bad request returns error)
- [ ] Production guide reviewed
- [ ] Ready to deploy! 

---

## Quick Command Reference

\`\`\`bash
# Start server
npm start

# Start with debug logging
LOG_LEVEL=DEBUG npm start

# Test API
curl http://localhost:5000/api/products
curl http://localhost:5000/health
curl http://localhost:5000/api-docs # Swagger UI

# Database operations
npm run reset-db # Reset seed data
psql -U postgres -d ecommerce # Connect to database

# Shutdown gracefully
kill -SIGTERM <PID>
# or Ctrl+C in terminal
\`\`\`

---

**Last Updated**: 2024-01-23 
**Status**: Production Ready 
**Version**: 2.0.0 (Enhanced)
