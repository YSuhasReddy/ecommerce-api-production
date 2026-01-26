# Environment Configuration Cheat Sheet

Quick reference for environment setup and configuration.

## One-Line Setup

\`\`\`bash
# Local Development
cp .env.local .env && docker-compose up -d && npm start

# AWS Production
./scripts/setup-env.sh aws && nano .env && git push

# Staging
./scripts/setup-env.sh staging
\`\`\`

---

## Environment Files Quick Reference

| File | Use | When |
|------|-----|------|
| `.env.local` | Local with Docker | Development |
| `.env.aws` | AWS RDS production | Production |
| `.env` | Current active config | Always symlink to one above |
| `.env.example` | Template reference | Never use directly |

---

## Copy Commands

\`\`\`bash
# For Local Development
cp .env.local .env

# For AWS Production
cp .env.aws .env
# Then edit with real credentials:
nano .env

# Backup current
cp .env .env.backup
\`\`\`

---

## Environment Variables Quick Table

\`\`\`

Variable Default Local Dev Production 

NODE_ENV dev development production 
PORT 5000 5000 5000 
LOG_LEVEL INFO DEBUG WARN 
DB_HOST local localhost <RDS_URL> 
DB_POOL_MAX 20 10 50 
DB_POOL_MIN 5 2 10 
SEED_ON_STARTUP true true false 
RATE_LIMIT_MAX_REQUESTS 100 1000 60 
CORS_ORIGIN *:3000 :3000 https://... 

\`\`\`

---

## Quick Commands

### Setup
\`\`\`bash
./scripts/setup-env.sh local # Local environment
./scripts/setup-env.sh aws # AWS environment
./scripts/setup-env.sh staging # Staging environment
./scripts/setup-env.sh test # Test environment
\`\`\`

### Verify Configuration
\`\`\`bash
cat .env | grep DB_
cat .env | grep NODE_ENV
cat .env | grep LOG_LEVEL
\`\`\`

### Test Connection
\`\`\`bash
# Local
psql -h localhost -U postgres -d ecommerce_db

# AWS
psql -h YOUR_RDS_ENDPOINT -U postgres -d ecommerce_db
\`\`\`

### Start API
\`\`\`bash
npm start # Uses .env file
NODE_ENV=test npm start # Override environment
\`\`\`

---

## Database Connection Strings

### Local (Docker)
\`\`\`
postgres://postgres:postgres123@localhost:5432/ecommerce_db
\`\`\`

### AWS RDS
\`\`\`
postgres://postgres:PASSWORD@ENDPOINT.rds.amazonaws.com:5432/ecommerce_db
\`\`\`

### Connection Test
\`\`\`bash
psql -h HOSTNAME -U DBUSER -d DBNAME -c "SELECT NOW();"
\`\`\`

---

## Environment Comparison

### Local Development
- **Best for**: Building and testing
- **Database**: Docker PostgreSQL
- **Setup time**: 5 minutes
- **Cost**: Free (local)
- **File**: `.env.local`

\`\`\`bash
cp .env.local .env
docker-compose up -d
npm start
\`\`\`

### AWS Production
- **Best for**: Live deployment
- **Database**: AWS RDS PostgreSQL
- **Setup time**: 30 minutes
- **Cost**: $10-50/month
- **File**: `.env.aws`

\`\`\`bash
./scripts/setup-env.sh aws
# Edit credentials in .env
git push origin main
\`\`\`

---

## Common Configurations

### For Development
\`\`\`env
NODE_ENV=development
LOG_LEVEL=DEBUG
DB_POOL_MAX=10
SEED_ON_STARTUP=true
RATE_LIMIT_MAX_REQUESTS=1000
\`\`\`

### For Production
\`\`\`env
NODE_ENV=production
LOG_LEVEL=WARN
DB_POOL_MAX=50
SEED_ON_STARTUP=false
RATE_LIMIT_MAX_REQUESTS=60
\`\`\`

### For Testing
\`\`\`env
NODE_ENV=test
LOG_LEVEL=ERROR
DB_POOL_MAX=5
SEED_ON_STARTUP=false
RATE_LIMIT_MAX_REQUESTS=10000
\`\`\`

---

## Security Checklist

Never:
\`\`\`bash
git add .env # Don't commit credentials
export PASSWORD=secret # Don't use shell history
console.log($PASSWORD) # Don't log secrets
\`\`\`

Always:
\`\`\`bash
# Use .gitignore
echo ".env" >> .gitignore

# Use secure storage
export DB_PASSWORD="$(aws secretsmanager ...)"

# Use CI/CD secrets
${{ secrets.AWS_DB_PASSWORD }}
\`\`\`

---

## Troubleshooting Quick Guide

### Connection Failed
\`\`\`bash
# Check .env exists
ls -la .env

# Check database is running
docker-compose ps # Local
aws rds describe-db-instances # AWS

# Test connection
psql -h $DB_HOST -U $DB_USER -d $DB_NAME
\`\`\`

### Wrong Environment
\`\`\`bash
# Check current
grep NODE_ENV .env

# Switch
./scripts/setup-env.sh [env]

# Or manually
sed -i 's/NODE_ENV=.*/NODE_ENV=production/' .env
\`\`\`

### Credentials Not Loading
\`\`\`bash
# Check file format
file .env

# Validate syntax
node -e "require('dotenv').config(); console.log(process.env.DB_HOST)"

# No spaces in values
DB_HOST=localhost # Good
DB_HOST = localhost # Bad (has spaces)
\`\`\`

### Port Already in Use
\`\`\`bash
# Change port
sed -i 's/PORT=5000/PORT=5001/' .env

# Or kill process
lsof -i :5000
kill -9 <PID>
\`\`\`

---

## Performance Tuning Quick Reference

### Light Load (< 100 users)
\`\`\`env
DB_POOL_MAX=10
DB_POOL_MIN=2
LOG_LEVEL=DEBUG
\`\`\`

### Medium Load (100-500 users)
\`\`\`env
DB_POOL_MAX=30
DB_POOL_MIN=5
LOG_LEVEL=INFO
\`\`\`

### Heavy Load (500+ users)
\`\`\`env
DB_POOL_MAX=50
DB_POOL_MIN=10
LOG_LEVEL=WARN
\`\`\`

### Database Timeout Issues
\`\`\`env
# If getting "statement timeout" errors:
DB_STATEMENT_TIMEOUT=60000 # Increase to 60s
DB_QUERY_TIMEOUT=60000

# If getting "connection timeout" errors:
DB_STATEMENT_TIMEOUT=5000 # Decrease to 5s
\`\`\`

---

## File Locations

\`\`\`
ecommerce-api/
.env ← Current active (don't commit)
.env.local ← Copy for local dev
.env.aws ← Copy for AWS prod
.env.example ← Template reference
.env.backup ← Backup copy
scripts/setup-env.sh ← Setup script
\`\`\`

---

## GitHub Secrets for CI/CD

Add to GitHub Settings → Secrets:

\`\`\`
AWS_DB_HOST your-db.xxxxx.rds.amazonaws.com
AWS_DB_USER postgres
AWS_DB_PASSWORD <secure_password>
AWS_DB_NAME ecommerce_db
AWS_CORS_ORIGIN https://yourdomain.com
AWS_API_ENDPOINT your-api-endpoint.com
SLACK_WEBHOOK https://hooks.slack.com/...
AWS_ROLE_ARN arn:aws:iam::...
\`\`\`

---

## Useful Aliases

Add to `.bashrc` or `.zshrc`:

\`\`\`bash
alias env-local='cp .env.local .env && echo " Local environment"'
alias env-aws='cp .env.aws .env && echo " AWS environment"'
alias env-check='echo "NODE_ENV: $(grep NODE_ENV .env | cut -d= -f2)"'
alias env-backup='cp .env .env.$(date +%s).backup'
alias db-connect='psql -h ${DB_HOST:-localhost} -U ${DB_USER:-postgres} -d ${DB_NAME:-ecommerce_db}'
\`\`\`

Usage:
\`\`\`bash
env-local # Switch to local
env-aws # Switch to AWS
env-check # Check current environment
db-connect # Connect to database
\`\`\`

---

## Emergency Commands

### Rollback Configuration
\`\`\`bash
# Restore from backup
mv .env .env.broken
mv .env.backup .env
npm start
\`\`\`

### Reset Database (Local Only)
\`\`\`bash
docker-compose down -v
docker volume rm ecommerce_postgres_data
docker-compose up -d
npm start # Auto-seeds
\`\`\`

### Force Environment Reload
\`\`\`bash
# Kill and restart
killall node
npm start
\`\`\`

### Check Port Usage
\`\`\`bash
lsof -i :5000
netstat -an | grep 5000
\`\`\`

---

## Documentation Quick Links

| Document | Purpose | Read Time |
|----------|---------|-----------|
| `.env.local` | Local config | 2 min |
| `.env.aws` | AWS config | 2 min |
| `ENV_CONFIGURATION.md` | Detailed reference | 20 min |
| `DEPLOYMENT_GUIDE.md` | AWS setup steps | 30 min |
| `DEPLOYMENT_CHECKLIST.md` | Pre-launch checklist | 15 min |
| `QUICK_REFERENCE.md` | Debugging guide | 10 min |

---

## Essential Links

- **Local setup**: See `.env.local`
- **AWS setup**: See `.env.aws` and `DEPLOYMENT_GUIDE.md`
- **Help**: Run `./scripts/setup-env.sh --help`
- **All docs**: See `DOCUMENTATION_INDEX.md`

---

**Last Updated**: 2024 
**API Version**: Production-Ready 
**Database**: PostgreSQL 14+
