type LogContext = Record<string, unknown>;
const SENSITIVE =
  /password|cookie|token|email|authorization|secret|session|phone/i;

function redact(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redact);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        SENSITIVE.test(key) ? "[REDACTED]" : redact(item),
      ]),
    );
  }
  return value;
}

export function logEvent(
  level: "info" | "warn" | "error",
  event: string,
  requestId: string,
  context: LogContext = {},
): void {
  const entry = JSON.stringify({
    ...(redact(context) as LogContext),
    level,
    event,
    requestId,
  });
  const stream = level === "error" ? process.stderr : process.stdout;
  stream.write(`${entry}\n`);
}
