# AI pipeline: cost, keys, per-account memory

How a generation runs, what it costs, and how to operate it with many users.

## Flow

```
POST /api/documents/generate
  1. verify Supabase access token                → user id
  2. acquireGenerationSlot(uid)               one in flight per user; global cap, short queue
  3. reserveGeneration(uid)                   daily quota, atomic (refunded on failure)
  4. prepareContext()   [RAG, optional]       embed + remember résumé & job; trim; pull facts
  5. generateDocuments()                      ONE model call → analysis + résumé + cover letter
  6. compile PDFs (Texapi)                    outage → LaTeX only, not a failure
  7. upload PDFs (Storage, 20 s cap)          outage → no saved links, not a failure
  8. saveGeneratedResume()                    Studio document written server-side
  9. respond { resumeId, analysis, … }        client opens /dashboard?view=resumes&resume=…&new=1
recordUsage()  runs alongside, best effort   tokens (+ cost if priced) per user and per model
```

Steps 4, 6 and 7 are enhancements: each has a fallback that returns a usable
result. Only a bad document (compile 422), a rejected prompt, or exhausted
quota fails a generation.

## Keys and rotation

**Gemini: one paid key is the normal setup** (`GEMINI_API_KEY`); it has the quota for
many users, so it needs no rotation. `GEMINI_API_KEYS` still exists if you ever want several.

**NVIDIA embeddings are where rotation matters.** Set `NVIDIA_API_KEYS=k1,k2,k3,k4`
(comma / space / newline separated); calls rotate across them.

`src/server/ai/keyPool.ts`:

- **Round-robin** over keys that are not benched, starting at a random offset so
  several instances do not all begin on key #1.
- **429** benches that key (the server's `Retry-After` / `retryDelay` if given,
  else 30 s doubling to 10 min) and the request moves to the next key **without
  sleeping**.
- **401/403** benches for 15 min; **5xx** for 3 s with jittered backoff.
- If every key is benched it waits for the earliest (≤ 20 s), else reports "busy".
- Logs and diagnostics use `#2…a1b2` (position + last four); secrets never leave the module.

Use one key per Google project so their quotas are independent. State is per
server instance, which is fine: a limit is discovered once per instance.

## Debugging one generation

Every generation has a **request id**, created in the browser and sent with the
request. The same id is on every line in both consoles and in any error shown
to the user as `(ref abc123)`. Search the terminal for it.

Server (`[generate rid=<id>] +<ms> <stage>`), in order:

| Stage | Meaning | If it is missing or slow |
|---|---|---|
| `received` | Request arrived (sizes only, never résumé text) | Never reached the server: browser or network |
| `authenticated` | ID token verified | 401: user signed out or token expired |
| `idempotent-hit` | This id already produced a résumé; returned it | Working as intended on a retry or reload |
| `slot-acquired` / `quota-reserved` | Concurrency slot and daily quota | 429 "already running" / "busy" / daily limit |
| `rag` | Embedding stats; `mode:"plain"` + `reason` when it stood down | `reason` says why (no key, timeout, error) |
| `llm` | Model, tokens, which key, match score | Gemini error follows as `failed` |
| `studio-saved` | **The résumé exists.** Retried once | `studio-save-failed` with the schema issues |
| `compile` / `storage` | PDFs and saved links (optional) | `ok:false` with a note; never fatal |
| `responding` / `done` | Response sent | |
| `failed` | Any exception: class, message, first stack frames, whether quota was refunded | |

Browser (`[flow rid=<id>] <step>`): `client:submit`, `client:response` (status, ms),
`client:parsed`, `modal:handoff`, `studio:open-resume`, `studio:resume-loaded`
(or `-missing` / `-error`), and on a reload `recover:start` → `recover:found`.
In the console run `copyFlowLog()` to copy the last 300 lines for a bug report.

**First request after a server start is slower** (~3-5 s): the database connection and NVIDIA
open their connections lazily. The `slot-acquired` and `quota-reserved` timings show it.

### What survives a failure

- **Browser reloads mid-generation** (a refresh, a dev hot-reload): the server still
  finishes and saves the résumé. The dashboard finds it by request id on reload and
  opens it (`recover:*`); it does not need to be generated again.
- **The same request sent twice** (retry, double submit): returns the first résumé
  (`idempotent-hit`); no second model call, no second quota charge.
- **Stored documents that no longer validate** are repaired when read
  (`healResume`) rather than silently dropped.

## Cost levers (in order of impact)

| Lever | Where | Effect |
|---|---|---|
| Lite model by default (`gemini-flash-lite-latest`) | `gemini.ts` | Lowest per-token price. Measured on a real résumé: 1 call, 1,718 in / 861 out tokens, 6.8 s, valid output |
| One call for three outputs | `generateLatex.ts` | No per-document overhead |
| Static prompt in `systemInstruction` | `gemini.ts` | Byte-stable prefix Gemini can cache (`cachedTokens` is recorded) |
| Thinking off, tried down a ladder | `gemini.ts` | `thinkingLevel: minimal` → `thinkingBudget: 0` → none; remembered per model |
| Output cap (16,384) | `gemini.ts` | Bounds a runaway; real output is 1–4k |
| Job description trimmed | `condense.ts` | Drops EEO boilerplate and page chrome; 8k cap |
| Long résumés compressed by relevance | `rag/context.ts` | Sends the header + chunks most relevant to the job |
| Identical text never re-embedded | `rag/context.ts` | Content-hash ids; re-tailoring costs one query embed |
| One generation per user at a time | `limiter.ts` | A double-click cannot become two paid calls |

Compression triggers only above `RAG_COMPRESS_ABOVE_CHARS` (7,000). A typical
one-to-two-page résumé is sent whole: it is small, and cutting it would risk
dropping something true.

## Per-account memory (RAG)

Every résumé and job description an account submits is embedded once with
`nvidia/nemotron-3-embed-1b` and stored under that account:

```
users/{uid}/ragResumes/{r_<sha1>}   users/{uid}/ragJobs/{j_<sha1>}
   { kind, label, model, createdAt, chunks: [{ t: text, v: int8-base64, s: scale }] }
```

- **Isolation:** every read and write is namespaced by `uid`; there is no shared
  index. A test asserts one account never sees another's résumé.
- **One document per source**, not per chunk, so a retrieval is a handful of
  reads. Vectors are int8-quantised (~4× smaller; cosine loss < 0.1 %).
- **Scoring is in memory.** An account holds tens of chunks; a scan beats an index.
  `VectorStore` (`rag/store.ts`) is the seam for pgvector or
  pgvector if accounts ever reach thousands.
- **Supplement:** relevant facts from the account's *other* résumés that the
  current one does not already say (deduped chunk-wise **and** line-wise) are
  added to the prompt, under the same no-invention rule.
- **Retention:** newest 20 résumés and 40 jobs per account (`RAG_KEEP_*`).
- **Off switch:** no NVIDIA key, `RAG_ENABLED=false`, an outage, or a 12 s
  timeout all fall back to the plain résumé. RAG never blocks a generation.

**Tune before trusting the defaults.** `RAG_MIN_SCORE` (0.4) and
`RAG_DUPLICATE_SCORE` (0.9) depend on the embedding model's score distribution
and were **not** calibrated against real résumés here. Log a week of
`[documents/generate] {"rag":…}` lines and adjust.

**Privacy.** Résumé text is sent to Google (generation) and NVIDIA (embeddings),
and to Texapi (compile). Say so in your privacy policy. Deleting an account
should delete `ragResumes`, `ragJobs` and `resumes` under `users/{uid}`.

## Observability

- Per request: one `[documents/generate]` log with RAG stats (chars in/out, chunks
  embedded, sources reused, supplement size, ms), call count and the key ids used.
- Per user per day: `users/{uid}/usage/{YYYY-MM-DD}` — `total_generations`,
  `llm_calls`, `prompt_tokens`, `output_tokens`, `cached_tokens`, `rag_generations`,
  `rag_chars_saved`, and `cost_usd` when prices are set.
- Whole app per day: `system/usage_{YYYY-MM-DD}` with a `by_model` breakdown.
- Set `GEMINI_PRICE_INPUT_PER_M` / `GEMINI_PRICE_OUTPUT_PER_M` (and optionally
  `…_CACHED_PER_M`) to record dollars. They are not hard-coded because they change.

`pnpm check:env` tests **each** key in both pools and the embedding model.

## Failure modes

| Situation | Behaviour |
|---|---|
| One Gemini key rate-limited | That key benched; request moves to another immediately |
| All keys limited | Waits ≤ 20 s for the earliest; else a clear "busy" error, quota refunded |
| User double-clicks Generate | Second request answered 429 "already running" |
| Many users at once | Beyond `GEN_MAX_CONCURRENCY` they queue ≤ `GEN_QUEUE_WAIT_MS`, then "busy" |
| NVIDIA down / no key | Plain generation, no RAG |
| Texapi down | LaTeX returned; Studio renders it; PDF on demand later |
| Storage down / slow | Result returned without saved links |
| Studio save fails | Old results screen shown with an explanation; nothing lost |

## Known limits

- Concurrency limits and key health are **per server instance**; the daily quota
  is the durable, cross-instance limit.
- Thresholds for retrieval are uncalibrated (above).
- The model id `nemotron-3-embed-1b` is taken from NVIDIA's public model list; its
  `input_type` handling is defensive (retried without the field if rejected), but
  it has **not** been run against a real NVIDIA key from here.

## The AI loader

While a résumé is generated the screen goes fully dark and shows one large
thinking orb in the centre, with the status lines at the bottom centre
(`src/components/ai/AiThinkingScreen.tsx`). The orb changes with the stage:
listening → searching → working → composing → solving → weaving, then a
"still working" state on a long wait. There is no percentage on purpose: the
server request has no progress events, so a number would be invented.

- **Orbs** come from [`thinking-orbs`](https://www.npmjs.com/package/thinking-orbs)
  (MIT, © Jakub Antalik). Its component only supports 20/32/64 px and CSS-scaling
  blurs it, so `LargeOrb.tsx` drives the package's own engine at any size, with
  per-mode dot density tuned for large sizes (`COUNT_EXPONENT`).
- **Cost:** at 520 px every orb paints 90-5,300 canvas calls a frame. The
  `working` orb used to paint 34,000 (about 21 ms a frame, over the 16.7 ms
  budget) until its density was retuned.
- **Modes:** `generating`, `opening` (hand-off to the Studio) and `recovering`
  (connection dropped; looking for the résumé the server is still finishing).
- **Robustness:** portal on `<body>`, page scroll locked, app root `inert` so
  focus cannot reach what is behind it, `prefers-reduced-motion` respected,
  paused while the tab is hidden, lazy-loaded (not in the dashboard's first load).
- **Previews (development only):** `/dev/ai-loader`, `/dev/orbs`.
