import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdtemp, writeFile, chmod, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { CASES, type Manifest } from "./manifest.js";
import { VerificationError } from "./errors.js";

export interface Outcome { id: string; passed: boolean }
export interface Runner { run(source: Buffer, manifest: Manifest): Promise<Outcome[]> }
export interface CommandResult { code: number | null; stdout: string; stderr: string; timeout: boolean; overflow: boolean }
export type Command = (args: string[], timeout: number, outputLimit: number) => Promise<CommandResult>;
export const dockerCommand: Command = (args, timeout, limit) => new Promise((resolve, reject) => {
  const child = spawn("docker", args, { shell: false, env: { PATH: process.env.PATH }, stdio: ["ignore", "pipe", "pipe"] });
  let stdout = "", stderr = "", size = 0, timedOut = false, overflow = false;
  const timer = setTimeout(() => { timedOut = true; child.kill("SIGKILL"); }, timeout);
  function collect(data: Buffer, isError: boolean) {
    size += data.length;
    if (size > limit) { overflow = true; child.kill("SIGKILL"); return; }
    if (isError) stderr += data.toString("utf8"); else stdout += data.toString("utf8");
  }
  child.stdout.on("data", data => collect(data, false));
  child.stderr.on("data", data => collect(data, true));
  child.on("error", () => { clearTimeout(timer); reject(new VerificationError("runner_unavailable")); });
  child.on("close", code => { clearTimeout(timer); resolve({ code, stdout, stderr, timeout: timedOut, overflow }); });
});
const HARNESS = `import { sum } from "file:///work/solution.mjs";
const input = JSON.parse(process.argv[1]);
const result = await sum(input);
process.stdout.write(JSON.stringify(result));`;

// No student path, image option, environment, command, or mount is interpolated into a shell.
export function runArguments(name: string, directory: string, manifest: Manifest, input: readonly number[]): string[] {
  const r = manifest.runner;
  return ["run", "--rm", "--pull=never", "--name", name, "--network=none", "--user=65534:65534",
    "--read-only", "--cap-drop=ALL", "--security-opt=no-new-privileges",
    "--cpus=" + r.cpus, "--memory=" + r.memoryMb + "m", "--memory-swap=" + r.memoryMb + "m",
    "--pids-limit=" + r.pids, "--ulimit=nofile=64:64", "--ipc=none", "--log-driver=none",
    "--mount", "type=bind,src=" + directory + ",dst=/work,readonly",
    "--entrypoint=node", r.image, "--input-type=module", "-e", HARNESS, JSON.stringify(input)];
}
export class DockerRunner implements Runner {
  constructor(private readonly trustedImage: string | undefined, private readonly command: Command = dockerCommand) {}
  async run(source: Buffer, manifest: Manifest): Promise<Outcome[]> {
    if (!this.trustedImage || this.trustedImage !== manifest.runner.image) throw new VerificationError("runner_unavailable");
    let directory: string | undefined;
    try {
      const available = await this.command(["version", "--format", "{{.Server.Version}}"], 5_000, 4096);
      if (available.code !== 0 || available.timeout || available.overflow) throw new VerificationError("runner_unavailable");
      directory = await mkdtemp(join(tmpdir(), "proofwork-run-"));
      if (directory.includes(",")) throw new VerificationError("runner_failure");
      await chmod(directory, 0o711);
      await writeFile(join(directory, "solution.mjs"), source, { mode: 0o444 });
      const outcomes: Outcome[] = [];
      for (const test of CASES) {
        const name = "proofwork-" + randomUUID();
        let result: CommandResult;
        try {
          result = await this.command(runArguments(name, directory, manifest, test.input), manifest.runner.timeoutMs, manifest.runner.outputBytes);
        } finally {
          // Killing the CLI does not necessarily stop the container. Force cleanup by its generated name.
          const cleanup = await this.command(["rm", "-f", name], 5_000, 4096);
          if (cleanup.timeout || cleanup.overflow || (cleanup.code !== 0 && !cleanup.stderr.includes("No such container"))) throw new VerificationError("runner_failure");
        }
        if (result.timeout) throw new VerificationError("runner_timeout");
        if (result.overflow) throw new VerificationError("runner_failure");
        if (result.code === 125 || result.code === 126 || result.code === 127 || result.code === null) throw new VerificationError("runner_failure");
        const passed = result.code === 0 && result.stderr === "" && result.stdout === JSON.stringify(test.expected);
        outcomes.push({ id: test.id, passed });
      }
      return outcomes;
    } catch (error) {
      if (error instanceof VerificationError) throw error;
      throw new VerificationError("runner_failure");
    } finally {
      if (directory) await rm(directory, { recursive: true, force: true });
    }
  }
}
