# 🚀 START HERE - Platform Owner Access

## ⚡ Quick Setup (3 Steps)

### Step 1: Apply Database Migrations

The platform tables need to be created first. Choose one method:

#### Method A: Supabase Dashboard SQL Editor (Easiest)

1. Open [Supabase Dashboard](https://viwgdxffvehogkflhkjw.supabase.co)
2. Go to **SQL Editor** → **New Query**
3. Copy/paste **`supabase/migrations/20260201000000_create_saas_platform_owner_layer.sql`**
4. Click **Run**
5. Copy/paste **`supabase/migrations/20260201000001_seed_platform_data.sql`**
6. Click **Run**

#### Method B: Use Quick Setup Script

1. Open [Supabase Dashboard](https://viwgdxffvehogkflhkjw.supabase.co)
2. Go to **SQL Editor** → **New Query**
3. Copy/paste **`create-owner-quick.sql`**
4. Click **Run**

### Step 2: Create Owner Account

Run the automated setup script:

```bash
node setup-owner.mjs
```

This creates your owner account with:
- **Email**: `owner@dojocloud.com`
- **Password**: `Owner123!@#`

### Step 3: Login

1. Open your app at the login page
2. Enter the credentials above
3. You'll see **"Platform Admin"** in the sidebar (👑 icon)
4. Click it to access `/platform-admin`
5. **Change your password immediately!**

---

## 🎯 What You Get

After logging in as platform owner, you can:

| Feature | Description |
|---------|-------------|
| 🏛️ **Academies** | Create and manage tenant academies |
| 💳 **Plans** | Configure Basic, Pro, Elite subscription plans |
| ⚙️ **Features** | Control which features are available per plan |
| 📊 **Overview** | View platform statistics and activity |
| 🔧 **Settings** | Suspend, activate, extend subscriptions |

---

## 📝 Default Credentials

```
┌─────────────────────────────────────────┐
│  Platform Owner Login                   │
├─────────────────────────────────────────┤
│  Email:    owner@dojocloud.com          │
│  Password: Owner123!@#                  │
│  URL:      /platform-admin              │
└─────────────────────────────────────────┘
```

⚠️ **CHANGE PASSWORD AFTER FIRST LOGIN!**

---

## 🔍 Troubleshooting

### "Script fails with table not found"
→ Apply migrations first (Step 1 above)

### "Cannot see Platform Admin button"
→ Log out and log back in
→ Check browser console for errors

### "Shows 404 on /platform-admin"
→ This is normal for non-owners
→ Verify you're logged in with owner account

---

## 📚 Documentation Files

| File | Purpose |
|------|---------|
| **START_HERE.md** ← You are here | Quick 3-step setup |
| **OWNER_CREDENTIALS.txt** | Quick credential reference |
| **QUICK_START_OWNER.md** | Detailed setup guide |
| **README_OWNER_ACCESS.md** | Access instructions |
| **OWNER_SETUP_GUIDE.md** | Complete setup manual |
| **docs/SAAS_PLATFORM_NOTES.md** | Full platform documentation |

---

## ✅ Verification Checklist

After setup, verify everything works:

- [ ] Migrations applied successfully
- [ ] Script ran without errors
- [ ] Can login with owner credentials
- [ ] See "Platform Admin" in sidebar
- [ ] Can access `/platform-admin`
- [ ] Overview tab shows statistics
- [ ] Can view Academies, Plans, Features tabs
- [ ] Changed default password
- [ ] Tested creating a test academy

---

## 🎓 Next Steps

1. ✅ Complete setup (Steps 1-3 above)
2. ✅ Change default password
3. ✅ Create your first academy
4. ✅ Configure plans and features
5. ✅ Read `docs/SAAS_PLATFORM_NOTES.md` for details

---

## 🆘 Need Help?

1. Check **QUICK_START_OWNER.md** for detailed steps
2. Review **OWNER_SETUP_GUIDE.md** for troubleshooting
3. Read **docs/SAAS_PLATFORM_NOTES.md** for complete documentation
4. Check browser console for JavaScript errors
5. Verify database tables exist in Supabase Dashboard

---

**🎉 Ready to get started? Follow the 3 steps above!**
