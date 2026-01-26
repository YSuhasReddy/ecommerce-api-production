# Deploy E-commerce API to Render.com (5 Minutes)

## Prerequisites
- GitHub account (you have this)
- Your repository: `https://github.com/YSuhasReddy/ecommerce-api-production`

## Step-by-Step Deployment

### Step 1: Create Render Account (1 minute)

1. Go to https://render.com
2. Click "Get Started for Free"
3. Sign up with GitHub
4. Authorize Render to access your GitHub repos

### Step 2: Create PostgreSQL Database (2 minutes)

1. Click "New +" (top right)
2. Select "PostgreSQL"
3. Configure:
   - **Name:** `ecommerce-db`
   - **Database:** `ecommerce_db`
   - **User:** `postgres`
   - **Region:** Oregon (US West) - Choose closest to you
   - **Plan:** Free
4. Click "Create Database"
5. Wait 1-2 minutes for database to provision
6. Once ready, copy the "Internal Database URL" (starts with `postgresql://`)
   - Click on database name > "Info" tab > Copy "Internal Database URL"

### Step 3: Deploy Web Service (2 minutes)

1. Click "New +" > "Web Service"
2. Click "Connect a repository"
3. Find and select: `ecommerce-api-production`
4. Configure service:

**Basic Settings:**
- **Name:** `ecommerce-api` (or your preferred name)
- **Region:** Oregon (same as database)
- **Branch:** `main`
- **Root Directory:** (leave blank)
- **Runtime:** Node
- **Build Command:** `npm install`
- **Start Command:** `npm start`

**Plan:**
- Select **Free**

5. Scroll down to "Environment Variables" section
6. Click "Add Environment Variable" and add these:

```
NODE_ENV = production
PORT = 5000
DB_HOST = (will be part of Internal Database URL)
DB_PORT = 5432
DB_NAME = ecommerce_db
DB_USER = postgres
DB_PASSWORD = (from Internal Database URL)
DATABASE_URL = (paste the full Internal Database URL from Step 2)
SEED_ON_STARTUP = true
LOG_LEVEL = INFO
RATE_LIMIT_WINDOW_MS = 900000
RATE_LIMIT_MAX_REQUESTS = 100
```

**Important:** For DATABASE_URL, paste the entire Internal Database URL you copied in Step 2.
It looks like: `postgresql://postgres:password@hostname:5432/ecommerce_db`

7. Click "Create Web Service"

### Step 4: Wait for Deployment (2-3 minutes)

You'll see the build logs in real-time:
- Installing dependencies...
- Building...
- Starting server...
- Deploy succeeded!

Once you see "Your service is live", your API is running!

### Step 5: Get Your Live URL

Your API will be available at:
```
https://ecommerce-api-xxxx.onrender.com
```

Test it:
- Health: `https://your-url.onrender.com/health`
- API Docs: `https://your-url.onrender.com/api-docs`
- Products: `https://your-url.onrender.com/api/products`

## Environment Variables Explained

Here's what each variable does:

| Variable | Value | Purpose |
|----------|-------|---------|
| NODE_ENV | production | Enables production optimizations |
| PORT | 5000 | Server port (Render auto-assigns) |
| DATABASE_URL | postgresql://... | Full database connection string |
| SEED_ON_STARTUP | true | Loads sample data on first start |
| LOG_LEVEL | INFO | Controls logging verbosity |
| RATE_LIMIT_WINDOW_MS | 900000 | Rate limit window (15 min) |
| RATE_LIMIT_MAX_REQUESTS | 100 | Max requests per window |

## Optional: Add Redis (Free)

Render doesn't offer free Redis, but you can use:

1. **Upstash Redis (Free tier):**
   - Go to https://upstash.com
   - Create free Redis database
   - Copy Redis URL
   - Add to Render env vars:
     ```
     REDIS_URL = redis://...
     ```

## Optional: Keep Server Awake 24/7

Render free tier sleeps after 15 minutes of inactivity.

**Solution: UptimeRobot (Free)**

1. Go to https://uptimerobot.com
2. Sign up (free)
3. Add New Monitor:
   - **Monitor Type:** HTTP(s)
   - **Friendly Name:** Ecommerce API
   - **URL:** `https://your-app.onrender.com/health`
   - **Monitoring Interval:** 5 minutes
4. Click "Create Monitor"

UptimeRobot will ping your API every 5 minutes, keeping it awake!

## Verify Deployment

Test these endpoints in your browser:

1. **Health Check:**
   ```
   https://your-app.onrender.com/health
   ```
   Should return:
   ```json
   {
     "success": true,
     "status": "healthy",
     "database": {...},
     "memory": {...}
   }
   ```

2. **API Documentation:**
   ```
   https://your-app.onrender.com/api-docs
   ```
   Interactive Swagger UI

3. **Get Products:**
   ```
   https://your-app.onrender.com/api/products
   ```
   Should return list of products

4. **Get Categories:**
   ```
   https://your-app.onrender.com/api/categories
   ```
   Should return list of categories

## Automatic Deployments

Every time you push to GitHub `main` branch, Render automatically:
1. Detects the push
2. Rebuilds your app
3. Deploys the new version
4. Zero downtime!

Test it:
```bash
# Make a change
echo "# Updated" >> README.md
git add .
git commit -m "Test auto-deploy"
git push
```

Watch the deploy in Render dashboard!

## Troubleshooting

### Issue: Build Failed

**Check:**
- Build logs in Render dashboard
- Ensure package.json is correct
- Verify Node version compatibility

**Solution:**
Add to package.json:
```json
"engines": {
  "node": "18.x"
}
```

### Issue: Database Connection Error

**Check:**
- DATABASE_URL is correct
- Database is in same region as web service
- Database status is "Available"

**Solution:**
Copy Internal Database URL again and update env var

### Issue: 503 Service Unavailable

**Reason:** App is starting (cold start)

**Wait:** 30-60 seconds, then refresh

### Issue: Port Already in Use

**Render assigns port automatically**

Make sure your server.js uses:
```javascript
const PORT = process.env.PORT || 5000;
```

## Monitoring Your App

Render Dashboard shows:
- Deploy history
- Logs (real-time)
- Metrics (CPU, Memory)
- Request stats

Access logs:
1. Go to your service
2. Click "Logs" tab
3. See real-time application logs

## Upgrade Options

Free tier limitations:
- 750 hours/month (24/7 for 31 days)
- 512 MB RAM
- Sleeps after 15 min inactivity
- 90-day PostgreSQL

**Upgrade to Starter ($7/month):**
- No sleep
- 1 GB RAM
- Permanent PostgreSQL
- Priority support

## Custom Domain (Optional)

Add your own domain:
1. Go to service settings
2. "Custom Domains" section
3. Click "Add Custom Domain"
4. Enter your domain
5. Add DNS records (Render provides)

## Summary

Your deployment is complete! You now have:

✅ Live API running 24/7
✅ PostgreSQL database
✅ Automatic deployments from GitHub
✅ SSL certificate (HTTPS)
✅ Health monitoring
✅ API documentation

**Your API URL:** `https://ecommerce-api-xxxx.onrender.com`

Share this URL with anyone to test your API!

## Next Steps

1. Set up UptimeRobot to prevent sleep
2. Share your API URL
3. Test with Postman (use provided collection)
4. Monitor usage in Render dashboard
5. Consider upgrading if you need no-sleep

## Support

Issues? Check:
- Render Status: https://status.render.com
- Render Docs: https://render.com/docs
- Your logs in Render dashboard
