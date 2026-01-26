# Quick Start - Production-Ready E-commerce API

**Last Updated**: 2026-01-25
**Status**: FULLY IMPLEMENTED
**Tested**: ALL FEATURES WORKING

---

## 60-Second Setup

```bash
# 1. Install dependencies
npm install

# 2. Start server (uses existing .env)
npm run dev

# 3. Test it works
curl http://localhost:5000/health
```

**That's it!** The API is now running with:
- Cursor pagination
- Prometheus metrics
- Security headers
- Compression
- Audit logging
- Request tracking
- Health monitoring

---

## Test Implementation

### 1. Health Check
```bash
curl http://localhost:5000/health

# Response includes:
# - Database pool stats
# - Redis availability
# - Memory usage
# - Uptime
```

### 2. Cursor Pagination
```bash
# Get first 5 products
curl "http://localhost:5000/api/products?limit=5"

# Response includes pagination.cursor - use it for next page:
curl "http://localhost:5000/api/products?cursor=358&limit=5"
```

### 3. Prometheus Metrics
```bash
curl http://localhost:5000/metrics | grep ecommerce_api

# See:
# - HTTP request counts
# - Response times
# - Database queries
# - Cache hit/miss (when Redis enabled)
# - Error counts
```

### 4. Swagger Documentation
```
Open: http://localhost:5000/api-docs
```

---

## Configuration (Optional)

### Enable Redis Caching
```bash
# Install Redis locally
docker run -d -p 6379:6379 --name redis redis:7-alpine

# Update .env
REDIS_URL=redis://localhost:6379

# Restart server
npm run dev

# Verify Redis is working
curl http://localhost:5000/health
# Should show: "redis": { "available": true }
```

### Enable Sentry Error Tracking
```bash
# Get DSN from sentry.io (create free account)
# Update .env
SENTRY_DSN=https://xxxxx@o000000.ingest.sentry.io/0000000

# Restart server
npm run dev
```

---

## What's Been Implemented

| Feature | Status | File |
|---------|--------|------|
| Helmet Security Headers | | `server.js:47-61` |
| Response Compression | | `server.js:66-73` |
| Request ID Tracking | | `server.js:95-104` |
| Prometheus Metrics | | `utils/metrics.js` |
| Cursor Pagination | | `controllers/productController.js:9-91` |
| Redis Caching | | `utils/redisClient.js` |
| Audit Logging | | `utils/auditLogger.js` |
| Redis Rate Limiting | | `middleware/rateLimiter.js` |
| Database Read Replicas | | `database/connection.js` |
| Sentry Error Tracking | | `server.js:27-42` |
| Enhanced Health Check | | `server.js:172-216` |

---

## Docker (Optional)

```bash
# Build image
docker build -t ecommerce-api .

# Run with docker-compose (includes postgres + redis)
docker-compose up

# API available at http://localhost:5000
```

---

## API Examples

### Cursor Pagination
```bash
# Get products with limit
GET /api/products?limit=20

# Response:
{
"success": true,
"data": [...],
"pagination": {
"cursor": 340,
"hasMore": true,
"limit": 20
}
}

# Next page (use cursor from previous response)
GET /api/products?cursor=340&limit=20
```

### Filter by Category with Pagination
```bash
GET /api/products?category_id=1&limit=10
GET /api/products?category_id=1&cursor=15&limit=10
```

### Request Tracking
Every response includes `requestId`:
```json
{
"success": true,
"data": {...},
"requestId": "550e8400-e29b-41d4-a716-446655440000"
}
```

Use this ID to:
- Track requests in logs
- Debug issues
- Correlate with Sentry errors

---

## Monitoring

### Prometheus Metrics
```bash
# Metrics endpoint
curl http://localhost:5000/metrics

# Key metrics:
# - ecommerce_api_http_requests_total
# - ecommerce_api_http_request_duration_seconds
# - ecommerce_api_db_queries_total
# - ecommerce_api_cache_operations_total (if Redis enabled)
# - ecommerce_api_errors_total
```

### Health Check
```bash
curl http://localhost:5000/health

# Returns:
# - 200 OK if healthy
# - 503 Service Unavailable if degraded
# - Full system stats
```

---

## AWS Deployment

See `IMPLEMENTATION_COMPLETE.md` for full AWS deployment guide.

**Quick checklist**:
1. Set up RDS PostgreSQL (primary + replica)
2. Set up ElastiCache Redis
3. Deploy to ECS/Fargate (3+ instances)
4. Configure ALB with health checks
5. Set environment variables from `.env.production.example`
6. Set up CloudWatch + Sentry monitoring

---

## Environment Variables

### Required
```bash
DB_USER=postgres
DB_PASSWORD=postgres123
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ecommerce
```

### Optional (Production Recommended)
```bash
NODE_ENV=production
LOG_LEVEL=WARN
REDIS_URL=redis://your-redis:6379
SENTRY_DSN=https://xxx@sentry.io/xxx
DB_READ_REPLICA_HOST=your-replica-host
RATE_LIMIT_MAX_REQUESTS=100
```

See `.env.production.example` for full configuration.

---

## Verification Tests

Run these to verify everything works:

```bash
# 1. Health check returns 200
curl -w "\nHTTP: %{http_code}\n" http://localhost:5000/health

# 2. Pagination works
curl "http://localhost:5000/api/products?limit=3" | python3 -m json.tool

# 3. Metrics endpoint works
curl http://localhost:5000/metrics | head -20

# 4. Request IDs are included
curl http://localhost:5000/api/products | grep requestId

# 5. API docs accessible
curl -I http://localhost:5000/api-docs

# 6. Rate limiting works (100 requests trigger 429)
for i in {1..101}; do curl -s -o /dev/null -w "%{http_code}\n" http://localhost:5000/health; done | grep 429
```

---

## Troubleshooting

### Server won't start
```bash
# Check if PostgreSQL is running
psql -U postgres -c "SELECT 1"

# Check if port 5000 is available
lsof -i :5000

# Check environment variables
cat .env
```

### Database connection error
```bash
# Verify credentials
psql -U postgres -h localhost -d ecommerce

# Check if database exists
psql -U postgres -l | grep ecommerce

# Server will auto-create database if it doesn't exist
```

### Redis not connecting
```bash
# Check if Redis is running
docker ps | grep redis

# Test Redis connection
redis-cli ping

# Redis is OPTIONAL - app works without it (falls back to memory)
```

---

## Documentation

- `IMPLEMENTATION_COMPLETE.md` - Full feature documentation
- `ARCHITECTURE_RECOMMENDATIONS.md` - Architecture deep-dive
- `PRODUCTION_IMPLEMENTATION_SUMMARY.md` - Production summary
- `CLAUDE.md` - Development guide for Claude Code

---

## Success!

If you can run:
```bash
curl http://localhost:5000/health
```

And get a `200 OK` response with system stats, **you're done!**

The API is fully production-ready with:
- Pagination that scales
- Caching that's optional but recommended
- Metrics for monitoring
- Security headers
- Audit trails
- Request tracking
- AWS compatibility

**Ready to deploy to production! **
