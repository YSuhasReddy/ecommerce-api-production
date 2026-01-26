# E-commerce API

A production-ready RESTful API built with Node.js, Express, and PostgreSQL. This API provides comprehensive product and category management with enterprise-grade features including caching, rate limiting, monitoring, and audit logging.

## Features

### Core Functionality
- Complete CRUD operations for Products and Categories
- Advanced filtering and cursor-based pagination
- Category-product relationship management
- Comprehensive input validation
- Detailed error handling with custom error codes

### Production Features
- **Security**: Helmet security headers, input validation, rate limiting
- **Caching**: Redis-based caching with graceful fallback
- **Monitoring**: Prometheus metrics and Sentry error tracking
- **Database**: PostgreSQL with read replica support
- **Audit Logging**: Complete audit trail for all data modifications
- **API Documentation**: Interactive Swagger/OpenAPI documentation
- **Health Checks**: Comprehensive health and readiness endpoints
- **Graceful Shutdown**: Proper cleanup of connections on termination

## Technology Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: PostgreSQL 14+
- **Cache**: Redis (optional, with in-memory fallback)
- **Monitoring**: Prometheus + Sentry
- **Documentation**: Swagger/OpenAPI 3.0

## Quick Start

### Prerequisites
- Node.js 18 or higher
- PostgreSQL 14 or higher
- Redis (optional)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd ecommerce-api
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Start the server:
```bash
npm start
```

The API will be available at `http://localhost:5000`

## API Documentation

Once the server is running, access the interactive API documentation at:
- **Swagger UI**: http://localhost:5000/api-docs
- **Health Check**: http://localhost:5000/health
- **Metrics**: http://localhost:5000/metrics

## Environment Configuration

Key environment variables:

```bash
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ecommerce_db
DB_USER=postgres
DB_PASSWORD=your_password

# Server
PORT=5000
NODE_ENV=development

# Redis (optional)
REDIS_HOST=localhost
REDIS_PORT=6379

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Monitoring (optional)
SENTRY_DSN=your_sentry_dsn
```

See `.env.example` for complete configuration options.

## API Endpoints

### Categories
- `GET /api/categories` - Get all categories
- `GET /api/categories/:id` - Get category by ID
- `POST /api/categories` - Create new category
- `PUT /api/categories/:id` - Update category
- `DELETE /api/categories/:id` - Delete category

### Products
- `GET /api/products` - Get all products (with pagination)
- `GET /api/products?category_id=X` - Filter by category
- `GET /api/products/:id` - Get product by ID
- `POST /api/products` - Create new product
- `PUT /api/products/:id` - Update product
- `DELETE /api/products/:id` - Delete product

### Pagination
Products endpoint supports cursor-based pagination:
```
GET /api/products?limit=20&cursor=123
```

## Testing

Run the comprehensive test suite:
```bash
chmod +x test-suite.sh
./test-suite.sh
```

The test suite includes:
- Input validation tests
- Security tests (SQL injection, XSS)
- Rate limiting tests
- Pagination tests
- Concurrency tests
- Error handling tests

## Project Structure

```
ecommerce-api/
├── controllers/          # Business logic
├── routes/              # API routes
├── middleware/          # Custom middleware
├── database/            # Database configuration and migrations
├── utils/               # Utility functions
├── scripts/             # Utility scripts
├── .github/             # GitHub workflows
└── docs/                # Documentation
```

## Documentation

Comprehensive documentation is available:
- `ARCHITECTURE_RECOMMENDATIONS.md` - Architecture and security best practices
- `DEPLOYMENT_GUIDE.md` - Production deployment guide
- `POSTMAN_TESTING_GUIDE.md` - Postman testing instructions
- `TEST_REPORT.md` - Testing results and vulnerability analysis
- `QUICK_START.md` - Quick start guide

## Security Features

- Input validation with express-validator
- SQL injection protection with parameterized queries
- XSS protection with Helmet
- Rate limiting to prevent DoS attacks
- CORS configuration
- Request size limits
- Error message sanitization
- Audit logging for all modifications

## Performance Features

- Redis caching with configurable TTL
- Database connection pooling
- Read replica support for scaling
- Cursor-based pagination
- Response compression
- Database query optimization

## Monitoring

### Health Checks
```bash
curl http://localhost:5000/health
```

### Prometheus Metrics
```bash
curl http://localhost:5000/metrics
```

Metrics include:
- HTTP request counts and duration
- Database connection pool stats
- Cache hit/miss rates
- Rate limit violations
- Custom application metrics

## Error Handling

All errors follow a consistent format:
```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE",
  "requestId": "uuid"
}
```

Error codes:
- `DUPLICATE_ENTRY` - Unique constraint violation
- `FOREIGN_KEY_VIOLATION` - Referenced record doesn't exist
- `INVALID_CURSOR` - Invalid pagination cursor
- `NOT_FOUND` - Resource not found
- `BAD_REQUEST` - Validation failed
- `INTERNAL_ERROR` - Server error

## Contributing

This is a production-ready template. Feel free to:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For issues and questions:
- Create an issue in the GitHub repository
- Check existing documentation in the `docs/` folder
- Review the Swagger API documentation

## Changelog

See `ENHANCEMENTS_SUMMARY.md` for detailed implementation history.

## Production Deployment

See `DEPLOYMENT_GUIDE.md` for comprehensive production deployment instructions including:
- AWS/Docker deployment
- Environment configuration
- Database setup
- Monitoring setup
- Security hardening

---

Built with Node.js and Express.js
