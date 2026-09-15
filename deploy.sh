#!/bin/bash
set -e

SERVER="deploy@134.209.152.144"
TARGETS=("/var/www/englishproai" "/var/www/englishskill")

# Nginx must serve index.html for SPA routes (/login, etc.). Run ./setup-droplet-nginx.sh once if you get 404s.

echo "🏗️ Building frontend..."
npm run build

echo "📁 Ensuring deploy directories exist on server..."
ssh $SERVER "mkdir -p ${TARGETS[*]}"

for TARGET in "${TARGETS[@]}"; do
  echo "📤 Syncing build to $TARGET..."
  scp -r build/* $SERVER:$TARGET/
done

echo "🔐 Fixing permissions for nginx (www-data)..."
ssh $SERVER "chmod -R u+rwX,g+rwX,o+rX ${TARGETS[*]}"

echo "🔄 Reloading nginx..."
ssh $SERVER << 'EOF'
  sudo nginx -t
  sudo systemctl reload nginx
EOF

echo "✅ Deployment completed successfully!"