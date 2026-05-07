# Speech provider rollout (Language Confidence vs Azure)

The app supports two speech-assessment backends. Switching between them is done by **changing which proxy URL the frontend hits**, not a server-side env flag. Each provider lives in its own dedicated function and is independently deployable.

| Provider | Function | Implementation |
|----------|----------|----------------|
| Language Confidence (current) | [`digitalocean/functions/speechProxy.js`](../digitalocean/functions/speechProxy.js), [`netlify/functions/speechProxy.js`](../netlify/functions/speechProxy.js) | Forwards to LC. |
| Azure Speech | [`digitalocean/functions/azureSpeechProxy.js`](../digitalocean/functions/azureSpeechProxy.js) | Calls **Azure Speech REST API** directly. Single self-contained file. No SDK or ffmpeg. |

The frontend chooses which one to hit via `VITE_SPEECH_PROXY_FUNCTION` / `VITE_SPEECH_PROXY_URL` (see [`src/config/apiConfig.ts`](../src/config/apiConfig.ts)).

## Environment variables

### Language Confidence proxy

| Variable | Purpose |
|----------|---------|
| `LC_API_KEY` / `SPEECH_API_KEY` | LC upstream key |

### Azure Speech proxy

| Variable | Notes |
|----------|-------|
| `SPEECH_KEY` (or aliases `AZURE_SPEECH_KEY`, `Key`) | Azure Cognitive Services subscription key |
| `SPEECH_REGION` (or aliases `AZURE_SPEECH_REGION`, `AZURE_REGION`, `Region`) | Region short name, e.g. `eastus2`. Must match the key's region. |
| `AZURE_SPEECH_LANGUAGE` | optional, default `en-US` |
| `AZURE_SPEECH_PROXY_VERBOSE_LOGGING` | set `false` to silence the per-response `console.log` |

## DigitalOcean function settings for `azureSpeechProxy`

- **Timeout:** ≥ 30 s. The DO default of 1 s will fail every time (Azure + cold-start typically takes 1–4 s).
- **Memory:** 256 MB is enough; 512 MB is comfortable.
- **Web Function:** enabled.
- **Source:** paste [`digitalocean/functions/azureSpeechProxy.js`](../digitalocean/functions/azureSpeechProxy.js) directly. No `npm install`, no `node_modules`, no `project.yml`.

## Frontend switching

| Setting in `.env` | Effect |
|-------------------|--------|
| (default, unset) | Hits `speechProxy` (Language Confidence) |
| `VITE_SPEECH_PROXY_FUNCTION=azure` | Hits `azureSpeechProxy` on the same DO namespace |
| `VITE_SPEECH_PROXY_URL=https://…/azureSpeechProxy` | Explicit override |

Local dev: `npm run proxy:speech` exposes both `POST /speechProxy` and `POST /azureSpeechProxy` (plus `GET /azureSpeechProxy?mode=info`) on `http://localhost:4000`. Set `VITE_API_PROVIDER=local` in `.env.local` to point the app at it.

## Rollout — staged

1. **Phase A — Postman.** Get the four Postman tests passing against the deployed `azureSpeechProxy` URL. See [postman/README-Azure-Speech-Proxy.md](../postman/README-Azure-Speech-Proxy.md).
2. **Phase B — Local frontend.** Set `VITE_SPEECH_PROXY_FUNCTION=azure` in `.env.local`, run the app, record on the speech / reading / speaking / IELTS pages, and confirm scores render. Compare to LC.
3. **Phase C — Production switch.** Set the same env in your production build env. LC stays deployed.
4. **Phase D — Retire LC** when you're confident.

## Rollback

Unset (or change) `VITE_SPEECH_PROXY_FUNCTION` / `VITE_SPEECH_PROXY_URL` and redeploy the frontend. No backend change required, no code change.

## Validation checklist

After enabling Azure in staging:

1. Scripted passage (chapter / lesson): scores, transcript, word breakdown, reading-style metrics.
2. Unscripted (custom content, IELTS speaking evaluation): transcript + ChatGPT IELTS scoring receives fluency/pronunciation/overall numbers.
3. Practice single-word pronunciation on results pages.
4. Save-result flows still accept payloads (mock IELTS/CEFR/PTE predictions are `null` from Azure — UI shows `-`, that's fine).

See [speech-assessment-lc-contract.md](./speech-assessment-lc-contract.md) for the JSON shape both proxies preserve.
