# EchoPledge — Permanent Development Instructions

These instructions apply to all development in this repository. The highest priority is preserving successfully completed functionality while implementing new features securely and incrementally.

## Project context

EchoPledge is a Solana-based institutional accountability demonstration for the HerHack hackathon, developed by a four-person team in one shared GitHub repository.

- Reporters do not need cryptocurrency wallets.
- Institutions commit clearly labeled DEMO-token accountability bonds on Solana Devnet.
- Authorized intake authorities admit eligible fictional cases.
- Institutions must acknowledge admitted cases within predefined deadlines.
- If an institution misses its acknowledgment deadline, an independent caller can invoke the Rust/Anchor smart contract to enforce the predefined penalty.

Technology stack: Solana Devnet only; Rust and Anchor smart contracts; TypeScript, Solana SDK and Anchor client integration; Next.js, TypeScript and Tailwind CSS frontend; Node.js backend; Supabase if required; custom DEMO tokens on Devnet.

## Developer ownership

- **Harshita:** GitHub repository coordination, case lifecycle engine, intake authorization, officer acknowledgment, deadline and penalty enforcement, relayer and minimal backend, and blockchain integration.
- **Palak:** Institutional policy engine, PDA-controlled bond vault, SPL token funding and transfers, financial accounting and security, and blockchain integration.
- **Manasvi:** Reporter-facing frontend, report submission and tracking UI.
- **Ganga:** Institution, intake, observer and Attack Lab frontend.

## Rule 1 — Preserve completed functionality

- Never remove, rewrite, refactor or break previously implemented and successfully tested features.
- Prefer minimal, additive changes.
- If an existing feature genuinely requires modification for security or integration, explain the proposed changes and request approval before proceeding.
- Never silently change completed functionality.

## Rule 2 — Solana Devnet only

- The entire project must operate exclusively on Solana Devnet.
- Never use Mainnet or real funds.
- All deployments, transactions, token operations, RPC calls and Explorer links must use Devnet.
- Use clearly labeled DEMO tokens.
- Never label custom test tokens as genuine USDC.

## Rule 3 — Ask for required configuration

- Whenever an implementation requires a wallet address, public key, program ID, token mint, RPC endpoint, API URL, API key or other external configuration, ask Harshita or Palak for the required value.
- Never invent real configuration values.
- Safe placeholders are permitted in `.env.example`, but they must be clearly marked as placeholders.
- Never ask for private keys, seed phrases or other secrets to be pasted into chat. For API keys and other sensitive configuration, ask Harshita or Palak to configure the value securely rather than disclose it in chat.
- Explain how to configure sensitive values securely in local environment variables.

## Rule 4 — Protect secrets

- Never commit private keys, seed phrases, signing keypair files, API secrets or local `.env` files.
- Never expose sensitive credentials in frontend code, logs or Git commits.
- Use environment variables for secrets and `.env.example` for documenting required variable names.

## Rule 5 — Respect developer ownership

- Palak and Harshita must work on separate feature branches.
- Do not modify another developer's assigned modules without approval.
- Shared Anchor structures, PDA seeds, instruction signatures and public interfaces require agreement from both blockchain developers before modification.

## Rule 6 — Test every feature

- Every new blockchain feature must include appropriate tests.
- Include negative tests for authorization, account validation, financial invariants and invalid state transitions.
- Run existing regression tests before reporting completion.
- Never claim a test passed unless it actually executed successfully.
- If a test cannot run, report that limitation clearly.

## Rule 7 — Safe Git workflow

- Never push directly to `main`.
- Never automatically commit, push, merge, rebase, reset or force-push unless explicitly instructed.
- Work only on the assigned branch.
- Keep changes limited to the requested task.
- Before any proposed commit, report modified files and test results.

## Rule 8 — Security requirements

Smart contracts must validate:

- Authorized signers.
- PDA seeds and account ownership.
- Correct SPL token mint and token program.
- Token account authority and destinations.
- Valid case-state transitions.
- Deadline conditions.
- Reserved bond liabilities.
- Checked arithmetic.
- Duplicate and replayed operations.

Do not rely solely on frontend or backend checks for blockchain security.

## Rule 9 — Privacy and demo safety

- EchoPledge is a demonstration prototype.
- Use only fictional reports and fictional institutional scenarios.
- Do not collect or process real harassment complaints or sensitive personal information.
- Do not publish report contents, tracking secrets or identifying metadata on-chain.

## Rule 10 — Report results

After completing any development task, report:

1. What was implemented.
2. Which files were created or changed.
3. Which tests were executed.
4. Whether existing functionality remains unchanged.
5. Any unresolved issues.
6. Current Git branch.
7. Working-tree status.
