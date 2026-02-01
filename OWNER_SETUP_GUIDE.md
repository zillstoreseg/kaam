# Platform Owner Setup Guide

## Step 1: Apply Database Migrations

First, you need to apply the platform migrations to create the required tables.

### Option A: Via Supabase Dashboard (Recommended)

1. Go to your Supabase Dashboard: https://viwgdxffvehogkflhkjw.supabase.co
2. Navigate to **SQL Editor**
3. Click **New Query**
4. Copy and paste the contents of these files in order:
   - `supabase/migrations/20260201000000_create_saas_platform_owner_layer.sql`
   - `supabase/migrations/20260201000001_seed_platform_data.sql`
5. Click **Run** for each query

### Option B: Via Supabase CLI (if installed)

```bash
supabase db push
```

## Step 2: Create Platform Owner Account

After migrations are applied, run the setup script:

```bash
node setup-owner.mjs
```

This will create an owner account with these credentials:

```
Email:    owner@dojocloud.com
Password: Owner123!@#
```

## Step 3: Login to Your App

1. Open your application in the browser
2. Go to the login page
3. Enter the credentials from Step 2
4. After login, you'll see **"Platform Admin"** link in the sidebar (with crown icon)
5. Click it to access `/platform-admin`

## Step 4: Secure Your Account

**IMPORTANT**: Change the default password immediately!

1. In the app, go to Settings
2. Update your password to something secure
3. Consider updating the email to your real email address

## What You Can Do as Platform Owner

Once logged in to `/platform-admin`, you can:

### Overview Tab
- View total academies count
- See active vs inactive statistics
- Monitor recent academy activity

### Academies Tab
- Create new academies
- Edit academy details
- Change subscription plans
- Suspend/activate academies
- Manage subscription expiry dates

### Plans Tab
- Create/edit subscription plans
- Set pricing
- Configure plan-feature matrix
- Toggle features for each plan

### Features Tab
- Add new features
- Edit feature labels
- Organize features by category

## Creating Your First Academy

1. Go to Platform Admin → Academies tab
2. Click "Add Academy"
3. Enter:
   - **Name**: Your academy name (e.g., "Elite Martial Arts")
   - **Domain**: Domain without protocol (e.g., "elite.example.com")
   - **Plan**: Select Basic, Pro, or Elite
4. Click "Create"

The academy will start with:
- Status: Active
- Subscription: 30-day trial
- Features: Based on selected plan

## Domain Setup for Academies

Each academy needs a domain or subdomain:

### Development (localhost)
- Use localhost without domain checks
- All features available by default

### Production Options

**Option 1: Subdomains**
```
academy1.yourdomain.com
academy2.yourdomain.com
academy3.yourdomain.com
```

**Option 2: Custom Domains**
```
elitemartialarts.com
tigerdojo.com
blackbeltacademy.com
```

Configure DNS to point to your application, then add the exact domain to the academy record.

## Troubleshooting

### Cannot See Platform Admin Link
- Verify you're logged in with the owner account
- Check browser console for errors
- Log out and log back in
- Run `node setup-owner.mjs` again to verify owner role

### Shows 404 on /platform-admin
- This is expected for non-owner accounts
- Verify owner role in database:
  ```sql
  SELECT * FROM platform_roles WHERE user_id = 'your-user-id';
  ```

### Academy Cannot Access System
- Check academy status is 'active'
- Check subscription_status is not 'expired'
- Verify expires_at is in the future
- Check domain matches exactly

### Features Not Showing
- Verify feature exists in features table
- Check plan_features mapping
- Check academy_feature_overrides for blocks
- Verify hasFeature() is implemented in component

## Quick SQL Reference

### Check if Owner Role Exists
```sql
SELECT * FROM platform_roles;
```

### Manually Create Owner
```sql
-- Get user ID first
SELECT id, email FROM auth.users WHERE email = 'your@email.com';

-- Insert owner role
INSERT INTO platform_roles (user_id, role)
VALUES ('user-uuid-here', 'owner');
```

### View All Academies
```sql
SELECT
  a.name,
  a.domain,
  a.status,
  a.subscription_status,
  a.expires_at,
  p.name as plan_name
FROM academies a
LEFT JOIN plans p ON a.plan_id = p.id;
```

### View Plan Features
```sql
SELECT
  p.name as plan,
  f.label as feature,
  pf.enabled
FROM plan_features pf
JOIN plans p ON pf.plan_id = p.id
JOIN features f ON pf.feature_key = f.key
ORDER BY p.name, f.category, f.label;
```

## Security Notes

1. **Owner role is stealth** - Regular users cannot discover it exists
2. **Platform Admin is hidden** - Shows 404 to non-owners
3. **Change default password** - First thing after login
4. **Secure service role key** - Never expose in client code
5. **Monitor access logs** - Check platform_audit_logs regularly

## Next Steps

After setup:

1. ✅ Create owner account
2. ✅ Login and verify Platform Admin access
3. ✅ Change default password
4. ✅ Create your first academy
5. ✅ Configure DNS for academy domain
6. ✅ Test academy login and features
7. ✅ Customize plans and features as needed
8. ✅ Review security settings

## Support

For detailed documentation, see:
- `/docs/SAAS_PLATFORM_NOTES.md` - Complete platform documentation
- `/SAAS_IMPLEMENTATION_COMPLETE.md` - Implementation details
- Supabase Dashboard - For direct database access

## Default Credentials Summary

```
Platform Owner:
  Email: owner@dojocloud.com
  Password: Owner123!@#
  Access: /platform-admin

⚠️ CHANGE THESE AFTER FIRST LOGIN!
```
