# Multi-Tenant SaaS - Quick Reference

## 🚀 Initial Setup (First Time Only)

```bash
# 1. Install dependencies
npm install

# 2. Create platform owner
node create-platform-owner.mjs admin@platform.com YourSecurePassword "Admin Name"

# 3. Build and run
npm run build
npm run dev
```

## 🔑 Key URLs

| Purpose | URL | Access |
|---------|-----|--------|
| Platform Admin Portal | `/admin/tenants` | Platform owners only |
| Tenant Portal | `/` | All users |
| Login | `/login` | Public |

## 👥 User Roles

| Role | tenant_id | Can Access |
|------|-----------|-----------|
| `platform_owner` | NULL | Everything + admin portal |
| `tenant_admin` | Tenant UUID | Full access in their tenant |
| `branch_manager` | Tenant UUID | Their branch in their tenant |
| `coach` | Tenant UUID | Limited access in their tenant |

## 🏢 Managing Tenants

### Create Tenant (UI)
1. Login as platform owner
2. Go to `/admin/tenants`
3. Click "Create Tenant"
4. Fill form:
   - Academy name
   - Subdomain (lowercase, no spaces)
   - Status (active/trial/suspended)
   - Plan (single/multi/enterprise)
   - Admin user credentials

### Extend Subscription
1. Go to `/admin/tenants/:id`
2. Click +30 days / +90 days / +1 year
3. Save changes

### Suspend Tenant
1. Go to `/admin/tenants/:id`
2. Change status to "suspended"
3. Save changes

## 🎭 Impersonation ("Login As")

1. From `/admin/tenants`, click "Login As"
2. Yellow banner appears: "Support Mode"
3. All queries scoped to impersonated tenant
4. Click "Exit Support Mode" to return

**Session expires in:** 30 minutes (automatic)

## 🔒 Security

### Database-Level Isolation
- ✅ RLS enabled on all tables
- ✅ Policies enforce `tenant_id` filtering
- ✅ Cannot bypass (even with direct SQL)
- ✅ Platform owners can access all data

### Subscription Gating
Blocks access if:
- Tenant status = 'suspended'
- No subscription exists
- Subscription expired beyond grace period

Platform owners **bypass all gates**.

## 📊 Database Tables

### New SaaS Tables
- `tenants` - Academy/business info
- `subscriptions` - Plans and renewal dates
- `impersonation_sessions` - Active impersonation tracking

### Updated Tables
All business tables now have:
- `tenant_id` column (NOT NULL)
- Index on `tenant_id`
- RLS policies

## 🛠️ SQL Helper Functions

```sql
-- Check if user is platform owner
SELECT is_platform_owner();

-- Get current user's tenant
SELECT current_tenant_id();

-- Get impersonated tenant (if any)
SELECT current_impersonation_tenant();

-- Get effective tenant (impersonation takes priority)
SELECT effective_tenant_id();
```

## 🐛 Common Issues

### "No tenant found"
**Fix:** Check user's `tenant_id` in profiles table

### Can't see data
**Fix:** Verify `tenant_id` matches tenant they should access

### Platform owner can't access admin
**Fix:** Ensure `role='platform_owner'` and `tenant_id=NULL`

### Subscription gate showing incorrectly
**Fix:** Check `renews_at` and `grace_days` in subscriptions table

## 📝 Quick SQL Queries

```sql
-- View all tenants
SELECT * FROM tenants ORDER BY created_at DESC;

-- View tenant subscriptions
SELECT t.name, s.plan, s.status, s.renews_at
FROM tenants t
LEFT JOIN subscriptions s ON s.tenant_id = t.id;

-- View all users per tenant
SELECT t.name as tenant, p.full_name, p.role, p.id
FROM profiles p
JOIN tenants t ON t.id = p.tenant_id
ORDER BY t.name, p.role;

-- View platform owners
SELECT * FROM profiles WHERE role IN ('platform_owner', 'platform_admin');

-- View active impersonation sessions
SELECT * FROM impersonation_sessions
WHERE NOT revoked AND expires_at > now();

-- Extend subscription by 30 days
UPDATE subscriptions
SET renews_at = renews_at + interval '30 days'
WHERE tenant_id = '[tenant-id]';

-- Activate suspended tenant
UPDATE tenants SET status = 'active' WHERE id = '[tenant-id]';
```

## 🎯 Testing Checklist

- [ ] Create platform owner user
- [ ] Login and access `/admin/tenants`
- [ ] Create 2 test tenants
- [ ] Create test data in Tenant A
- [ ] Login as Tenant B admin
- [ ] Verify cannot see Tenant A data ✅
- [ ] Use "Login As" to impersonate Tenant A
- [ ] Verify can see Tenant A data ✅
- [ ] Exit impersonation
- [ ] Suspend a tenant
- [ ] Try to login as suspended tenant user
- [ ] Verify "Account Suspended" page shows ✅
- [ ] Reactivate tenant
- [ ] Verify access restored ✅

## 📚 Additional Resources

- Full guide: `MULTI_TENANT_SAAS_GUIDE.md`
- Migration SQL: `supabase/migrations/20260108000000_convert_to_multi_tenant_saas.sql`
- Platform owner script: `create-platform-owner.mjs`

---

**Need help?** Check the full guide or review the migration file for technical details.
