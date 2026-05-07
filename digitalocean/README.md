# DigitalOcean Functions and API Server

This folder contains proxy functions for DigitalOcean deployment, converted from Netlify Functions.

## Structure

- `functions/` - Serverless function versions (for DigitalOcean Functions). All files here are **self-contained, single-file** functions you can paste directly into the DO web editor. No `npm install` step.
  - `speechProxy.js` - Proxies to Language Confidence
  - `azureSpeechProxy.js` - **Azure Speech REST API** pronunciation assessment (same request shape as `speechProxy`, returns LC-shaped JSON). Set `SPEECH_KEY`, `SPEECH_REGION`, optional `AZURE_SPEECH_LANGUAGE` env vars. Bump function timeout to ≥ 30s.
  - `chatgptProxy.js` - Proxies requests to OpenAI ChatGPT API
  - `authProxy.js` - Proxies authentication requests
  - `pdfProxy.js` - Proxies PDF file requests
  - `pdfExtractProxy.js` - Processes extracted PDF text with ChatGPT

- `api-server.js` - Express.js API server (alternative to serverless functions)
  - ⚠️ **DO NOT deploy this as a serverless function** - it requires Express.js and other dependencies
  - Use this as a **Web Service component** in DigitalOcean App Platform (not Functions)
  - All proxy functions are available as Express routes

## Deployment Options

### Option 1: DigitalOcean Functions (Serverless)

1. Deploy each function in `functions/` as a separate serverless function
2. **Important**: 
   - Functions use ES module format (`export async function main(event)`) compatible with Node.js 18+
   - Functions are self-contained and use only built-in Node.js features (no Express.js or npm packages)
   - ⚠️ **Do NOT try to deploy `api-server.js` as a function** - it will fail with `ERR_MODULE_NOT_FOUND` because it requires Express.js
3. Set environment variables in DigitalOcean dashboard:
   - `LC_API_KEY` or `SPEECH_API_KEY`
   - `OPENAI_API_KEY`
   - `ALLOWED_ORIGIN` (your domain, e.g., `https://exeleratetechnology.com`)
4. Functions handle event structure: `event.http.method`, `event.http.headers`, `event.http.body`, `event.http.query`

### Option 2: Express.js API Server (Recommended)

⚠️ **IMPORTANT**: This must be deployed as a **Web Service** in DigitalOcean **App Platform**, NOT as a serverless function!

1. Go to DigitalOcean → **Apps** → **Create App** (not Functions)
2. Connect your repository and select the branch
3. Add a **Web Service** component (not a Function)
4. Configure the Web Service:
   - **Source Directory**: Leave empty (or set to root)
   - **Runtime**: Node.js 18 or 20 (recommended: 20)
   - **Build Command**: `npm install`
   - **Run Command**: `node digitalocean/api-server.js`
   - **HTTP Port**: `3000`
   - **Health Check Path**: `/health`

3. Set environment variables:
   - `LC_API_KEY` or `SPEECH_API_KEY`
   - `OPENAI_API_KEY`
   - `ALLOWED_ORIGIN` (your domain)
   - `PORT` (optional, defaults to 3000)

## API Endpoints (Express Server)

- `GET /health` - Health check endpoint
- `POST /api/speech-proxy` - Speech assessment proxy
- `POST /api/chatgpt-proxy` - ChatGPT proxy (supports multiple modes)
- `POST /api/auth-proxy` - Authentication proxy
- `GET /api/pdf-proxy?url=<pdf-url>` - PDF file proxy
- `POST /api/pdf-extract-proxy` - PDF text extraction and processing

## Migration from Netlify

### Update Frontend Code

Replace Netlify function URLs with DigitalOcean API URLs:

**Before (Netlify):**
```javascript
const response = await fetch('/.netlify/functions/speechProxy', { ... });
```

**After (DigitalOcean - Express Server):**
```javascript
const response = await fetch('https://your-api-service.ondigitalocean.app/api/speech-proxy', { ... });
```

**After (DigitalOcean - Functions):**
```javascript
const response = await fetch('https://your-function.workers.digitalocean.com/speechProxy', { ... });
```

## Environment Variables

Make sure to set these in DigitalOcean App Platform or Functions dashboard:

- `LC_API_KEY` - Language Confidence API key
- `OPENAI_API_KEY` - OpenAI API key
- `ALLOWED_ORIGIN` - Your domain for CORS (e.g., `https://exeleratetechnology.com`)
- `PORT` - Server port (only for Express server, defaults to 3000)

## Testing Locally

To test the Express API server locally:

```bash
cd digitalocean
node api-server.js
```

The server will run on `http://localhost:3000`

Test the health endpoint:
```bash
curl http://localhost:3000/health
```

## Node.js Version Requirements

- **Minimum**: Node.js 18.0.0 (required by Express 5.1.0)
- **Recommended**: Node.js 20.x (matches `@types/node` version)
- The project uses ES modules (`"type": "module"`), which requires Node 14.8.0+ but is stable from Node 16+

When deploying to DigitalOcean App Platform, select **Node.js 18** or **Node.js 20** as the runtime version.

## Important Notes

### ⚠️ Common Mistake: Don't Deploy api-server.js as a Function

**If you see this error:**
```
Error [ERR_MODULE_NOT_FOUND]: Cannot find package 'express'
```

**This means you're trying to deploy `api-server.js` as a serverless function, which won't work!**

**Solutions:**
1. **Use App Platform** (Recommended): Deploy `api-server.js` as a **Web Service** component in DigitalOcean App Platform, not Functions
2. **Use Individual Functions**: Deploy the individual functions from `functions/` folder as separate serverless functions

### Other Notes

- The Express server version is recommended for easier deployment and management
- CORS is configured to allow requests from your domain
- All functions maintain the same functionality as the original Netlify functions
- Update `ALLOWED_ORIGIN` environment variable with your actual domain
- Serverless functions don't support npm packages - they must be self-contained
