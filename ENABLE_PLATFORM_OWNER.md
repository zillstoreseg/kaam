# Enable Platform Owner Features

Follow these steps to enable the platform owner dashboard in your application.

## Step 1: Apply Database Migrations

1. Go to your Supabase SQL Editor:
   **https://supabase.com/dashboard/project/viwgdxffvehogkflhkjw/sql/new**

2. Open the file `APPLY_SAAS_MIGRATIONS.sql` in this project

3. Copy the ENTIRE contents of that file

4. Paste it into the Supabase SQL Editor

5. Click "Run" to execute the SQL

This will create:
- `platform_roles` table (for owner/super_owner roles)
- `plans` table (Basic, Pro, Elite subscription plans)
- `features` table (all system features)
- `plan_features` table (which features are in each plan)
- `academies` table (tenant academies)
- `subscriptions` table (subscription tracking)
- `academy_feature_overrides` table (custom feature access)
- `get_my_platform_role()` function (checks if user is platform owner)
- `get_tenant_config_by_domain()` function (gets academy config)

## Step 2: Create Platform Owner Account

After the migrations are applied, create a platform owner user:

```bash
node create-platform-owner.mjs your-email@example.com
```

Replace `your-email@example.com` with the email of an EXISTING user account.

If the user doesn't exist yet, create it first through the app's registration, then run this script.

## Step 3: Login and Access Platform Admin

1. Login to your app with the owner email
2. Look in the sidebar - you should now see "Platform Admin" menu item
3. Click it to access the platform owner dashboard

## What You Get

The platform owner dashboard allows you to:
- Manage all academy tenants
- Control subscription plans and pricing
- Enable/disable features for specific academies
- View platform-wide statistics
- Impersonate academy users for support
- Monitor subscriptions and renewals

## Troubleshooting

### "Platform Admin" not showing in sidebar

- Make sure the migrations were applied successfully
- Verify your user is in the `platform_roles` table:
  ```sql
  SELECT * FROM platform_roles WHERE user_id = '<your-user-id>';
  ```
- Try logging out and logging back in

### Script says "User not found"

- Create the user account first by registering through the app
- Then run the script with that user's email

### SQL errors when running migrations

- Make sure you copied the ENTIRE SQL file
- Check that you're running it in the correct Supabase project
- If tables already exist, that's OK - the script uses `IF NOT EXISTS`
