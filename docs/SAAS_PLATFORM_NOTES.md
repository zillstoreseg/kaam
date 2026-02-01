# DOJO CLOUD - SaaS Platform Documentation

## Overview

DOJO CLOUD is a multi-tenant SaaS platform for martial arts academy management. This document provides comprehensive information about the platform's architecture, setup, and management.

## System Architecture

### Core Components

1. **Platform Owner Layer**: Stealth admin layer for managing the entire SaaS platform
2. **Tenant Layer**: Individual academies with their own subscription plans and features
3. **Feature Gating**: Dynamic feature access based on subscription plans
4. **Domain-Based Tenant Resolution**: Automatic tenant identification via domain

## Database Schema

### Platform Tables

#### 1. platform_roles
Identifies platform owners who can access the owner dashboard.

```sql
- user_id (uuid, PK): Reference to auth.users
- role (text): 'owner' or 'super_owner'
- created_at (timestamptz): Creation timestamp
```

**Security**: Users can only see their own role. No listing of all owners possible.

#### 2. plans
Defines subscription plans with pricing.

```sql
- id (uuid, PK): Unique identifier
- name (text): Plan name (Basic, Pro, Elite)
- price_monthly (numeric): Monthly price
- description (text): Plan description
- created_at (timestamptz): Creation timestamp
```

#### 3. features
Master list of all available features/modules.

```sql
- key (text, PK): Unique feature identifier
- label (text): Display name
- category (text): Feature category
- created_at (timestamptz): Creation timestamp
```

**Available Features**:
- dashboard: Dashboard access
- students: Students management
- attendance: Attendance tracking
- branches: Branch management
- users: User management
- packages: Package management
- schemes: Scheme management
- invoices: Invoice management
- sales: Sales tracking
- expenses: Expense tracking
- reports: General reports
- revenue_reports: Revenue reports
- attendance_reports: Attendance reports
- exam_eligibility: Exam eligibility
- inactive_players: Inactive players tracking
- activity_log: Activity log
- login_history: Login history
- security_alerts: Security alerts
- stock: Stock management
- stock_inventory: Stock inventory
- settings: Settings access

#### 4. plan_features
Maps features to plans.

```sql
- plan_id (uuid, FK): Reference to plans
- feature_key (text, FK): Reference to features
- enabled (boolean): Feature enabled status
```

#### 5. academies
Represents tenant academies.

```sql
- id (uuid, PK): Unique identifier
- name (text): Academy name
- domain (text, unique): Academy domain
- status (text): 'active' or 'suspended'
- plan_id (uuid, FK): Reference to plans
- subscription_status (text): 'active', 'expired', 'trial', or 'suspended'
- expires_at (timestamptz): Subscription expiry date
- created_at (timestamptz): Creation timestamp
```

#### 6. academy_feature_overrides
Allows custom feature access per academy.

```sql
- academy_id (uuid, FK): Reference to academies
- feature_key (text, FK): Reference to features
- enabled (boolean): Override enabled status
- created_at (timestamptz): Creation timestamp
```

#### 7. subscriptions
Tracks subscription history.

```sql
- id (uuid, PK): Unique identifier
- academy_id (uuid, FK): Reference to academies
- plan_id (uuid, FK): Reference to plans
- starts_at (timestamptz): Subscription start date
- ends_at (timestamptz): Subscription end date
- status (text): 'active', 'expired', or 'cancelled'
- created_at (timestamptz): Creation timestamp
```

## RPC Functions

### get_my_platform_role()
Returns the current user's platform role or null.

**Returns**: `{ role: 'owner' | 'super_owner' | null }`

**Usage**:
```typescript
const { data } = await supabase.rpc('get_my_platform_role');
const isOwner = data?.role === 'owner' || data?.role === 'super_owner';
```

### get_tenant_config_by_domain(domain: text)
Returns academy configuration by domain.

**Parameters**:
- `domain_param`: Domain name (e.g., 'academy1.example.com')

**Returns**:
```json
{
  "academy_id": "uuid",
  "name": "Academy Name",
  "domain": "academy1.example.com",
  "status": "active",
  "subscription_status": "active",
  "expires_at": "2024-12-31T23:59:59Z",
  "plan": {
    "id": "uuid",
    "name": "Pro",
    "price_monthly": 79.99,
    "description": "Advanced features"
  },
  "features": ["dashboard", "students", "attendance", ...]
}
```

**Usage**:
```typescript
const { data } = await supabase.rpc('get_tenant_config_by_domain', {
  domain_param: window.location.hostname
});
```

## Frontend Implementation

### Contexts

#### PlatformContext
Manages platform owner role detection.

```typescript
const { isOwner, loading, checkPlatformRole } = usePlatform();
```

#### TenantContext
Manages tenant configuration and feature access.

```typescript
const { tenant, loading, hasFeature, loadTenantConfig } = useTenant();

// Check feature access
if (hasFeature('branches')) {
  // Show branches feature
}
```

### Feature Gating

#### FeatureGate Component
Wraps components to restrict access based on features.

```typescript
import { FeatureGate } from '../components/FeatureGate';
import { FEATURES } from '../lib/featureHelpers';

<FeatureGate featureKey={FEATURES.BRANCHES}>
  <BranchesComponent />
</FeatureGate>
```

#### hasFeature Helper
Check feature access programmatically.

```typescript
const { hasFeature } = useTenant();

if (hasFeature('expenses')) {
  // Show expenses menu item
}
```

### Routes

#### /platform-admin
Hidden route accessible only to platform owners.

**Protection**:
- Returns 404 for non-owners
- Requires authentication
- Not visible in navigation for regular users

**Features**:
- Overview dashboard with statistics
- Academy management (CRUD)
- Plan management (CRUD)
- Feature management (CRUD)
- Plan-feature matrix configuration
- Academy-specific feature overrides

## Adding a New Academy

### Method 1: Via Platform Admin Dashboard

1. Log in as a platform owner
2. Navigate to `/platform-admin`
3. Go to "Academies" tab
4. Click "Add Academy"
5. Fill in:
   - Academy Name
   - Domain (e.g., 'academy1' without full domain)
   - Plan (select from dropdown)
6. Click "Create"

The academy will be created with:
- Status: Active
- Subscription Status: Trial
- Expires At: 30 days from now

### Method 2: Via SQL

```sql
-- Insert academy
INSERT INTO academies (name, domain, status, plan_id, subscription_status, expires_at)
VALUES (
  'My Dojo Academy',
  'mydojo.example.com',
  'active',
  (SELECT id FROM plans WHERE name = 'Pro'),
  'trial',
  NOW() + INTERVAL '30 days'
);

-- Optional: Add feature overrides
INSERT INTO academy_feature_overrides (academy_id, feature_key, enabled)
VALUES (
  (SELECT id FROM academies WHERE domain = 'mydojo.example.com'),
  'expenses',
  true
);
```

## Creating a Platform Owner

### Method 1: Via Supabase Dashboard

1. Open Supabase Dashboard
2. Go to SQL Editor
3. Run:
```sql
-- First, get the user_id of the user you want to make an owner
-- (they must have already signed up)
SELECT id, email FROM auth.users WHERE email = 'owner@example.com';

-- Then insert into platform_roles
INSERT INTO platform_roles (user_id, role)
VALUES ('user-uuid-here', 'owner');
```

### Method 2: Via Service Role Key

```javascript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

await supabase.from('platform_roles').insert({
  user_id: 'user-uuid',
  role: 'owner'
});
```

## Managing Plans and Features

### Adding a New Plan

1. Navigate to `/platform-admin` → "Plans" tab
2. Click "Add Plan"
3. Fill in:
   - Plan Name
   - Monthly Price
   - Description
4. Click "Create"
5. Go to the Plan-Feature Matrix below
6. Toggle features for the new plan

### Adding a New Feature

1. Navigate to `/platform-admin` → "Features" tab
2. Click "Add Feature"
3. Fill in:
   - Feature Key (e.g., 'new_module')
   - Feature Label (e.g., 'New Module')
   - Category (e.g., 'management')
4. Click "Create"
5. Go to "Plans" tab → Plan-Feature Matrix
6. Enable the feature for desired plans

### Applying Feature to Code

1. Add feature key to `src/lib/featureHelpers.ts`:
```typescript
export const FEATURES = {
  // ... existing features
  NEW_MODULE: 'new_module',
} as const;
```

2. Wrap your component with FeatureGate:
```typescript
import { FeatureGate } from '../components/FeatureGate';
import { FEATURES } from '../lib/featureHelpers';

export default function NewModule() {
  return (
    <FeatureGate featureKey={FEATURES.NEW_MODULE}>
      {/* Your component content */}
    </FeatureGate>
  );
}
```

3. Conditionally show menu items in Layout:
```typescript
const { hasFeature } = useTenant();

const navigation = [
  // ... other items
  ...(hasFeature('new_module') ? [{
    name: 'New Module',
    href: '/new-module',
    icon: Icon
  }] : [])
];
```

## Academy-Specific Feature Overrides

To grant or revoke specific features for an academy:

1. Navigate to `/platform-admin` → "Academies" tab
2. Click edit on the academy
3. Below the academy details, you'll see feature overrides
4. Toggle features on/off for that specific academy

**Note**: Overrides take precedence over plan features.

## Subscription Management

### Extending Subscription

1. Navigate to `/platform-admin` → "Academies" tab
2. Click edit on the academy
3. Modify the "Expires At" date
4. Update subscription status if needed
5. Click "Save"

### Changing Plan

1. Navigate to `/platform-admin` → "Academies" tab
2. Click edit on the academy
3. Select new plan from dropdown
4. Click "Save"

The academy will immediately have access to features from the new plan.

### Suspending Academy

1. Navigate to `/platform-admin` → "Academies" tab
2. Click edit on the academy
3. Change status to "Suspended"
4. Click "Save"

When suspended, the academy cannot access the system.

## Domain Configuration

### Development (localhost)
When running on localhost, the tenant context is not loaded, and all features are available.

### Production
Each academy needs a unique domain or subdomain:
- `academy1.example.com`
- `academy2.example.com`
- Or use custom domains: `mydojo.com`

The domain must exactly match the `domain` field in the `academies` table.

## Security Considerations

1. **Owner Role is Stealth**: Regular tenants cannot discover platform owners
2. **RLS is Restrictive**: All platform tables are locked down by default
3. **404 Protection**: Non-owners see 404 on `/platform-admin`, not access denied
4. **Feature Gating is Server-Side**: Features are checked via RPC function
5. **No Direct Table Access**: Tenants cannot query platform tables

## Branding

The system name "DOJO CLOUD" is hardcoded and cannot be changed via settings. It's defined in:

```typescript
// src/lib/constants.ts
export const BRANDING = {
  SYSTEM_NAME: 'DOJO CLOUD',
  PLATFORM_NAME: 'DOJO CLOUD Platform',
  TAGLINE: 'Martial Arts Academy Management System'
} as const;
```

## Migration Files

All platform tables are created in:
- `supabase/migrations/20260201000000_create_saas_platform_owner_layer.sql`
- `supabase/migrations/20260201000001_seed_platform_data.sql`

## Troubleshooting

### Academy Cannot Access System
1. Check academy status is 'active'
2. Check subscription_status is 'active' or 'trial'
3. Check expires_at is in the future
4. Verify domain matches exactly

### Feature Not Showing
1. Verify feature exists in `features` table
2. Check feature is enabled in `plan_features` for the academy's plan
3. Check no override in `academy_feature_overrides` disabling it
4. Verify `hasFeature` is being called correctly

### Cannot Access Platform Admin
1. Verify user has entry in `platform_roles` table
2. Check role is 'owner' or 'super_owner'
3. Ensure `PlatformContext` is loaded
4. Check browser console for errors

## Best Practices

1. **Always use trial period**: New academies should start with 30-day trial
2. **Regular backups**: Backup academy data before major changes
3. **Feature testing**: Test new features on trial academy first
4. **Plan structure**: Keep Basic, Pro, Elite structure for simplicity
5. **Documentation**: Document custom features in this file
6. **Audit logs**: Monitor platform_audit_logs for suspicious activity

## Future Enhancements

Potential improvements for the platform:

1. **Automated billing**: Integration with payment providers
2. **Usage analytics**: Track feature usage per academy
3. **Email notifications**: Subscription expiry reminders
4. **Self-service portal**: Allow academies to manage their own subscriptions
5. **API access**: RESTful API for third-party integrations
6. **White labeling**: Custom branding per academy
7. **Multi-language**: Full i18n support for platform admin
8. **Audit trail**: Comprehensive logging of all platform changes

## Support

For technical support or questions about the platform:
- Review this documentation thoroughly
- Check the RLS policies in Supabase
- Review the migration files
- Check application logs for errors
- Verify database connection and permissions
