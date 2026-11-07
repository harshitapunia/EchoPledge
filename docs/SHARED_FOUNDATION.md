# Shared Rust foundation

The [approved contract specification](CONTRACT_SPEC.md) defines the ABI and permitted transitions. Finance and verification live inside the single `proof_of_work` Anchor crate.

| Module | Contents and consumers |
|---|---|
| `crate::state` | Both teams use `Internship`, `Milestone`, `Submission`, `CompletionRecord`, and `MilestoneStatus`. The account types expose total `SPACE` for allocation. |
| `crate::seeds` | Both teams import the approved prefixes and seed component helpers. Use `encode_id` for eight-byte little-endian IDs. The helpers return seeds before the canonical bump and do not derive addresses. |
| `crate::errors::ProofOfWorkError` | Both teams use shared Anchor errors. The approved variant order maps to codes 6000 through 6010. |
| `crate::instructions::finance` | Palak implements internship and milestone creation, funding, settlement, and refunds. Finance also owns escrow and token-transfer helpers, completion record creation, financial security tests, and the finance TypeScript client. |
| `crate::instructions::verification` | Harshita implements student assignment, submission, and attestation. Verification also owns the external GitHub verifier, verification authorization and replay protection, verification security tests, the student and verification TypeScript client, and end-to-end integration. |

Both teams use the same `MilestoneStatus`. Finance owns the creation and funding steps, settlement from `Verified`, and the approved unclaimed refund paths from `Funded` or `Assigned`. Verification owns assignment, submission, and the transition from `Submitted` to `Verified`. Handlers must enforce the approved role, state, timing, and account constraints. Sharing the enum does not itself enforce those constraints.

Keep `lib.rs`, `state/`, `seeds.rs`, `errors.rs`, and the shared `instructions/mod.rs` stable during parallel implementation. Coordinate public instruction contexts, vault CPI interfaces, and any ABI or fixture changes through joint review. Keep handler files within the appropriate team namespace. Ganga owns `apps/web/` and integrates against reviewed interfaces.

The four state types use Anchor's `#[account]` macro. Their allocation constants include the eight-byte discriminator. ABI fixtures verify exact payload bytes, full account size, the discriminator, and program ownership.

## Devnet program identity

The public ProofOfWork program ID is `J2FkqDuuuHT14gxjVMhSryrX3Bs4Knct45NMLA79dGdZ`. It is configured in `Anchor.toml` under `[programs.devnet]` and in `programs/proof_of_work/src/lib.rs` via `declare_id!`. Collaborators use this public ID for clients and PDA derivation. The same seeds and a different program ID produce different PDA addresses. Keep the program keypair private. Collaborators do not need it for the host-side Rust checks.

The Anchor entry point has no business instruction handlers. A local `anchor build --tools-version v1.57 --arch v3` checks the program scaffold only. Anchor's normal build expects a matching local program keypair in its ignored build directory and can create a new identity if it is missing. Coordinate build and deployment identity with Harshita before invoking that build on another machine. The program has not been deployed. Business instructions, on-chain integration tests, the DEMO mint, deployment and upgrade authority configuration, and separately authorized deployment are pending.
