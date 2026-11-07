# ProofOfWork

**Build Experience. Prove Work. Unlock Opportunities.**

Students can struggle to show what they did during an internship. Organizations need a clear way to describe meaningful work, commit rewards, and evaluate evidence against requirements the student knows up front.

ProofOfWork proposes structured internships with predefined milestones and verifiable completion records. Startups, companies, NGOs, open-source organizations, and college clubs can sponsor opportunities. Smaller assignments can provide an entry point.

## Proposed workflow

1. An organization publishes an internship with milestones and acceptance conditions.
2. A student applies and is selected. The organization commits the milestone reward to SPL-token escrow.
3. The student submits evidence of completed work.
4. For supported objectively testable software milestones, an authorized independent verifier evaluates the submission against the fixed conditions.
5. A successful attestation can enable the program to settle the milestone and issue a completion record without another discretionary sponsor signature. Participating organizations may consider that record for future opportunities.

Solana is used to hold committed rewards in program-controlled vaults, enforce settlement rules, and record completion. The verifier evaluates the work off-chain. Submission and sponsor silence alone do not establish completion. Review, disputes, and refunds need agreed rules. Keep private evidence and student details off-chain.

## Development status

| Stage | Scope |
|---|---|
| Implemented | Shared Rust/Anchor foundation, approved MVP design, Devnet program identity, and Anchor account definitions. The program has no business instructions and has not been deployed. |
| Planned | Internship and milestone accounts, escrow, submission, verification, settlement, completion records, tests, TypeScript integration, GitHub verification service, and student and organization UI. |
| Future extension | Additional evidence types and use of completion records across participating organizations, subject to design and approval. |

## Repository layout and setup

- [Anchor crate](programs/proof_of_work/) uses Rust and Anchor for the proposed Solana program.
- [Architecture draft](docs/ARCHITECTURE.md) defines the proposed accounts, trust boundaries, and settlement rules.
- [Team workflow](docs/TEAM_WORKFLOW.md) defines ownership and review. Palak owns finance and internships, Harshita owns verification, settlement and integration, and Ganga owns the frontend.
- Proposed locations are `client/` for TypeScript Solana integration, `services/verifier/` for the GitHub verification service, `apps/web/` for Next.js, and `tests/` for integration tests.

Use Ubuntu/WSL with Rust and Cargo 1.98.1 via the installed stable toolchain, Anchor 1.2.2, Solana CLI 4.1.2, and platform-tools v1.57. Node 24 LTS and Yarn are intended for TypeScript development. From the repository root, run:

```sh
cargo fmt --all -- --check
cargo check --workspace --locked
```

See [Shared Rust foundation](docs/SHARED_FOUNDATION.md) for the public Devnet program ID and local Anchor build requirements.

## Devnet-only demo

Use fictional organizations and internships and clearly labeled non-monetary DEMO tokens. The prototype involves no real stipends, customer funds, Mainnet deployment, or employment or legal guarantees.
