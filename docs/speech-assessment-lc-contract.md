# Speech assessment JSON contract (LC-shaped)

The React app and `save-result` APIs expect assessment payloads shaped like **Language Confidence** responses. Alternative providers (e.g. Azure) should **adapt** into this shape so UI and persistence stay stable.

## Top-level keys

| Key | Used for |
|-----|-----------|
| `pronunciation` | Scores, expected/reference text, per-word scores, phonemes |
| `fluency` | Overall score, `metrics` (speech rate, pauses, fillers), `feedback` |
| `overall` | `overall_score`, `english_proficiency_scores` (mock IELTS / CEFR / PTE) |
| `reading` | Passage metrics: completion, accuracy, WPM, timings, word counts |
| `vocabulary` | Tab content (often supplemented by ChatGPT in UI) |
| `grammar` | Tab content (LC fields + ChatGPT fallbacks in UI) |
| `warnings` | Display warnings |
| `metadata` | **`predicted_text`** (required for grammar/vocab/verification flows), `content_relevance` |
| `error` | If set, results pages redirect away |

## Pronunciation

- `pronunciation.overall_score` — number (0–100).
- `pronunciation.expected_text` — reference/script text for scripted tasks (used with `metadata.predicted_text` for ChatGPT word-breakdown).
- `pronunciation.words[]` — `{ word_text, word_score, phonemes?: [{ phoneme, phoneme_score, ... }] }`.

## Fluency

- `fluency.overall_score` — number.
- `fluency.metrics.speech_rate`, `pauses`, `filler_words` — displayed in results tabs (may be `null` if unknown).
- `fluency.feedback` — object iterated in UI; empty `{}` is fine.

## Overall

- `overall.overall_score` — number.
- `overall.english_proficiency_scores.mock_ielts.prediction`, `mock_cefr.prediction`, `mock_pte.prediction` — optional; UI shows `-` when missing.

## Reading

Used heavily for **scripted** passage reading. Typical fields:

- `completion`, `accuracy` — 0–1 or percent (UI normalizes).
- `total_time` / `reading_time`, `words_read`, `speed_wpm_correct` / `speed_wpm`, etc.

## Metadata & save-result

- **`metadata.predicted_text`** — transcript; drives vocabulary suggestions, grammar tab, IELTS ChatGPT scoring.
- **`metadata.content_relevance`** — persisted (e.g. `save-result.php`); use `0` if not computed.

### Speaking save (`SpeechAssessmentResultsPage`, `SpeakingAssessmentResultsPage`)

Maps `apiResponse.*` into `result.pronunciation|fluency|grammar|overall|reading|metadata` (see page source).

### Reading save (`ReadingAssessmentResultsPage`)

Similar flattening with `reading.completion` / `reading.accuracy` as 0–1.

## IELTS batch evaluation compatibility

`IELTSSpeakingTaskView` `evaluateWithChatGPT` reads **both**:

- Nested LC shape: `speechAssessmentResult.fluency`, `pronunciation`, etc.
- Legacy flat keys: `fluency_score`, `pronunciation_score`, `overall_score`, `word_scores`

Adapters should set nested scores correctly and may also set flat aliases for robustness.

## Proxy response envelope

Clients must normalize:

- **DigitalOcean / Netlify**: `{ statusCode, body: "<JSON string>" }` or `{ body: object }`.
- **Local `speechProxyServer`**: raw assessment JSON.

Use `normalizeSpeechProxyResponse` from `@/utils/normalizeSpeechProxyResponse`.
