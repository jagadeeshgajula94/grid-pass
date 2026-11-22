export function safeNext(value: unknown): string {
  if (
    typeof value !== "string" ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    /[\\\s]/.test(value) ||
    /[\u0000-\u001f]/.test(value)
  )
    return "/map";
  try {
    const parsed = new URL(value, "https://gridpass.invalid");
    return parsed.origin === "https://gridpass.invalid"
      ? `${parsed.pathname}${parsed.search}${parsed.hash}`
      : "/map";
  } catch {
    return "/map";
  }
}
