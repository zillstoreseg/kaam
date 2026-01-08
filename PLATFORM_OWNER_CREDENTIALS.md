# 🔑 Platform Owner Access

## Your Platform Owner Account

A platform owner account has been created for you:

**Email:** `admin@platform.com`
**Password:** `admin123456`

---

## 🚀 Getting Started

### 1. Login
1. Navigate to the login page
2. Enter the credentials above
3. You will be automatically redirected to `/admin/tenants`

### 2. Platform Admin Portal

After login, you'll see the **Tenant Management Portal** where you can:

- ✅ **View all tenants** - See every academy with their subscription details
- ✅ **Create new tenants** - Click "Create Tenant" to onboard a new academy
- ✅ **Manage subscriptions** - View plan, status, days remaining, renewal dates
- ✅ **Login As (Impersonate)** - Click "Login As" to view any tenant's account
- ✅ **Suspend/Activate** - Control tenant access instantly
- ✅ **View platform audit logs** - Track all admin actions

---

## 📊 Your Existing Data

All your current data has been migrated to the **Main Academy** tenant:

- **Tenant Name:** Main Academy
- **Subdomain:** main
- **Plan:** Enterprise (all features enabled)
- **Status:** Active
- **Subscription:** Valid for 1 year
- **Access:** Login As from tenant list to view/manage

---

## 🎛️ Quick Actions

### View Main Academy (Your Existing Data)
1. Login as platform owner
2. From tenant list, find "Main Academy"
3. Click "Login As"
4. You're now viewing your existing academy data
5. Click "Exit Support Mode" to return to admin portal

### Create a New Academy (Tenant)
1. From tenant list, click "Create Tenant"
2. Fill in academy details (name, subdomain)
3. Choose a plan (Single/Multi/Enterprise)
4. Set subscription dates
5. Create admin user credentials
6. Click "Create Tenant"
7. New academy is ready to use!

### Suspend a Tenant
1. From tenant list, find the tenant
2. Click "Suspend"
3. Tenant immediately loses access
4. They see a "subscription expired" page
5. Click "Activate" to restore access

---

## 🔒 Platform Owner Privileges

As platform owner, you have:

- ✅ **Full platform access** - No restrictions
- ✅ **Bypass subscription checks** - Access all features always
- ✅ **Impersonation** - Login as any tenant without password
- ✅ **Tenant management** - Create, suspend, modify any tenant
- ✅ **Subscription control** - Change plans, extend renewals, toggle features
- ✅ **Audit access** - View all platform-level actions

---

## 📱 Tenant URLs

Each tenant can access the platform via:

**Option 1: Subdomain** (recommended for production)
- Format: `https://{subdomain}.yourdomain.com`
- Example: `https://main.yourdomain.com` for Main Academy
- Requires DNS wildcard setup

**Option 2: Single Domain** (current setup)
- All tenants login at same URL
- System resolves tenant from user's profile
- Works out of the box

---

## 🛡️ Security Notes

- **Never share platform owner credentials** with tenants
- **Use impersonation** for support instead of sharing passwords
- **All impersonations are logged** in platform_audit table
- **Sessions expire** after 30 minutes for security
- **Tenant data is isolated** - They cannot see each other's data (enforced by database)

---

## 🎨 Next Steps

1. **Login** with platform owner credentials
2. **View tenant list** to see Main Academy
3. **Login As Main Academy** to access your existing data
4. **Create a test tenant** to verify multi-tenancy
5. **Test subscription features** by creating different plans

**Your multi-tenant SaaS platform is ready to use!** 🚀
