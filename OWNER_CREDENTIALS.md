# Platform Owner Credentials

## Create Your Platform Owner Account

Run this command to create the first platform owner:

```bash
node create-owner-account.mjs owner@dojocloud.com
```

## Default Login Credentials

**Email**: `owner@dojocloud.com`  
**Password**: `Owner@123456`

(You can change these by passing different arguments to the script)

## How to Login

1. Navigate to the login page
2. Enter the credentials above
3. After login, click "Platform Admin" in the sidebar (blue link with crown icon)
4. You're now in the Platform Admin dashboard at `/platform-admin`

## Security Note

**IMPORTANT**: Change the default password after first login for security!

You can do this through:
- The app's settings/profile page, or
- Run: `node reset-password.mjs owner@dojocloud.com NewSecurePassword123`

---

For complete setup instructions, see `PLATFORM_OWNER_SETUP.md`
