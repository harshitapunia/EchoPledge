import { PublicKey } from "@solana/web3.js";
import { PROGRAM_ID, equal, key, sha256 } from "./commitments.js";
import { requireValue, VerificationError } from "./errors.js";
import { jsonResponse, type Fetcher } from "./http.js";

export interface ChainState {
  milestone: string; submission: string; student: string; verifier: string;
  requirementsHash: string; evidenceHash: string; snapshot: string;
}
export interface StateReader { read(milestone: string): Promise<ChainState> }

interface Account { owner: string; data: Buffer }
function decode(value: unknown, name: string, size: number): Account {
  requireValue(value !== null && typeof value === "object", "missing_onchain_state");
  const account = value as Record<string, unknown>;
  requireValue(account.owner === PROGRAM_ID.toBase58() && account.executable === false
    && Array.isArray(account.data) && account.data[1] === "base64" && typeof account.data[0] === "string", "invalid_onchain_state");
  const data = Buffer.from(account.data[0], "base64");
  requireValue(data.toString("base64") === account.data[0] && data.length === size
    && equal(data.subarray(0, 8), sha256(Buffer.from("account:" + name)).subarray(0, 8)), "invalid_onchain_state");
  return { owner: account.owner, data };
}
function pubkey(bytes: Buffer, offset: number): PublicKey { return new PublicKey(bytes.subarray(offset, offset + 32)); }
function pda(label: string, parent: PublicKey, id?: Buffer): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([Buffer.from(label), parent.toBuffer(), ...(id ? [id] : [])], PROGRAM_ID);
}
export function decodeState(milestoneAddress: string, milestoneValue: unknown, submissionValue: unknown, internshipValue: unknown, verifier: string): ChainState {
  try {
    const milestone = key(milestoneAddress);
    const m = decode(milestoneValue, "Milestone", 276).data;
    const s = decode(submissionValue, "Submission", 113).data;
    const i = decode(internshipValue, "Internship", 49).data;
    const parent = pubkey(m, 8), sponsor = pubkey(m, 40), student = pubkey(m, 72);
    const linkedSubmission = pubkey(m, 168);
    const [expectedMilestone, milestoneBump] = pda("milestone", parent, m.subarray(232, 240));
    const [expectedSubmission, submissionBump] = pda("submission", milestone);
    const [expectedInternship, internshipBump] = pda("internship", pubkey(i, 8), i.subarray(40, 48));
    requireValue(expectedMilestone.equals(milestone) && m[273] === milestoneBump
      && expectedSubmission.equals(linkedSubmission) && s[112] === submissionBump
      && expectedInternship.equals(parent) && i[48] === internshipBump
      && pubkey(i, 8).equals(sponsor)
      && pubkey(s, 8).equals(milestone) && pubkey(s, 40).equals(student), "invalid_onchain_state");
    requireValue(m[272] === 3 && m.readBigInt64LE(264) === 0n
      && m.readBigUInt64LE(240) > 0n
      && s.readBigInt64LE(104) > 0n && s.readBigInt64LE(104) < m.readBigInt64LE(256)
      && pubkey(m, 104).equals(key(verifier)), "invalid_onchain_state");
    return {
      milestone: milestone.toBase58(), submission: linkedSubmission.toBase58(),
      student: student.toBase58(), verifier, requirementsHash: m.subarray(200, 232).toString("hex"),
      evidenceHash: s.subarray(72, 104).toString("hex"),
      snapshot: sha256(Buffer.concat([m, s, i])).toString("hex"),
    };
  } catch (error) {
    if (error instanceof VerificationError && error.code === "missing_onchain_state") throw error;
    throw new VerificationError("invalid_onchain_state");
  }
}

export class DevnetReader implements StateReader {
  constructor(private readonly rpc: string | undefined, private readonly verifier: string | undefined, private readonly request: Fetcher = fetch) {}
  async read(address: string): Promise<ChainState> {
    requireValue(this.rpc && this.verifier, "missing_onchain_state");
    // The initial service supports only the explicitly approved public Devnet endpoint.
    requireValue(this.rpc === "https://api.devnet.solana.com", "invalid_onchain_state");
    try {
      const milestone = key(address);
      const [submission] = pda("submission", milestone);
      const first = await this.accounts([milestone.toBase58(), submission.toBase58()]);
      const m = decode(first[0], "Milestone", 276).data;
      const parent = pubkey(m, 8).toBase58();
      const all = await this.accounts([milestone.toBase58(), submission.toBase58(), parent]);
      return decodeState(address, all[0], all[1], all[2], this.verifier);
    } catch (error) {
      if (error instanceof VerificationError) throw error;
      throw new VerificationError("invalid_onchain_state");
    }
  }
  private async accounts(addresses: string[]): Promise<unknown[]> {
    const response = await this.request(this.rpc!, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getMultipleAccounts", params: [addresses, { encoding: "base64", commitment: "confirmed" }] }),
      redirect: "error", signal: AbortSignal.timeout(10_000),
    });
    requireValue(response.ok, "missing_onchain_state");
    const json = await jsonResponse(response, 16_384) as { error?: unknown; result?: { value?: unknown[] } };
    requireValue(!json.error && Array.isArray(json.result?.value) && json.result.value.length === addresses.length, "invalid_onchain_state");
    return json.result.value;
  }
}
