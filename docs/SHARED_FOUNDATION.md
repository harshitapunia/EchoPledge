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

The current types serialize account payloads and reserve eight additional bytes in their allocation constants. The real program ID is required to attach Anchor's `#[account]` ownership and discriminator behavior and define the on-chain entry point. Payload fixtures verify exact byte order and size independently of that identity. Program-specific PDA derivation, Anchor account validation, and deployment remain separate steps.
