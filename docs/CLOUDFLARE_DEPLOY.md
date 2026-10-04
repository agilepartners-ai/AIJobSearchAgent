# Deploying to Cloudflare (free plan)

Runbook for putting the AI Job Search Agent on Cloudflare Workers. The reasoning, measurements and free-plan
limits behind it are in [CLOUDFLARE_MIGRATION_SCOPE.md](./CLOUDFLARE_MIGRATION_SCOPE.md). **Nothing here has been
run against your Cloudflare account yet**; every step marked 👤 needs you, because it needs your login.

```
Browser ─► Cloudflare Worker `ajsa-web`   pages (static, free) + light API ──► Hyperdrive ──► PostgreSQL on the VM
                     │
                     └─ /api/documents/generate, /compile ──► Cloudflare Tunnel ──► `ajsa-generate` on the VM
```

Order matters. Do each stage, run its check, then move on. Nothing changes for users until stage 7.

## 0. What to have ready
- A Cloudflare account that contains the `agilepartners-ai.com` zone (confirm in the dashboard).
- This repo, `pnpm install` done (Wrangler and the adapter are project dependencies, so there is nothing to install globally).
- The CA certificate for the database: `secrets-local/jobsearch-ca.crt` (already on this machine; it is also on the VM at `~/notera/pgconf/ca.crt`).

## 1. 👤 Sign in to Cloudflare
```bash
pnpm exec wrangler login
pnpm exec wrangler whoami        # shows the account and the zones you can use
```

## 2. 👤 Database through Hyperdrive
Hyperdrive pools connections to PostgreSQL and verifies the server certificate against our private CA, which a
Worker cannot do on its own. It is free (100,000 queries/day).
```bash
pnpm exec wrangler cert upload certificate-authority --ca-cert secrets-local/jobsearch-ca.crt --name jobsearch-ca
# note the CA id it prints, then:
pnpm exec wrangler hyperdrive create ajsa-db \
  --connection-string="postgres://jobsearch_app:<password>@35.238.183.204:5432/jobsearch" \
  --ca-certificate-id <CA id> --sslmode verify-full
```
Paste the printed Hyperdrive id into `wrangler.jsonc` (`REPLACE_WITH_HYPERDRIVE_ID`). The CA bundle must contain a single
certificate (ours does).

Later hardening (optional): Hyperdrive can reach a private database through a Cloudflare Tunnel, which would let you
close port 5432 on the VM entirely. See Cloudflare's "Connect to a private database using Tunnel" guide.

## 3. 👤 The generation service on the VM, behind a tunnel
1. Cloudflare dashboard → **Zero Trust → Networks → Tunnels → Create a tunnel** (Cloudflared). Copy the connector token.
2. Add a published application: hostname `gen.agilepartners-ai.com` → service `http://ajsa-generate:3000`.
3. Build and ship the image (on a machine with RAM to spare, not the 2 GB VM). The command is in `deploy/vm/Dockerfile`.
4. On the VM:
   ```bash
   mkdir -p ~/ajsa && cd ~/ajsa
   # copy deploy/vm/docker-compose.cloudflare.yml and ajsa.env.example here
   cp ajsa.env.example ajsa.env && chmod 600 ajsa.env      # fill in the values
   echo "TUNNEL_TOKEN=<token>" > cloudflared.env && chmod 600 cloudflared.env
   cd ~/notera && sudo docker compose -f docker-compose.prod.yml -f ~/ajsa/docker-compose.cloudflare.yml up -d ajsa-generate cloudflared
   ```
5. **Check:** `curl https://gen.agilepartners-ai.com/api/health` → `{"ok":true,"runtime":"node"}`.

`DOCUMENT_SIGNING_SECRET` must be **identical** on the VM (`ajsa.env`) and on the Worker (step 4), because the VM signs
document links and the Worker serves and verifies them.

## 4. 👤 Deploy the Worker (preview URL first)
Secrets (never in files):
```bash
pnpm exec wrangler secret put DOCUMENT_SIGNING_SECRET
pnpm exec wrangler secret put TAVUS_API_KEY            # AI mock interviews
```
Set `GENERATE_ORIGIN` to `https://gen.agilepartners-ai.com` in `wrangler.jsonc` (`vars`).

`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are inlined at **build** time. For a local deploy they come
from `.env.local`; in Workers Builds add them as build variables. Then:
```bash
pnpm cf:deploy                  # builds with the adapter and deploys to <name>.<account>.workers.dev
```
Building on Windows is not supported by the adapter. Use WSL, or let Workers Builds do it: Dashboard → Workers & Pages →
ajsa-web → Settings → Builds → connect the GitHub repo, build command `pnpm exec opennextjs-cloudflare build`, deploy
command `pnpm exec wrangler deploy`, root `/`.

**Check the preview URL** (replace the host):
```bash
curl https://ajsa-web.<account>.workers.dev/api/health              # {"ok":true,"runtime":"workers"}
curl 'https://ajsa-web.<account>.workers.dev/api/health?db=1'       # {"ok":true,...,"db":true}  (Hyperdrive works)
curl -I https://ajsa-web.<account>.workers.dev/resume-tailoring     # 200, security headers present
```
Then, in a browser: sign in, add an application, tailor a résumé (this goes through the tunnel), open the PDF preview.
`pnpm exec wrangler tail ajsa-web` streams live logs while you test.

## 5. 👤 Supabase
Authentication → URL Configuration: Site URL `https://agilepartners-ai.com`, redirect URLs
`https://agilepartners-ai.com/**` (already set), plus the `workers.dev` preview URL while testing. Google OAuth origins and the
callback are unchanged.

## 6. 👤 Cloudflare dashboard settings (free plan)
**AI crawlers: do this first, it decides whether ChatGPT-style search can see the site at all.**
New zones block AI crawlers by default, before `robots.txt` is read.
- Security → Bots (or **AI Crawl Control**): allow the retrieval and answer bots in our policy
  (OAI-SearchBot, ChatGPT-User, PerplexityBot, Perplexity-User, Claude-SearchBot, Claude-User, Googlebot, Bingbot,
  Applebot). Leave the training crawlers blocked (GPTBot, ClaudeBot, CCBot, Bytespider, Meta-ExternalAgent, ...).
- If the dashboard offers to manage `robots.txt` for you, turn that off: we ship our own (`public/robots.txt`).
- Check afterwards: `curl -A "OAI-SearchBot" -I https://agilepartners-ai.com/` must return 200, not 403.

Speed and safety: Always Use HTTPS **on**; Brotli **on**; HTTP/3 **on**; Early Hints **on**; Crawler Hints **on**;
Auto Minify **off** and Rocket Loader **off** (both can break React hydration).

Rate limiting (free plan: **one** rule, 10-second window, per IP). Use it on the expensive routes:
`(starts_with(http.request.uri.path, "/api/documents/generate")) or (starts_with(http.request.uri.path, "/api/interview"))`
→ 5 requests per 10 seconds, action Block. Daily per-account limits are enforced separately in the database.

## 7. 👤 Go live
1. Workers & Pages → ajsa-web → Settings → Domains & Routes → **Add → Custom domain** → `agilepartners-ai.com` (and `www`).
   Cloudflare switches the DNS record to the Worker; remove the old Netlify record first if it conflicts.
2. Add a redirect rule `www.agilepartners-ai.com/*` → `https://agilepartners-ai.com/$1` (301) so there is one canonical host.
3. Repeat the stage 4 checks on the real domain.
4. Keep the Netlify site untouched for a week. Rollback is switching the DNS record back.

## 8. 👤 Keep-alive and health checks
```bash
# put the real anon key in workers/keepalive/wrangler.jsonc (it is public by design), set GENERATE_ORIGIN, then:
pnpm exec wrangler deploy --config workers/keepalive/wrangler.jsonc
```
It runs daily at 06:17 UTC: keeps the free Supabase project from pausing, and checks the site, the database path and the
generation service. Open its URL any time to run the same checks. Add a Cloudflare Notification for failed Worker
invocations to get an email when one fails.

## 9. 👤 Search engines
- Google Search Console and Bing Webmaster Tools: add the domain, submit `https://agilepartners-ai.com/sitemap.xml`.
- Request indexing for `/`, `/resume-tailoring` and `/ats-resume-builder`.
- Crawler Hints (stage 6) already tells Bing and others when pages change.

## 10. Cleaning up what this replaces
Once stable for a week: delete the Netlify site, and `netlify.toml` and `ci-cd-cloudrun/` can go.

## Troubleshooting
| Symptom | Cause |
|---|---|
| `/api/health?db=1` → 503 on the Worker | Hyperdrive id missing in `wrangler.jsonc`, wrong password, or the VM firewall closed 5432 |
| Generate answers 503 "not available" | `GENERATE_ORIGIN` not set on the Worker (intentional safe default) |
| Generate answers 502 | The tunnel or `ajsa-generate` is down: `docker ps` on the VM, check `cloudflared` logs |
| PDF preview blank | `DOCUMENT_SIGNING_SECRET` differs between VM and Worker |
| 401 on every API call | `NEXT_PUBLIC_SUPABASE_URL` baked into the build points at a different project |
| `Exceeded CPU limit` (error 1102) in `wrangler tail` | A route does more than ~10 ms of work on the Worker: move it behind the proxy like generation |
| AI search never cites the site | The AI-crawler block from stage 6 is still on |
