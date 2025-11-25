# Database Setup Guide - FrameForge 3D

## Quick Start

### Step 1: Set Environment Variables

Your deployment platform should provide PostgreSQL and Redis services. Set these environment variables:

**Required:**
```bash
DATABASE_URL=postgresql://user:password@host:port/database
REDIS_URL=redis://host:port
```

**Optional:**
```bash
STORAGE_TYPE=s3              # or 'local' for testing
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
AWS_S3_BUCKET=your-bucket
```

### Step 2: Run Database Migrations

Connect to your PostgreSQL database and run:

```bash
psql $DATABASE_URL -f 001_add_3d_models.sql
```

This will:
- Add 3D model columns to your frames table
- Create the `generation_jobs` table
- Set up indexes and views
- Create necessary enums

### Step 3: Add Sample Data (Optional)

To test with sample frames:

```bash
psql $DATABASE_URL -f seed-sample-data.sql
```

This adds 20 sample frames representing Jay's Frames products.

### Step 4: Verify Setup

Check your setup using the CLI:

```bash
# See statistics
npm run generate stats

# List all frames
npm run generate list
```

## Database Schema

### `frames` table
- Core frame product data
- `model_glb_url` - URL to GLB (web) model
- `model_usdz_url` - URL to USDZ (iOS AR) model
- `ar_enabled` - Whether AR is available
- `profile_type` - Frame profile (flat, stepped, ornate, etc.)
- `material` - Frame material (wood, metal, acrylic, etc.)

### `generation_jobs` table
- Tracks model generation history
- Links to frames via `frame_id`
- Stores job status, timing, and errors

## Connecting Existing Data

If you already have a `frames` table from FrameKraft:

1. The migration will add new columns without affecting existing data
2. Run: `UPDATE frames SET ar_enabled = true WHERE model_glb_url IS NOT NULL;`
3. Your existing frames will appear in the UI immediately

## Troubleshooting

### "Internal Server Error" on API calls

**Check database connection:**
```bash
psql $DATABASE_URL -c "SELECT version();"
```

**Verify tables exist:**
```bash
psql $DATABASE_URL -c "SELECT table_name FROM information_schema.tables WHERE table_schema='public';"
```

**Check if frames exist:**
```bash
psql $DATABASE_URL -c "SELECT COUNT(*) FROM frames;"
```

### "Connection refused" errors

1. Verify `DATABASE_URL` is set correctly
2. Check that PostgreSQL service is running
3. Verify `REDIS_URL` is set correctly
4. Check that Redis service is running

### No frames showing in UI

1. Run the seed script: `psql $DATABASE_URL -f seed-sample-data.sql`
2. Or insert your own frame data
3. Refresh the browser

## API Testing

Once setup is complete, test endpoints:

```bash
# Check health
curl https://your-app.com/api/health

# List frames
curl https://your-app.com/api/frames

# Get queue metrics
curl https://your-app.com/api/queue/metrics

# Generate a model
curl -X POST https://your-app.com/api/generate-model \
  -H "Content-Type: application/json" \
  -d '{"frameId": "your-frame-id"}'
```

## Next Steps

1. ✅ Database migrations run
2. ✅ Sample data loaded
3. 🎨 Visit your app UI
4. 🚀 Click "Generate All Missing Models"
5. 📊 Watch the queue metrics!

---

**Houston Heights Custom Framing**
🎨 Jay's Frames
📍 218 W 27th St, Houston, TX 77008
