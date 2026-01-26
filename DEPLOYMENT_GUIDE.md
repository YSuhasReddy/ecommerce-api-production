# Deployment Guide: Local to AWS Production

This guide covers deploying your ecommerce API from local Docker development to AWS RDS production.

## Table of Contents

1. [Local Development Setup](#local-development-setup)
2. [AWS RDS Setup](#aws-rds-setup)
3. [Environment Configuration](#environment-configuration)
4. [Migration from Local to AWS](#migration-from-local-to-aws)
5. [Scaling & Monitoring](#scaling--monitoring)
6. [Troubleshooting](#troubleshooting)

---

## Local Development Setup

### Prerequisites

- Docker & Docker Compose installed
- Node.js 16+ installed
- Git installed

### Quick Start

1. **Clone and install:**
\`\`\`bash
git clone <your-repo>
cd ecommerce-api
npm install
\`\`\`

2. **Start PostgreSQL with Docker:**
\`\`\`bash
docker-compose up -d
\`\`\`

3. **Configure environment:**
\`\`\`bash
cp .env.local .env
\`\`\`

4. **Start API server:**
\`\`\`bash
npm start
\`\`\`

5. **Verify:**
\`\`\`bash
curl http://localhost:5000/health
\`\`\`

### Docker Compose Verification

\`\`\`bash
# Check container status
docker-compose ps

# View PostgreSQL logs
docker-compose logs postgres

# Access PostgreSQL directly
docker exec -it ecommerce_postgres psql -U postgres -d ecommerce_db

# Stop all services
docker-compose down
\`\`\`

### Resetting Local Database

\`\`\`bash
# Stop containers
docker-compose down -v

# Remove volume (deletes all data)
docker volume rm ecommerce_postgres_data

# Restart
docker-compose up -d
npm start # Auto-seeds database
\`\`\`

---

## AWS RDS Setup

### Step 1: Create RDS Instance

1. **Log in to AWS Console** → RDS
2. **Create Database:**
- Engine: PostgreSQL 14+
- DB Instance Class: `db.t3.micro` (free tier) or higher
- Storage: 20 GB
- Multi-AZ: No (for cost; enable later)
- VPC Security Group: Allow port 5432 inbound from your API

3. **Database Details:**
- DB Instance Identifier: `ecommerce-prod`
- Master username: `postgres`
- Master password: Generate a strong password (save it!)

4. **Additional Configuration:**
- Initial Database Name: `ecommerce_db`
- Backup retention: 7 days
- Enable automatic minor version upgrade

5. **Create** and wait ~5-10 minutes for provisioning

### Step 2: Get RDS Endpoint

1. Navigate to RDS → Databases → `ecommerce-prod`
2. Find **Endpoint** (e.g., `ecommerce-prod.xxxxx.us-east-1.rds.amazonaws.com`)
3. Note the endpoint and master password

### Step 3: Configure Security Group

1. Go to EC2 → Security Groups
2. Find the RDS security group
3. Add inbound rule:
- Type: PostgreSQL
- Port: 5432
- Source: Your API's security group or IP

### Step 4: Verify RDS Connection

From your local machine:
\`\`\`bash
psql -h ecommerce-prod.xxxxx.us-east-1.rds.amazonaws.com \
-U postgres \
-d ecommerce_db \
-p 5432
\`\`\`

Enter the master password when prompted.

---

## Environment Configuration

### Local Development (.env)

\`\`\`bash
cp .env.local .env
# Edit .env with your Docker credentials (usually no changes needed)
\`\`\`

### AWS Production (CI/CD or Manual)

**Option A: Using GitHub Secrets (Recommended for CI/CD)**

1. Go to GitHub Repository → Settings → Secrets and variables → Actions
2. Add secrets:
- `AWS_DB_USER`: `postgres`
- `AWS_DB_PASSWORD`: Your RDS master password
- `AWS_DB_HOST`: Your RDS endpoint
- `AWS_DB_PORT`: `5432`
- `AWS_DB_NAME`: `ecommerce_db`
- `AWS_CORS_ORIGIN`: Your frontend domain

3. In your CI/CD pipeline (.github/workflows), use:
\`\`\`yaml
- name: Deploy to AWS
env:
DB_USER: ${{ secrets.AWS_DB_USER }}
DB_PASSWORD: ${{ secrets.AWS_DB_PASSWORD }}
DB_HOST: ${{ secrets.AWS_DB_HOST }}
DB_PORT: ${{ secrets.AWS_DB_PORT }}
DB_NAME: ${{ secrets.AWS_DB_NAME }}
NODE_ENV: production
LOG_LEVEL: WARN
\`\`\`

**Option B: AWS Secrets Manager (More Secure)**

1. **Create Secret in AWS Secrets Manager:**
\`\`\`bash
aws secretsmanager create-secret \
--name ecommerce-api-prod \
--secret-string '{
"DB_USER":"postgres",
"DB_PASSWORD":"your_password",
"DB_HOST":"your-endpoint.rds.amazonaws.com",
"DB_PORT":"5432",
"DB_NAME":"ecommerce_db"
}'
\`\`\`

2. **Update connection.js** to load secrets:
\`\`\`javascript
// Example: Add AWS Secrets Manager integration
const secretsManager = require('aws-secrets-manager');
const secrets = await secretsManager.getSecrets();
\`\`\`

**Option C: Environment Variables in Elastic Beanstalk**

1. Create `.ebextensions/env.config`:
\`\`\`yaml
option_settings:
- namespace: aws:autoscaling:launchconfiguration
option_name: EnvironmentVariables
value:
NODE_ENV: production
DB_HOST: your-endpoint.rds.amazonaws.com
DB_USER: postgres
DB_PASSWORD: (set in Elastic Beanstalk console)
\`\`\`

---

## Migration from Local to AWS

### Step 1: Export Local Data (Optional)

\`\`\`bash
# Dump local PostgreSQL to file
docker exec ecommerce_postgres pg_dump -U postgres ecommerce_db > backup.sql

# Restore to AWS RDS
psql -h your-endpoint.rds.amazonaws.com \
-U postgres \
-d ecommerce_db \
-f backup.sql
\`\`\`

### Step 2: Update Configuration

1. **Edit .env.aws** with actual RDS credentials
2. **Copy to production environment** (via secrets manager or CI/CD)

### Step 3: Run Database Migration

\`\`\`bash
# Set environment
export NODE_ENV=production
export DB_HOST=your-endpoint.rds.amazonaws.com
export DB_USER=postgres
export DB_PASSWORD=your_password
export DB_NAME=ecommerce_db

# Initialize schema (runs on first connection)
npm start

# API should now connect to AWS RDS
\`\`\`

### Step 4: Verify Production Deployment

\`\`\`bash
# From EC2 instance or Lambda:
curl http://your-api-endpoint/health

# Expected response:
# {"success":true,"message":"Server is running"}
\`\`\`

---

## Scaling & Monitoring

### Connection Pool Tuning for RDS

For high-traffic scenarios, adjust pool settings in `.env.aws`:

\`\`\`bash
# Current production settings
DB_POOL_MAX=50 # Max connections
DB_POOL_MIN=10 # Min connections
\`\`\`

**Scaling recommendation:**
- Dev: `MAX=10, MIN=2`
- Staging: `MAX=30, MIN=5`
- Production: `MAX=50, MIN=10`
- High Traffic: `MAX=100, MIN=20` (requires RDS instance increase)

### CloudWatch Monitoring

1. **Enable Enhanced Monitoring:**
- RDS Console → Databases → `ecommerce-prod`
- Modify → Enable Enhanced Monitoring

2. **Create Alarms:**
- CPU Utilization > 80%
- Database Connections > 40
- Read/Write Latency > 100ms

3. **Monitor Logs:**
\`\`\`bash
aws logs tail /aws/rds/ecommerce-prod --follow
\`\`\`

### Auto-Scaling with Application Load Balancer (ALB)

1. Create ALB pointing to multiple API instances
2. Configure target group with health check: `/health`
3. Set auto-scaling policies based on CPU/memory

---

## Troubleshooting

### Issue: Cannot Connect to RDS

**Symptoms:** `connect ECONNREFUSED` or timeout

**Solutions:**
1. Check RDS security group allows inbound on port 5432
2. Verify RDS endpoint is correct
3. Check database credentials
4. Verify VPC/subnet routing

\`\`\`bash
# Test connectivity
psql -h <rds-endpoint> -U postgres -d ecommerce_db

# Check RDS status
aws rds describe-db-instances --db-instance-identifier ecommerce-prod
\`\`\`

### Issue: High Database Latency

**Symptoms:** API slow responses, `statement timeout` errors

**Solutions:**
1. Increase `DB_STATEMENT_TIMEOUT` in .env
2. Check RDS instance size (CPU/memory)
3. Review query performance in CloudWatch
4. Add database indexes for frequently queried columns

### Issue: Connection Pool Exhaustion

**Symptoms:** `Client has encountered a connection error` 

**Solutions:**
1. Increase `DB_POOL_MAX` in .env
2. Check for connection leaks in app code
3. Enable connection timeout warnings
4. Upgrade RDS instance if queries are slow

### Issue: Out of Memory on RDS

**Symptoms:** Database becomes unresponsive

**Solutions:**
1. Upgrade RDS instance type
2. Review slow queries in CloudWatch
3. Add indexes to frequently queried tables
4. Reduce `DB_POOL_MAX` to free memory

### Monitoring Commands

\`\`\`bash
# Check RDS performance
aws cloudwatch get-metric-statistics \
--namespace AWS/RDS \
--metric-name CPUUtilization \
--dimensions Name=DBInstanceIdentifier,Value=ecommerce-prod \
--start-time 2024-01-01T00:00:00Z \
--end-time 2024-01-02T00:00:00Z \
--period 300 \
--statistics Average

# View RDS logs
aws rds describe-db-log-files \
--db-instance-identifier ecommerce-prod

# Monitor API health
while true; do
curl -s http://your-api-endpoint/health | jq .
sleep 5
done
\`\`\`

---

## Production Checklist

- [ ] RDS instance created and tested
- [ ] Security groups configured correctly
- [ ] Database credentials stored securely (Secrets Manager)
- [ ] Environment variables configured
- [ ] Connection pool tuned for production
- [ ] LOG_LEVEL set to WARN or ERROR
- [ ] SEED_ON_STARTUP set to false
- [ ] CORS_ORIGIN set to frontend domain
- [ ] Rate limiting configured
- [ ] Backups enabled and tested
- [ ] Monitoring alerts configured
- [ ] Health check endpoint verified
- [ ] Graceful shutdown tested
- [ ] Error handling verified in logs

---

## Quick Reference: Commands

\`\`\`bash
# Local Development
docker-compose up -d # Start services
docker-compose down # Stop services
npm start # Start API
npm run reset-db # Reset database

# AWS RDS Management
aws rds describe-db-instances # List RDS instances
aws rds create-db-instance # Create new instance
aws rds modify-db-instance # Modify instance
aws rds delete-db-instance # Delete instance

# Database Connection
psql -h <endpoint> -U postgres -d ecommerce_db
pg_dump > backup.sql
psql < backup.sql
\`\`\`

---

## Support

For issues or questions:
1. Check `/ecommerce-api/BUG_ANALYSIS.md` for known issues
2. Review `/ecommerce-api/QUICK_REFERENCE.md` for debugging
3. Check AWS RDS documentation
4. Review application logs in CloudWatch
