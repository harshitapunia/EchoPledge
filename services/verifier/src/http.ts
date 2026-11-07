import { VerificationError } from "./errors.js";
export type Fetcher = typeof fetch;

export async function boundedBytes(response: Response, max: number): Promise<Buffer> {
  if (!response.body) throw new Error("missing_body");
  const reader = response.body.getReader();
  const chunks: Buffer[] = [];
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > max) throw new Error("response_too_large");
      chunks.push(Buffer.from(value));
    }
  } finally { await reader.cancel(); }
  return Buffer.concat(chunks);
}
export async function jsonResponse(response: Response, max = 1_000_000): Promise<unknown> {
  return JSON.parse((await boundedBytes(response, max)).toString("utf8"));
}
export function apiError(response: Response, missingCommit: boolean): VerificationError {
  if (response.status === 429 || (response.status === 403 && response.headers.get("x-ratelimit-remaining") === "0")) return new VerificationError("github_rate_limit");
  if (response.status === 401) return new VerificationError("invalid_github_identity");
  if (response.status === 404 && missingCommit) return new VerificationError("missing_commit");
  return new VerificationError("github_api_failure");
}
