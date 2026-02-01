# Platform Owner Setup - Final Step

Your platform owner code is complete and the app will now automatically redirect platform owners to the admin panel.

## Current Issue

The platform tables need to be created in your database. This requires running the migration SQL files.

## Solution - Apply Migrations via SQL Editor

### Step 1: Open SQL Editor

Go to: https://viwgdxffvehogkflhkjw.supabase.co/project/viwgdxffvehogkflhkjw/sql/new

### Step 2: Apply First Migration

1. Open file: `supabase/migrations/20260201000000_create_saas_platform_owner_layer.sql`
2. Copy the ENTIRE file content (it's about 440 lines)
3. Paste into SQL Editor
4. Click **Run** button
5. You should see "Success. No rows returned"

### Step 3: Apply Second Migration

1. Open file: `supabase/migrations/20260201000001_seed_platform_data.sql`
2. Copy the ENTIRE file content
3. Paste into SQL Editor
4. Click **Run** button
5. You should see "Success" messages

### Step 4: Create Owner Account

Run this script to create the owner:

```bash
node create-owner.mjs
```

OR run this SQL in the SQL Editor:

```sql
-- Create owner user
INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, confirmation_token
)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'owner@dojocloud.com',
  crypt('Owner123!@#', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{}'::jsonb,
  now(),
  now(),
  ''
)
ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email
RETURNING id;

-- Get the user ID and assign owner role
-- (Copy the UUID from the result above and replace YOUR_USER_ID_HERE)
INSERT INTO platform_roles (user_id, role)
VALUES ('YOUR_USER_ID_HERE', 'owner')
ON CONFLICT (user_id) DO NOTHING;
```

## Step 5: Login

**Credentials:**
- Email: `owner@dojocloud.com`
- Password: `Owner123!@#`

**What Happens:**
1. You'll be automatically redirected to `/platform-admin`
2. The sidebar will only show "Platform Admin" button
3. No academy navigation items will appear (as expected for platform owners)

## Verification

After logging in as owner, you should see:
- Platform Admin dashboard with tabs: Overview, Academies, Plans, Features
- Ability to create new academies
- Ability to manage subscription plans
- Ability to configure features

## Troubleshooting

If you still see academy statistics after login:
1. The migrations weren't applied correctly
2. Check browser console for errors
3. Verify tables exist: Run `SELECT * FROM platform_roles;` in SQL Editor
4. Verify function exists: Run `SELECT get_my_platform_role();` in SQL Editor
