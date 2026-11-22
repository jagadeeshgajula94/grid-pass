# Security rules: OWASP Top 10 and Zero Trust

Always apply these rules to GridPass changes. Use the [OWASP Top 10](https://owasp.org/www-project-top-ten/) during review. Trust no input or caller by default: authenticate where required, authorize each action and resource on the server, deny by default, and grant the least privilege needed.

## Secrets and configuration

- Never hardcode secrets, API keys, tokens, or credentials in code or logs. Never commit them in configuration, fixtures, or example files, expose them to the browser, or log them at runtime.
- Supply all secrets through environment variables. Validate the server environment with Zod at startup and fail closed on missing or invalid values. Startup errors may name the invalid variables but must not print their values.

## Input validation and XSS prevention

- Strictly validate and sanitize all user inputs on the server using Zod schemas. This includes query and route parameters, headers, and API payloads. Validate expected types, sizes, formats, and allowed values; reject unexpected fields on structured inputs and explicitly normalize or sanitize values in the schemas. Never rely on client-side validation.
- Never use `dangerouslySetInnerHTML`, raw HTML string interpolation in map popups, `eval()`, or `new Function()`. Render untrusted content as text via framework escaping, text nodes, or safe DOM properties. Validate URLs before rendering them as links.

## Authentication and session security

- Hash passwords with Argon2id or bcrypt with a cost factor of at least 12. Never store or log plaintext passwords.
- Store sessions only in cookies set with `HttpOnly`, `Secure`, and `SameSite=Lax`; never store session material in `localStorage`. Rotate sessions after authentication or privilege changes and invalidate them on logout.
- Rate-limit authentication and API endpoints on the server. Enable CSRF protection for state-changing requests that use cookie authentication; `SameSite=Lax` is not a substitute for CSRF protection.

## Data protection

- Use only parameterized queries through an ORM or prepared statements. Never concatenate untrusted values into queries.
- Return explicitly allowlisted response fields and safe client errors. Never return stack traces, internal database errors, or sensitive fields such as password hashes or internal IDs in API responses.
- Keep security-relevant events observable through structured, redacted logs. Never record secrets or sensitive request bodies, cookies, or headers.

## Mandatory security headers

Configure and verify the following headers on applicable responses, including error responses:

- `Content-Security-Policy`: enforce a strict policy using nonces or hashes as needed; disallow `unsafe-inline` and `unsafe-eval`, and use `frame-ancestors 'none'`. Allow only the specific map and API origins the application needs.
- `Strict-Transport-Security` (HSTS): enforce HTTPS for production origins.
- `X-Frame-Options: DENY`.
- `X-Content-Type-Options: nosniff`.
- `Referrer-Policy`: set an explicit restrictive policy, such as `strict-origin-when-cross-origin`.
