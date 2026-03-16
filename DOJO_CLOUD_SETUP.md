# DOJO CLOUD - SaaS Platform Setup Guide

This guide will help you set up the DOJO CLOUD multi-tenant SaaS platform.

## Step 1: Run Database Migration

Execute the SQL migration in your Supabase SQL Editor:

```bash
# Open the file and copy the SQL
cat SAAS_MIGRATION.sql
```

Then paste and execute it in your Supabase SQL Editor at:
`https://supabase.com/dashboard/project/YOUR_PROJECT_ID/sql/new`

## Step 2: Migrate Existing Data

Run the data migration script to create Default Academy and assign all existing data:

```bash
node migrate-to-default-academy.mjs
```

This will:
- Create "Default Academy" with a 14-day free trial
- Assign all existing profiles, students, branches, attendance, etc. to Default Academy
- Preserve all existing functionality

## Step 3: Create Platform Owner Account

Run the platform owner creation script:

```bash
node create-platform-owner.mjs
```

This will create:
- Email: `owner@dojocloud.com`
- Password: `DojoCloud2024!Owner`
- Role: `platform_owner`

**IMPORTANT:** Save these credentials securely!

## Step 4: Update Platform Settings

After logging in as platform owner, update these settings in the Platform Settings page:

### Bank Transfer Details
- Bank Name
- Account Name
- IBAN
- SWIFT Code

### OpenAI API Key (for AI Assistant)
- Get your API key from: https://platform.openai.com/api-keys
- Add it to the platform settings

## Architecture Overview

### Multi-Tenant Structure

```
Platform Owner (Super Admin)
├── Academy 1 (Tenant)
│   ├── Students
│   ├── Branches
│   ├── Attendance
│   └── All academy data
├── Academy 2 (Tenant)
│   ├── Students
│   └── ...
└── Academy N (Tenant)
```

### User Roles

1. **Platform Owner** - Super admin with full platform access
   - Manage all academies
   - Configure subscription plans
   - Approve payments
   - Edit landing page
   - View platform analytics
   - Manage platform settings

2. **Academy Admin** - Academy owner/administrator
   - Manage academy data
   - View academy dashboard
   - Manage students, attendance, tournaments
   - Handle payments and invoices
   - Access AI assistant

3. **Coach** - Academy coach
   - Mark attendance
   - View students
   - Limited reporting

4. **Staff** - Academy staff
   - Basic operations
   - Limited access

### Key Features

#### Public Landing Page
- Hero section
- Features showcase
- Pricing plans
- FAQ section
- Registration flow

#### Platform Owner Dashboard
- Platform analytics
- Academy management
- Subscription plans management
- Payment approvals
- Landing page CMS
- Platform settings

#### Academy Dashboard (Existing + Enhanced)
- All existing features preserved
- New subscription management
- AI assistant integration
- Multi-tenant data isolation

### Subscription Workflow

1. **Academy Registration**
   - Academy signs up
   - Gets 14-day free trial automatically
   - Full access to all features

2. **Choose Plan**
   - After trial or at any time
   - Select: Starter, Professional, or Enterprise
   - Choose: Monthly or Yearly

3. **Bank Transfer Payment**
   - View bank transfer details
   - Upload payment screenshot
   - Payment status: Pending Approval

4. **Owner Approval**
   - Platform owner reviews payment
   - Approves or rejects
   - If approved: Subscription activates automatically

5. **Active Subscription**
   - Full access based on plan
   - Track subscription status
   - Renew when needed

### Security & Data Isolation

- Each academy sees only its own data
- Row Level Security (RLS) enforced on all tables
- Platform owner has full access for management
- No cross-academy data leakage

### AI Assistant

- Available for Enterprise plan customers
- Answers questions about academy data
- Provides insights and recommendations
- Examples:
  - "How many students attended this month?"
  - "Which students missed classes?"
  - "How can I increase revenue?"
  - "Show me attendance trends"

## Testing the Setup

1. **Test Default Academy Access**
   - Login with existing academy user
   - Verify all data is visible
   - Check that existing features work

2. **Test Platform Owner Access**
   - Login as platform owner
   - Access Platform Owner dashboard
   - Verify academy management works

3. **Test New Academy Registration**
   - Register a new academy
   - Verify trial period
   - Test subscription flow

4. **Test Payment Workflow**
   - Select a plan
   - Upload payment screenshot
   - Approve as platform owner
   - Verify subscription activates

## Important Notes

- All existing features are preserved
- Data isolation is automatic via RLS policies
- Trial period is 14 days by default
- Bank transfer is the only payment method
- OpenAI API key required for AI assistant

## Troubleshooting

### Migration Issues
If migration fails, check:
- Supabase credentials in .env
- Database permissions
- Existing table conflicts

### Login Issues
If you can't login:
- Verify email is confirmed
- Check platform_role is set correctly
- Ensure academy_id is assigned (for academy users)

### Data Not Visible
If data doesn't show:
- Check academy_id is set on all records
- Verify RLS policies are applied
- Check user's academy_id matches data

## Next Steps

1. Customize landing page content
2. Update subscription pricing if needed
3. Configure bank transfer details
4. Add OpenAI API key for AI assistant
5. Test complete workflows
6. Deploy to production

## Support

For issues or questions, refer to the codebase documentation or contact the development team.
