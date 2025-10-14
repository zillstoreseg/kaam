# Karate Academy Attendance Manager (KAAM)

A complete full-stack web application for managing karate academy operations including students, attendance tracking, subscriptions, and multi-branch management.

## Features

### Core Functionality
- **Multi-Branch Support**: Manage multiple academy locations from a single system
- **Role-Based Access Control**: Super Admin, Branch Manager, and Coach roles with specific permissions
- **Student Management**: Complete student profiles with package assignments
- **Attendance Tracking**: Interactive attendance marking with calendar and search
- **Package Management**: Subscription plans with session tracking
- **Reports & Analytics**: Comprehensive reporting with CSV export
- **Multi-Language Support**: Full support for English, Arabic (RTL), and Hindi

### User Roles

1. **Super Admin**
   - Full access to all branches
   - Manage branches, packages, and system settings
   - View all students and attendance across branches
   - Manage user accounts

2. **Branch Manager**
   - Manage students in assigned branch
   - Mark attendance
   - View branch-specific reports
   - Cannot access other branches

3. **Coach**
   - Mark attendance for students
   - View student information
   - Read-only access to branch data

## Getting Started

### Prerequisites
- Node.js (v18 or higher)
- Supabase account (database is pre-configured)

### First Time Setup

1. **Create the first Super Admin account**:

   The system requires manual creation of the first super admin. Run this SQL in your Supabase SQL Editor:

   ```sql
   -- First, sign up through the application login page
   -- Then run this to upgrade your account to super admin:

   UPDATE profiles
   SET role = 'super_admin', branch_id = NULL
   WHERE id = 'YOUR_USER_ID_HERE';
   ```

   To get your user ID:
   - Sign up through the login page
   - Go to Supabase Dashboard > Authentication > Users
   - Copy your User ID
   - Run the SQL above with your ID

2. **Set up initial data**:
   - Login as super admin
   - Create your first branch
   - Create subscription packages
   - Add branch managers and coaches (they'll receive email invitations)

### Usage Guide

#### For Super Admins

1. **Managing Branches**:
   - Navigate to Branches page
   - Click "Add Branch" to create new locations
   - Each branch can have multiple managers and coaches

2. **Creating Packages**:
   - Go to Packages page
   - Define session limits (per month/week)
   - Set pricing and descriptions

3. **Managing Users**:
   - Currently done through direct database access
   - Plan to add user management UI in future updates

#### For Branch Managers

1. **Adding Students**:
   - Go to Students page
   - Click "Add Student"
   - Fill in all required information
   - Assign package and set start/end dates

2. **Marking Attendance**:
   - Navigate to Attendance page
   - Select date (defaults to today)
   - Search for students
   - Mark as Present, Late, or Absent

3. **Viewing Reports**:
   - Go to Reports page
   - Apply filters (date range, student, status)
   - Export to CSV for external analysis

#### For Coaches

1. **Daily Attendance**:
   - Open Attendance page
   - Today's date is pre-selected
   - Quickly mark attendance for each student
   - Status saves automatically

## Language Support

The system supports three languages with automatic RTL support for Arabic:

- **English** (default)
- **Arabic** (العربية) - Full RTL layout
- **Hindi** (हिंदी)

Switch languages using the globe icon in the top navigation bar.

## Database Structure

### Main Tables
- `branches` - Academy locations
- `profiles` - User profiles with roles
- `packages` - Subscription plans
- `students` - Student records
- `attendance` - Daily attendance tracking
- `settings` - System-wide configuration

### Security
- All tables protected with Row Level Security (RLS)
- Branch-scoped data access for non-admin users
- Authenticated access required for all operations

## Technical Stack

- **Frontend**: React 18 + TypeScript
- **Styling**: Tailwind CSS
- **Routing**: React Router v6
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Icons**: Lucide React

## Future Enhancements

- WhatsApp/Telegram notifications for parents
- Package expiration reminders
- Attendance analytics dashboard
- Student progress tracking
- Payment integration
- Mobile app (React Native)
- User management interface
- Bulk student import

## Support

For issues or questions:
1. Check the database RLS policies are properly configured
2. Verify environment variables are set correctly
3. Ensure user roles are assigned properly in the profiles table

## License

Proprietary - All rights reserved
