# Environment Setup & Deployment Summary

Complete summary of environment configuration and deployment options for your ecommerce API.

## Files Created/Updated

### Configuration Files
1. **`.env.local`** - Local development with Docker (copy to `.env`)
2. **`.env.aws`** - AWS RDS production configuration
3. **`.env.example`** - Generic template with all variables explained

### Documentation Files
1. **`ENV_CONFIGURATION.md`** - Complete environment variable reference
2. **`DEPLOYMENT_GUIDE.md`** - Step-by-step AWS deployment guide
3. **`DEPLOYMENT_CHECKLIST.md`** - Pre-launch and post-launch checklist

### Scripts
1. **`scripts/setup-env.sh`** - Automated environment setup script

### CI/CD
1. **`.github/workflows/deploy-to-aws.yml`** - GitHub Actions deployment pipeline

---

## Quick Setup (5 minutes)

### Option 1: Local Development
\`\`\`bash
# Copy environment file
cp .env.local .env

# Start Docker
docker-compose up -d

# Start API
npm start

# Test
curl http://localhost:5000/health
\`\`\`

### Option 2: AWS Production
\`\`\`bash
# Run setup script
./scripts/setup-env.sh aws

# Edit .env with your credentials
nano .env
# - DB_PASSWORD: Your RDS master password
# - DB_HOST: Your RDS endpoint

# Deploy (handles CI/CD)
git push origin main
\`\`\`

---

## Environment Variables Overview

### Required for All Environments
\`\`\`
DB_USER Database username
DB_PASSWORD Database password
DB_HOST Database hostname
DB_PORT Database port (usually 5432)
DB_NAME Database name
\`\`\`

### Server Configuration
\`\`\`
NODE_ENV development | staging | production
PORT Server port (default: 5000)
CORS_ORIGIN Frontend URL for CORS
\`\`\`

### Performance Tuning
\`\`\`
DB_POOL_MAX Connection pool max (dev:10, prod:50)
DB_POOL_MIN Connection pool min (dev:2, prod:10)
DB_STATEMENT_TIMEOUT Query timeout in ms (default: 30000)
DB_QUERY_TIMEOUT Query timeout in ms (default: 30000)
\`\`\`

### Logging & Security
\`\`\`
LOG_LEVEL ERROR | WARN | INFO | DEBUG
RATE_LIMIT_WINDOW_MS Time window for rate limiting
RATE_LIMIT_MAX_REQUESTS Max requests in window
SEED_ON_STARTUP Auto-seed test data (dev: true, prod: false)
\`\`\`

---

## Environment Profiles

### Development Profile (.env.local)
**Best for**: Building and testing locally with Docker
\`\`\`
NODE_ENV=development
LOG_LEVEL=DEBUG
DB_POOL_MAX=10
SEED_ON_STARTUP=true
RATE_LIMIT_MAX_REQUESTS=1000
\`\`\`

### Staging Profile (.env.staging)
**Best for**: Testing with realistic performance
\`\`\`
NODE_ENV=staging
LOG_LEVEL=INFO
DB_POOL_MAX=30
SEED_ON_STARTUP=false
RATE_LIMIT_MAX_REQUESTS=200
\`\`\`

### Production Profile (.env.aws)
**Best for**: Live AWS RDS deployment
\`\`\`
NODE_ENV=production
LOG_LEVEL=WARN
DB_POOL_MAX=50
SEED_ON_STARTUP=false
RATE_LIMIT_MAX_REQUESTS=60
\`\`\`

---

## Setup Methods

### Method 1: Setup Script (Recommended)
\`\`\`bash
# Local development
./scripts/setup-env.sh local

# AWS production
./scripts/setup-env.sh aws

# Staging
./scripts/setup-env.sh staging

# Testing
./scripts/setup-env.sh test
\`\`\`

### Method 2: Manual Copy
\`\`\`bash
# Development
cp .env.local .env

# Production
cp .env.aws .env
nano .env # Edit with real credentials
\`\`\`

### Method 3: GitHub Secrets (CI/CD)
1. Go to repository Settings → Secrets
2. Add secrets: `AWS_DB_HOST`, `AWS_DB_PASSWORD`, etc.
3. CI/CD pipeline automatically uses them

---

## Deployment Paths

### Path 1: Local Development → Docker
\`\`\`
1. Copy .env.local to .env
2. docker-compose up -d
3. npm start
API runs on http://localhost:5000
\`\`\`

### Path 2: Local → AWS Elastic Beanstalk
\`\`\`
1. Create RDS instance
2. Create Elastic Beanstalk environment
3. ./scripts/setup-env.sh aws
4. Configure credentials in GitHub Secrets
5. git push → CI/CD handles deployment
API runs on https://your-endpoint.elasticbeanstalk.com
\`\`\`

### Path 3: Local → AWS App Runner
\`\`\`
1. Create RDS instance
2. Create App Runner service
3. Connect GitHub repository
4. ./scripts/setup-env.sh aws
5. Configure environment variables in App Runner console
API runs on App Runner custom domain
\`\`\`

### Path 4: Local → EC2 + ALB
\`\`\`
1. Create RDS instance
2. Launch EC2 instances
3. Create Application Load Balancer
4. Deploy API manually or with CI/CD
5. Configure Route 53 DNS
API runs on custom domain via ALB
\`\`\`

---

## Connection String Reference

### Local Development (Docker)
\`\`\`
postgres://postgres:postgres123@localhost:5432/ecommerce_db
\`\`\`

### AWS RDS
\`\`\`
postgres://postgres:YOUR_PASSWORD@your-db.xxxxx.us-east-1.rds.amazonaws.com:5432/ecommerce_db
\`\`\`

---

## Environment Variable by Use Case

### For High Traffic Applications
\`\`\`
DB_POOL_MAX=100
DB_POOL_MIN=20
LOG_LEVEL=ERROR
RATE_LIMIT_MAX_REQUESTS=1000
DB_STATEMENT_TIMEOUT=10000 # Aggressive timeout
\`\`\`

### For Development/Testing
\`\`\`
DB_POOL_MAX=5
DB_POOL_MIN=1
LOG_LEVEL=DEBUG
RATE_LIMIT_MAX_REQUESTS=10000
SEED_ON_STARTUP=true
\`\`\`

### For Compliance (Logging)
\`\`\`
LOG_LEVEL=INFO
RATE_LIMIT_WINDOW_MS=300000
RATE_LIMIT_MAX_REQUESTS=50 # Strict limits
DB_POOL_MAX=30
\`\`\`

---

## Security Best Practices

### Storing Credentials

**Never do this:**
\`\`\`bash
git add .env
# Credentials committed to Git
\`\`\`

**Do this instead:**

**Option 1: AWS Secrets Manager**
\`\`\`bash
aws secretsmanager create-secret \
--name ecommerce-prod \
--secret-string '{"DB_PASSWORD":"secret"}'
\`\`\`

**Option 2: GitHub Secrets**
1. Settings → Secrets and variables → Actions
2. Add `AWS_DB_PASSWORD`, etc.
3. Reference in CI/CD: `${{ secrets.AWS_DB_PASSWORD }}`

**Option 3: Environment Variables (Recommended)**
\`\`\`bash
export DB_PASSWORD="your_password"
npm start
\`\`\`

### .gitignore

Ensure `.env` files are ignored:
\`\`\`
.env
.env.local
.env.aws
.env*.backup
.env*.local
\`\`\`

---

## Troubleshooting

### Setup Script Not Working
\`\`\`bash
# Make executable
chmod +x scripts/setup-env.sh

# Run with bash explicitly
bash scripts/setup-env.sh local
\`\`\`

### Environment Variables Not Loading
\`\`\`bash
# Verify file exists
ls -la .env

# Check contents
cat .env | grep DB_

# Verify in Node
node -e "require('dotenv').config(); console.log(process.env.DB_HOST)"
\`\`\`

### Database Connection Failed
\`\`\`bash
# Test connection manually
psql -h localhost -U postgres -d ecommerce_db

# From AWS
psql -h your-endpoint.rds.amazonaws.com -U postgres -d ecommerce_db
\`\`\`

### Wrong Environment Deployed
\`\`\`bash
# Check current environment
cat .env | grep NODE_ENV

# Switch environments
./scripts/setup-env.sh aws # Switch to production
./scripts/setup-env.sh local # Switch to local
\`\`\`

---

## Monitoring & Maintenance

### Check Current Configuration
\`\`\`bash
node -e "
require('dotenv').config();
console.log('Environment:', process.env.NODE_ENV);
console.log('Database:', process.env.DB_HOST);
console.log('Log Level:', process.env.LOG_LEVEL);
console.log('Pool Max:', process.env.DB_POOL_MAX);
"
\`\`\`

### View Database Connections
\`\`\`bash
psql -h localhost -U postgres -d ecommerce_db

# Inside psql:
SELECT datname, usename, count(*) FROM pg_stat_activity 
GROUP BY datname, usename;
\`\`\`

### Monitor API Logs
\`\`\`bash
# Local
npm start 2>&1 | grep -E "ERROR|WARN"

# AWS CloudWatch
aws logs tail /aws/api/ecommerce --follow
\`\`\`

---

## Common Tasks

### Switch from Local to AWS
\`\`\`bash
# 1. Stop local Docker
docker-compose down

# 2. Set up AWS environment
./scripts/setup-env.sh aws

# 3. Configure credentials
nano .env

# 4. Test connection
npm start
\`\`\`

### Add New Environment Variable
1. Add to all relevant `.env.*` files
2. Add to documentation (ENV_CONFIGURATION.md)
3. Update GitHub Secrets if using CI/CD
4. Update CI/CD workflow if needed
5. Test in development first

### Update Database Credentials
\`\`\`bash
# 1. Update RDS password in AWS console
# 2. Update environment variables:
export DB_PASSWORD="new_password"
npm start

# Or edit .env file and restart
\`\`\`

### Scale Connection Pool for High Traffic
1. Check current pool size: `echo $DB_POOL_MAX`
2. Edit `.env`: `DB_POOL_MAX=100`
3. Verify RDS can handle connections
4. Restart API: `npm start`

---

## Documentation Files Map

\`\`\`
ecommerce-api/
.env.local # Local dev config
.env.aws # AWS prod config
.env.example # Generic template
ENV_CONFIGURATION.md # This file - env reference
DEPLOYMENT_GUIDE.md # AWS deployment steps
DEPLOYMENT_CHECKLIST.md # Pre/post launch checklist
PRODUCTION_GUIDE.md # Production best practices
QUICK_REFERENCE.md # Quick debugging guide
BUG_ANALYSIS.md # Known issues & fixes
scripts/
setup-env.sh # Automated setup script
\`\`\`

---

## Next Steps

1. **Choose your path:**
- Local with Docker: `cp .env.local .env`
- AWS production: `./scripts/setup-env.sh aws`

2. **Configure credentials:**
- Edit `.env` with your database details

3. **Test connection:**
- `npm start` and verify `/health` endpoint

4. **For production deployment:**
- Review `DEPLOYMENT_GUIDE.md`
- Complete `DEPLOYMENT_CHECKLIST.md`
- Use `.github/workflows/deploy-to-aws.yml`

---

## Support

- **Local issues**: Check `QUICK_REFERENCE.md`
- **Environment problems**: Review `ENV_CONFIGURATION.md`
- **AWS deployment**: Follow `DEPLOYMENT_GUIDE.md`
- **Pre-launch**: Use `DEPLOYMENT_CHECKLIST.md`
- **Bug reference**: See `BUG_ANALYSIS.md`

**Questions?** Review the relevant documentation file or run:
\`\`\`bash
./scripts/setup-env.sh --help
\`\`\`
