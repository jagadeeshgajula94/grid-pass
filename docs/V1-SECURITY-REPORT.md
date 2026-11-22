# V1 security and performance report

Local audit: 2026-11-22, `feat/route-corridor-planner`, Node 24.22.3,
Next.js 15.5.29. This is code review, automated scanning and local production-mode
verification, not an external penetration test or production certification.

## Findings and changes

- Public Nominatim is used only for explicit searches (`mode=search`), never
  typing/autocomplete. The default validated mode is local landmarks only.
  Explicit searches await the next one-second global slot (maximum 1.5-second
  wait); excess queue demand returns uncached 503 with Retry-After, not an empty
  search result. Successful explicit results remain cached for 24 hours.

- **Bound auth input before parsing.** Login/register previously called
  `request.json()` without a byte bound. `src/lib/request-body.ts` now shares the
  corridor parser's streamed 4 KiB limit; declared and actual sizes are checked
  before Zod validation. `tests/auth-routes.test.ts` covers oversized bodies and
  declared sizes; existing normal, empty and malformed cases remain covered.
- **Remove Host-derived CSRF trust.** `src/lib/origin-check.ts` previously accepted
  a matching caller-supplied Host, even across schemes. Only the configured exact
  HTTP(S) origin now grants trust. `src/lib/env.ts` rejects credentials, paths and
  non-HTTP(S) app URLs. Regression evidence: `tests/auth-security.test.ts`,
  `tests/request-validation.test.ts`, `tests/env.test.ts`; a production request
  supplying matching attacker Host/Origin returned 403.
- **Make proxy trust opt-in.** Forwarded IP headers previously controlled limiter
  identity unconditionally. `src/lib/client-ip.ts` now ignores them unless
  `TRUST_PROXY_HEADERS=true`; its startup value is validated. Tests rotate forged
  IPs and still reach 429; trusted-proxy mode retains bounded IPv4/IPv6 parsing
  and endpoint limits. `.env.example` documents the setting.
- Corridor markers now reuse nearby mode's Supercluster index and marker
  lifecycle. Low-zoom pins collapse to stop counts; clicking expands the cluster.
  Stop numbers are assigned before viewport filtering, preserving list numbering
  and selection. Tests cover expansion, reclustering, reordering and empty cleanup.

## Reviewed surface and OWASP Top 10 evidence

Every route under `src/app/api` was reviewed: POST auth login/register/logout,
GET auth/me, GET stations/nearby, GET geocode/search, POST routes/corridor and GET
health. Only health and login/register are intentionally public. Logout is
idempotent and revokes any supplied valid session. Health exposes only status.
Protected handlers check active server-side sessions; middleware's page JWT check
is not the authorization boundary. Unsupported methods are framework-rejected.

| OWASP 2021                | Verified controls and file evidence                                                                                                                                                                                                                                                                          | Remaining boundary                                                                                                                 |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| A01 Access control        | `api-http.ts`, `auth.service.ts`, `session.service.ts`: active session and owner match; strict DTOs. `middleware-security.ts`, `origin-check.ts`: CSRF on mutating API methods. Route/auth tests cover 401, tampering, revocation and CSRF.                                                                  | No V2 roles/resources exist yet. Set the exact HTTPS `NEXT_PUBLIC_APP_URL` when deploying.                                         |
| A02 Cryptography          | `password.service.ts`: Argon2id, 19,456 KiB, two iterations, one lane; dummy-hash unknown-user verification. `session-token.ts`: HS256, issuer/audience/required claims, bounded token syntax. `env.ts`: required signing secret, safe startup errors.                                                       | TLS termination, signing-key storage/rotation and encryption at rest need deployment controls.                                     |
| A03 Injection             | Strict `validation/*.schema.ts`; duplicate-query rejection in HTTP helpers; bounded JSON. UI uses React text/portals and fixed-origin numeric navigation URLs, not HTML popups/eval. `user.repository.ts`/`session.repository.ts` use Maps, not concatenated SQL.                                            | A real database must use parameterized queries; no SQL backend was tested.                                                         |
| A04 Insecure design       | `rate-limit.ts`, `sliding-window-limiter.ts`, `ttl-cache.ts`: bounded limiter/cache state. `route.service.ts`: flagged fallback, bounded candidates and geometry. Mock seeding is disabled in production (`db/mock-store.ts`).                                                                               | Process-local state is not durable/distributed; no financial functionality is implemented.                                         |
| A05 Misconfiguration      | `middleware.ts`, `next.config.ts`: nonce script/style CSP, frame-ancestors none, object-src none, DENY, nosniff, restrictive referrer policy, production HSTS. Production HTTP probes below verified headers.                                                                                                | Development deliberately permits React Refresh eval and inline styles. Trusted ingress and HTTPS remain operator responsibilities. |
| A06 Vulnerable components | `package-lock.json`, pinned CI action SHAs and scanner versions in `.github/workflows/ci-security.yml`; npm audit and SAST results below.                                                                                                                                                                    | Point-in-time results, not proof of absence of vulnerabilities.                                                                    |
| A07 Authentication        | `session.service.ts`: fresh session per authentication, previous-token revocation and logout invalidation. HttpOnly, SameSite=Lax, host-only cookie; Secure in production. Auth 5/15-minute route/IP buckets plus general API limit. Auth route/security/unit tests cover these.                             | Signup deliberately returns 409 for duplicate email; distributed credential stuffing requires ingress controls.                    |
| A08 Integrity             | Upstream schemas in `validation/`, allowlisted DTO mapping in repositories, client response schemas in `stations-client.ts`/`route-client.ts`, lockfile and pinned CI actions.                                                                                                                               | Public providers supply untrusted, approximate data, not authenticated settlement records. No signed CDR/payment ingestion exists. |
| A09 Logging               | `logger.ts`: structured events and recursive key redaction; auth/API helpers log safe statuses/errors without bodies, cookies, search text or coordinates. Redaction tests in `auth-unit.test.ts`.                                                                                                           | Central collection, alerting, retention and incident response are not deployed.                                                    |
| A10 SSRF                  | `upstream-fetch.ts`: exact three-host HTTPS allowlist, no credentials/nondefault ports/redirects, bounded 2 MiB streamed responses, abort signals. OSRM/Nominatim/OCM repositories build fixed-origin URLs and validate responses. `upstream-fetch.test.ts` covers rejected targets/redirects/size failures. | Egress DNS/network enforcement is infrastructure work; third-party availability remains best-effort.                               |

Paths in the table are under `src/lib`, `src/services`, `src/repositories` or the
explicit named directory. UI has no repository/persistence imports. Route handlers
delegate to services, which use typed repositories. All six repositories were
reviewed: users, sessions, local stations, OCM, geocoding and routes.

CSP allows only the two CARTO origins for map network/images; Nominatim, OSRM and
OCM remain server-side. Same-origin module-worker CSP is narrowly configured for
the hashed MapLibre worker. Production probes on 200/400/401/403/429/307/404/405
responses confirmed strict CSP, DENY, nosniff, restrictive referrer policy and
HSTS. All were uncached (`no-store`, including Next's expanded 404 directive).
Production registration returned HttpOnly/Secure/SameSite=Lax, host-only cookie;
logout returned 204 and replaying that cookie on auth/me returned 401. Local HTTP
checks do not validate an actual HTTPS termination or browser HSTS deployment.

## Local CI-equivalent gates

These commands ran locally; hosted CI has not been claimed as run.
The clustering follow-up reran the full gate and clean build; scanner rows retain
the Part 3 audit results.

| Command                                                                                                                         | Actual result                                                                                                                                                                                                                                                                                   |
| ------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `source ~/.nvm/nvm.sh; npm run typecheck && npm run lint && npm run format:check && npm run test:coverage`                      | Exit 0; SonarJS/security ESLint zero warnings; Prettier clean; 29 files / 226 tests passed. Coverage: statements 98.31%, branches 93.08%, functions 97.78%, lines 98.91% (all above 80% gates).                                                                                                 |
| `rm -rf .next && AUTH_SECRET=$(openssl rand -base64 48) npm run build`                                                          | Exit 0; clean optimized production build, compiled in 10.6 s. Non-fatal Webpack cache warning about serializing a 105 KiB string.                                                                                                                                                               |
| `semgrep scan --error --metrics=off --config p/owasp-top-ten --config p/typescript --config p/nextjs --config p/security-audit` | Semgrep 1.163.0 installed via pip; exit 0, 0 findings, 123 rules run, 117 targets, ~100% parsed lines. Default scanner exclusions apply.                                                                                                                                                        |
| `npm audit --audit-level=high`                                                                                                  | Exit 0, `found 0 vulnerabilities`; no dependency changes needed.                                                                                                                                                                                                                                |
| `gitleaks dir . --redact --no-banner`                                                                                           | Checksum-verified 8.30.1; exit 0, no leaks in clean source tree after deleting `.next`. Initial dirty-tree scan flagged seven generated Next encryption/preview keys in ignored `.next` manifests/cache. No source finding or suppression; build artifacts must remain private and uncommitted. |
| `gitleaks git --redact --verbose .`                                                                                             | Exit 0, no leaks in committed history; rerun after the final audit/docs commit.                                                                                                                                                                                                                 |

No lint/security suppressions or CI gate weakening were introduced. A new URL
validation refinement initially threw on malformed URLs; piping it after URL
validation fixed this and the existing safe-error regression now passes.

## Measured performance

Production server via `npm run start`, localhost:3000, one process, no OCM key.
A fresh production account was registered; no production demo seeding was enabled.
Times include HTTP round trip and JSON decoding. These are small local samples,
not load tests or provider SLAs.

- Clean build: `/map` **8.55 kB**, **202 kB First Load JS** as reported by Next;
  shared First Load JS **103 kB**, middleware **74.7 kB**.
- First Load JS excludes deferred map assets. The build's MapCanvas loadable
  manifest references two JS chunks totaling **1,081,023 raw bytes / 298,863
  gzip bytes**, plus **71,558 / 10,177 bytes** CSS. The separate worker is
  **540,726 / 156,093 bytes**. Gzip sizes were measured from generated files.
- Production clustering walkthrough: 5 km / 91 stops and 10 km / 120 stops.
  At fitted 10 km zoom, 57/58-stop city clusters, one two-stop cluster and three
  numbered highway pins replaced the overlapping markers. Expanding Hyderabad
  exposed numbered pins; stop 54 opened the matching Tata Power Abids Hub 9
  drawer. Evidence: `/home/ubuntu/work/shots/corridor-clustered.png` and
  `/home/ubuntu/work/shots/corridor-clustered-drawer.png`.
- Hyderabad → Vijayawada, 5 km buffer: **273.4959 km, 91 stops, OSRM route**
  (`fallback=false`, local station source). First route-cache miss: **592.29 ms**.
  Five cached requests: **13.79, 12.57, 11.55, 35.36, 28.76 ms**;
  median **13.79 ms**. Geometry is cached; station projection/filtering still runs.
- Injected, network-free stalled OSRM test through the real repository/service:
  native four-second abort fired and fallback returned in **4,004 ms**, with
  **51 points / 249.794 km**, flagged `fallback=true`; cached repeat **3 ms** and
  only one fetch attempt. This measures timeout handling, not a real OSRM outage.
  With OCM enabled, its parallel three-second calls can add latency afterward.

Caches, Nominatim throttle and rate limits are process-local. No proxy trust means
all callers share the conservative unknown-IP bucket; enable proxy trust only
after ingress sanitization is verified. The mock store loses all users/sessions
on restart and is not production identity storage. Seed availability and detours
are estimates. Browser mode/theme/drawer screenshots were captured in Part 2;
mobile, accessibility tooling and sustained-load testing were not performed here.

## Planned V2 security checklist (not implemented)

- **Centralized UPI wallet:** legal/RBI/PPI and licensed-partner assessment before
  holding funds; PCI scope assessment if card data is introduced. Server-authorized
  wallet ownership, integer-paise double-entry ledger, atomic holds/captures/refunds,
  idempotency keys, concurrency/negative-balance tests, transaction limits,
  reconciliation and immutable audit history. Authenticate/sign provider webhooks,
  prevent replay/duplicates, encrypt/minimize payment identifiers, rotate KMS-held
  credentials and separate operator approval from payout execution.
- **OCPI settlement:** per-partner scoped rotating tokens, mTLS where agreed,
  tenant/resource authorization, strict versioned schemas and CDR integrity/replay
  checks (signatures where partner-supported). Idempotent CDR ingestion/corrections,
  ledger-backed settlement states, tariff/currency validation, reconciliation,
  bounded retries, audit trails and partner egress allowlists.
- **Restaurant onboarding:** consent/minimal KYC storage and verified payout
  identity; tenant-scoped RBAC and separate approval roles. Private file storage,
  short-lived upload URLs, byte/type limits, content sniffing, malware scanning,
  metadata removal and non-executable downloads. Audit approval/bank changes,
  require re-verification for payout changes, enforce retention/deletion and test
  cross-tenant access, malicious uploads and webhook/URL SSRF.
