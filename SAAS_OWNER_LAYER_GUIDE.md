# SaaS Platform Owner Layer - Complete Guide

This guide explains the newly added SaaS platform owner layer that allows you to manage multiple academy tenants, subscription plans, and feature access control.

## Overview

The system now has a **stealth platform owner role** that can manage:
- Multiple academy tenants
- Subscription plans (Basic, Pro, Elite)
- Feature gating per plan
- Academy-specific feature overrides
- Subscription status and expiration

**Important**: The platform owner role is completely hidden from regular tenant users. They cannot discover that platform owners exist.

## Architecture

### Database Tables

1. **platform_roles** - Identifies platform owners (stealth)
2. **plans** - Subscription plans with pricing
3. **features** - Master list of all system features/modules
4. **plan_features** - Maps features to plans
5. **academies** - Tenant academies with subscription info
6. **academy_feature_overrides** - Per-academy feature overrides
7. **subscriptions** - Subscription history

### Security

- All platform tables use strict RLS policies
- Only platform owners can access platform tables
- Regular users cannot discover platform owners exist
- Platform owners can view the Platform Admin dashboard

## Getting Started

### 1. Create a Platform Owner

First, ensure you have a user account in the system. Then run:

```bash
node create-platform-owner.mjs your-email@example.com
```

This will grant platform owner access to the specified user.

### 2. Access Platform Admin

After logging in, platform owners will see a special "Platform Admin" link in the sidebar (blue with a crown icon). Click it to access the platform dashboard at `/platform-admin`.

Regular users will get a 404 if they try to access this route.

## Platform Admin Dashboard

### Overview Tab

Shows platform statistics:
- Total academies
- Active academies
- Total subscription plans
- Total available features
- Recent academies list

### Academies Tab

Manage tenant academies:
- **Create Academy**: Add new tenant with name, domain, and plan
- **Edit Academy**: Update academy details, plan, status, and subscription
- **Delete Academy**: Remove academy (with confirmation)

**Academy Fields:**
- Name: Academy display name
- Domain: Unique domain identifier for tenant routing
- Plan: Current subscription plan
- Status: active or suspended
- Subscription Status: trial, active, expired, or suspended
- Expires At: Subscription expiration date

### Plans Tab

Manage subscription plans:
- **Create Plan**: Add new plan with pricing
- **Edit Plan**: Update plan details
- **Delete Plan**: Remove plan (with confirmation)
- **Plan-Feature Matrix**: Toggle which features are included in each plan

**Default Plans:**
- **Basic ($29.99/mo)**: Essential features (dashboard, students, attendance, packages, invoices, settings)
- **Pro ($79.99/mo)**: All Basic + branches, users, schemes, sales, expenses, reports
- **Elite ($149.99/mo)**: All features including stock, security alerts, activity logs

### Features Tab

Manage system features:
- **Create Feature**: Add new feature with key, label, and category
- **Edit Feature**: Update feature details
- **Delete Feature**: Remove feature (with confirmation)

**Feature Categories:**
- core: Essential features (dashboard, students, attendance, settings)
- management: Administrative features (branches, users, activity log)
- finance: Financial features (invoices, sales, expenses)
- reports: Reporting features (revenue reports, attendance reports)
- features: Special features (exam eligibility, inactive players)
- inventory: Stock management features

## Feature Gating

The system includes feature gating to restrict access based on subscription plans.

### For Developers

**Check if a feature is enabled:**

```typescript
import { useTenant } from './contexts/TenantContext';

function MyComponent() {
  const { hasFeature } = useTenant();
  
  if (!hasFeature('stock')) {
    return <div>Feature not available</div>;
  }
  
  return <div>Stock management content</div>;
}
```

**Use the FeatureGate component:**

```typescript
import { FeatureGate } from './components/FeatureGate';
import { FEATURES } from './lib/featureHelpers';

function MyPage() {
  return (
    <FeatureGate featureKey={FEATURES.STOCK}>
      <StockManagementContent />
    </FeatureGate>
  );
}
```

**Feature keys are defined in `src/lib/featureHelpers.ts`:**

```typescript
export const FEATURES = {
  DASHBOARD: 'dashboard',
  STUDENTS: 'students',
  ATTENDANCE: 'attendance',
  BRANCHES: 'branches',
  USERS: 'users',
  PACKAGES: 'packages',
  SCHEMES: 'schemes',
  INVOICES: 'invoices',
  SALES: 'sales',
  EXPENSES: 'expenses',
  REPORTS: 'reports',
  REVENUE_REPORTS: 'revenue_reports',
  ATTENDANCE_REPORTS: 'attendance_reports',
  EXAM_ELIGIBILITY: 'exam_eligibility',
  INACTIVE_PLAYERS: 'inactive_players',
  ACTIVITY_LOG: 'activity_log',
  LOGIN_HISTORY: 'login_history',
  SECURITY_ALERTS: 'security_alerts',
  STOCK: 'stock',
  STOCK_INVENTORY: 'stock_inventory',
  SETTINGS: 'settings'
};
```

## Tenant Configuration

### Domain-Based Tenant Detection

The system uses `window.location.hostname` to detect which academy tenant is accessing the system. The `TenantContext` automatically loads the tenant configuration on app startup.

**For localhost development**, tenant detection is disabled and all features are available.

**For production domains**, the system calls `get_tenant_config_by_domain()` to:
1. Verify the domain exists
2. Check subscription status
3. Load the active plan
4. Load enabled features (plan features + overrides)

### Subscription Status Handling

Based on subscription status, the system shows different messages:
- **Not Found**: "DOJO CLOUD - Domain Not Registered"
- **Expired/Suspended**: "DOJO CLOUD - Subscription Required"
- **Active**: Full access to enabled features

## Database Migrations

All database changes are in:
- `supabase/migrations/20260201000000_create_saas_platform_owner_layer.sql`
- `supabase/migrations/20260201000001_seed_platform_data.sql`

The migrations create all tables, RLS policies, and RPC functions, then seed initial plans and features.

## RPC Functions

### get_my_platform_role()

Returns the current user's platform role (if any).

```typescript
const { data } = await supabase.rpc('get_my_platform_role');
// Returns: { role: 'owner' } or { role: null }
```

### get_tenant_config_by_domain(domain)

Returns complete tenant configuration including enabled features.

```typescript
const { data } = await supabase.rpc('get_tenant_config_by_domain', {
  domain_param: 'academy1'
});
// Returns: {
//   academy_id: '...',
//   name: 'Academy Name',
//   domain: 'academy1',
//   status: 'active',
//   subscription_status: 'active',
//   expires_at: '2024-12-31',
//   plan: { id: '...', name: 'Pro', ... },
//   features: ['dashboard', 'students', 'attendance', ...]
// }
```

## Branding

The system branding is hardcoded as **"DOJO CLOUD"** and is NOT editable through the UI or settings. This ensures consistent platform branding across all tenants.

## Important Notes

1. **No Breaking Changes**: All existing functionality remains intact. The SaaS layer is purely additive.

2. **Existing Roles Unchanged**: All existing academy roles (super_admin, branch_manager, coach, etc.) work exactly as before.

3. **Owner Stealth**: Platform owners are completely invisible to tenant users. The platform_roles table is hidden through restrictive RLS policies.

4. **Feature Gating is Optional**: For localhost/development, feature gating is disabled. Enable it by configuring an academy with a domain.

5. **Migration Safe**: All migrations use `IF NOT EXISTS` and `DROP POLICY IF EXISTS` to be safely re-runnable.

## Troubleshooting

### Platform Admin link not showing

- Verify the user has been added to `platform_roles` table
- Check browser console for errors in `get_my_platform_role()` call
- Ensure you're logged in with the correct account

### Getting 404 on /platform-admin

- You are not a platform owner
- The `PlatformOwnerRoute` component is blocking access
- Check if `isOwner` is true in React DevTools

### Features not being gated

- Tenant detection is disabled for localhost
- Check if domain is configured in `academies` table
- Verify `TenantContext` is properly loaded
- Check browser console for tenant config data

### Tenant config not loading

- Verify domain exists in `academies` table
- Check subscription_status is 'active'
- Ensure plan has features assigned in `plan_features` table
- Check browser console for RPC errors

## Support

For issues or questions about the SaaS platform owner layer:
1. Check the browser console for errors
2. Verify database migrations ran successfully
3. Check RLS policies are active
4. Review this documentation

---

**Git Branch**: All changes are in the `saas-owner-layer` branch.
