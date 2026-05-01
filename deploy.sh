#!/bin/bash
set -e

SERVER="deploy@134.209.152.144"
TARGET="/var/www/englishskill"

# Nginx must serve index.html for SPA routes (/login, etc.). Run ./setup-droplet-nginx.sh once if you get 404s.

echo "🏗️ Building frontend..."
npm run build

echo "📤 Syncing build to server..."
scp -r build/* $SERVER:$TARGET/

echo "🔄 Reloading nginx..."
ssh $SERVER << 'EOF'
  sudo nginx -t
  sudo systemctl reload nginx
EOF

echo "✅ Deployment completed successfully!"