# Deployment Checklist: Local to AWS

Complete checklist for deploying from local development to AWS production.

## Pre-Deployment (1-2 hours)

### Code Quality
- [ ] All tests passing: `npm test`
- [ ] No linting errors: `npm run lint`
- [ ] All console.log statements removed
- [ ] Error handling in place for all endpoints
- [ ] Input validation on all API inputs
- [ ] No hardcoded credentials in code
- [ ] API documentation updated

### Security Review
- [ ] SQL injection prevention verified (using parameterized queries)
- [ ] Input validation on all user inputs
- [ ] Rate limiting configured
- [ ] CORS properly configured
- [ ] Error messages don't leak sensitive info
- [ ] Password hashing verified (if applicable)
- [ ] SSL/TLS enabled for API
- [ ] API keys/tokens secured

### Performance Testing
- [ ] Load testing completed (at least 100 concurrent users)
- [ ] Response times acceptable (< 200ms average)
- [ ] Database queries optimized
- [ ] No N+1 query issues
- [ ] Connection pooling tested
- [ ] Memory leaks checked

## AWS Setup (2-3 hours)

### RDS Database Setup
- [ ] RDS instance created (PostgreSQL 14+)
- [ ] Database name: `ecommerce_db`
- [ ] Backup retention: 7 days
- [ ] Multi-AZ enabled (for production)
- [ ] Enhanced monitoring enabled
- [ ] Automated backups enabled
- [ ] Parameter groups configured
- [ ] Security groups configured correctly
- [ ] Subnet groups configured
- [ ] RDS endpoint noted: `___________`
- [ ] Master password stored securely
- [ ] Database connection tested

### AWS Secrets Manager
- [ ] Create secret: `ecommerce-prod`
- [ ] Add DB credentials to secret:
\`\`\`json
{
"DB_USER": "postgres",
"DB_PASSWORD": "your_password",
"DB_HOST": "endpoint.rds.amazonaws.com",
"DB_PORT": "5432",
"DB_NAME": "ecommerce_db"
}
\`\`\`
- [ ] IAM policy created for secret access
- [ ] Secret rotation configured (optional)

### Compute Setup (Choose One)

#### Option A: Elastic Beanstalk
- [ ] EB environment created
- [ ] Environment type: Node.js with Docker
- [ ] Instance type selected (t3.micro or larger)
- [ ] Load balancer configured
- [ ] Health check endpoint: `/health`
- [ ] Auto-scaling rules configured
- [ ] Environment variables set:
- [ ] `NODE_ENV=production`
- [ ] `LOG_LEVEL=WARN`
- [ ] `DB_HOST=<RDS_ENDPOINT>`
- [ ] `CORS_ORIGIN=https://yourdomain.com`
- [ ] `.ebextensions/env.config` created

#### Option B: EC2 + Application Load Balancer
- [ ] EC2 instance launched (Amazon Linux 2 or Ubuntu)
- [ ] Security group configured
- [ ] IAM role with RDS access created
- [ ] Application Load Balancer created
- [ ] Target group configured with health check
- [ ] SSL certificate configured
- [ ] Auto Scaling group configured

#### Option C: App Runner
- [ ] App Runner service created
- [ ] GitHub repository connected (if using)
- [ ] Build configuration defined
- [ ] Runtime environment variables set
- [ ] IAM role with secrets access configured
- [ ] Custom domain configured (optional)

### Networking & DNS
- [ ] Security groups allow port 443 (HTTPS)
- [ ] Security groups allow port 80 (HTTP)
- [ ] Database security group allows port 5432 from API
- [ ] Route 53 DNS records created
- [ ] API endpoint: `___________`
- [ ] SSL certificate provisioned (ACM)
- [ ] Certificate auto-renewal enabled

### Monitoring & Logging
- [ ] CloudWatch Log Group created: `/aws/api/ecommerce`
- [ ] CloudWatch alarms created:
- [ ] CPU utilization > 80%
- [ ] Database connections > 40
- [ ] API error rate > 5%
- [ ] Response time > 500ms
- [ ] X-Ray tracing enabled (optional)
- [ ] Application Insights enabled (optional)
- [ ] Health check endpoint verified

## Configuration (1 hour)

### Environment Variables
- [ ] `.env` file NOT committed to Git
- [ ] `.env.aws` file updated with actual values
- [ ] GitHub Secrets configured:
- [ ] `AWS_ROLE_ARN`
- [ ] `AWS_DB_HOST`
- [ ] `AWS_DB_USER`
- [ ] `AWS_DB_PASSWORD`
- [ ] `AWS_DB_NAME`
- [ ] `AWS_CORS_ORIGIN`
- [ ] `AWS_API_ENDPOINT`
- [ ] `SLACK_WEBHOOK` (for notifications)

### Database
- [ ] Database schema initialized on first deploy
- [ ] Database migrations tested
- [ ] `SEED_ON_STARTUP=false` set for production
- [ ] Indexes created for frequently queried columns
- [ ] Backup restoration tested

### API Configuration
- [ ] `LOG_LEVEL=WARN` for production
- [ ] `NODE_ENV=production` verified
- [ ] `DB_POOL_MAX=50` or appropriate value
- [ ] Rate limiting: 60 req per 5 minutes
- [ ] CORS origin set to frontend domain
- [ ] API documentation deployed

## CI/CD Setup (30 minutes)

### GitHub Actions
- [ ] `.github/workflows/deploy-to-aws.yml` configured
- [ ] Test job configured
- [ ] Build job configured
- [ ] Deploy job configured
- [ ] Slack notifications configured

### Deployment Pipeline
- [ ] Code triggers test on push
- [ ] Tests must pass before build
- [ ] Build must succeed before deploy
- [ ] Only main/production branch deploys
- [ ] Deployment notifications working

## Pre-Launch Testing (1-2 hours)

### API Testing
\`\`\`bash
# Test health endpoint
curl https://your-api-endpoint/health

# Test GET categories
curl https://your-api-endpoint/api/categories

# Test GET products
curl https://your-api-endpoint/api/products

# Test rate limiting
for i in {1..70}; do curl -s -o /dev/null https://your-api-endpoint/health & done
\`\`\`

### Database Testing
- [ ] Connection from API to RDS verified
- [ ] Queries execute successfully
- [ ] Response times acceptable
- [ ] Database backups working
- [ ] Data persistence verified

### Security Testing
- [ ] HTTPS forced (no HTTP)
- [ ] CORS headers correct
- [ ] Rate limiting working
- [ ] Error messages don't leak data
- [ ] Input validation working
- [ ] SQL injection prevented

### Performance Testing
- [ ] Load test: 100 concurrent users
- [ ] Load test: 500 concurrent users (if expected)
- [ ] Response times < 200ms (average)
- [ ] No 503 errors under load
- [ ] Memory usage stable
- [ ] Database connections pooled

### Monitoring Testing
- [ ] CloudWatch logs showing requests
- [ ] Health check passing
- [ ] Alarms triggering correctly
- [ ] Error logs captured
- [ ] Performance metrics recorded

## Launch Day (30 minutes)

### Final Checks
- [ ] All tests passing 
- [ ] All monitoring ready 
- [ ] All secrets configured 
- [ ] Team notified 
- [ ] Rollback plan ready 

### Deployment
- [ ] Merge code to main branch
- [ ] GitHub Actions CI/CD triggers
- [ ] Tests run successfully
- [ ] Build succeeds
- [ ] Deployment succeeds
- [ ] Health check passes
- [ ] Team notified via Slack

### Post-Launch Monitoring (First 24 hours)
- [ ] Monitor error rate
- [ ] Monitor response times
- [ ] Monitor database connections
- [ ] Check CloudWatch logs every hour
- [ ] Monitor user reports
- [ ] Be available for rollback if needed

## Post-Deployment (Ongoing)

### Daily Checks (First Week)
- [ ] Review error logs
- [ ] Check performance metrics
- [ ] Verify backups completed
- [ ] Monitor database size
- [ ] Check rate limit usage

### Weekly Checks
- [ ] Review CloudWatch dashboards
- [ ] Check security group rules
- [ ] Verify backup restoration (test)
- [ ] Review cost analysis
- [ ] Plan capacity upgrades if needed

### Monthly Checks
- [ ] Review performance trends
- [ ] Update security patches
- [ ] Review and rotate credentials
- [ ] Test disaster recovery
- [ ] Review logs for anomalies

## Rollback Plan

If deployment fails or issues occur:

### Quick Rollback
\`\`\`bash
# Option 1: Elastic Beanstalk
eb abort

# Option 2: Redeploy previous version
eb deploy ecommerce-api-prod --version <previous_version>

# Option 3: Manual rollback
git revert <commit_sha>
git push origin main
\`\`\`

### Database Rollback
\`\`\`bash
# Restore from RDS backup
aws rds restore-db-instance-from-db-snapshot \
--db-instance-identifier ecommerce-prod-restored \
--db-snapshot-identifier <snapshot-id>
\`\`\`

## Support & Debugging

### Common Issues

**Issue: API can't connect to RDS**
\`\`\`bash
# Check security group
aws ec2 describe-security-groups --group-ids <sg-id>

# Test connection
psql -h <rds-endpoint> -U postgres -d ecommerce_db

# Check environment variables
ssh ec2-instance
echo $DB_HOST
\`\`\`

**Issue: High response time**
\`\`\`bash
# Check CloudWatch metrics
aws cloudwatch get-metric-statistics \
--namespace AWS/RDS \
--metric-name CPUUtilization \
--dimensions Name=DBInstanceIdentifier,Value=ecommerce-prod

# Check slow queries
# Enable query logging in RDS parameter group
\`\`\`

**Issue: 503 errors (rate limiting)**
\`\`\`bash
# Check current rate limit settings
grep RATE_LIMIT .env

# Temporarily increase for testing
RATE_LIMIT_MAX_REQUESTS=1000
\`\`\`

## Contact & Escalation

- **Infrastructure Issues**: AWS Support
- **Database Issues**: AWS RDS Support
- **Application Issues**: Development Team
- **Security Issues**: Security Team
- **On-call Engineer**: [Add phone number]

## Sign-Off

| Role | Name | Date | Time |
|------|------|------|------|
| Deployer | __________ | __________ | __________ |
| QA Lead | __________ | __________ | __________ |
| DevOps Lead | __________ | __________ | __________ |
| Manager | __________ | __________ | __________ |

---

**Deployment Date**: ___________ 
**Environment**: AWS Production 
**Version**: ___________ 
**Rollback Decision**: ___________ 
**Notes**: _____________________________
