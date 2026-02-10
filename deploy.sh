#!/bin/bash

# HKJC Strapi Deployment Script
# Usage: ./deploy.sh

set -e

echo "🚀 Starting deployment to strapi.hkjc-event.org..."

# Pull latest from GitHub on server
echo "📦 Pulling latest code from GitHub..."
ssh root@76.13.187.31 << 'EOF'
cd /var/www
rm -rf strapi
git clone https://github.com/kincau2/hkjc-strapi.git temp
mv temp/Backend strapi
rm -rf temp
cd strapi
EOF

# Install dependencies
echo "📥 Installing dependencies..."
ssh root@76.13.187.31 'cd /var/www/strapi && npm install --production --quiet'

# Build admin panel
echo "🔨 Building Strapi admin panel..."
ssh root@76.13.187.31 'cd /var/www/strapi && NODE_ENV=production npm run build'

# Restart PM2
echo "🔄 Restarting Strapi..."
ssh root@76.13.187.31 'pm2 restart strapi-backend'

# Check status
echo "✅ Deployment complete!"
echo ""
ssh root@76.13.187.31 'pm2 list'
echo ""
echo "🌐 Backend: http://76.13.187.31/admin"
echo "🌐 Backend: https://strapi.hkjc-event.org/admin"
