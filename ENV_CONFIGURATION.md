# Environment Configuration Guide

Complete guide to configuring your ecommerce API for different environments.

## Quick Start

### Local Development

\`\`\`bash
cp .env.local .env
npm install
docker-compose up -d
npm start
\`\`\`

### AWS Production

\`\`\`bash
# Using setup script
./scripts/setup-env.sh aws

# OR manually
cp .env.aws .env
# Edit .env with your RDS credentials
npm start
\`\`\`

---

## Environment Variables Reference

### Database Configuration

| Variable | Default | Description | Example |
|----------|---------|-------------|---------|
| `DB_USER` | `postgres` | Database username | `postgres` |
| `DB_PASSWORD` | `postgres123` | Database password | `SecurePass123!` |
| `DB_HOST` | `localhost` | Database hostname/IP | `db.example.com.rds.amazonaws.com` |
| `DB_PORT` | `5432` | Database port | `5432` |
| `DB_NAME` | `ecommerce_db` | Database name | `ecommerce_db` |

### Connection Pool Settings

| Variable | Default | Dev | Staging | Production |
|----------|---------|-----|---------|------------|
| `DB_POOL_MAX` | `20` | 10 | 30 | 50+ |
| `DB_POOL_MIN` | `5` | 2 | 5 | 10 |
| `DB_STATEMENT_TIMEOUT` | `30000` ms | 30000 | 30000 | 30000 |
| `DB_QUERY_TIMEOUT` | `30000` ms | 30000 | 30000 | 30000 |

**Pool Tuning Guide:**
- **Development**: Low values to save resources
- **Staging**: Medium values for realistic testing
- **Production**: High values for reliability and throughput

\`\`\`
Formula for MAX pool size:
= (CPU_Cores × 2) + Disk_Spindles

For example, 4 CPU cores = (4 × 2) + 1 = 9 (round up to 10 minimum)
For high concurrency, aim for 50-100
\`\`\`

### Server Configuration

| Variable | Default | Example | Notes |
|----------|---------|---------|-------|
| `NODE_ENV` | `development` | `production` | Set to `production` for AWS |
| `PORT` | `5000` | `5000` | API server port |
| `CORS_ORIGIN` | `http://localhost:3000` | `https://yourdomain.com` | Frontend URL |

### Logging

| Variable | Default | Options | Notes |
|----------|---------|---------|-------|
| `LOG_LEVEL` | `INFO` | `ERROR`, `WARN`, `INFO`, `DEBUG` | Higher = more logs |

**Recommendations:**
- Development: `DEBUG` (all information)
- Staging: `INFO` (normal operations)
- Production: `WARN` (only issues)

### Rate Limiting

| Variable | Default | Development | Production |
|----------|---------|-------------|------------|
| `RATE_LIMIT_WINDOW_MS` | `900000` (15 min) | 900000 | 300000 (5 min) |
| `RATE_LIMIT_MAX_REQUESTS` | `100` | 1000 | 60 |

**Rate Limit Math:**
- Current production: 60 requests per 5 minutes = 12 requests/minute
- Adjust based on your API needs and user base

### Startup Configuration

| Variable | Default | Development | Production |
|----------|---------|-------------|------------|
| `SEED_ON_STARTUP` | `true` | `true` | `false` |

**Important**: Set to `false` in production to prevent data loss!

---

## Environment-Specific Configurations

### Local Development (.env.local)

**Purpose**: Quick development with Docker
**Use case**: Building and testing features locally

\`\`\`env
NODE_ENV=development
LOG_LEVEL=DEBUG
SEED_ON_STARTUP=true
DB_POOL_MAX=10
RATE_LIMIT_MAX_REQUESTS=1000
\`\`\`

**Benefits:**
- Auto-seeding for quick testing
- Debug logs for troubleshooting
- No rate limiting interference
- Lower resource usage

**How to use:**
\`\`\`bash
cp .env.local .env
docker-compose up -d
npm start
\`\`\`

---

### Staging (.env.staging)

**Purpose**: Pre-production testing
**Use case**: Testing with realistic data and performance metrics

\`\`\`env
NODE_ENV=staging
LOG_LEVEL=INFO
SEED_ON_STARTUP=false
DB_POOL_MAX=30
RATE_LIMIT_MAX_REQUESTS=200
\`\`\`

**Benefits:**
- Similar to production but allows experimentation
- Info logs for monitoring
- Realistic performance testing
- Manual data management

**How to use:**
\`\`\`bash
./scripts/setup-env.sh staging
npm start
\`\`\`

---

### Production (.env.aws)

**Purpose**: AWS RDS production deployment
**Use case**: Live environment serving end users

\`\`\`env
NODE_ENV=production
LOG_LEVEL=WARN
SEED_ON_STARTUP=false
DB_POOL_MAX=50
RATE_LIMIT_MAX_REQUESTS=60
\`\`\`

**Critical Security Requirements:**
1. **Never store real credentials in Git**
- Use AWS Secrets Manager
- Use CI/CD secrets
- Use environment variable injection

2. **Secure credential storage:**
\`\`\`bash
# AWS Secrets Manager example
aws secretsmanager create-secret \
--name ecommerce-prod \
--secret-string '{"DB_PASSWORD":"your_password"}'
\`\`\`

3. **Audit credential access:**
- Monitor AWS Secrets Manager
- Review IAM policies
- Enable CloudTrail logging

**How to use:**
\`\`\`bash
# Option 1: GitHub Secrets (CI/CD)
./scripts/setup-env.sh aws
# Add credentials via GitHub Secrets UI

# Option 2: Elastic Beanstalk Environment Variables
# Set in EB console or .ebextensions/env.config

# Option 3: Lambda Environment Variables
# Set in Lambda configuration
\`\`\`

---

## Environment Variable Validation

The API validates environment variables on startup. If required variables are missing, the server will not start.

**Required variables:**
- `DB_USER`
- `DB_PASSWORD`
- `DB_HOST`
- `DB_PORT`
- `DB_NAME`

**On startup, you'll see:**
\`\`\`
[DB] Database connection pool initialized
[Server] Server started successfully on port 5000
\`\`\`

**If missing, you'll see:**
\`\`\`
Error: Missing required environment variables: DB_PASSWORD, DB_HOST
\`\`\`

---

## Performance Tuning by Environment

### Connection Pool Tuning

**Development (Low Concurrency):**
\`\`\`env
DB_POOL_MAX=10
DB_POOL_MIN=2
\`\`\`

**Staging (Medium Concurrency):**
\`\`\`env
DB_POOL_MAX=30
DB_POOL_MIN=5
\`\`\`

**Production (High Concurrency):**
\`\`\`env
DB_POOL_MAX=50
DB_POOL_MIN=10
\`\`\`

**High Traffic (Requires larger RDS instance):**
\`\`\`env
DB_POOL_MAX=100
DB_POOL_MIN=20
\`\`\`

### Query Timeout Tuning

**Default (Suitable for most cases):**
\`\`\`env
DB_STATEMENT_TIMEOUT=30000 # 30 seconds
DB_QUERY_TIMEOUT=30000 # 30 seconds
\`\`\`

**Reduce for high-concurrency (aggressive):**
\`\`\`env
DB_STATEMENT_TIMEOUT=5000 # 5 seconds
DB_QUERY_TIMEOUT=5000 # 5 seconds
\`\`\`

**Increase for complex queries (lenient):**
\`\`\`env
DB_STATEMENT_TIMEOUT=60000 # 1 minute
DB_QUERY_TIMEOUT=60000 # 1 minute
\`\`\`

### Logging Impact on Performance

**Minimal overhead:**
\`\`\`env
LOG_LEVEL=ERROR # Only errors
\`\`\`

**Moderate overhead:**
\`\`\`env
LOG_LEVEL=WARN # Warnings and errors
\`\`\`

**High overhead:**
\`\`\`env
LOG_LEVEL=DEBUG # All information (development only)
\`\`\`

---

## Common Configuration Mistakes

### Mistake 1: Production credentials in .env file

\`\`\`env
# BAD - Never do this in production
DB_PASSWORD=MyRealPassword123!
\`\`\`

### Correct: Use secrets management

\`\`\`bash
# AWS Secrets Manager
export DB_PASSWORD=$(aws secretsmanager get-secret-value \
--secret-id ecommerce-prod \
--query SecretString --output text | jq -r .DB_PASSWORD)
\`\`\`

---

### Mistake 2: SEED_ON_STARTUP=true in production

\`\`\`env
# BAD - Will create test data and overwrite production!
SEED_ON_STARTUP=true
\`\`\`

### Correct: Disable in production

\`\`\`env
# GOOD
SEED_ON_STARTUP=false
\`\`\`

---

### Mistake 3: LOG_LEVEL=DEBUG in production

\`\`\`env
# BAD - Logs too much, impacts performance
LOG_LEVEL=DEBUG
\`\`\`

### Correct: Use WARN or ERROR

\`\`\`env
# GOOD
LOG_LEVEL=WARN
\`\`\`

---

### Mistake 4: Insufficient connection pool

\`\`\`env
# BAD - Runs out of connections under load
DB_POOL_MAX=5
\`\`\`

### Correct: Size appropriately

\`\`\`env
# GOOD
DB_POOL_MAX=50
\`\`\`

---

## Switching Environments

### Local to AWS

\`\`\`bash
# 1. Backup current .env
cp .env .env.local.backup

# 2. Set up AWS environment
./scripts/setup-env.sh aws

# 3. Add AWS credentials
# Edit .env with your RDS endpoint and password

# 4. Test connection
npm start

# Check logs:
curl http://localhost:5000/health
\`\`\`

### AWS to Local for Testing

\`\`\`bash
# 1. Backup AWS .env
cp .env .env.aws.backup

# 2. Switch to local
./scripts/setup-env.sh local

# 3. Start Docker
docker-compose up -d

# 4. Test
npm start
\`\`\`

---

## Verification Checklist

Before deploying to any environment, verify:

- [ ] All required variables are set
- [ ] Database credentials are correct
- [ ] `NODE_ENV` matches the environment
- [ ] `LOG_LEVEL` is appropriate
- [ ] `CORS_ORIGIN` is correct
- [ ] `SEED_ON_STARTUP` is `false` (production only)
- [ ] Connection pool is appropriately sized
- [ ] Rate limiting is configured
- [ ] Credentials are stored securely (not in Git)

**Quick verification:**
\`\`\`bash
node -e "
require('dotenv').config();
const required = ['DB_USER', 'DB_PASSWORD', 'DB_HOST', 'DB_PORT', 'DB_NAME'];
const missing = required.filter(v => !process.env[v]);
if (missing.length) {
console.error('Missing:', missing);
process.exit(1);
} else {
console.log(' All required variables set');
console.log('Environment:', process.env.NODE_ENV);
console.log('Log Level:', process.env.LOG_LEVEL);
console.log('DB Host:', process.env.DB_HOST);
}
"
\`\`\`

---

## Environment-Specific Debugging

### Local Development Issues

**Check Docker:**
\`\`\`bash
docker-compose ps
docker-compose logs postgres
\`\`\`

**Check .env:**
\`\`\`bash
cat .env | grep DB_
\`\`\`

**Verify database:**
\`\`\`bash
psql -h localhost -U postgres -d ecommerce_db
\`\`\`

### AWS Production Issues

**Check secrets:**
\`\`\`bash
aws secretsmanager get-secret-value --secret-id ecommerce-prod
\`\`\`

**Check application logs:**
\`\`\`bash
aws logs tail /aws/api/ecommerce --follow
\`\`\`

**Check RDS:**
\`\`\`bash
aws rds describe-db-instances --db-instance-identifier ecommerce-prod
\`\`\`

---

## Monitoring Loaded Configuration

The application logs its configuration on startup (with sensitive values masked):

\`\`\`
[Server] Starting with configuration:
- Environment: production
- Log Level: WARN
- Database Host: prod-db.rds.amazonaws.com
- Connection Pool: Max=50, Min=10
- CORS Origin: https://yourdomain.com
\`\`\`

---

## Support

For environment configuration issues:

1. **Check example files:**
- `.env.local` - Local development
- `.env.aws` - AWS production

2. **Run setup script:**
\`\`\`bash
./scripts/setup-env.sh [environment]
\`\`\`

3. **Review logs:**
\`\`\`bash
npm start 2>&1 | grep -i error
\`\`\`

4. **Verify with:**
\`\`\`bash
curl http://localhost:5000/health
\`\`\`
