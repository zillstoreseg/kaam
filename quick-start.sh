#!/bin/bash

echo "================================"
echo "Platform Owner Quick Start"
echo "================================"
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found!"
    echo ""
    echo "Please create a .env file with:"
    echo "  VITE_SUPABASE_URL=your-supabase-url"
    echo "  VITE_SUPABASE_ANON_KEY=your-anon-key"
    echo "  SUPABASE_SERVICE_ROLE_KEY=your-service-role-key"
    exit 1
fi

echo "✓ .env file found"
echo ""

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    echo ""
fi

echo "✓ Dependencies installed"
echo ""

# Create platform owner account
echo "👤 Creating platform owner account..."
echo ""
node create-owner-account.mjs owner@dojocloud.com

echo ""
echo "================================"
echo "✓ Setup Complete!"
echo "================================"
echo ""
echo "Next steps:"
echo ""
echo "1. Start the dev server:"
echo "   npm run dev"
echo ""
echo "2. Open browser to: http://localhost:5173"
echo ""
echo "3. Login with:"
echo "   Email:    owner@dojocloud.com"
echo "   Password: Owner@123456"
echo ""
echo "4. Click 'Platform Admin' in the sidebar (blue link with crown icon)"
echo ""
echo "For complete guide, see: TRY_FEATURES_GUIDE.md"
echo ""
