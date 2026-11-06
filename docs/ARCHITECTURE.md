# Draft shared contract specification

Palak and Harshita must approve account fields, PDA seeds, instruction signatures, and state transitions before implementation. The components and transitions below are proposals.

| Component | Proposed on-chain responsibilities |
|---|---|
| Internship | Identify the sponsoring organization authority and link its milestones. |
| Milestone | Bind the internship, assigned student, approved requirements commitment, designated verifier, reward mint and amount, and lifecycle state. |
| Escrow vault | Hold a single funded milestone's reward in a dedicated SPL token account owned by the approved token program. A milestone-specific PDA is the token account's transfer authority. |
| Submission | Bind an assigned student's evidence commitment and submission version to the milestone. |
| Verification | Record an authorized successful attestation bound to the milestone, submission version and digest, assigned student, and fixed requirements. |
| Completion record | Record the settled milestone and student. Create it atomically with successful settlement and make it unique to the milestone. |

Listings, applications, identities, private evidence, repository access, test logs, and verification execution belong off-chain. Only agreed references or commitments belong on-chain. Treat all submitted code as untrusted and isolate verifier execution from credentials. The verifier is trusted to evaluate the agreed checks and attest accurately. The program verifies the attestation's authority, bindings, and state. It cannot independently establish work quality or employment history.

Proposed flow is funding and assignment, submission, successful verification, then settlement. Fix requirements before funded work begins. Settlement can be triggered under agreed program rules after successful verification without an additional organization signature. A submission or sponsor silence alone cannot release funds. Manual review, disputes, and any time-based rules require explicit approval. There is no automatic payout on timeout.

Validate the internship and milestone PDA relationships, program ownership of application accounts, and approved token-program ownership of token accounts. Check the vault address, mint, token program, transfer authority, and reward amount. Bind the recipient token account to the assigned student and reward mint. Use checked arithmetic. Disallow unrelated vault access, repeat settlement, and unauthorized refunds. Settlement and refund must be mutually exclusive terminal outcomes with token movement and state changes in the same atomic transaction.

Team approval is required for field types and layouts, seed encodings, instruction and signer sets, funding and assignment ordering, supported token program and mint, verifier rotation, resubmission and replay rules, review and dispute handling, refund eligibility and destinations, vault closure, and completion or reputation semantics.
