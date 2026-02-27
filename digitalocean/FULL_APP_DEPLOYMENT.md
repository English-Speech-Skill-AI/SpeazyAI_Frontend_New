# Complete App Deployment to DigitalOcean

This guide covers deploying your entire React application from Netlify to DigitalOcean App Platform.

## Overview

Your app consists of:
1. **Frontend**: React + Vite static site
2. **Backend**: 5 DigitalOcean Serverless Functions (already deployed)
3. **Domain**: exeleratetechnology.com

## Prerequisites

✅ All 5 functions are deployed to DigitalOcean Functions
✅ Function URLs are documented
✅ Environment variables are set in functions
✅ Frontend code is updated to use DigitalOcean functions

## Step 1: Prepare Your Repository

1. **Commit all changes**:
   ```bash
   git add .
   git commit -m "Migrate to DigitalOcean"
   git push origin master
   ```

2. **Verify build works locally**:
   ```bash
   npm run build
   ```
   This should create a `build` directory with your static files.

## Step 2: Create DigitalOcean App

1. **Go to DigitalOcean Dashboard**:
   - Navigate to: https://cloud.digitalocean.com/apps
   - Click **"Create App"**

2. **Connect Your Repository**:
   - Choose your Git provider (GitHub/GitLab/Bitbucket)
   - Select your repository: `EnglishSkillAI`
   - Select branch: `master` (or `main`)

3. **Configure Build Settings**:
   - **Build Command**: `npm run build`
   - **Output Directory**: `build`
   - **Node.js Version**: `20` (or `18` - check your `.nvmrc` file)

## Step 3: Add Static Site Component

DigitalOcean will auto-detect your app type, but verify:

1. **Component Type**: Static Site
2. **Build Command**: `npm run build`
3. **Output Directory**: `build`
4. **HTTP Port**: Leave default (or `8080`)

## Step 4: Configure Environment Variables

Add these environment variables in the App Platform settings:

### Frontend Environment Variables

```env
# API Provider (set to 'digitalocean' for production)
VITE_API_PROVIDER=digitalocean

# DigitalOcean Function URLs (replace with your actual URLs)
VITE_SPEECH_PROXY_URL=https://faas-blr1-8177d592.doserverless.co/api/v1/web/fn-a38d3580-f602-4111-8967-d449fc5ef00e/default/speechProxy
VITE_CHATGPT_PROXY_URL=https://faas-blr1-8177d592.doserverless.co/api/v1/web/fn-a38d3580-f602-4111-8967-d449fc5ef00e/default/chatgptProxy
VITE_AUTH_PROXY_URL=https://faas-blr1-8177d592.doserverless.co/api/v1/web/fn-a38d3580-f602-4111-8967-d449fc5ef00e/default/authProxy
VITE_PDF_PROXY_URL=https://faas-blr1-8177d592.doserverless.co/api/v1/web/fn-a38d3580-f602-4111-8967-d449fc5ef00e/default/pdfProxy
VITE_PDF_EXTRACT_PROXY_URL=https://faas-blr1-8177d592.doserverless.co/api/v1/web/fn-a38d3580-f602-4111-8967-d449fc5ef00e/default/pdfExtractProxy
```

**How to add in DigitalOcean**:
1. Go to your App → Settings → App-Level Environment Variables
2. Click "Edit" or "Add Variable"
3. Add each variable above

## Step 5: Configure Routing (SPA Support)

Since this is a React SPA, you need to handle client-side routing:

1. **In App Platform Settings**:
   - Go to Settings → Static Site
   - Enable **"Catch-all route"** or configure custom routing

2. **Create `_redirects` file** (if not exists):
   Create `public/_redirects` or add to `build` directory:
   ```
   /*    /index.html   200
   ```

3. **Alternative: Use `app.yaml`** (DigitalOcean App Platform):
   Create `app.yaml` in root:
   ```yaml
   name: speech-skills-ai
   static_sites:
     - name: frontend
       github:
         repo: your-username/EnglishSkillAI
         branch: master
       build_command: npm run build
       output_dir: build
       routes:
         - path: /
           preserve_path_prefix: true
   ```

## Step 6: Connect Your Domain

1. **In DigitalOcean App Platform**:
   - Go to Settings → Domains
   - Click "Add Domain"
   - Enter: `exeleratetechnology.com`
   - Also add: `www.exeleratetechnology.com` (if needed)

2. **DNS Configuration**:
   - DigitalOcean will provide DNS records to add
   - Go to your domain registrar (where you bought the domain)
   - Update DNS records:
     ```
     Type: CNAME
     Name: @ (or root)
     Value: [DigitalOcean provided value]
     
     Type: CNAME
     Name: www
     Value: [DigitalOcean provided value]
     ```
   - Or use A records if provided

3. **SSL Certificate**:
   - DigitalOcean automatically provisions Let's Encrypt SSL
   - Wait 5-10 minutes for certificate to be issued
   - Your site will be available at `https://exeleratetechnology.com`

## Step 7: Deploy

1. **Review Configuration**:
   - Check all settings
   - Verify environment variables
   - Confirm build command and output directory

2. **Deploy**:
   - Click "Create Resources" or "Deploy"
   - DigitalOcean will:
     - Clone your repo
     - Install dependencies
     - Run build command
     - Deploy static files

3. **Monitor Build**:
   - Watch the build logs in real-time
   - Check for any errors
   - Build should complete in 2-5 minutes

## Step 8: Verify Deployment

After deployment, test:

1. **Homepage**: `https://exeleratetechnology.com`
2. **Authentication**: Login functionality
3. **Speech Recording**: Test audio recording
4. **ChatGPT**: Test chat functionality
5. **PDF Processing**: Test PDF features

## Step 9: Update Function CORS Settings

Make sure your DigitalOcean Functions allow your production domain:

1. **For each function**, set environment variable:
   ```
   ALLOWED_ORIGIN=https://exeleratetechnology.com
   ```

2. **Functions to update**:
   - speechProxy
   - chatgptProxy
   - authProxy
   - pdfProxy
   - pdfExtractProxy

## Step 10: Post-Deployment Checklist

- [ ] App is accessible at your domain
- [ ] SSL certificate is active (HTTPS)
- [ ] All environment variables are set
- [ ] Functions are accessible from frontend
- [ ] CORS is configured correctly
- [ ] Authentication works
- [ ] Speech recording works
- [ ] ChatGPT integration works
- [ ] PDF features work
- [ ] Client-side routing works (try navigating to different pages)

## Troubleshooting

### Build Fails

**Issue**: Build command fails
- Check build logs for specific errors
- Verify Node.js version matches `.nvmrc`
- Ensure all dependencies are in `package.json`

**Solution**:
```bash
# Test build locally first
npm run build
```

### 404 Errors on Routes

**Issue**: Direct URL access returns 404
- SPA routing not configured

**Solution**:
- Add `_redirects` file or configure routing in App Platform
- Ensure all routes redirect to `index.html`

### CORS Errors

**Issue**: Functions reject requests from frontend
- `ALLOWED_ORIGIN` not set correctly

**Solution**:
- Set `ALLOWED_ORIGIN=https://exeleratetechnology.com` in each function
- Redeploy functions if needed

### Environment Variables Not Working

**Issue**: `import.meta.env.VITE_*` variables are undefined
- Variables not prefixed with `VITE_`
- Variables not set in App Platform

**Solution**:
- All frontend env vars must start with `VITE_`
- Set them in App Platform → Settings → Environment Variables

## Cost Estimation

- **Static Site**: ~$5/month (Basic plan)
- **Functions**: Pay-per-use (very low cost for typical usage)
- **Total**: ~$5-10/month for small to medium traffic

## Next Steps

1. ✅ Monitor app performance
2. ✅ Set up monitoring/alerts
3. ✅ Configure custom domain
4. ✅ Test all features thoroughly
5. ✅ Update any hardcoded URLs in code
6. ✅ Remove Netlify configuration (optional)

## Rollback Plan

If you need to rollback to Netlify:

1. Keep Netlify deployment active during migration
2. If issues occur, switch DNS back to Netlify
3. Or set `VITE_API_PROVIDER=netlify` temporarily

## Support

- DigitalOcean Docs: https://docs.digitalocean.com/products/app-platform/
- DigitalOcean Functions: https://docs.digitalocean.com/products/functions/
