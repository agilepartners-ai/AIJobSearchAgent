# Self-hosting the LaTeX compiler

**Status: not implemented. This is the escape hatch, written up so it can be executed cold.**

The app compiles LaTeX through [Texapi](https://texapi.ovh) (`src/server/latex/compile/texapi.ts`).
That works and needs no infrastructure. This document covers what to do if it stops being good
enough, and records what we measured so nobody has to rediscover it.

---

## Why you might switch

These are observed behaviours of the live Texapi service, not speculation. Several contradict its
published documentation.

| Issue | Detail |
|---|---|
| **No compile log, ever** | The docs say `outputFiles` carries the log. It is **always `null`**. There is no way to find out *why* a document failed. |
| **Failures are undocumented 422s** | The docs say compile errors return `HTTP 200` with `status: "error"`. Actual: `HTTP 422` `application/problem+json`, no detail. |
| **Rate limiting masquerades as compile failure** | Exceeding 20 req/min returns **422 and 500**, not 429. A hello-world document that returned 200 began returning 422 after ~50 rapid requests, then returned 200 again after a 75-second pause. This is the nastiest one: without the workaround in `texapi.ts`, users get told their resume is broken when the service is merely busy. |
| **The multipart endpoint lies** | `POST /api/latex/compile/file` returned `status: "success"` for a deliberately broken document and served a garbage 20 KB PDF. We do not use it. |
| **Throughput ceiling** | 20 requests/minute per key. Each generation costs 2 compiles, so ~10 generations/minute across all users, before retries. |
| **Data residency** | Resumes contain names, addresses, phone numbers and employment history. They leave your infrastructure. PDFs are retained for 10 minutes. |
| **Single point of failure** | Third-party uptime you do not control and cannot monitor. |

The throughput ceiling is the most likely trigger in practice. The daily cap is 5 generations per
user, so roughly 10 concurrently-generating users will start queueing behind the rate limiter.

---

## What to replace it with: Overleaf CLSI

CLSI (Common LaTeX Service Interface) is the compile server behind Overleaf itself, open-sourced in
the [overleaf/overleaf](https://github.com/overleaf/overleaf) monorepo under `services/clsi`.

**The thing it buys you that Texapi cannot: `outputFiles` includes the `.log`.** That unlocks a real
repair loop — feed the compiler error back to Gemini and let it fix its own LaTeX — instead of the
blind single retry in `generateLatex.ts`.

### API shape

```
POST http://<clsi-host>:3013/project/<project-id>/compile
```

```jsonc
{
  "compile": {
    "options": { "compiler": "pdflatex", "timeout": 60 },
    "rootResourcePath": "main.tex",
    "resources": [
      { "path": "main.tex", "content": "\\documentclass{article}..." }
    ]
  }
}
```

The response carries `status` and an `outputFiles` array of `{ type, url }` — one entry for the PDF,
one for the `.log`. Ports: 3013 REST, 3048 load reports, 3049 HTTP control.

### Building it — read this before you start

The Dockerfile at `services/clsi/Dockerfile` **copies from the monorepo root**: `package.json`,
`yarn.lock`, `.yarnrc.yml` and ten `libraries/*` workspaces. You cannot build it from the `clsi`
directory alone. You must clone the whole repo and build with the repo root as context:

```bash
git clone --depth 1 https://github.com/overleaf/overleaf.git
cd overleaf
docker build -f services/clsi/Dockerfile --target with-texlive -t clsi:local .
```

The `with-texlive` target installs effectively `texlive-full` (minus docs and language packs) plus
inkscape, python3-pygments and qpdf. **Expect a 5–7 GB image and a long first build.** The default
target omits TeX Live entirely and is useless on its own.

### Running it

```yaml
# docker-compose.yml
services:
  clsi:
    image: clsi:local
    ports:
      - "3013:3013"
    environment:
      # Sandboxing spawns sibling containers and needs the Docker socket, which
      # Cloud Run does not provide. Unsandboxed is acceptable here: our LaTeX is
      # generated from a fixed template and passed through sanitize.ts, which
      # rejects \write18, \input, \openout and friends outright.
      SANDBOXED_COMPILES: "false"
      LISTEN_ADDRESS: "0.0.0.0"
      COMPILE_SIZE_LIMIT: "10mb"
    volumes:
      - clsi-cache:/overleaf/services/clsi/cache
      - clsi-compiles:/overleaf/services/clsi/compiles
      - clsi-output:/overleaf/services/clsi/output
volumes:
  clsi-cache:
  clsi-compiles:
  clsi-output:
```

**Deployment target.** Cloud Run will run this, but a 5–7 GB image makes cold starts brutal — budget
`min-instances=1`, which costs money around the clock. A small always-on GCE VM is usually the better
fit. Netlify cannot run it at all, so if you deploy there, Texapi stays the only option for that
environment.

**Security.** `SANDBOXED_COMPILES=false` means `latexmk` runs inside the CLSI container with no
additional isolation. Keep `sanitize.ts` in the pipeline, pass `-no-shell-escape`, never expose port
3013 publicly, and treat the container as compromised-if-reachable.

---

## The code change

Small, because the seam already exists.

1. Add `src/server/latex/compile/clsi.ts` implementing `LatexCompiler` from `./types.ts`. Return the
   `.log` in `CompileResult.log` — that field exists and is unused today precisely for this.
2. Branch in `src/server/latex/compile/index.ts`:

   ```ts
   export function getCompiler(): LatexCompiler {
     if (!instance) {
       instance = process.env.LATEX_COMPILER_PROVIDER === 'clsi'
         ? new ClsiCompiler(process.env.CLSI_URL!)
         : new TexapiCompiler(process.env.TEXAPI_KEY ?? '');
     }
     return instance;
   }
   ```
3. Add `LATEX_COMPILER_PROVIDER` and `CLSI_URL` to `.env.example`.
4. **Then take the win:** in `generateLatex.ts`, catch `LatexCompileError`, and when `error.log` is
   present, append the relevant log lines to the retry prompt. That is the whole point of the
   migration; skipping it means you took on 6 GB of infrastructure for data residency alone.
5. Point the integration tests at the new provider. `texapi.integration.test.ts` is the template —
   the golden-PDF assertions (compile, extract the text layer, check every section and special
   character survived) are provider-agnostic and should be reused verbatim.

---

## Licensing

CLSI is **AGPL-3.0**. Your users interact with the Next.js app, not with CLSI directly, so §13's
network clause is arguably not triggered by running it as an internal backend. But if you *modify*
CLSI, you must make those modifications available. Worth a look from counsel before production —
it is not a blocker for evaluating it.

---

## Alternatives considered

- **`texlive.net` / `latexonline.cc`** — courtesy services run by volunteers, explicitly not intended
  for production traffic. Do not point an app at them.
- **Tectonic** — a single binary that fetches packages on demand. Much smaller than CLSI, but the
  runtime downloads make cold compiles slow and fragile unless you pre-warm the cache into the image.
  A reasonable middle ground if CLSI's size is the blocker and you do not need the log.
- **WebAssembly LaTeX in the browser** (SwiftLaTeX, texlive.js) — no server at all, works on Netlify,
  but a 10–30 MB download per user, slow on mobile, and limited package support would force the
  template to get much plainer.
