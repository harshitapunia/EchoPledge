import { test } from "node:test";
import assert from "node:assert/strict";
import { GitHub } from "../src/github.js";
import { DevnetReader } from "../src/chain.js";
import { VerifierService } from "../src/service.js";
import { CASES } from "../src/manifest.js";
import { fixture, githubFetch, COMMIT, TOKEN } from "./helpers.js";

test("PR target and exact head commit are independently bound", async () => {
  const f = fixture();
  const path = "/repos/proofwork-demo/assignment/pulls/7";
  for (const patch of [
    { number: 7, user: { id: 2002 }, base: { repo: { id: 9 } }, head: { sha: COMMIT, repo: { id: 1001, full_name: "x/y" } } },
    { number: 7, user: { id: 2002 }, base: { repo: { id: 1001 } }, head: { sha: "ee".repeat(20), repo: { id: 1001, full_name: "x/y" } } },
    {},
  ]) {
    await assert.rejects(new GitHub(githubFetch({ [path]: patch })).verify(f.request, TOKEN));
  }
});
test("source retrieval is pinned and rejects symlinks or invalid Git blobs", async () => {
  const f = fixture();
  const path = "/repos/proofwork-demo/assignment/contents/solution.mjs";
  for (const value of [
    { type: "symlink", encoding: "base64", path: "solution.mjs", size: 1, content: "eA==" },
    { type: "file", encoding: "base64", path: "solution.mjs", size: 1, content: "eA==", sha: "00".repeat(20) },
  ]) await assert.rejects(new GitHub(githubFetch({ [path]: value })).source(f.request, TOKEN, "solution.mjs"));
});
test("API network errors, malformed JSON and secondary rate limits fail safely", async () => {
  const f = fixture();
  await assert.rejects(new GitHub(async () => { throw new Error("network"); }).verify(f.request, TOKEN), /github_api_failure/);
  await assert.rejects(new GitHub(async () => new Response("{")).verify(f.request, TOKEN), /github_api_failure/);
  await assert.rejects(new GitHub(async () => new Response("", { status: 403, headers: { "x-ratelimit-remaining": "0" } })).verify(f.request, TOKEN), /github_rate_limit/);
});
test("incomplete test reports cannot authorize attestation", async () => {
  const f = fixture();
  const chain = new DevnetReader("https://api.devnet.solana.com", f.verifier.toBase58(), f.rpc);
  for (const outcomes of [[], CASES.map(c => ({ id: c.id, passed: false })), CASES.map(() => ({ id: "forged", passed: true }))]) {
    const service = new VerifierService(new GitHub(githubFetch()), chain, { run: async () => outcomes });
    const result = await service.verify(f.request, TOKEN);
    assert.equal(result.approved, false);
    assert.equal(result.attestation, undefined);
    assert.equal(result.reason, "tests_failed");
  }
});
