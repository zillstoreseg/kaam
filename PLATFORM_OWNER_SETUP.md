# Platform Owner Setup Guide

## Quick Start: Create Your First Platform Owner

Run this single command to create a complete platform owner account:

```bash
node create-owner-account.mjs owner@dojocloud.com
```

This will:
1. Create the auth user account
2. Create the profile (if needed)
3. Grant platform owner access

**Default Password**: `Owner@123456`

Or specify a custom password:

```bash
node create-owner-account.mjs owner@dojocloud.com YourSecurePassword123
```

## Login

After creating the account:

1. Go to your app's login page
2. Login with:
   - **Email**: `owner@dojocloud.com` (or whatever you specified)
   - **Password**: `Owner@123456` (or your custom password)

3. After login, look in the sidebar for a blue "Platform Admin" link with a crown icon
4. Click it to access `/platform-admin`

## Alternative Method: Two-Step Process

If you already have a user account, just grant them platform owner access:

```bash
node create-platform-owner.mjs existing-user@example.com
```

## Verification

To verify the owner account was created correctly:

```bash
node check-users.mjs
```

This will list all users and show who has platform owner access.

## Security Notes

- The platform owner role is completely hidden from regular users
- Only users in the `platform_roles` table can access `/platform-admin`
- Regular users get a 404 if they try to access the platform admin area
- Keep your owner credentials secure

## Troubleshooting

### Script fails with "Missing Supabase credentials"

Make sure your `.env` file has:
```
VITE_SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### "User already exists" error

If the user already exists, you can:
1. Use the existing account: `node create-platform-owner.mjs existing@email.com`
2. Or reset their password: `node reset-password.mjs existing@email.com NewPassword123`

### Platform Admin link not showing

1. Make sure you're logged in with the owner account
2. Check browser console for errors
3. Verify the user is in `platform_roles` table
4. Try logging out and back in

### Getting 404 on /platform-admin

- You are not logged in with a platform owner account
- Check if the user has a row in the `platform_roles` table

## Next Steps

Once logged in as platform owner:

1. **Create your first academy**:
   - Go to Academies tab
   - Click "Add Academy"
   - Enter name, domain, and select a plan

2. **Customize plans**:
   - Go to Plans tab
   - Edit pricing and descriptions
   - Use the plan-feature matrix to control features

3. **Manage features**:
   - Go to Features tab
   - Add custom features
   - Assign to plans

For more details, see `SAAS_OWNER_LAYER_GUIDE.md`
