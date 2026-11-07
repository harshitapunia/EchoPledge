import { test } from "node:test";
import assert from "node:assert/strict";
import { VerifierService } from "../src/service.js";
import { GitHub } from "../src/github.js";
import { DevnetReader, decodeState } from "../src/chain.js";
import { DockerRunner } from "../src/runner.js";
import { CASES } from "../src/manifest.js";
import { VerificationError, type Failure } from "../src/errors.js";
import { fixture, githubFetch, TOKEN, COMMIT } from "./helpers.js";

function setup(overrides: Record<string, unknown> = {}) {
  const f = fixture();
  const reader = new DevnetReader("https://api.devnet.solana.com", f.verifier.toBase58(), f.rpc);
  const service = new VerifierService(new GitHub(githubFetch(overrides)), reader, {
    run: async () => CASES.map(c => ({ id: c.id, passed: true })),
  });
  return { ...f, reader, service };
}
test("mocked GitHub/RPC integration returns state-derived unsigned attestation bindings", async () => {
  const f = setup();
  const result = await f.service.verify(f.request, TOKEN);
  assert.equal(result.approved, true);
  assert.deepEqual(result.attestation, { milestone: f.request.milestone, submission: f.submission.toBase58(),
    verifier: f.verifier.toBase58(), expected_student: f.request.student,
    expected_requirements_hash: f.requirements.toString("hex"), expected_evidence_hash: f.evidence.toString("hex") });
  assert.equal(result.outcomes.length, 4);
  assert.ok(result.startedAt <= result.finishedAt);
  assert.ok(!JSON.stringify(result).includes(f.request.nonce));
  assert.ok(!JSON.stringify(result).includes(TOKEN));
});
test("GitHub identity, repository, commit and PR provenance failures never approve", async () => {
  const prefix = "/repos/proofwork-demo/assignment";
  const cases: [Record<string, unknown>, Failure][] = [
    [{ "/user": { id: 9 } }, "invalid_github_identity"],
    [{ [prefix]: { id: 9 } }, "repository_mismatch"],
    [{ [prefix + "/commits/" + COMMIT]: { sha: "aa".repeat(20) } }, "commit_mismatch"],
    [{ [prefix + "/commits/" + COMMIT]: new Response("", { status: 404 }) }, "missing_commit"],
    [{ [prefix + "/pulls/7"]: { number: 7, user: { id: 9 }, base: { repo: { id: 1001 } }, head: { sha: COMMIT, repo: { id: 1001, full_name: "x/y" } } } }, "provenance_mismatch"],
    [{ "/user": new Response("", { status: 401 }) }, "invalid_github_identity"],
    [{ "/user": new Response("", { status: 429 }) }, "github_rate_limit"],
    [{ "/user": new Response("", { status: 500 }) }, "github_api_failure"],
    [{ "/user": { id: "2002" } }, "github_api_failure"],
  ];
  for (const [overrides, reason] of cases) {
    const f = setup(overrides);
    const result = await f.service.verify(f.request, TOKEN);
    assert.equal(result.reason, reason);
    assert.equal(result.approved, false);
    assert.equal(result.attestation, undefined);
  }
});
test("malformed GitHub response is incomplete and cannot approve", async () => {
  const f = setup({ "/repos/proofwork-demo/assignment/pulls/7": {} });
  assert.equal((await f.service.verify(f.request, TOKEN)).approved, false);
});
test("commitment mutations and unsupported URLs never approve", async () => {
  const f = setup();
  for (const patch of [
    { nonce: "aa".repeat(32) }, { contributorId: "2003" }, { commit: "ab".repeat(20) },
    { student: f.verifier.toBase58() }, { repositoryId: "1002" },
    { owner: "https://attacker.invalid" }, { commit: "HEAD" }, { nonce: "aa" },
    { manifestBase64: Buffer.from("{}").toString("base64") },
  ]) {
    const result = await f.service.verify({ ...f.request, ...patch }, TOKEN);
    assert.equal(result.approved, false);
    assert.equal(result.attestation, undefined);
  }
  const changed = JSON.parse(Buffer.from(f.request.manifestBase64, "base64").toString());
  changed.runner.timeoutMs = 999;
  assert.equal((await f.service.verify({ ...f.request, manifestBase64: Buffer.from(JSON.stringify(changed)).toString("base64") }, TOKEN)).reason, "requirements_mismatch");
});
test("RPC validates canonical PDAs, discriminator, status, ownership and verifier", async () => {
  const f = fixture();
  const account = (data: Buffer) => ({ owner: "J2FkqDuuuHT14gxjVMhSryrX3Bs4Knct45NMLA79dGdZ", executable: false, data: [data.toString("base64"), "base64"] });
  const decode = (m = f.m, s = f.s, i = f.i, verifier = f.verifier.toBase58()) =>
    decodeState(f.request.milestone, account(m), account(s), account(i), verifier);
  assert.equal(decode().student, f.request.student);
  for (const [target, offset] of [[f.m, 272], [f.m, 273], [f.s, 112], [f.s, 8], [f.s, 40], [f.i, 48], [f.m, 0]] as const) {
    const original = target[offset]!;
    target[offset] = original ^ 1;
    assert.throws(() => decode());
    target[offset] = original;
  }
  assert.throws(() => decode(f.m, f.s, f.i, f.request.student));
  assert.throws(() => decodeState(f.request.milestone, null, account(f.s), account(f.i), f.verifier.toBase58()));
  assert.throws(() => decodeState(f.request.milestone, { ...account(f.m), owner: f.request.student }, account(f.s), account(f.i), f.verifier.toBase58()));
});
test("missing configuration and invalid chain state fail closed", async () => {
  const f = fixture();
  const runner = { run: async () => CASES.map(c => ({ id: c.id, passed: true })) };
  for (const reader of [new DevnetReader(undefined, undefined), new DevnetReader("https://api.mainnet-beta.solana.com", f.verifier.toBase58(), f.rpc)]) {
    const result = await new VerifierService(new GitHub(githubFetch()), reader, runner).verify(f.request, TOKEN);
    assert.equal(result.approved, false);
    assert.ok(result.reason === "missing_onchain_state" || result.reason === "invalid_onchain_state");
  }
});
test("test failures, runner timeout, unavailable runtime and infrastructure failures cannot approve", async () => {
  const f = setup();
  const failing = new VerifierService(new GitHub(githubFetch()), f.reader, { run: async () => CASES.map(c => ({ id: c.id, passed: false })) });
  assert.equal((await failing.verify(f.request, TOKEN)).reason, "tests_failed");
  for (const code of ["runner_timeout", "runner_unavailable", "runner_failure"] as const) {
    const service = new VerifierService(new GitHub(githubFetch()), f.reader, { run: async () => { throw new VerificationError(code); } });
    assert.equal((await service.verify(f.request, TOKEN)).reason, code);
  }
  const service = new VerifierService(new GitHub(githubFetch()), { read: async () => { throw new Error(TOKEN); } }, { run: async () => [] });
  const result = await service.verify(f.request, TOKEN);
  assert.equal(result.reason, "infrastructure_failure");
  assert.ok(!JSON.stringify(result).includes(TOKEN));
});
test("repeated requests revalidate state; concurrent requests do not race approvals", async () => {
  const f = setup();
  assert.equal((await f.service.verify(f.request, TOKEN)).approved, true);
  f.m[272] = 4;
  assert.equal((await f.service.verify(f.request, TOKEN)).approved, false);
  const g = setup();
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  let entered!: () => void;
  const started = new Promise<void>(resolve => { entered = resolve; });
  const service = new VerifierService(new GitHub(githubFetch()), g.reader, { run: async () => {
    entered(); await gate; return CASES.map(c => ({ id: c.id, passed: true }));
  } });
  const first = service.verify(g.request, TOKEN);
  await started;
  assert.equal((await service.verify(g.request, TOKEN)).reason, "request_in_progress");
  g.m[272] = 4;
  release();
  assert.equal((await first).approved, false);
});
test("no trusted image configured produces no approval", async () => {
  const f = setup();
  const service = new VerifierService(new GitHub(githubFetch()), f.reader, new DockerRunner(undefined));
  assert.equal((await service.verify(f.request, TOKEN)).reason, "runner_unavailable");
});
