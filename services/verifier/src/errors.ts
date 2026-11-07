export type Failure =
  | "invalid_request" | "invalid_manifest" | "requirements_mismatch" | "evidence_mismatch"
  | "invalid_github_identity" | "repository_mismatch" | "commit_mismatch" | "provenance_mismatch"
  | "github_api_failure" | "github_rate_limit" | "missing_commit" | "missing_onchain_state"
  | "invalid_onchain_state" | "runner_timeout" | "runner_unavailable" | "runner_failure"
  | "tests_failed" | "request_in_progress" | "infrastructure_failure";

export class VerificationError extends Error {
  constructor(public readonly code: Failure) { super(code); }
}
export function requireValue(condition: unknown, code: Failure): asserts condition {
  if (!condition) throw new VerificationError(code);
}
export function object(value: unknown): Record<string, unknown> {
  requireValue(value !== null && typeof value === "object" && !Array.isArray(value), "invalid_request");
  return value as Record<string, unknown>;
}
export function exactKeys(value: Record<string, unknown>, keys: string[], code: Failure): void {
  requireValue(Object.keys(value).sort().join("|") === [...keys].sort().join("|"), code);
}
