# ⚡ DO THIS NOW - Fix Your Platform Owner Access

## The Problem

You logged in but:
- Sidebar is empty (no "Platform Admin" button)
- You see regular dashboard statistics, not academy management
- Platform owner tables don't exist yet in your database

## The Solution (3 Simple Steps)

### Step 1: Apply Database Migrations

**Go to Supabase Dashboard:**
1. Open: https://viwgdxffvehogkflhkjw.supabase.co
2. Click **SQL Editor** in left sidebar
3. Click **New Query**
4. Open the file: **`APPLY_ALL_MIGRATIONS.sql`** (in your project root)
5. **Copy the ENTIRE file contents**
6. **Paste** into the SQL Editor
7. Click **Run** button (top right)

**What this does:**
- Creates all platform tables (platform_roles, plans, features, academies, etc.)
- Sets up security policies
- Seeds initial data (3 plans, 21 features)
- Shows you what to do next

---

### Step 2: Create Owner Account

**Option A: Use the Script (Easiest)**

In your terminal, run:
```bash
node setup-owner.mjs
```

This will:
- Create user: owner@dojocloud.com
- Password: Owner123!@#
- Add platform owner role automatically

**Option B: Manual Setup**

1. In Supabase Dashboard, go to **Authentication** → **Users**
2. Click **Add User**
3. Fill in:
   - **Email**: `owner@dojocloud.com`
   - **Password**: `Owner123!@#` (or your choice)
   - Check **"Auto Confirm User"**
4. Click **Create User** or **Send Magic Link**
5. **Copy the User ID** that appears

6. Go back to **SQL Editor**
7. Run this query (replace USER_ID):
```sql
INSERT INTO platform_roles (user_id, role)
VALUES ('USER_ID_HERE', 'owner');
```

---

### Step 3: Login and Verify

1. **Log out** of your current session
2. **Login** with:
   - Email: `owner@dojocloud.com`
   - Password: `Owner123!@#`

3. **You should now see:**
   - **"Platform Admin"** button in sidebar (with 👑 crown icon)
   - Click it to access `/platform-admin`

4. **On Platform Admin page you'll see:**
   - **Overview** tab - Academy statistics
   - **Academies** tab - Manage tenant academies
   - **Plans** tab - Subscription plans (Basic, Pro, Elite)
   - **Features** tab - Available features

---

## Quick Verification

After Step 1, verify tables were created:

```sql
-- Run this in Supabase SQL Editor
SELECT
  (SELECT COUNT(*) FROM platform_roles) as owner_count,
  (SELECT COUNT(*) FROM plans) as plan_count,
  (SELECT COUNT(*) FROM features) as feature_count;
```

Should show:
- `owner_count`: 0 (or 1 if you ran Step 2)
- `plan_count`: 3
- `feature_count`: 21

---

## Still Having Issues?

### Problem: "Table doesn't exist"
→ You skipped Step 1. Run `APPLY_ALL_MIGRATIONS.sql` in SQL Editor

### Problem: "Cannot see Platform Admin button"
→ Log out and log back in
→ Clear browser cache
→ Verify owner role exists:
```sql
SELECT * FROM platform_roles;
```

### Problem: "Shows 404 on /platform-admin"
→ This is expected for non-owner accounts
→ Make sure you're logged in with owner@dojocloud.com

### Problem: "Script fails"
→ Use manual method (Option B in Step 2)
→ Or run SQL directly in dashboard

---

## Files Reference

| File | What It Does |
|------|--------------|
| **APPLY_ALL_MIGRATIONS.sql** | Creates all tables (run in Supabase Dashboard) |
| **setup-owner.mjs** | Creates owner account (run in terminal) |
| **DO_THIS_NOW.md** | This file - your quick start guide |
| **START_HERE.md** | Detailed documentation |

---

## Expected Result

After completing all 3 steps, you should:

✅ Have all platform tables in database
✅ Have owner account created
✅ See "Platform Admin" in sidebar
✅ Be able to access `/platform-admin`
✅ See Overview, Academies, Plans, Features tabs
✅ Be able to create and manage academies

---

## What's Different from Regular Dashboard?

| Regular User | Platform Owner |
|--------------|----------------|
| ❌ No "Platform Admin" button | ✅ "Platform Admin" button visible |
| Dashboard shows their academy stats | Overview shows all academies |
| Cannot create academies | Can create unlimited academies |
| Cannot change plans | Can assign/change plans |
| Cannot override features | Can enable/disable features per academy |
| `/platform-admin` shows 404 | `/platform-admin` works |

---

**⚡ Start with Step 1 RIGHT NOW!**

Open `APPLY_ALL_MIGRATIONS.sql` and run it in your Supabase Dashboard.
