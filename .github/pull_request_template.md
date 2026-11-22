## Summary

<!-- What milestone does this PR deliver, and why? -->

## Verification

<!-- List the commands run and their results. If a check is unavailable, explain why and leave it unchecked. -->

- [ ] Type-checking passed.
- [ ] SonarQube Quality Gate and lint checks passed.
- [ ] Security scans passed.
- [ ] Unit tests passed.
- [ ] A clean production build passed.

## Mandatory review checklist

<!-- Complete every applicable item. Explain any not-applicable item and leave it unchecked. -->

- [ ] Reviewed the change against the OWASP Top 10 and the repository security rules.
- [ ] Verified server-side Zod validation and sanitization of all affected inputs, including query parameters, headers, and API payloads.
- [ ] Confirmed no secrets, credentials, sensitive fields, or internal errors are exposed in code, logs, client bundles, or API responses.
- [ ] Added tests for new behavior and regression coverage for fixes.
