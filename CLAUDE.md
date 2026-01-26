# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

E-commerce REST API server built with Express.js and PostgreSQL. Features automated nightly database reset at 2:00 AM via cron jobs, comprehensive validation, rate limiting, structured logging, and production-ready error handling.

## Development Commands

```bash
# Start server (production mode)
npm start

# Start with auto-reload (development mode)
npm run dev

# Manually reset database to seed data
npm run reset-db

# Access API documentation
# Navigate to http://localhost:5000/api-docs
```

## Database Operations

**IMPORTANT**: Always use the following pattern when working with the database:

1. **Read current schema.sql before making changes**:
```bash
# The database schema is in database/schema.sql
# Review it to understand table structure and relationships
```

2. **Download and review database files when analyzing**:
- `database/schema.sql` - Table definitions and indexes
- `database/seedData.js` - Seed data population logic
- `database/connection.js` - Pool configuration

3. **Transaction pattern for multi-step operations**:
```javascript
const client = await pool.connect();
try {
await client.query('BEGIN');
// ... multiple queries
await client.query('COMMIT');
} catch (error) {
await client.query('ROLLBACK');
throw error;
} finally {
client.release();
}
```

## Architecture & Code Organization

### Layer Structure
- **Routes** (`routes/*.js`) - HTTP endpoints, Swagger docs, validation middleware
- **Controllers** (`controllers/*.js`) - Business logic, database queries
- **Middleware** (`middleware/*.js`) - Validation rules, rate limiting
- **Utils** (`utils/*.js`) - Error handling, logging
- **Database** (`database/*.js`) - Connection pool, schema, seed data

### Key Architectural Patterns

1. **Error Handling Flow**:
- Controllers throw `AppError` instances or database errors
- Route handlers use `asyncHandler()` wrapper to catch async errors
- Global error middleware in `server.js` formats responses
- Production mode masks error details; development mode shows full stack traces

2. **Validation Strategy**:
- express-validator rules defined in `middleware/validation.js`
- Applied in route definitions before controller execution
- ID parameters validated with `validateIdParam()` middleware
- All numeric inputs explicitly parsed with `parseInt()` to prevent type coercion bugs

3. **Database Connection Pool**:
- Configured in `database/connection.js`
- Validates required env vars at startup (fails fast if missing)
- Implements graceful shutdown (`closePool()`)
- Query timeout set to 30s (configurable via `DB_QUERY_TIMEOUT`)

4. **Rate Limiting**:
- In-memory implementation (not suitable for multi-instance deployments)
- Global middleware applied to all routes
- Default: 100 requests per 15 minutes per IP
- Returns HTTP 429 when exceeded

5. **Logging**:
- Structured JSON logging via `utils/logger.js`
- Format: `{timestamp, level, context, message, data}`
- Levels: ERROR, WARN, INFO, DEBUG
- Controlled by `LOG_LEVEL` environment variable

## Critical Implementation Details

### Foreign Key Relationships
- Products reference categories via `category_id`
- Categories have `ON DELETE CASCADE` - deleting a category deletes all its products
- Always verify category exists in a transaction before creating products

### Nightly Reset Behavior
- Cron job runs at 2:00 AM daily
- Calls `resetDatabase()` which truncates all data and re-seeds
- Controlled by `node-cron` schedule in `server.js:135`
- Disable on startup with `SEED_ON_STARTUP=false`

### Graceful Shutdown
- Handles SIGTERM and SIGINT signals
- Stops cron job → closes HTTP server → drains connection pool
- 30-second timeout before forced shutdown
- Critical for zero-downtime deployments

## Environment Variables

### Required (will cause startup failure if missing)
```bash
DB_USER=postgres
DB_PASSWORD=your_password
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ecommerce
```

### Optional with defaults
```bash
NODE_ENV=development # Controls error detail exposure
PORT=5000
LOG_LEVEL=INFO # ERROR|WARN|INFO|DEBUG
DB_POOL_MAX=20 # Max concurrent connections
DB_POOL_MIN=5
DB_QUERY_TIMEOUT=30000 # ms
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_WINDOW_MS=900000 # 15 minutes
CORS_ORIGIN=*
SEED_ON_STARTUP=true
SWAGGER_HOST=localhost:5000
```

## Common Tasks

### Adding a New Endpoint
1. Define validation rules in `middleware/validation.js`
2. Add controller function in `controllers/[resource]Controller.js`
3. Add route with Swagger docs in `routes/[resource].js`
4. Use `asyncHandler()` wrapper and `handleValidationErrors` middleware

### Modifying Database Schema
1. Update `database/schema.sql`
2. Update `database/seedData.js` if seed data structure changes
3. Modify controller queries if column names/types changed
4. Test with `npm run reset-db`

### Adding a New Database Table
1. Add CREATE TABLE statement in `database/schema.sql`
2. Create controller in `controllers/`
3. Create route file in `routes/`
4. Import and mount route in `server.js`
5. Update seed data in `database/seedData.js`

## Testing & Debugging

```bash
# Enable debug logging
LOG_LEVEL=DEBUG npm run dev

# Test rate limiting
for i in {1..150}; do curl -s http://localhost:5000/api/products; done

# Test graceful shutdown
npm start
# In another terminal: kill -SIGTERM <PID>

# Direct database access
psql -U postgres -d ecommerce
```

## Production Considerations

- **Rate Limiter**: Current in-memory implementation does NOT scale across multiple instances. For production clusters, use Redis-based rate limiting (e.g., `express-rate-limit` with Redis store)
- **Logging**: Output is JSON formatted for log aggregation tools (Datadog, CloudWatch, etc.)
- **Error Masking**: Set `NODE_ENV=production` to hide error details from API responses
- **Seed Data**: Disable with `SEED_ON_STARTUP=false` in production
- **CORS**: Set `CORS_ORIGIN` to specific domain, not `*`
- **Connection Pool**: Tune `DB_POOL_MAX` based on traffic (typical: 20-50 for medium traffic)

## File Locations Reference

- **Main entry**: `server.js` - Express app setup, middleware chain, cron configuration
- **Database schema**: `database/schema.sql` - Two tables (categories, products) with indexes
- **Seed data**: `database/seedData.js` - 5 categories, 20 products
- **Error handling**: `utils/errorHandler.js` - AppError class, asyncHandler wrapper
- **Validation**: `middleware/validation.js` - All validation rules for routes
- **Product endpoints**: `routes/products.js` + `controllers/productController.js`
- **Category endpoints**: `routes/categories.js` + `controllers/categoryController.js`
