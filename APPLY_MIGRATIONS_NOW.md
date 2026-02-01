# Apply Migrations - Quick Guide

## Problem

Platform owner tables don't exist yet. You need to run 2 SQL migration files.

## Solution (5 Minutes)

### 1. Open SQL Editor

Click: https://viwgdxffvehogkflhkjw.supabase.co/project/viwgdxffvehogkflhkjw/sql/new

### 2. Run First Migration

1. Open file: `supabase/migrations/20260201000000_create_saas_platform_owner_layer.sql`
2. Copy entire file (Ctrl+A, Ctrl+C)
3. Paste into SQL Editor
4. Click **RUN** button (top right)
5. Wait for "Success"

### 3. Run Second Migration

1. Open file: `supabase/migrations/20260201000001_seed_platform_data.sql`
2. Copy entire file
3. Paste into SQL Editor
4. Click **RUN** button
5. Wait for "Success"

### 4. Verify

Run: `node check-platform-status.mjs`

You should see all ✅ green checks.

### 5. Login

**Credentials:**
```
Email:    owner@dojocloud.com
Password: Owner123!@#
```

You'll be automatically redirected to Platform Admin dashboard.

---

**That's it!** The entire setup takes 5 minutes.
