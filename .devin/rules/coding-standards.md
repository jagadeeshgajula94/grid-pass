# Coding standards

## TypeScript

- Set `strict: true` and `noUncheckedIndexedAccess: true` in every TypeScript project configuration.
- Declare explicit return types on exported functions. Use `unknown` at untrusted boundaries and narrow it through validation or type guards. Do not use `any` or suppression directives.

## SonarQube Quality Gate

- Cognitive complexity: at most 15 per function.
- Function length: at most 50 lines per function.
- Duplicated code blocks: zero.
- Unused variables and imports: zero.

Use small, focused functions and shared abstractions where logic genuinely repeats. Do not suppress findings or weaken the gate to accommodate a change.

## Naming

- Use `camelCase` for variables, functions, and methods; use action names for functions and `is`, `has`, or `can` prefixes for boolean values where appropriate.
- Use `PascalCase` for components, classes, interfaces, and type aliases. Use `UPPER_SNAKE_CASE` for environment variable names and fixed application constants.
- Prefer descriptive domain names over abbreviations. Follow framework-required filenames; otherwise use descriptive `kebab-case` filenames, with `PascalCase` permitted for named UI component files.

## Error handling

- Model expected failures with a typed `Result<T, AppError>`: a discriminated success or failure with a value or an error, respectively. Use typed `AppError` classes with stable error codes and safe messages. Handle failures explicitly and exhaustively.
- Treat caught exceptions as `unknown` and narrow before handling. Map persistence errors at the appropriate boundary; keep internal causes out of API responses. Route handlers map recognized errors to HTTP statuses and safe response bodies, with a generic server error for unexpected failures.

## Logging

- Use a structured logger with a severity level, stable event name, and request or correlation ID where available. Log useful, allowlisted context and redact sensitive data.
- No `console.log` in production code. Do not log secrets, credentials, session identifiers, or sensitive personal data.
