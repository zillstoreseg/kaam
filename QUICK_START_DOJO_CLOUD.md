# DOJO CLOUD - Quick Start Guide

Get DOJO CLOUD running in 5 minutes!

---

## Step 1: Run Database Migration

Copy the contents of `SAAS_MIGRATION.sql` and execute in Supabase SQL Editor:

```
https://supabase.com/dashboard/project/YOUR_PROJECT_ID/sql/new
```

---

## Step 2: Migrate Existing Data

```bash
node migrate-to-default-academy.mjs
```

This creates "Default Academy" and assigns all existing data to it.

---

## Step 3: Create Platform Owner Account

```bash
node create-platform-owner.mjs
```

**Save these credentials:**
- Email: `owner@dojocloud.com`
- Password: `DojoCloud2024!Owner`

---

## Step 4: Start the Application

```bash
npm run dev
```

---

## Step 5: Configure Platform Settings

1. Navigate to: `http://localhost:5173/login`
2. Login with owner credentials
3. Click "Platform Admin" in sidebar
4. Go to "Platform Settings"
5. Add bank transfer details
6. (Optional) Add OpenAI API key for AI Assistant

---

## Test the Platform

### Test Landing Page
- Visit: `http://localhost:5173/`
- Browse features, pricing, FAQ
- Click "Start Free Trial"

### Test Registration
- Fill in academy information
- Create account
- Verify 14-day trial starts

### Test Academy Dashboard
- Login with new academy account
- Explore all features
- Click "Subscription" in sidebar
- Select a plan
- Upload payment screenshot

### Test Payment Approval
- Logout
- Login as platform owner
- Go to "Payment Approvals"
- View pending payment
- Click "Approve"
- Verify subscription activates

### Test AI Assistant
- Login as academy owner
- Click AI Assistant button (bottom right)
- Ask: "How many students do I have?"
- Verify response

---

## Routes Overview

### Public Routes
- `/` - Landing page
- `/register` - Academy registration
- `/login` - Login page

### Academy Routes (Authenticated)
- `/dashboard` - Main dashboard
- `/dashboard/students` - Student management
- `/dashboard/subscription` - Subscription management
- `/dashboard/*` - All other features

### Platform Owner Route
- `/platform-admin` - Platform owner dashboard

---

## Default Credentials

**Platform Owner:**
- Email: `owner@dojocloud.com`
- Password: `DojoCloud2024!Owner`

**Default Academy:**
- Uses existing user accounts
- All existing data assigned to "Default Academy"
- Trial period: 14 days

---

## Key Features to Test

1. **Multi-Tenancy**
   - Create 2 academies
   - Verify each sees only their data

2. **Subscription Flow**
   - Register academy
   - Select plan
   - Upload payment
   - Approve as owner
   - Verify activation

3. **AI Assistant**
   - Configure OpenAI key
   - Ask questions
   - Test responses

4. **Landing Page CMS**
   - Edit content from Platform Admin
   - Verify changes on landing page

5. **Platform Analytics**
   - Check total academies
   - View revenue
   - Monitor new signups

---

## Troubleshooting

### Migration Fails
- Check Supabase credentials in `.env`
- Ensure tables don't already exist
- Check for SQL syntax errors

### Can't Login as Owner
- Verify `create-platform-owner.mjs` ran successfully
- Check `platform_role` is set to `platform_owner`
- Try resetting password in Supabase dashboard

### Data Not Showing
- Verify `academy_id` is set on all records
- Check RLS policies are enabled
- Ensure user's `academy_id` matches data

### Payment Upload Fails
- Create storage bucket: `payment-screenshots`
- Set public access for the bucket
- Check file size limits

### AI Assistant Not Working
- Add OpenAI API key in Platform Settings
- Check API key is valid
- Verify fetch request succeeds

---

## Production Deployment

1. Run migrations on production database
2. Set environment variables
3. Build: `npm run build`
4. Deploy `dist` folder
5. Configure bank details
6. Add OpenAI API key
7. Test complete flow

---

## What's Next?

- Customize landing page content
- Update subscription pricing
- Configure bank transfer details
- Add your logo
- Invite first customers
- Monitor platform analytics

---

**You're ready to run DOJO CLOUD! 🚀**
