# How to Try Platform Owner Features

Follow these steps to explore all the platform owner features:

## Prerequisites Check

Make sure your `.env` file has these variables:
```
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## Step 1: Create Your Platform Owner Account

Run this command:

```bash
node create-owner-account.mjs owner@dojocloud.com
```

You should see:
```
=== Creating Platform Owner Account ===
Email: owner@dojocloud.com
Password: Owner@123456

[1/3] Creating auth user...
✓ Auth user created successfully

[2/3] Creating profile...
✓ Profile created successfully

[3/3] Granting platform owner access...
✓ Platform owner role granted successfully

=== ✓ SUCCESS ===
```

## Step 2: Start the Development Server

```bash
npm run dev
```

The app should start on `http://localhost:5173`

## Step 3: Login as Platform Owner

1. Open your browser to `http://localhost:5173`
2. You'll see the login page
3. Login with:
   - **Email**: `owner@dojocloud.com`
   - **Password**: `Owner@123456`

## Step 4: Access Platform Admin Dashboard

After login, look at the **sidebar** (left side):

- You should see a **blue "Platform Admin"** link at the bottom
- It has a crown icon (👑)
- Click it to go to `/platform-admin`

## Step 5: Explore Features

### 5.1 Overview Tab (Default View)

You'll see:
- Total academies count
- Total revenue (sum of all subscriptions)
- Active subscriptions count
- Total users across all academies
- Recent activity list

### 5.2 Create Your First Academy

Click **"Academies"** tab:

1. Click **"Add Academy"** button
2. Fill in the form:
   - **Name**: "My First Martial Arts Academy"
   - **Domain/Subdomain**: "first-academy" (must be unique)
   - **Contact Email**: "admin@firstacademy.com"
   - **Plan**: Select "Pro" from dropdown
   - **Status**: "Active"
   - **Trial Period**: Toggle ON (optional)
   - **Trial End Date**: Select a future date (optional)

3. Click **"Create Academy"**

You should see your new academy in the table!

### 5.3 Manage Subscription Plans

Click **"Plans"** tab:

You'll see 3 default plans:
- **Basic** - $29.99/month
- **Pro** - $59.99/month
- **Elite** - $99.99/month

Try this:
1. Click **edit icon** (pencil) next to "Pro"
2. Change the price to $49.99
3. Change the description
4. Click **"Save"**

Create a new plan:
1. Click **"Add Plan"** button
2. Fill in:
   - **Name**: "Starter"
   - **Display Name**: "Starter Plan"
   - **Price**: 19.99
   - **Billing Period**: "monthly"
   - **Description**: "Perfect for small academies"
3. Click **"Create Plan"**

### 5.4 Control Features Per Plan

Click **"Features"** tab:

You'll see all available features:
- Students Management
- Attendance Tracking
- Belt System
- Exam Management
- Stock Management
- Financial Reports
- Multi-Branch Support
- etc.

**Try the Feature-Plan Matrix**:
1. Find "Multi-Branch Support" in the list
2. Look at the checkboxes next to it (Basic, Pro, Elite)
3. Currently only Elite has it enabled
4. Check the box for "Pro" to enable it
5. Click **"Save All Assignments"**

Now Pro plan academies can use multi-branch!

**Create a Custom Feature**:
1. Click **"Add Feature"** button
2. Fill in:
   - **Code**: "custom_reports"
   - **Display Name**: "Custom Reports"
   - **Description**: "Advanced custom reporting"
   - **Category**: "reporting"
3. Click **"Create Feature"**
4. Assign it to Elite plan only

### 5.5 Impersonate an Academy

Back in the **"Academies"** tab:

1. Find your academy in the table
2. Click the **"Impersonate"** button (eye icon)
3. You'll be switched to that academy's view
4. A yellow banner appears at top: "Viewing as: [Academy Name]"
5. Explore the academy dashboard
6. Click **"Stop Impersonation"** in the banner to return to platform view

### 5.6 View Platform Activity

Click **"Activity Log"** tab (if available in sidebar):

You'll see audit logs of all platform actions:
- Academy created
- Plans modified
- Features assigned
- Impersonation sessions
- etc.

## Step 6: Test as a Regular Academy User

To see how it works for regular users:

1. Stop impersonation (if active)
2. Logout from the platform owner account
3. Register a new regular user account:
   - Go to login page
   - Click "Register" or "Sign Up"
   - Create account: `academy@test.com` / `Test123456`
4. Login as this regular user
5. **Notice**: NO "Platform Admin" link appears!

Regular users cannot:
- See the platform admin link
- Access `/platform-admin` (they get 404)
- Know platform owners exist

## Step 7: Create Academy Admin for Testing

While logged in as platform owner:

1. Go to **Academies** tab
2. Click **"Impersonate"** on your test academy
3. Go to **"Users"** page in the academy dashboard
4. Create a new user with role "admin"
5. This user can now manage the academy (but never see platform features)

## Troubleshooting

### "Platform Admin" link not showing

- Make sure you're logged in as `owner@dojocloud.com`
- Check browser console for errors
- Try logging out and back in
- Run: `node check-users.mjs` to verify the account

### Getting 404 on /platform-admin

You're not logged in as a platform owner. Only accounts in the `platform_roles` table can access it.

### Script error: Missing Supabase credentials

Check your `.env` file has all three variables:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

### Database errors

Make sure all migrations are applied to your Supabase database. Check the Supabase dashboard SQL editor.

## Quick Test Checklist

- [ ] Platform owner account created
- [ ] Login successful
- [ ] "Platform Admin" link visible in sidebar
- [ ] Overview shows statistics
- [ ] Created a test academy
- [ ] Modified a plan's price
- [ ] Toggled feature assignments
- [ ] Impersonated an academy
- [ ] Regular users can't see platform features

## What's Next?

Once you're comfortable with the features:

1. **Customize Plans**: Adjust pricing for your market
2. **Create Features**: Add custom features specific to your platform
3. **Onboard Academies**: Create real academy accounts
4. **Set Billing**: Integrate payment processing (Stripe)
5. **Monitor Growth**: Use the overview dashboard to track platform growth

---

For more details, see:
- `SAAS_OWNER_LAYER_GUIDE.md` - Complete feature guide
- `PLATFORM_OWNER_SETUP.md` - Setup instructions
- `OWNER_CREDENTIALS.md` - Credentials reference
