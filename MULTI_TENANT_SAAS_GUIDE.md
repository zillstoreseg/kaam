# Multi-Tenant SaaS Conversion Guide

## Overview

This Karate Academy Management System has been converted into a **multi-tenant SaaS platform** with subscription management, tenant isolation, and impersonation capabilities.

### What Changed?

- ✅ **Multi-Tenancy**: Each academy is now a separate tenant with complete data isolation
- ✅ **Subscription Management**: Track plans, renewal dates, grace periods, and subscription status
- ✅ **Platform Admin Portal**: Central portal for managing all tenants
- ✅ **Impersonation ("Login As")**: Platform owners can impersonate tenants for support
- ✅ **Subscription Gating**: Automatic access blocking when subscriptions expire
- ✅ **Database-Level Isolation**: Row-Level Security (RLS) enforces tenant boundaries
- ✅ **Existing Features Preserved**: All original features still work within each tenant

---

## Architecture

### Database Schema

#### New Tables

1. **`tenants`**
   - Stores academy information
   - Fields: `id`, `name`, `subdomain`, `status` (active/suspended/trial), `created_at`

2. **`subscriptions`**
   - Tracks subscription per tenant
   - Fields: `id`, `tenant_id`, `plan` (single/multi/enterprise), `starts_at`, `renews_at`, `status`, `grace_days`

3. **`impersonation_sessions`**
   - Tracks active impersonation sessions
   - Fields: `id`, `admin_user_id`, `tenant_id`, `created_at`, `expires_at`, `revoked`

#### Updated Tables

All business tables now have:
- `tenant_id` column (NOT NULL, foreign key to `tenants.id`)
- Index on `tenant_id` for performance
- RLS policies enforcing tenant isolation

### User Roles

| Role | tenant_id | Access |
|------|-----------|--------|
| `platform_owner` | NULL | All tenants, admin portal |
| `platform_admin` | NULL | All tenants, admin portal |
| `tenant_admin` | tenant UUID | Full access within tenant |
| `super_admin` | tenant UUID | Full access within tenant (legacy) |
| `branch_manager` | tenant UUID | Branch-specific access within tenant |
| `coach` | tenant UUID | Limited access within tenant |

---

## Setup Instructions

### 1. Database Migration

The migration has already been applied. It:
- Created `tenants`, `subscriptions`, and `impersonation_sessions` tables
- Added `tenant_id` to all business tables
- Created a default tenant "Main Academy" with subdomain "main"
- Backfilled all existing data to the default tenant
- Enabled RLS and created policies for tenant isolation

### 2. Create Platform Owner

Run the provided script to create your first platform owner:

```bash
node create-platform-owner.mjs admin@platform.com SecurePassword123 "Platform Admin"
```

**What this does:**
- Creates a user in Supabase Auth
- Creates a profile with `role='platform_owner'` and `tenant_id=NULL`
- Platform owner can access `/admin/tenants` portal
- Platform owner can impersonate any tenant

### 3. Environment Variables

Ensure your `.env` file has:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key  # For platform owner script
```

---

## Platform Admin Portal

### Accessing the Admin Portal

Platform owners access the admin portal at:
- **URL**: `/admin/tenants`
- **Who can access**: Only users with `role='platform_owner'` or `role='platform_admin'`

### Creating a New Tenant

1. Navigate to `/admin/tenants`
2. Click **"Create Tenant"**
3. Fill in the form:
   - **Academy Name**: Display name (e.g., "Elite Karate Academy")
   - **Subdomain**: Unique subdomain (e.g., "elite-karate")
   - **Status**: active, trial, or suspended
   - **Plan**: single, multi, or enterprise
   - **Grace Period**: Days after expiry before blocking access
   - **Admin User**: Email, password, and full name for tenant admin

4. Click **"Create Tenant"**

**What happens:**
- Creates tenant record
- Creates subscription with 30-day default period
- Creates tenant admin user
- Tenant admin can log in and access their academy at `subdomain.example.com`

### Managing Tenants

On the tenants list page, you can:
- **View all tenants** with their status, plan, and renewal date
- **Click "Manage"** to edit tenant details
- **Click "Login As"** to impersonate the tenant

### Tenant Details Page

On the details page (`/admin/tenants/:id`), you can:

**Tenant Information:**
- Edit academy name
- Change status (active/trial/suspended)
- View subdomain (cannot be changed)

**Subscription Management:**
- Change plan (single/multi/enterprise)
- Adjust renewal date
- Quick extend buttons: +30 days, +90 days, +1 year
- Change grace period

### Impersonation ("Login As")

1. From tenants list, click **"Login As"** next to any tenant
2. You are redirected to `/` and see:
   - **Yellow banner** at top: "Support Mode: Viewing [Tenant Name]"
   - Access to all tenant data as if you were their admin
   - All queries automatically scoped to impersonated tenant

3. Click **"Exit Support Mode"** to end impersonation

**Technical Details:**
- Creates `impersonation_sessions` record (expires in 30 minutes)
- `effective_tenant_id()` function returns impersonation tenant
- All RLS policies respect impersonation context
- Session can be revoked by clicking "Exit"

---

## Subscription Gating

### How It Works

When a non-platform-owner user tries to access the app:

1. **Tenant Status Check**:
   - If `tenants.status = 'suspended'` → Show "Account Suspended" page
   - If `tenants.status = 'active'` → Continue

2. **Subscription Check**:
   - If no subscription → Show "No Active Subscription" page
   - If subscription exists → Check expiry

3. **Expiry Check**:
   - If `renews_at + grace_days >= today` → Allow access
   - If expired beyond grace period → Show "Subscription Expired" page

### Blocked Access Pages

All blocked pages show:
- Professional, clean design
- Reason for block (suspended, expired, no subscription)
- Tenant/academy name
- Contact information for support
- Days overdue (if applicable)

Platform owners **bypass all subscription checks** and always have access.

---

## Row-Level Security (RLS)

### Helper Functions

Four SQL functions enforce tenant isolation:

1. **`is_platform_owner()`**
   - Returns `true` if current user has role `platform_owner` or `platform_admin`

2. **`current_tenant_id()`**
   - Returns `tenant_id` from profiles for current user

3. **`current_impersonation_tenant()`**
   - Returns `tenant_id` from active impersonation session (if any)

4. **`effective_tenant_id()`**
   - Returns impersonation tenant if impersonating, else user's tenant
   - **This is the main function used in all RLS policies**

### RLS Policies

Every business table has 5 policies:

1. **Platform owners full access**
   - `USING (is_platform_owner())`
   - Platform owners see ALL tenant data

2. **Tenant users can select own tenant**
   - `USING (tenant_id = effective_tenant_id())`

3. **Tenant users can insert own tenant**
   - `WITH CHECK (tenant_id = effective_tenant_id())`

4. **Tenant users can update own tenant**
   - `USING (tenant_id = effective_tenant_id())`
   - `WITH CHECK (tenant_id = effective_tenant_id())`

5. **Tenant users can delete own tenant**
   - `USING (tenant_id = effective_tenant_id())`

### Data Isolation Guarantees

✅ **Database-enforced**: Cannot be bypassed even with direct database access
✅ **Impersonation-aware**: Policies respect impersonation context
✅ **Platform owner access**: Platform owners can access all data for support
✅ **Complete isolation**: Tenants cannot see or modify other tenants' data

---

## Application Updates

### Automatic tenant_id Insertion

When creating records, `tenant_id` is automatically populated based on:
- Current user's `tenant_id` (from `profiles.tenant_id`)
- OR impersonated `tenant_id` (if in support mode)

RLS policies enforce this with `WITH CHECK` constraints.

### Query Filtering

All SELECT queries automatically filter by `tenant_id` via RLS policies. No application code changes needed for filtering.

### Branch Scoping Still Works

Within a tenant:
- Branch scoping still works as before
- Branch admins see only their branch data
- Super admins / tenant admins see all branches within their tenant

---

## Testing & Validation

### Create Test Tenants

1. Log in as platform owner
2. Navigate to `/admin/tenants`
3. Create 2 test tenants (e.g., "Tenant A" and "Tenant B")
4. Create test data in each tenant

### Validate Isolation

1. Log in as Tenant A admin
2. Create students, attendance, etc.
3. Log out and log in as Tenant B admin
4. Verify you **cannot see** Tenant A's data
5. Create different data in Tenant B

### Test Impersonation

1. Log in as platform owner
2. Navigate to `/admin/tenants`
3. Click "Login As" for Tenant A
4. Verify you see Tenant A's data
5. Click "Exit Support Mode"
6. Verify you return to platform owner view

### Test Subscription Gating

1. Navigate to `/admin/tenants/:id` for a tenant
2. Set `status = 'suspended'`
3. Try to log in as that tenant's user
4. Verify "Account Suspended" page appears
5. Reactivate (`status = 'active'`) and verify access restored

---

## Migration from Single-Tenant

### Existing Data

All existing data has been:
- Assigned to "Main Academy" tenant (subdomain: `main`)
- Backfilled with `tenant_id = '00000000-0000-0000-0000-000000000001'`
- Given an active enterprise subscription (365 days)

### Existing Users

All existing users in `profiles`:
- Have been assigned to "Main Academy" tenant
- Role mappings:
  - `super_admin` → functions as `tenant_admin` for Main Academy
  - `branch_manager` → remains `branch_manager` for Main Academy
  - `coach` → remains `coach` for Main Academy

### Zero Downtime

The migration was designed to:
- Not break existing functionality
- Preserve all data
- Maintain user access
- Add new capabilities on top

---

## Common Operations

### Add a New Tenant

```bash
# Via UI (recommended)
1. Log in as platform owner
2. Go to /admin/tenants
3. Click "Create Tenant"
4. Fill form and submit

# Via SQL (advanced)
INSERT INTO tenants (name, subdomain, status)
VALUES ('New Academy', 'new-academy', 'active');

INSERT INTO subscriptions (tenant_id, plan, renews_at, status)
VALUES ('[tenant-id]', 'multi', current_date + 90, 'active');
```

### Extend a Subscription

```bash
# Via UI (recommended)
1. Navigate to /admin/tenants/:id
2. Click +30 days / +90 days / +1 year buttons
3. Click "Save Changes"

# Via SQL
UPDATE subscriptions
SET renews_at = renews_at + interval '30 days'
WHERE tenant_id = '[tenant-id]';
```

### Suspend a Tenant

```bash
# Via UI
1. Navigate to /admin/tenants/:id
2. Change status to "suspended"
3. Click "Save Changes"

# Via SQL
UPDATE tenants
SET status = 'suspended'
WHERE id = '[tenant-id]';
```

### Convert Existing User to Platform Owner

```bash
# Via SQL (use with caution)
UPDATE profiles
SET role = 'platform_owner', tenant_id = NULL
WHERE id = '[user-id]';
```

---

## Security Considerations

### Database-Level Security

✅ **RLS enabled** on all tables
✅ **Policies enforce** tenant isolation
✅ **Cannot bypass** even with direct SQL access
✅ **Service role** bypasses RLS (only used by platform owner script)

### Application Security

✅ **Subscription gating** blocks expired tenants
✅ **Role-based routing** restricts admin portal access
✅ **Impersonation logging** tracks all support sessions
✅ **Audit logs** capture all actions with tenant context

### Best Practices

1. **Never expose service role key** to client
2. **Rotate platform owner passwords** regularly
3. **Monitor impersonation sessions** for abuse
4. **Set appropriate grace periods** (default: 7 days)
5. **Use `platform_admin` role** for staff (instead of `platform_owner`)

---

## Troubleshooting

### Issue: "No tenant found" error

**Cause**: User's profile has invalid or missing `tenant_id`

**Solution**:
```sql
-- Check user's profile
SELECT * FROM profiles WHERE id = '[user-id]';

-- Assign to a valid tenant
UPDATE profiles
SET tenant_id = '[valid-tenant-id]'
WHERE id = '[user-id]';
```

### Issue: User can't see their data

**Cause**: RLS policies blocking access

**Solution**:
```sql
-- Verify user has correct tenant_id
SELECT p.id, p.role, p.tenant_id, t.name as tenant_name
FROM profiles p
LEFT JOIN tenants t ON t.id = p.tenant_id
WHERE p.id = '[user-id]';

-- Verify effective_tenant_id function works
SELECT effective_tenant_id();
```

### Issue: Platform owner can't access admin portal

**Cause**: Profile missing or wrong role

**Solution**:
```sql
-- Check profile
SELECT * FROM profiles WHERE id = '[user-id]';

-- Fix role
UPDATE profiles
SET role = 'platform_owner', tenant_id = NULL
WHERE id = '[user-id]';
```

### Issue: Subscription gate showing even though subscription is active

**Cause**: Date/timezone mismatch or grace period calculation

**Solution**:
```sql
-- Check subscription details
SELECT *, renews_at + (grace_days || ' days')::interval as grace_period_end
FROM subscriptions
WHERE tenant_id = '[tenant-id]';

-- Extend renewal if needed
UPDATE subscriptions
SET renews_at = current_date + interval '30 days'
WHERE tenant_id = '[tenant-id]';
```

---

## Advanced Configuration

### Custom Subdomain Resolution

For production, you'll need to:
1. Set up DNS wildcard (*.yourdomain.com)
2. Update tenant resolution logic in `TenantContext.tsx`
3. Parse subdomain from `window.location.hostname`
4. Look up tenant by subdomain

### Custom Subscription Plans

To add new plans:
```sql
-- Update plan check constraint
ALTER TABLE subscriptions DROP CONSTRAINT subscriptions_plan_check;
ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_plan_check
CHECK (plan IN ('single', 'multi', 'enterprise', 'custom'));
```

### Webhooks for Subscription Events

Set up database triggers to call webhooks on:
- Subscription expiry
- Tenant suspension
- Impersonation start/end

---

## Summary

You now have a fully functional multi-tenant SaaS platform with:

✅ Complete tenant isolation (database-enforced)
✅ Subscription management with grace periods
✅ Platform admin portal for managing tenants
✅ Impersonation for customer support
✅ Automatic subscription gating
✅ All original features preserved and working

**Next Steps:**
1. Create platform owner user
2. Create test tenants
3. Validate data isolation
4. Test impersonation
5. Configure production subdomain routing
6. Set up billing integration (optional)

For questions or issues, refer to the troubleshooting section or check the migration SQL file for technical details.
