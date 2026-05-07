/**
 * Unwraps speech proxy payloads from DigitalOcean (`{ body: string | object }`),
 * Netlify, or other envelopes so callers always receive the assessment JSON object.
 * Local `speechProxyServer.js` returns the assessment directly — this is a no-op pass-through.
 */
export function normalizeSpeechProxyResponse(raw: unknown): Record<string, unknown> {
  if (raw == null || typeof raw !== "object") {
    return {}
  }

  let data = raw as Record<string, unknown>

  if (typeof data.body === "string") {
    try {
      data = JSON.parse(data.body) as Record<string, unknown>
    } catch {
      return raw as Record<string, unknown>
    }
  } else if (data.body != null && typeof data.body === "object") {
    data = data.body as Record<string, unknown>
  } else if (data.data != null && typeof data.data === "object") {
    data = data.data as Record<string, unknown>
  }

  return data
}

/** Parse `fetch` JSON then unwrap proxy envelope (same rules as {@link normalizeSpeechProxyResponse}). */
export async function speechProxyResponseJson(response: Response): Promise<Record<string, unknown>> {
  const raw = await response.json()
  return normalizeSpeechProxyResponse(raw)
}
