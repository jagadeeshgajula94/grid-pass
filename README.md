# grid-pass

GridPass: an EV charging aggregator app

## Foundation development

Use Node.js 24 LTS and `npm ci`. Copy `.env.example` to `.env.local` if
overriding the non-secret defaults, then run `npm run dev`. The skeleton has
only a landing page and `GET /api/health`; there is no persistence or authentication.

Run `npm run lint`, `npm run typecheck`, `npm run test:coverage`,
`npm run build`, `npm audit --audit-level=high`, and `npm run format:check`.
`npm run format` formats files; commits run lint-staged via Husky and reject
lint findings or unformatted staged files rather than silently fixing them.

CI also runs Gitleaks 8.30.1 across git history and Semgrep 1.163.0 with
`p/owasp-top-ten`, `p/typescript`, `p/nextjs`, and `p/security-audit`.
Run those same scans locally with `gitleaks git --redact --verbose .` and
`semgrep scan --error --metrics=off --config p/owasp-top-ten --config p/typescript --config p/nextjs --config p/security-audit`.
SonarCloud placeholders must be replaced before connecting the service; LCOV
is written to `coverage/lcov.info`. Server-side SonarCloud quality gates
(including duplicated blocks) must be enabled when connecting it; ESLint
SonarJS enforces local smells and duplicate strings, not whole-project CPD.

Tailwind v4 and shadcn/ui's new-york configuration are ready in `components.json`,
with the `cn` utility in `src/lib/utils.ts`. No feature components are generated.
The dependency overrides retain Next 15 while using patched PostCSS and minimatch;
review them when upgrading upstream packages.

The strict CSP intentionally disallows development eval/HMR scripts; verify
browser behavior using `npm run build && npm start` instead of weakening CSP.
