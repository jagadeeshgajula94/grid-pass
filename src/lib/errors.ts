export type ErrorCode =
  "VALIDATION" | "EMAIL_TAKEN" | "INVALID_CREDENTIALS" | "UNAUTHENTICATED";

export class AppError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "AppError";
  }
}
