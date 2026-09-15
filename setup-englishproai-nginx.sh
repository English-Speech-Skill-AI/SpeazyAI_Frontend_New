#!/bin/bash
# One-time: nginx + Let's Encrypt for englishproai.intelliviq.com
# Prerequisites: DNS A record for englishproai.intelliviq.com -> droplet IP
# Run from project root (Git Bash / WSL / Mac): bash setup-englishproai-nginx.sh

set -e

SERVER="deploy@134.209.152.144"
SITE="englishproai.intelliviq.com"
CONF="digitalocean/nginx-englishproai.conf"

echo "Uploading nginx config..."
scp "$CONF" "$SERVER:/tmp/nginx-englishproai.conf"

echo "Installing site + SSL (requires sudo on server)..."
ssh -t "$SERVER" << EOF
  set -e
  sudo cp /tmp/nginx-englishproai.conf /etc/nginx/sites-available/$SITE
  sudo ln -sf /etc/nginx/sites-available/$SITE /etc/nginx/sites-enabled/$SITE
  sudo nginx -t
  sudo certbot --nginx -d $SITE
  sudo systemctl reload nginx
EOF

echo "Done. Deploy the app with: npm run deploy"
