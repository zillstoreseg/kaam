# 🚀 Quick Start Guide

## You're Ready to Go!

Your multi-tenant SaaS platform is **fully configured and ready to use**. Here's how to get started:

---

## Step 1: Login as Platform Owner

1. Start the dev server (if not already running)
2. Open your browser and go to the login page
3. Use these credentials:

```
Email: admin@platform.com
Password: admin123456
```

4. Click "Sign In"
5. **You'll be automatically redirected to `/admin/tenants`** (Platform Admin Portal)

---

## Step 2: Explore the Admin Portal

After login, you'll see the **Tenant Management Portal** with:

### What You'll See
- **Tenant List** - All academies (currently: Main Academy with your existing data)
- **Subscription Details** - Plan, status, days remaining, renewal dates
- **Quick Actions** - Login As, Edit, Suspend/Activate buttons

### Your Existing Data
All your current data is in the **"Main Academy"** tenant:
- Plan: Enterprise (all features)
- Status: Active
- Valid: 1 year

### Try It Out
Click **"Login As"** on Main Academy to view your existing data!

---

## Step 3: Test Impersonation (Login As)

1. From the tenant list, find **"Main Academy"**
2. Click the **"Login As"** button
3. You'll see a **purple banner** at the top: "Support Mode: Viewing Main Academy"
4. Browse around - you're now in the tenant's context
5. Click **"Exit Support Mode"** in the banner to return to admin portal

**Note:** All impersonations are logged for security and compliance.

---

## Step 4: Create a Test Tenant (Optional)

Want to test multi-tenancy? Create a new academy:

1. Click **"Create Tenant"** button (top right)
2. Fill in the form:
   - **Academy Name:** Test Academy
   - **Subdomain:** test (will be test.academy.com)
   - **Status:** Active
   - **Plan:** Single (for testing)
   - **Dates:** Today to 30 days from now
   - **Admin User:** test@test.com / password123
3. Click **"Create Tenant"**
4. New tenant appears in the list!

### Verify Isolation
1. Login As "Test Academy"
2. Verify: No students (empty - Main Academy data not visible)
3. Add a test student
4. Exit support mode
5. Login As "Main Academy"
6. Verify: Test Academy's student NOT visible ✅
7. **Data isolation confirmed!**

---

## 🎯 What You Can Do Now

### Platform Owner Actions
- ✅ View all tenants and their subscriptions
- ✅ Create unlimited new academies
- ✅ Impersonate any tenant for support
- ✅ Suspend/activate tenants instantly
- ✅ Control which features each tenant can access
- ✅ Extend subscriptions
- ✅ View platform audit logs

### For Each Tenant
- ✅ Complete data isolation (enforced by database)
- ✅ Feature access based on their plan
- ✅ Subscription status enforcement
- ✅ Grace period support
- ✅ Custom module overrides

---

## 📊 Understanding the Plans

### Single Plan
Perfect for small academies:
- Students management
- Attendance tracking
- Exam eligibility
- Inactive alerts
- WhatsApp templates
- Basic settings

### Multi Plan
Single + advanced features:
- All Single features
- Multi-branch management
- Expense tracking
- Expense analytics
- Email digests

### Enterprise Plan
Multi + premium features:
- All Multi features
- Security Suite (audit logs, login history, alerts)
- Priority support (your choice)
- Custom integrations (your choice)

---

## 🔧 Common Tasks

### Change a Tenant's Plan
1. Go to tenant list
2. Click "Edit" on the tenant
3. Select new plan from dropdown
4. Save changes
5. Features immediately update

### Extend a Subscription
1. Go to tenant list
2. Click "Edit" on the tenant
3. Change "Renews At" date to future date
4. Save changes
5. Days remaining updates automatically

### Suspend a Tenant (Non-payment)
1. Go to tenant list
2. Click "Suspend" button
3. Tenant immediately loses access
4. They see "subscription expired" message
5. Click "Activate" to restore when paid

### Override a Feature
1. Edit tenant
2. In module overrides section:
   - Add feature key (e.g., "expenses")
   - Set to true (enable) or false (disable)
3. Overrides plan defaults
4. Useful for custom deals/trials

---

## 🛡️ Security & Best Practices

### DO
- ✅ Use strong passwords for platform owner
- ✅ Use impersonation for support (never ask for passwords)
- ✅ Review platform audit logs regularly
- ✅ Set appropriate grace periods (3-7 days typical)
- ✅ Test plan changes before applying to production tenants

### DON'T
- ❌ Share platform owner credentials with anyone
- ❌ Bypass subscription checks for tenants (maintain fairness)
- ❌ Manually edit database (use admin portal)
- ❌ Delete tenants with active data (suspend instead)

---

## 🐛 Troubleshooting

### "Permission Denied" Error
**Cause:** User doesn't have tenant_id set correctly
**Fix:** Check profiles table, ensure user has valid tenant_id

### Can't See Admin Portal
**Cause:** User role is not 'platform_owner'
**Fix:** Verify role in profiles table is exactly 'platform_owner' with tenant_id = NULL

### Tenant Shows Wrong Features
**Cause:** Plan features not matching or overrides present
**Fix:** Edit tenant, check plan and module_overrides field

### Impersonation Not Working
**Cause:** Session may be expired or invalid
**Fix:** Check impersonation_sessions table, ensure not expired/revoked

---

## 📚 Documentation

- **PLATFORM_OWNER_CREDENTIALS.md** - Your login credentials and access details
- **SAAS_COMPLETE.md** - Complete SaaS implementation guide
- **SAAS_TRANSFORMATION_GUIDE.md** - Technical architecture details

---

## 🎉 You're All Set!

Your platform is production-ready with:
- ✅ Complete tenant isolation
- ✅ Subscription management
- ✅ Feature gating
- ✅ Admin portal
- ✅ Impersonation system
- ✅ Security enforcement

**Login now and start managing your academies!** 🚀

---

## Need Help?

If you encounter any issues:
1. Check the troubleshooting section above
2. Review the detailed guides in the docs folder
3. Check browser console for error messages
4. Verify database RLS policies are enabled

**Everything is ready to go!** 🎊
