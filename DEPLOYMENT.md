# Deployment Guide - Supabase + Vercel

## Step 1: Set Up Supabase Database

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Note your database password when creating the project
3. Once ready, go to **Project Settings → Database**
4. Copy the **Connection string** under "Connection pooling" (URI format)
5. Replace `[YOUR-PASSWORD]` with your actual password

Example connection string:
```
postgresql://postgres:YOUR_PASSWORD@db.abcdefghijklmnop.supabase.co:5432/postgres?pgbouncer=true
```

## Step 2: Set Environment Variables in Vercel

1. Go to your Vercel project dashboard
2. Go to **Settings → Environment Variables**
3. Add these variables for **Production, Preview, and Development**:

```
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@db.xxx.supabase.co:5432/postgres?pgbouncer=true

SENDGRID_API_KEY=your_sendgrid_api_key_here
SENDGRID_FROM_EMAIL=your_verified_email@example.com

TWILIO_ACCOUNT_SID=your_twilio_account_sid_here
TWILIO_AUTH_TOKEN=your_twilio_auth_token_here
TWILIO_API_SECRET=your_twilio_api_secret_here
TWILIO_PHONE_NUMBER=your_twilio_phone_number_here

PEOPLE_DATA_LABS_API_KEY=your_pdl_api_key_here
```

## Step 3: Run Database Migrations on Supabase

From your local machine, with the Supabase DATABASE_URL:

```bash
# Update your local .env with Supabase URL temporarily
# Then run migrations
npx prisma migrate deploy

# Or create a new migration
npx prisma migrate dev --name init
```

## Step 4: Add Prisma Generate to Build Process

Make sure your `package.json` has this in scripts:

```json
{
  "scripts": {
    "build": "prisma generate && next build",
    "postinstall": "prisma generate"
  }
}
```

## Step 5: Deploy

1. Push changes to GitHub:
```bash
git add .
git commit -m "Configure for production deployment with Supabase"
git push origin main
```

2. Vercel will automatically redeploy
3. Check the deployment logs for any errors

## Step 6: Seed Initial Data (Optional)

If you want to copy your local data to production:

1. Export from local SQLite:
```bash
npx prisma db pull
```

2. With production DATABASE_URL, run:
```bash
npx prisma db push
```

## Common Issues

### Issue: "Can't reach database server"
**Fix**: Make sure you're using the **Connection pooling** URL from Supabase, not the direct connection string.

### Issue: "Prisma Client not generated"
**Fix**: Add `postinstall: "prisma generate"` to package.json scripts

### Issue: "Environment variables not working"
**Fix**: Make sure you've added them to Vercel and redeployed after adding them

## Authentication (Optional - For Later)

If you want to add login/authentication:

1. Enable Supabase Auth in your project
2. Install `@supabase/supabase-js` and `@supabase/auth-helpers-nextjs`
3. Configure authentication providers (email, Google, etc.)
4. Add auth middleware to protect routes

This can be added later - your app will work without auth for now.
