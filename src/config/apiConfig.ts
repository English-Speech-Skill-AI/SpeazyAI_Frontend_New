// API Configuration - supports DigitalOcean Functions, Netlify Functions, and local dev

const isLocal = import.meta.env.DEV || window.location.hostname === 'localhost';
const isNetlify = typeof window !== 'undefined' && window.location.hostname.includes('netlify.app');

// DigitalOcean Function URLs (used when deployed to DigitalOcean App Platform)
const DO_BASE = 'https://faas-blr1-8177d592.doserverless.co/api/v1/web/fn-a38d3580-f602-4111-8967-d449fc5ef00e/default';
const DIGITALOCEAN_FUNCTIONS = {
  speechProxy: import.meta.env.VITE_SPEECH_PROXY_URL || `${DO_BASE}/speechProxy`,
  chatgptProxy: import.meta.env.VITE_CHATGPT_PROXY_URL || `${DO_BASE}/chatgptProxy`,
  authProxy: import.meta.env.VITE_AUTH_PROXY_URL || `${DO_BASE}/authProxy`,
  pdfProxy: import.meta.env.VITE_PDF_PROXY_URL || `${DO_BASE}/pdfProxy`,
  pdfExtractProxy: import.meta.env.VITE_PDF_EXTRACT_PROXY_URL || `${DO_BASE}/pdfExtractProxy`,
  supportProxy: import.meta.env.VITE_SUPPORT_PROXY_URL || `${DO_BASE}/supportProxy`,
};

// Local development proxy URLs (if running proxy servers locally)
const LOCAL_PROXIES = {
  speechProxy: 'http://localhost:4000/speechProxy',
  chatgptProxy: 'http://localhost:4001/chatgptProxy',
  authProxy: 'http://localhost:4001/authProxy',
  pdfProxy: 'http://localhost:4001/pdfProxy',
  pdfExtractProxy: 'http://localhost:4001/pdfExtractProxy',
  supportProxy: 'http://localhost:4002/supportProxy',
};

// Netlify function URLs (used when deployed to speazyai.netlify.app)
const NETLIFY_FUNCTIONS = {
  speechProxy: '/.netlify/functions/speechProxy',
  chatgptProxy: '/.netlify/functions/chatgptProxy',
  authProxy: '/.netlify/functions/authProxy',
  pdfProxy: '/.netlify/functions/pdfProxy',
  pdfExtractProxy: '/.netlify/functions/pdfExtractProxy',
  supportProxy: '/.netlify/functions/supportProxy',
};

// Choose which API provider to use
// Set via VITE_API_PROVIDER, or auto-detect:
// - localhost -> 'local'
// - *.netlify.app (e.g. speazyai.netlify.app) -> 'netlify'
// - otherwise -> 'digitalocean'
const API_PROVIDER = (import.meta.env.VITE_API_PROVIDER || (isLocal ? 'local' : (isNetlify ? 'netlify' : 'digitalocean'))) as 'digitalocean' | 'local' | 'netlify';

// Get the appropriate URL based on provider and environment
function getApiUrl(functionName: keyof typeof DIGITALOCEAN_FUNCTIONS): string {
  if (isLocal && API_PROVIDER === 'local') {
    return LOCAL_PROXIES[functionName];
  }
  
  switch (API_PROVIDER) {
    case 'digitalocean':
      return DIGITALOCEAN_FUNCTIONS[functionName];
    case 'local':
      return LOCAL_PROXIES[functionName];
    case 'netlify':
      return NETLIFY_FUNCTIONS[functionName];
    default:
      return DIGITALOCEAN_FUNCTIONS[functionName];
  }
}

// Export API URLs
export const API_URLS = {
  speechProxy: getApiUrl('speechProxy'),
  chatgptProxy: getApiUrl('chatgptProxy'),
  authProxy: getApiUrl('authProxy'),
  pdfProxy: getApiUrl('pdfProxy'),
  pdfExtractProxy: getApiUrl('pdfExtractProxy'),
  supportProxy: getApiUrl('supportProxy'),
};

// Helper function to build speech proxy URL with endpoint query param.
// Caller must pass the correct endpoint (scripted/uk or unscripted/uk) so the proxy forwards to the right Confidence API.
export function getSpeechProxyUrl(endpoint?: string): string {
  const baseUrl = API_URLS.speechProxy;
  if (endpoint) {
    const separator = baseUrl.includes('?') ? '&' : '?';
    return `${baseUrl}${separator}endpoint=${encodeURIComponent(endpoint)}`;
  }
  return baseUrl;
}

// Export provider info for debugging
export const API_CONFIG = {
  provider: API_PROVIDER,
  isLocal,
  urls: API_URLS,
};

// Base URL for direct Exelerate API calls (org, users, reading, ielts, etc.).
// Always use the full API host, same as: curl --location 'https://api.exeleratetechnology.com/api/...' --header 'Authorization: Bearer <token>'
export const getExelerateApiBase = (): string => {
  return 'https://api.exeleratetechnology.com';
};
