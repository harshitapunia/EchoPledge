import { test } from "node:test";
import assert from "node:assert/strict";
import { DockerRunner, runArguments, type CommandResult, type Command } from "../src/runner.js";
import { CASES } from "../src/manifest.js";
import { IMAGE, manifest } from "./helpers.js";

const ok: CommandResult = { code: 0, stdout: "", stderr: "", timeout: false, overflow: false };
test("runner pins the image and applies bounded container isolation without secrets", () => {
  const args = runArguments("test-name", "/tmp/test-source", manifest(), [1, 2]);
  for (const expected of ["--network=none", "--user=65534:65534", "--read-only", "--cap-drop=ALL",
    "--security-opt=no-new-privileges", "--pull=never", "--memory=128m", "--memory-swap=128m",
    "--pids-limit=32", "--log-driver=none", "--entrypoint=node", IMAGE]) assert.ok(args.includes(expected));
  assert.ok(args.includes("type=bind,src=/tmp/test-source,dst=/work,readonly"));
  assert.ok(!args.some(a => a.includes("docker.sock") || a === "--privileged" || a === "--env"));
});
test("mocked execution evaluates all pinned expected outputs and cleans up", async () => {
  let index = 0, cleaned = 0;
  const command: Command = async args => {
    if (args[0] === "version") return ok;
    if (args[0] === "rm") { cleaned++; return ok; }
    return { ...ok, stdout: JSON.stringify(CASES[index++]!.expected) };
  };
  const result = await new DockerRunner(IMAGE, command).run(Buffer.from("export function sum() {}"), manifest());
  assert.ok(result.every(r => r.passed));
  assert.equal(cleaned, CASES.length);
  const failed = await new DockerRunner(IMAGE, async args => args[0] === "run" ? { ...ok, stdout: "999" } : ok)
    .run(Buffer.from("invalid fixture"), manifest());
  assert.ok(failed.every(r => !r.passed));
});
test("timeout, output overflow, unavailable daemon and infrastructure failure cannot pass", async () => {
  for (const patch of [{ timeout: true }, { overflow: true }, { code: 125 }]) {
    let cleaned = false;
    const command: Command = async args => {
      if (args[0] === "rm") { cleaned = true; return ok; }
      return args[0] === "run" ? { ...ok, ...patch } : ok;
    };
    await assert.rejects(new DockerRunner(IMAGE, command).run(Buffer.from(""), manifest()));
    assert.equal(cleaned, true);
  }
  await assert.rejects(new DockerRunner(IMAGE, async () => ({ ...ok, code: 1 })).run(Buffer.from(""), manifest()), /runner_unavailable/);
  await assert.rejects(new DockerRunner(IMAGE, async () => { throw new Error("infrastructure"); }).run(Buffer.from(""), manifest()), /runner_failure/);
});
