# GridPass architecture

## Foundation milestone

The skeleton has no business operations, identities, secrets, external APIs, or
persistence. The landing page renders static text; the public health route
returns only `{ status: "ok" }`, without dependencies or sensitive diagnostics.
No services or repositories are needed until business behavior exists.

Middleware replaces caller-supplied nonce headers with a fresh nonce and forwards
the CSP to Next.js for inline framework scripts. Dynamic rendering prevents
nonce reuse from static HTML caches; responses use no-store. Global config
headers provide a restrictive fallback including errors and excluded assets.
HSTS is production-only. Environment validation executes when Next loads its
configuration, rejects invalid values without logging them, and has no secrets.

Trust boundaries are browser-to-Next.js and contributor-to-CI. XSS/clickjacking
are mitigated by nonce CSP, framework escaping, and framing restrictions;
dependency/supply-chain risks by lockfile installs, pinned actions, audit and
scans. This public, constant-time health endpoint has no application state;
deployment ingress must provide request limiting before public operation, since
per-process counters do not provide reliable multi-instance abuse protection.
Authentication, authorization, CSRF, durable rate limiting and persistence remain
out of scope and require a new threat review before adding application behavior.

This is a template for documenting architecture decisions and security assumptions before implementing a milestone. No application design or threat assessment is approved by this template.

## System overview

- **Purpose and scope:** _What does this milestone deliver? What is out of scope?_
- **Actors and external dependencies:** _Who uses the system, and what providers or services does it rely on?_
- **Components and ownership:** _What belongs in UI components, API route handlers, `services/`, and `repositories/`?_
- **Data flows and trust boundaries:** _Link a diagram and identify entry points, data stores, third-party interactions, and boundaries crossed._

## Architecture decision records (ADRs)

| ADR       | Title            | Status                             | Date         |
| --------- | ---------------- | ---------------------------------- | ------------ |
| _ADR-NNN_ | _Decision title_ | _Proposed / Accepted / Superseded_ | _YYYY-MM-DD_ |

### ADR-NNN: Decision title

- **Status, date, and owner:** _Who owns this decision, and when was it made?_
- **Context:** _What problem, requirements, and constraints drive the decision?_
- **Alternatives:** _What options were considered and what trade-offs did they present?_
- **Decision:** _What was chosen and why?_
- **Consequences:** _What changes, risks, or follow-up work result?_
- **References:** _Link related ADRs, PRs, and threat-model entries._

## Threat model (STRIDE)

- **Scope, owner, and review date:** _Identify the milestone, reviewer, and date._
- **Assets and classification:** _List sensitive data, credentials, and critical operations._
- **Entry points and trust boundaries:** _Reference the data-flow diagram and identify where authorization or isolation applies._
- **Assumptions and exclusions:** _Record what the assessment assumes and what it does not cover._

Use STRIDE to review spoofing, tampering, repudiation, information disclosure, denial of service, and elevation of privilege across components and trust boundaries.

| Threat ID | STRIDE category | Asset, flow, or boundary | Threat and impact     | Likelihood / severity  | Mitigation and verification    | Residual risk and owner    |
| --------- | --------------- | ------------------------ | --------------------- | ---------------------- | ------------------------------ | -------------------------- |
| _T-NNN_   | _Category_      | _Component or boundary_  | _Scenario and impact_ | _Rating and rationale_ | _Control and test or evidence_ | _Remaining risk and owner_ |

Revisit the threat model when a change affects authentication, authorization, data handling, external integrations, or trust boundaries. Link unresolved risks to follow-up work and record who accepts any residual risk.
