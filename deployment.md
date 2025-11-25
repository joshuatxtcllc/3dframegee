# FrameForge 3D - Railway Deployment Guide

Complete guide to deploying the 3D frame model generator to Railway for Jay's Frames.

## 📋 Prerequisites

- Railway account (https://railway.app)
- Existing FrameKraft PostgreSQL database
- GitHub repository with FrameForge 3D code
- AWS S3 bucket (or use Railway volumes)

## 🚀 Deployment Steps

### Step 1: Prepare Your Repository

1. **Push to GitHub**

```bash
git init
git add .
git commit -m "Initial commit - FrameForge 3D"
git remote add origin https://github.com/yourusername/frameforge-3d.git
git push -u origin main
```

2. **Verify railway.json**

Ensure `railway.json` is configured correctly for multiple services.

### Step 2: Create Railway Project

1. Go to https://railway.app/new
2. Click "Deploy from GitHub repo"
3. Select your `frameforge-3d` repository
4. Railway will create a new project

### Step 3: Configure PostgreSQL

**Option A: Link Existing FrameKraft Database**

If your FrameKraft database is already on Railway:

1. In Railway dashboard, go to your project
2. Click "New" → "Database" → "Add PostgreSQL"
3. Use existing database connection string

**Option B: External Database**

If FrameKraft is on another host:

1. Get connection string from your provider
2. Add as environment variable (see Step 5)

### Step 4: Add Redis

1. Click "New" in your Railway project
2. Select "Database" → "Add Redis"
3. Railway will provision Redis automatically
4. Note the `REDIS_URL` provided

### Step 5: Configure Environment Variables

**For API Service:**

Click on the API service → "Variables" tab → Add:

```
NODE_ENV=production
PORT=3000
DATABASE_URL=${{Postgres.DATABASE_URL}}
REDIS_URL=${{Redis.REDIS_URL}}

# Storage - Choose S3 or local
STORAGE_TYPE=s3

# If using S3
AWS_ACCESS_KEY_ID=your_access_key_here
AWS_SECRET_ACCESS_KEY=your_secret_key_here
AWS_REGION=us-east-1
AWS_BUCKET_NAME=jays-frames-3d-models
CDN_BASE_URL=https://d1234567890.cloudfront.net

# Or if using Railway volumes
# STORAGE_TYPE=local
# LOCAL_STORAGE_PATH=/app/models
# CDN_BASE_URL=https://frameforge-api.up.railway.app/models

# Generation Settings
MAX_FILE_SIZE_MB=2
DEFAULT_TEXTURE_RESOLUTION=1024
ENABLE_COMPRESSION=true

# Houston Business Info (for SEO)
BUSINESS_NAME=Jay's Frames
BUSINESS_ADDRESS=218 W 27th St
BUSINESS_CITY=Houston Heights
BUSINESS_STATE=TX
BUSINESS_ZIP=77008
BUSINESS_PHONE=(713) 555-0100
```

**For Worker Service:**

Same environment variables as API, plus:

```
WORKER_CONCURRENCY=2
```

### Step 6: Configure Services

**API Service:**

1. Service name: `frameforge-api`
2. Build Command: `npm install && npm run build`
3. Start Command: `npm start`
4. Root Directory: `/`

**Worker Service:**

1. Service name: `frameforge-worker`
2. Build Command: `npm install && npm run build`
3. Start Command: `npm run worker`
4. Root Directory: `/`

### Step 7: Add Railway Volumes (if using local storage)

**For API Service:**

1. Go to API service → "Settings" → "Volumes"
2. Click "New Volume"
3. Mount Path: `/app/models`
4. Size: 10GB (adjust based on inventory size)

**For Worker Service:**

1. Same volume configuration
2. Ensure both services share the same volume

### Step 8: Run Database Migration

**Method 1: Railway CLI**

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Link project
railway link

# Run migration
railway run psql $DATABASE_URL < migrations/001_add_3d_models.sql
```

**Method 2: Temporary Service**

1. Create a temporary service
2. Connect to PostgreSQL
3. Run migration manually:

```bash
psql $DATABASE_URL -f migrations/001_add_3d_models.sql
```

### Step 9: Deploy

1. Railway automatically deploys on push to `main`
2. Monitor deployment in Railway dashboard
3. Check logs for any errors

```bash
# Watch logs
railway logs --service frameforge-api
railway logs --service frameforge-worker
```

### Step 10: Test Deployment

**Health Check:**

```bash
curl https://frameforge-api.up.railway.app/api/health
```

**Generate Test Model:**

```bash
curl -X POST https://frameforge-api.up.railway.app/api/generate-model \
  -H "Content-Type: application/json" \
  -d '{"frameId": "your-test-frame-id"}'
```

**Check Queue Metrics:**

```bash
curl https://frameforge-api.up.railway.app/api/queue/metrics
```

## 🔒 Security Best Practices

### 1. Enable API Authentication

Add to `src/api/routes.ts`:

```typescript
const authenticateRequest = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  if (apiKey !== process.env.API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

router.use(authenticateRequest);
```

Add to Railway env:
```
API_KEY=your-secure-random-key-here
```

### 2. Set Up CORS Properly

Update `src/index.ts`:

```typescript
app.use(cors({
  origin: ['https://jaysframes.com', 'https://www.jaysframes.com'],
  credentials: true,
}));
```

### 3. Enable Rate Limiting

Install:
```bash
npm install express-rate-limit
```

Add to `src/index.ts`:

```typescript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use('/api/', limiter);
```

## 📊 Monitoring & Alerts

### 1. Set Up Railway Notifications

1. Go to Project Settings → Notifications
2. Add webhook URL for Slack/Discord
3. Configure alert conditions:
   - Deployment failures
   - High memory usage
   - Service crashes

### 2. Add Application Logging

Already configured via Winston in `src/utils/logger.ts`

View logs:
```bash
railway logs --service frameforge-api --tail
```

### 3. Monitor Queue Health

Create a health check endpoint that monitors queue:

```typescript
router.get('/queue/health', async (req, res) => {
  const metrics = await getQueueMetrics();
  const isHealthy = metrics.failed < 10 && metrics.active < 50;
  
  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'healthy' : 'unhealthy',
    metrics,
  });
});
```

## 🔄 Continuous Deployment

### Automatic Deployments

Railway automatically deploys when you push to GitHub:

```bash
git add .
git commit -m "Update frame profiles"
git push origin main
```

### Manual Deployment

```bash
railway up
```

### Rollback

```bash
railway rollback
```

## 💰 Cost Optimization

### Railway Pricing Estimate

**API Service:**
- Memory: 512MB
- CPU: 0.5 vCPU
- ~$5-10/month

**Worker Service:**
- Memory: 1GB (handles 3D generation)
- CPU: 1 vCPU
- ~$10-15/month

**PostgreSQL:** (if using Railway)
- 1GB storage
- ~$5/month

**Redis:**
- 256MB memory
- ~$5/month

**Total: ~$25-35/month**

### Cost Saving Tips

1. **Use Single Worker:** Reduce WORKER_CONCURRENCY instead of scaling horizontally
2. **Batch Off-Hours:** Schedule large batch jobs during low-traffic times
3. **S3 + CloudFront:** More cost-effective than Railway volumes at scale
4. **Cleanup Jobs:** Regularly clean completed/failed jobs from queue

## 🐛 Troubleshooting

### Service Won't Start

**Check logs:**
```bash
railway logs --service frameforge-api
```

**Common issues:**
- Missing environment variables
- Database connection string incorrect
- Redis URL malformed

### Worker Not Processing Jobs

**Verify worker is running:**
```bash
railway logs --service frameforge-worker
```

**Check queue metrics:**
```bash
curl https://frameforge-api.up.railway.app/api/queue/metrics
```

**Restart worker:**
```bash
railway restart --service frameforge-worker
```

### Models Not Generating

**Check permissions:**
- Verify AWS credentials if using S3
- Check Railway volume permissions

**Test single generation:**
```bash
railway run npm run generate -- generate --frame FRAME_ID
```

### Database Migration Failed

**Manual migration:**
```bash
railway connect postgres
# In psql:
\i migrations/001_add_3d_models.sql
```

## 🔧 Advanced Configuration

### Custom Domain

1. Go to Service → Settings → Domains
2. Add custom domain: `frameforge.jaysframes.com`
3. Configure DNS:

```
Type: CNAME
Name: frameforge
Value: frameforge-api.up.railway.app
```

### Scaling Workers

To handle more frames:

1. Increase `WORKER_CONCURRENCY` to 4-6
2. Or add another worker service
3. Monitor memory usage

### Redis Persistence

Enable in Redis service settings:
```
appendonly yes
appendfsync everysec
```

## 📈 Production Checklist

- [ ] Database migration completed
- [ ] Environment variables configured
- [ ] Both services deployed successfully
- [ ] Health checks passing
- [ ] Test model generation working
- [ ] Queue processing functioning
- [ ] Storage (S3/volumes) accessible
- [ ] API authentication enabled
- [ ] CORS configured for your domain
- [ ] Rate limiting enabled
- [ ] Monitoring/alerts configured
- [ ] Custom domain (optional) set up
- [ ] Backup strategy implemented

## 🆘 Support

**Railway Support:**
- Discord: https://discord.gg/railway
- Docs: https://docs.railway.app

**FrameForge Issues:**
- GitHub: https://github.com/yourusername/frameforge-3d/issues

**Jay's Frames:**
- 218 W 27th St, Houston Heights, TX 77008
- (832) 893-3794

---

**You're ready to generate 3D models for all 350+ frames! 🎨🚀**
