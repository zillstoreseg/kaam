# 🚀 Quick Start: Platform Owner Access

## What is Platform Owner?

As a **Platform Owner**, you can:
- Access the hidden `/platform-admin` dashboard
- Create and manage academies (tenants)
- Configure subscription plans
- Control feature access per academy
- Manage the entire DOJO CLOUD platform

## 🎯 Two Methods to Get Started

### Method 1: Automated Script (Fastest)

Run the setup script to automatically create an owner account:

```bash
node setup-owner.mjs
```

**Default credentials created:**
```
Email: owner@dojocloud.com
Password: Owner123!@#
```

### Method 2: Manual Setup (via Supabase Dashboard)

If the script fails or you prefer manual setup:

#### Step 1: Create User Account

1. Go to [Supabase Dashboard](https://viwgdxffvehogkflhkjw.supabase.co)
2. Navigate to **Authentication → Users**
3. Click **"Add User"** (or "Invite User")
4. Fill in:
   - **Email**: `owner@dojocloud.com` (or your email)
   - **Password**: `Owner123!@#` (or your password)
   - Check **"Auto Confirm User"**
5. Click **"Send Magic Link"** or **"Create User"**

#### Step 2: Add Platform Owner Role

1. In Supabase Dashboard, go to **SQL Editor**
2. Click **"New Query"**
3. Copy and paste this SQL:

```sql
-- Get the user ID (replace with your email if different)
SELECT id, email FROM auth.users WHERE email = 'owner@dojocloud.com';

-- Copy the user ID from the result, then run:
INSERT INTO platform_roles (user_id, role)
VALUES ('PASTE-USER-ID-HERE', 'owner');
```

4. Click **"Run"**

**OR** use the quick SQL file:

1. Open `create-owner-quick.sql`
2. Copy entire contents
3. Paste in SQL Editor
4. Click "Run"

## 🔐 Login to Platform Admin

### 1. Open Your Application
Navigate to your app's login page (usually `http://localhost:5173/login` in development)

### 2. Enter Credentials
```
Email: owner@dojocloud.com
Password: Owner123!@#
```

### 3. Access Platform Admin
After login, you'll see a special **"Platform Admin"** button in the sidebar (with a crown 👑 icon).

Click it to access: `/platform-admin`

## ✅ What You'll See

After accessing `/platform-admin`, you'll see 4 tabs:

### 📊 Overview
- Total academies count
- Active vs inactive stats
- Recent academy activity

### 🏛️ Academies
- List all academies
- Create new academies
- Edit academy details
- Change plans
- Suspend/activate

### 💳 Plans
- Manage subscription plans (Basic, Pro, Elite)
- Set pricing
- Configure feature matrix

### ⚙️ Features
- Add/edit available features
- Organize by category
- Toggle features per plan

## 🏢 Create Your First Academy

1. Go to **Academies** tab
2. Click **"Add Academy"**
3. Enter:
   - **Name**: "Demo Dojo Academy"
   - **Domain**: "demo.example.com"
   - **Plan**: Select "Pro"
4. Click **"Create"**

Your academy will be created with:
- ✅ Status: Active
- ⏰ Subscription: 30-day trial
- 🎁 Features: Based on Pro plan

## 🔒 Security Checklist

After first login:

- [ ] Change default password (Settings page)
- [ ] Update email to your real address
- [ ] Review all academies and plans
- [ ] Test creating a test academy
- [ ] Verify feature gating works
- [ ] Keep service role key secure

## 🧪 Test the System

### Test 1: Create Test Academy
```
Name: Test Academy
Domain: test.localhost
Plan: Basic
```

### Test 2: Check Feature Access
- Basic plan should have limited features
- Pro plan has more features
- Elite plan has all features

### Test 3: Feature Override
- Go to an academy
- Add feature override
- Verify feature appears/disappears

## 🛠️ Troubleshooting

### "Cannot see Platform Admin button"

**Solution 1**: Log out and log back in
```bash
# Clear browser cache or use incognito mode
```

**Solution 2**: Verify owner role exists
```sql
-- Run in Supabase SQL Editor
SELECT u.email, pr.role
FROM auth.users u
LEFT JOIN platform_roles pr ON u.id = pr.user_id
WHERE u.email = 'owner@dojocloud.com';
```

Should show: `role: owner`

**Solution 3**: Re-run setup script
```bash
node setup-owner.mjs
```

### "/platform-admin shows 404"

This is **EXPECTED** for non-owner accounts. The route is hidden.

If you're the owner and see 404:
1. Check browser console for errors
2. Verify `PlatformContext` is loaded
3. Check network tab for `get_my_platform_role` call
4. Ensure role is in database

### "Table platform_roles does not exist"

You need to apply migrations first:

**Option 1**: Via SQL Editor
1. Open `supabase/migrations/20260201000000_create_saas_platform_owner_layer.sql`
2. Copy all contents
3. Paste in Supabase SQL Editor
4. Click "Run"
5. Repeat for `20260201000001_seed_platform_data.sql`

**Option 2**: Via Supabase CLI (if installed)
```bash
supabase db push
```

## 📚 Documentation

- **Complete Guide**: `/docs/SAAS_PLATFORM_NOTES.md`
- **Implementation Details**: `/SAAS_IMPLEMENTATION_COMPLETE.md`
- **Owner Setup**: `/OWNER_SETUP_GUIDE.md`

## 🎓 Common Tasks

### Change Owner Password
1. Login as owner
2. Go to Settings
3. Update password
4. Save

### Add Another Owner
```sql
-- Get their user ID
SELECT id FROM auth.users WHERE email = 'new-owner@example.com';

-- Add owner role
INSERT INTO platform_roles (user_id, role)
VALUES ('user-id-here', 'owner');
```

### Remove Owner Access
```sql
DELETE FROM platform_roles WHERE user_id = 'user-id-here';
```

### View All Owners
```sql
SELECT
  u.email,
  pr.role,
  pr.created_at
FROM platform_roles pr
JOIN auth.users u ON pr.user_id = u.id
ORDER BY pr.created_at DESC;
```

## 🆘 Need Help?

1. Check browser console for errors
2. Review Supabase logs
3. Verify database tables exist
4. Check RLS policies
5. Read full documentation in `/docs/SAAS_PLATFORM_NOTES.md`

---

## 📋 Quick Reference

### Default Owner Credentials
```
Email: owner@dojocloud.com
Password: Owner123!@#
URL: /platform-admin
```

### Important Commands
```bash
# Create owner account
node setup-owner.mjs

# Build application
npm run build

# Start development server
npm run dev
```

### Important URLs
- Login: `/login`
- Platform Admin: `/platform-admin` (owners only)
- Dashboard: `/` (regular users)

---

**🎉 You're all set! Login and start managing your DOJO CLOUD platform!**
