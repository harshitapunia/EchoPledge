import { test } from "node:test";
import assert from "node:assert/strict";
import { DockerRunner, createArguments, type CommandResult, type Command } from "../src/runner.js";
import { CASES } from "../src/manifest.js";
import { IMAGE, manifest } from "./helpers.js";

const ok: CommandResult = { code: 0, stdout: "", stderr: "", timeout: false, overflow: false };
const ID = "12".repeat(32);
function state(patch: Record<string, unknown> = {}): CommandResult {
  return { ...ok, stdout: JSON.stringify({ Status: "exited", Running: false, OOMKilled: false, Error: "", ExitCode: 0, ...patch }) };
}
function mock(
  override: (args: string[], caseIndex: number) => CommandResult | undefined = () => undefined,
  trace: string[][] = [],
): Command {
  let index = 0;
  return async args => {
    trace.push(args);
    const changed = override(args, index);
    if (changed) return changed;
    switch (args[0]) {
      case "version": return { ...ok, stdout: "test-daemon" };
      case "create": return { ...ok, stdout: ID + "\n" };
      case "start": return { ...ok, stdout: JSON.stringify(CASES[index++]!.expected) };
      case "inspect": return state();
      case "rm": return ok;
      default: throw new Error("unexpected Docker command");
    }
  };
}

test("stopped container creation preserves pinned isolation and credential boundaries", () => {
  const args = createArguments("test-name", "/tmp/test-source", manifest(), [1, 2]);
  assert.equal(args[0], "create");
  for (const expected of ["--network=none", "--user=65534:65534", "--read-only", "--cap-drop=ALL",
    "--security-opt=no-new-privileges", "--pull=never", "--memory=128m", "--memory-swap=128m",
    "--pids-limit=32", "--cpus=0.5", "--ipc=none", "--log-driver=none", "--entrypoint=node", IMAGE,
    "--label=proofwork.verifier=true"]) assert.ok(args.includes(expected));
  assert.ok(args.includes("type=bind,src=/tmp/test-source,dst=/work,readonly"));
  assert.ok(!args.some(a => a.includes("docker.sock") || a === "--privileged" || a === "--env" || a === "--rm"));
});

test("passing and failing mock runs inspect exit status and remove every exact container", async () => {
  const trace: string[][] = [];
  const result = await new DockerRunner(IMAGE, mock(undefined, trace)).run(Buffer.from("test fixture"), manifest());
  assert.ok(result.every(r => r.passed));
  assert.deepEqual(trace.map(args => args[0]),
    ["version", ...CASES.flatMap(() => ["create", "start", "inspect", "rm"])]);
  for (const args of trace.filter(a => ["start", "inspect", "rm"].includes(a[0]!))) assert.equal(args.at(-1), ID);
  const failed = await new DockerRunner(IMAGE, mock(args =>
    args[0] === "start" ? { ...ok, stdout: "999" } : undefined)).run(Buffer.from("test fixture"), manifest());
  assert.ok(failed.every(r => !r.passed));
});

test("execution timeout and output overflow always remove the created container", async () => {
  for (const patch of [{ timeout: true }, { overflow: true }]) {
    const trace: string[][] = [];
    const runner = new DockerRunner(IMAGE, mock(args =>
      args[0] === "start" ? { ...ok, ...patch } : undefined, trace));
    await assert.rejects(runner.run(Buffer.from("test fixture"), manifest()),
      patch.timeout ? /runner_timeout/ : /runner_failure/);
    assert.deepEqual(trace.map(args => args[0]), ["version", "create", "start", "rm"]);
    assert.deepEqual(trace.at(-1), ["rm", "-f", ID]);
  }
});

test("timed-out or malformed creation never starts student code", async () => {
  for (const created of [{ ...ok, timeout: true }, { ...ok, stdout: "invalid-id" }, { ...ok, code: 125 }]) {
    const trace: string[][] = [];
    const runner = new DockerRunner(IMAGE, mock(args =>
      args[0] === "create" ? created : undefined, trace));
    await assert.rejects(runner.run(Buffer.from("test fixture"), manifest()), /runner_failure/);
    assert.deepEqual(trace.map(args => args[0]), ["version", "create", "rm"]);
    assert.ok(trace.at(-1)![2]!.startsWith("proofwork-"));
  }
});

test("cleanup failure cannot return successful outcomes even after passing output", async () => {
  for (const cleanup of [{ ...ok, code: 1, stderr: "daemon unavailable" },
    { ...ok, timeout: true }, { ...ok, overflow: true },
    { ...ok, code: 1, stderr: "No such container" }]) {
    await assert.rejects(new DockerRunner(IMAGE, mock(args =>
      args[0] === "rm" ? cleanup : undefined)).run(Buffer.from("test fixture"), manifest()), /runner_failure/);
  }
});

test("unavailable daemon and missing or unpinned trusted images fail closed", async () => {
  await assert.rejects(new DockerRunner(IMAGE, async () => ({ ...ok, code: 1 }))
    .run(Buffer.from("test fixture"), manifest()), /runner_unavailable/);
  for (const image of [undefined, "node:24", "node@sha256:" + "00".repeat(32)]) {
    await assert.rejects(new DockerRunner(image, async () => { throw new Error("must not run"); })
      .run(Buffer.from("test fixture"), manifest()), /runner_unavailable/);
  }
});

test("actual container exit status controls passing instead of CLI status alone", async () => {
  const failed = await new DockerRunner(IMAGE, mock(args =>
    args[0] === "inspect" ? state({ ExitCode: 1 }) : undefined)).run(Buffer.from("test fixture"), manifest());
  assert.ok(failed.every(r => !r.passed));
  for (const inspected of [{ ...ok, stdout: "{" }, { ...ok, code: 1 }, state({ Running: true }),
    state({ OOMKilled: true }), state({ Status: "running" }), state({ Error: "runtime failure" })]) {
    await assert.rejects(new DockerRunner(IMAGE, mock(args =>
      args[0] === "inspect" ? inspected : undefined)).run(Buffer.from("test fixture"), manifest()), /runner_failure/);
  }
});

test("a thrown execution error still triggers exact container cleanup", async () => {
  let removed = false;
  const normal = mock();
  const command: Command = async (args, timeout, limit) => {
    if (args[0] === "start") throw new Error("simulated transport failure");
    if (args[0] === "rm") { removed = true; assert.equal(args[2], ID); }
    return normal(args, timeout, limit);
  };
  await assert.rejects(new DockerRunner(IMAGE, command).run(Buffer.from("test fixture"), manifest()), /runner_failure/);
  assert.equal(removed, true);
});
