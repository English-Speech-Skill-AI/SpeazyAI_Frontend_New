// API Configuration - supports DigitalOcean Functions, Netlify Functions, and local dev

/** True only when running the Vite dev server or opening the app from this machine (not a deployed site). */
const isLocal =
  import.meta.env.DEV ||
  (typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'));
const isNetlify = typeof window !== 'undefined' && window.location.hostname.includes('netlify.app');

// DigitalOcean Function URLs (used when deployed to DigitalOcean App Platform)
const DO_BASE = 'https://faas-blr1-8177d592.doserverless.co/api/v1/web/fn-a38d3580-f602-4111-8967-d449fc5ef00e/default';
// Optional: VITE_SPEECH_PROXY_FUNCTION=azure uses dedicated DO function `azureSpeechProxy` (Azure-only). Override URL entirely with VITE_SPEECH_PROXY_URL.
const DO_SPEECH_PATH =
  import.meta.env.VITE_SPEECH_PROXY_FUNCTION === 'azure' ? '/azureSpeechProxy' : '/speechProxy';
const DO_SPEECH_PROXY_FALLBACK = `${DO_BASE}${DO_SPEECH_PATH}`;

/** Production builds sometimes ship with dev .env (VITE_SPEECH_PROXY_URL=http://localhost:4000/...). Never use that from a real site. */
function sanitizeSpeechProxyUrlForOrigin(candidate: string, fallback: string): string {
  const s = String(candidate).trim();
  if (!s) return fallback;
  try {
    const u = new URL(s);
    const loopback = u.hostname === 'localhost' || u.hostname === '127.0.0.1';
    if (loopback && !isLocal) return fallback;
    return s;
  } catch {
    if (!isLocal && /localhost|127\.0\.0\.1/.test(s)) return fallback;
    return s;
  }
}

const DIGITALOCEAN_FUNCTIONS = {
  speechProxy: sanitizeSpeechProxyUrlForOrigin(
    import.meta.env.VITE_SPEECH_PROXY_URL || DO_SPEECH_PROXY_FALLBACK,
    DO_SPEECH_PROXY_FALLBACK,
  ),
  chatgptProxy: import.meta.env.VITE_CHATGPT_PROXY_URL || `${DO_BASE}/chatgptProxy`,
  authProxy: import.meta.env.VITE_AUTH_PROXY_URL || `${DO_BASE}/authProxy`,
  pdfProxy: import.meta.env.VITE_PDF_PROXY_URL || `${DO_BASE}/pdfProxy`,
  pdfExtractProxy: import.meta.env.VITE_PDF_EXTRACT_PROXY_URL || `${DO_BASE}/pdfExtractProxy`,
  supportProxy: import.meta.env.VITE_SUPPORT_PROXY_URL || `${DO_BASE}/supportProxy`,
  uploadPdfProxy: import.meta.env.VITE_UPLOAD_PDF_PROXY_URL || `${DO_BASE}/uploadPdfProxy`,
};

// Local development proxy URLs (if running proxy servers locally)
const LOCAL_PROXIES = {
  speechProxy:
    import.meta.env.VITE_SPEECH_PROXY_FUNCTION === 'azure'
      ? 'http://localhost:4000/azureSpeechProxy'
      : 'http://localhost:4000/speechProxy',
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

// Always use DigitalOcean proxy (including when on localhost).
// Override with VITE_API_PROVIDER=local or netlify if needed.
const API_PROVIDER = (import.meta.env.VITE_API_PROVIDER || 'digitalocean') as 'digitalocean' | 'local' | 'netlify';

// Get the appropriate URL based on provider and environment
function getApiUrl(functionName: keyof typeof DIGITALOCEAN_FUNCTIONS): string {
  // Only hit localhost proxies when we are actually on dev/localhost. A production build
  // must never call localhost even if VITE_API_PROVIDER=local was mistakenly set at build time.
  if (API_PROVIDER === 'local' && isLocal) {
    return LOCAL_PROXIES[functionName];
  }

  switch (API_PROVIDER) {
    case 'digitalocean':
      return DIGITALOCEAN_FUNCTIONS[functionName];
    case 'local':
      return DIGITALOCEAN_FUNCTIONS[functionName];
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

// Base URL for direct API calls (org, users, reading, ielts, etc.).
export const getExelerateApiBase = (): string => {
  return 'https://api.intelliviq.com';
};

// Upload PDF - use direct API. Backend (api.intelliviq.com/upload-pdf) must allow CORS for your origin.
// Serverless proxies (Netlify, DigitalOcean) have ~6MB request limits causing 413 for larger PDFs.
export const getUploadPdfUrl = (): string => {
  return `${getExelerateApiBase()}/upload-pdf`;
};
