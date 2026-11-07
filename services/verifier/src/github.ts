import { createHash } from "node:crypto";
import { object, requireValue, VerificationError } from "./errors.js";
import { hex } from "./commitments.js";
import { apiError, jsonResponse, type Fetcher } from "./http.js";

export interface GitHubInput { owner: string; repository: string; pullRequest: number; commit: string; repositoryId: string; contributorId: string }
function githubObject(value: unknown): Record<string, unknown> {
  try { return object(value); } catch { throw new VerificationError("github_api_failure"); }
}
function numericId(value: unknown): string {
  requireValue(typeof value === "number" && Number.isSafeInteger(value) && value > 0, "github_api_failure");
  return String(value);
}
export class GitHub {
  constructor(private readonly request: Fetcher = fetch) {}
  private async get(path: string, token: string, missingCommit = false): Promise<Record<string, unknown>> {
    requireValue(token.length > 0 && token.length <= 1024 && !/[\r\n]/.test(token), "invalid_github_identity");
    try {
      const response = await this.request("https://api.github.com" + path, {
        headers: { authorization: "Bearer " + token, accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" },
        redirect: "error", signal: AbortSignal.timeout(10_000),
      });
      if (!response.ok) throw apiError(response, missingCommit);
      return githubObject(await jsonResponse(response));
    } catch (error) {
      if (error instanceof VerificationError) throw error;
      throw new VerificationError("github_api_failure");
    }
  }
  async verify(input: GitHubInput, token: string): Promise<void> {
    requireValue(/^[A-Za-z0-9][A-Za-z0-9-]{0,38}$/.test(input.owner)
      && /^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/.test(input.repository)
      && Number.isSafeInteger(input.pullRequest) && input.pullRequest > 0, "invalid_request");
    hex(input.commit, 20);
    const user = await this.get("/user", token);
    requireValue(numericId(user.id) === input.contributorId, "invalid_github_identity");
    const base = "/repos/" + encodeURIComponent(input.owner) + "/" + encodeURIComponent(input.repository);
    const repository = await this.get(base, token);
    requireValue(numericId(repository.id) === input.repositoryId, "repository_mismatch");
    const commit = await this.get(base + "/commits/" + input.commit, token, true);
    requireValue(commit.sha === input.commit, "commit_mismatch");
    const pr = await this.get(base + "/pulls/" + input.pullRequest, token);
    const head = githubObject(pr.head);
    const headRepo = githubObject(head.repo);
    const target = githubObject(githubObject(pr.base).repo);
    requireValue(pr.number === input.pullRequest && numericId(target.id) === input.repositoryId
      && numericId(githubObject(pr.user).id) === input.contributorId && head.sha === input.commit
      && typeof headRepo.full_name === "string" && numericId(headRepo.id).length > 0, "provenance_mismatch");
  }
  async source(input: GitHubInput, token: string, entry: string): Promise<Buffer> {
    // Called only after identity/provenance validation. No clone URL or archive extraction.
    const path = "/repos/" + encodeURIComponent(input.owner) + "/" + encodeURIComponent(input.repository)
      + "/contents/" + entry.split("/").map(encodeURIComponent).join("/") + "?ref=" + input.commit;
    const content = await this.get(path, token);
    requireValue(content.type === "file" && content.encoding === "base64" && content.path === entry
      && typeof content.content === "string" && typeof content.size === "number"
      && Number.isSafeInteger(content.size) && content.size > 0 && content.size <= 131_072, "github_api_failure");
    const encoded = (content.content as string).replace(/\n/g, "");
    requireValue(/^[A-Za-z0-9+/]*={0,2}$/.test(encoded), "github_api_failure");
    const bytes = Buffer.from(encoded, "base64");
    requireValue(bytes.length === content.size && bytes.toString("base64") === encoded, "github_api_failure");
    const blob = createHash("sha1").update(Buffer.from("blob " + bytes.length + "\0")).update(bytes).digest("hex");
    requireValue(content.sha === blob, "github_api_failure");
    return bytes;
  }
}
