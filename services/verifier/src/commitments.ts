import { createHash, timingSafeEqual } from "node:crypto";
import { PublicKey } from "@solana/web3.js";
import { requireValue } from "./errors.js";

export const PROGRAM_ID = new PublicKey("J2FkqDuuuHT14gxjVMhSryrX3Bs4Knct45NMLA79dGdZ");
export function sha256(bytes: Uint8Array): Buffer {
  return createHash("sha256").update(bytes).digest();
}
export function hex(value: unknown, size: number): Buffer {
  requireValue(typeof value === "string" && new RegExp("^[0-9a-f]{" + size * 2 + "}$").test(value), "invalid_request");
  return Buffer.from(value, "hex");
}
export function key(value: unknown): PublicKey {
  requireValue(typeof value === "string", "invalid_request");
  try {
    const result = new PublicKey(value);
    requireValue(result.toBase58() === value, "invalid_request");
    return result;
  } catch { throw new Error("invalid_public_key"); }
}
export function u64(value: unknown): Buffer {
  requireValue(typeof value === "string" && /^(0|[1-9][0-9]*)$/.test(value), "invalid_request");
  const n = BigInt(value);
  requireValue(n <= 0xffffffffffffffffn, "invalid_request");
  const bytes = Buffer.alloc(8);
  bytes.writeBigUInt64LE(n);
  return bytes;
}
export function requirementsHash(bytes: Uint8Array): Buffer {
  return sha256(Buffer.concat([Buffer.from("proofwork:requirements:v1", "ascii"), bytes]));
}
export interface Evidence {
  milestone: string; student: string; requirementsHash: string;
  repositoryId: string; contributorId: string; commit: string; nonce: string;
}
export function evidenceHash(e: Evidence): Buffer {
  return sha256(Buffer.concat([
    Buffer.from("proofwork:submission:v1", "ascii"),
    PROGRAM_ID.toBuffer(), key(e.milestone).toBuffer(), key(e.student).toBuffer(),
    hex(e.requirementsHash, 32), u64(e.repositoryId), u64(e.contributorId),
    hex(e.commit, 20), hex(e.nonce, 32),
  ]));
}
export function equal(a: Uint8Array, b: Uint8Array): boolean {
  return a.length === b.length && timingSafeEqual(a, b);
}
