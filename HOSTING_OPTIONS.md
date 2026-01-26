# 24/7 Hosting Options for E-commerce API

## Free Tier Options (Best for Testing/Demo)

### 1. Render.com (Recommended)

**Pros:**
- Free tier includes web service + PostgreSQL
- Auto-deploys from GitHub
- 750+ hours/month free (24/7 coverage)
- Built-in SSL certificate
- Easy setup (5 minutes)

**Cons:**
- Free tier spins down after 15 min inactivity (50s cold start)
- 512 MB RAM limit

**Setup Steps:**

1. Go to https://render.com
2. Sign up with GitHub
3. Click "New +" > "Web Service"
4. Select your repository: `ecommerce-api-production`
5. Configure:
   - Name: `ecommerce-api`
   - Environment: `Node`
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Plan: `Free`
6. Add environment variables (from .env.production.example)
7. Click "Create Web Service"

**Database Setup:**
1. Click "New +" > "PostgreSQL"
2. Name: `ecommerce-db`
3. Plan: `Free` (90 days)
4. Copy connection string to your web service env vars

**Your API will be live at:** `https://ecommerce-api-xxxx.onrender.com`

**Limitations:**
- Free PostgreSQL expires after 90 days
- Server sleeps after 15 min inactivity

---

### 2. Railway.app

**Pros:**
- $5 free credit monthly
- No sleep/cold starts
- PostgreSQL + Redis included
- GitHub auto-deploy

**Cons:**
- Limited to 500 hours/month on free tier
- Credit runs out mid-month if heavily used

**Setup:**

1. Go to https://railway.app
2. Sign up with GitHub
3. Click "New Project" > "Deploy from GitHub repo"
4. Select `ecommerce-api-production`
5. Click "Add Plugin" > "PostgreSQL"
6. Click "Add Plugin" > "Redis" (optional)
7. Add environment variables
8. Deploy

**Your API will be live at:** `https://ecommerce-api-production.up.railway.app`

---

### 3. Fly.io

**Pros:**
- Free tier: 3 VMs with 256MB RAM
- True 24/7 (no sleep)
- PostgreSQL included
- Global edge network

**Cons:**
- Requires credit card
- CLI-based setup (more technical)

**Setup:**

```bash
# Install flyctl
curl -L https://fly.io/install.sh | sh

# Login
flyctl auth login

# Deploy
cd /path/to/ecommerce-api
flyctl launch

# Create PostgreSQL
flyctl postgres create

# Attach database
flyctl postgres attach <postgres-app-name>

# Deploy
flyctl deploy
```

**Your API will be live at:** `https://ecommerce-api-production.fly.dev`

---

### 4. Vercel (Serverless - Limited for APIs)

**Pros:**
- Completely free
- Auto-deploy from GitHub
- Global CDN

**Cons:**
- 10s execution timeout (not suitable for long-running operations)
- Serverless (connection pooling issues)
- Not recommended for database-heavy APIs

---

### 5. Heroku (No Longer Free)

Heroku eliminated free tier in November 2022. Cheapest plan is $7/month.

---

## Paid Options (Production-Ready 24/7)

### 1. AWS EC2 (Most Reliable)

**Cost:** $0.0116/hour (~$8.50/month for t2.micro)

**Setup:**
1. Launch EC2 t2.micro instance (Ubuntu)
2. Install Node.js, PostgreSQL, Redis
3. Clone your GitHub repo
4. Set up PM2 for process management
5. Configure Nginx reverse proxy
6. Get free SSL from Let's Encrypt

**Pros:**
- True 24/7 uptime
- Full control
- Scalable

**Cons:**
- Requires DevOps knowledge
- Manual setup

We have deployment guide: `DEPLOYMENT_GUIDE.md`

---

### 2. DigitalOcean Droplet

**Cost:** $6/month (1GB RAM)

**Setup:**
Similar to AWS but simpler interface:
1. Create Droplet (Ubuntu)
2. Use one-click Node.js app
3. Clone repo and configure
4. Set up PM2

**Pros:**
- Simpler than AWS
- Good documentation
- Predictable pricing

---

### 3. AWS Elastic Beanstalk

**Cost:** ~$15-25/month (includes RDS)

**Pros:**
- Fully managed
- Auto-scaling
- Load balancing

**Setup:**
We have GitHub Actions workflow in `.github/workflows/deploy-to-aws.yml`

---

### 4. Google Cloud Platform (GCP)

**Free Tier:** $300 credit (90 days)
**Cost After:** Similar to AWS

**Pros:**
- Good free tier
- Excellent documentation

---

## My Recommendation Based on Use Case

### For Demo/Portfolio (Free):
**Use Render.com**
- Easiest setup
- Free SSL
- GitHub auto-deploy
- Good enough for demos

**Note:** Server sleeps after 15min inactivity (you can use UptimeRobot to ping every 5min to keep it awake)

### For Learning/Testing (Free with caveats):
**Use Railway.app**
- True 24/7 (no sleep)
- $5 free credit
- Good for low traffic

### For Production (Paid):
**Use AWS EC2 or DigitalOcean**
- Reliable
- Scalable
- Full control
- Cost: ~$8-10/month

---

## Quick Start: Deploy to Render.com NOW (5 minutes)

1. **Visit:** https://render.com
2. **Sign up** with GitHub
3. **New Web Service** > Connect `ecommerce-api-production`
4. **Settings:**
   ```
   Build Command: npm install
   Start Command: npm start
   ```
5. **Add PostgreSQL:**
   - New > PostgreSQL > Free plan
   - Copy connection string
6. **Add Environment Variables:**
   ```
   DATABASE_URL=<paste connection string>
   NODE_ENV=production
   PORT=5000
   ```
7. **Deploy**

Your API will be live in 2-3 minutes!

---

## Keep Free Render Server Awake

Render free tier sleeps after 15min. Use UptimeRobot to ping:

1. Go to https://uptimerobot.com (free)
2. Add New Monitor
3. Type: HTTP(s)
4. URL: `https://your-app.onrender.com/health`
5. Interval: 5 minutes

This keeps your server awake 24/7!

---

## GitHub Actions Auto-Deploy

Your repo already has `.github/workflows/deploy-to-aws.yml`

To enable:
1. Add AWS credentials to GitHub Secrets
2. Push to main branch
3. Automatic deployment!

---

## Summary Table

| Service | Cost | Setup Time | 24/7 | Cold Start | Best For |
|---------|------|------------|------|------------|----------|
| Render.com | Free | 5 min | Yes* | 50s | Demo/Portfolio |
| Railway.app | Free ($5) | 5 min | Yes | None | Testing |
| Fly.io | Free | 10 min | Yes | None | Learning |
| AWS EC2 | $8.50/mo | 30 min | Yes | None | Production |
| DigitalOcean | $6/mo | 20 min | Yes | None | Production |

*Sleeps after 15min inactivity, use UptimeRobot to keep awake

---

## Next Steps

1. **For Quick Demo:** Deploy to Render.com now (5 min)
2. **For Production:** Follow `DEPLOYMENT_GUIDE.md` for AWS setup
3. **Keep Awake:** Set up UptimeRobot monitoring

Your API is GitHub-ready and deployment-ready!
