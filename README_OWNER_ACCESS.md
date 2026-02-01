# 🎯 How to Access Platform Owner Dashboard

## Quick Answer

**Default Owner Credentials:**
```
Email:    owner@dojocloud.com
Password: Owner123!@#
```

**Access URL:** `/platform-admin` (after login)

---

## Setup Methods

### ⚡ Method 1: Automated (Recommended)

```bash
node setup-owner.mjs
```

This automatically creates the owner account. Then login with the credentials above.

### 🛠️ Method 2: Manual

If you need to create the account manually:

1. **Create User in Supabase Dashboard**
   - Go to Authentication → Users
   - Add user with email: `owner@dojocloud.com`
   - Password: `Owner123!@#`

2. **Add Platform Role**
   - Go to SQL Editor
   - Run:
   ```sql
   INSERT INTO platform_roles (user_id, role)
   VALUES (
     (SELECT id FROM auth.users WHERE email = 'owner@dojocloud.com'),
     'owner'
   );
   ```

3. **Login**
   - Use credentials above
   - Look for "Platform Admin" in sidebar
   - Click to access `/platform-admin`

---

## What You Get

After logging in as owner, you'll see a **"Platform Admin"** link in the sidebar with a crown 👑 icon.

Click it to access the owner dashboard where you can:

✅ **Manage Academies**
- Create new academy tenants
- Edit academy details
- Change subscription plans
- Suspend/activate academies

✅ **Configure Plans**
- Create/edit subscription plans (Basic, Pro, Elite)
- Set pricing
- Manage plan-feature matrix

✅ **Control Features**
- Add/remove features
- Toggle features per plan
- Override features per academy

✅ **View Statistics**
- Total academies
- Active vs inactive
- Subscription status

---

## Security Notes

🔒 **Hidden from Regular Users**
- Platform Admin link only shows to owners
- `/platform-admin` shows 404 for non-owners
- Owner role is completely stealth

⚠️ **Change Password**
- Default password is for setup only
- Change it immediately after first login
- Go to Settings to update

---

## Files Reference

| File | Purpose |
|------|---------|
| `setup-owner.mjs` | Automated owner account creation |
| `OWNER_CREDENTIALS.txt` | Quick credential reference |
| `QUICK_START_OWNER.md` | Step-by-step setup guide |
| `OWNER_SETUP_GUIDE.md` | Detailed setup instructions |
| `create-owner-quick.sql` | Manual SQL setup script |
| `docs/SAAS_PLATFORM_NOTES.md` | Complete platform documentation |

---

## Troubleshooting

### Can't See Platform Admin Link

1. Log out and log back in
2. Check browser console for errors
3. Verify owner role exists in database
4. Run `node setup-owner.mjs` again

### Shows 404 on /platform-admin

This is **expected** for non-owner accounts. If you're the owner:
- Verify you're logged in
- Check `platform_roles` table has your user_id
- Clear browser cache

### Script Fails

If `node setup-owner.mjs` fails:
1. Check database migrations are applied
2. Use manual method instead
3. See `OWNER_SETUP_GUIDE.md` for detailed steps

---

## Next Steps

1. ✅ Run `node setup-owner.mjs`
2. ✅ Login with credentials above
3. ✅ Access `/platform-admin`
4. ✅ Change password
5. ✅ Create your first academy
6. ✅ Configure plans and features

---

**📚 For complete documentation, see:**
- `QUICK_START_OWNER.md` - Quick start guide
- `docs/SAAS_PLATFORM_NOTES.md` - Full documentation

**🎉 Ready to manage your DOJO CLOUD platform!**
