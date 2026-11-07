import { test } from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { createVerifierServer } from "../src/server.js";
import { VerifierService } from "../src/service.js";
import { GitHub } from "../src/github.js";
import { DevnetReader } from "../src/chain.js";
import { CASES } from "../src/manifest.js";
import { fixture, githubFetch, TOKEN } from "./helpers.js";

test("local HTTP endpoint enforces boundaries and carries authenticated input through the mocked pipeline", async () => {
  const f = fixture();
  const service = new VerifierService(new GitHub(githubFetch()),
    new DevnetReader("https://api.devnet.solana.com", f.verifier.toBase58(), f.rpc),
    { run: async () => CASES.map(c => ({ id: c.id, passed: true })) });
  const server = createVerifierServer(service);
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert.ok(address && typeof address === "object");
  const url = "http://127.0.0.1:" + address.port + "/verify";
  const headers = { "content-type": "application/json", authorization: "Bearer " + TOKEN };
  try {
    const valid = await fetch(url, { method: "POST", headers, body: JSON.stringify(f.request) });
    assert.equal(valid.status, 200);
    assert.equal(valid.headers.get("cache-control"), "no-store");
    assert.equal((await valid.json() as { approved: boolean }).approved, true);
    assert.equal((await fetch(url)).status, 400);
    assert.equal((await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: "{}" })).status, 401);
    assert.equal((await fetch(url, { method: "POST", headers: { ...headers, origin: "https://attacker.invalid" }, body: "{}" })).status, 400);
    assert.equal((await fetch(url, { method: "POST", headers, body: "{" })).status, 400);
    assert.equal((await fetch(url, { method: "POST", headers, body: " ".repeat(33_000) })).status, 413);
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
});
