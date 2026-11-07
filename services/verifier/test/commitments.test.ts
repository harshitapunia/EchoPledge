import { test } from "node:test";
import assert from "node:assert/strict";
import { PublicKey } from "@solana/web3.js";
import { evidenceHash, hex, key, requirementsHash, u64 } from "../src/commitments.js";
import { parseManifest } from "../src/manifest.js";
import { manifest } from "./helpers.js";

test("requirements commit to the original byte sequence", () => {
  assert.equal(requirementsHash(Buffer.from('{"version":1}')).toString("hex"), "c0cd5f50fc0d2636254128f2e825d284e6d5182b74883793f7e5071484527ad8");
  assert.notDeepEqual(requirementsHash(Buffer.from('{"version":1}')), requirementsHash(Buffer.from('{ "version":1 }')));
  const bytes = Buffer.from(JSON.stringify(manifest()));
  assert.deepEqual(parseManifest(bytes).hash, requirementsHash(bytes));
});
test("evidence matches independently computed fixed-width vector", () => {
  const e = { milestone: new PublicKey(Buffer.alloc(32, 1)).toBase58(), student: new PublicKey(Buffer.alloc(32, 2)).toBase58(),
    requirementsHash: "03".repeat(32), repositoryId: "1", contributorId: "2", commit: "04".repeat(20), nonce: "05".repeat(32) };
  assert.equal(evidenceHash(e).toString("hex"), "9606d15f8d72f4f827c15eea24f47c9558ba230652cd9735be5400bca2fdeeaf");
  for (const [field, value] of Object.entries({ milestone: new PublicKey(Buffer.alloc(32, 6)).toBase58(),
    student: new PublicKey(Buffer.alloc(32, 7)).toBase58(), requirementsHash: "08".repeat(32),
    contributorId: "3", repositoryId: "4", commit: "09".repeat(20), nonce: "0a".repeat(32) })) {
    assert.notDeepEqual(evidenceHash({ ...e, [field]: value }), evidenceHash(e), field);
  }
});
test("strict numeric, key, SHA and nonce parsing", () => {
  for (const id of ["-1", "01", "1.1", "18446744073709551616", 1]) assert.throws(() => u64(id));
  assert.equal(u64("18446744073709551615").toString("hex"), "ffffffffffffffff");
  assert.throws(() => key("not-a-public-key"));
  assert.throws(() => hex("A".repeat(40), 20));
  assert.throws(() => hex("aa", 32));
});
test("manifest rejects malformed, unsupported, unpinned or ambiguous definitions", () => {
  const good = manifest();
  for (const value of [
    { ...good, version: 2 }, { ...good, repositoryId: "0" }, { ...good, tests: {} },
    { ...good, runner: { ...good.runner, image: "node:latest" } },
    { ...good, runner: { ...good.runner, network: "host" } },
    { ...good, runner: { ...good.runner, memoryMb: 4096 } },
    { ...good, entry: "../secret.mjs" }, { ...good, runner: { ...good.runner, privileged: true } },
  ]) assert.throws(() => parseManifest(Buffer.from(JSON.stringify(value))));
  for (const bytes of [Buffer.from("{"), Buffer.from([255]), Buffer.from(" " + JSON.stringify(good)),
    Buffer.from(JSON.stringify(good).replace('"version":1', '"version":2,"version":1'))]) {
    assert.throws(() => parseManifest(bytes));
  }
});
