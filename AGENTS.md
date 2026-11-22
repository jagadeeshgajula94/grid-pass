# GridPass engineering instructions

These instructions apply to every AI session and every change in this repository. Always apply the [security rules](.devin/rules/security.md) and [coding standards](.devin/rules/coding-standards.md) alongside this file.

## Workflow

- Always propose a short plan before coding. State the milestone, scope, and verification steps.
- Keep PRs small and scoped to one milestone. Use a feature branch and never push directly to `main`.
- Never disable lint or security rules. `eslint-disable`, `@ts-ignore`, `@ts-expect-error`, and `any` types are strictly forbidden. Fix the underlying issue instead of suppressing it.

## Verification before opening a PR

Every PR must pass type-checking, linting, security scans, unit tests, and a clean production build before opening. Record the commands and results in the PR. Run the build from a clean state without relying on previous build output. If a tool or check is not yet configured, report that it is unavailable; do not mark it as passed.

## Architecture boundaries

Keep these responsibilities in separate layers:

| Layer | Responsibility | Boundary |
| --- | --- | --- |
| UI components | Render views and collect user interactions | Use the API boundary for server operations; never access repositories or persistence directly. |
| API route handlers | Handle HTTP concerns, including server-side validation, authentication, and response mapping | Delegate business logic to services; never query persistence directly. |
| `services/` | Implement business rules and use cases, including resource-level authorization | Call repositories through typed interfaces; do not depend on UI or HTTP handlers. |
| `repositories/` | Read and write data through the persistence layer | Encapsulate queries and storage details; do not embed business or presentation logic. |

Server-side dependencies flow from route handlers to services to repositories. Record significant decisions, trust boundaries, and threat-model changes in [the architecture document](docs/ARCHITECTURE.md).
