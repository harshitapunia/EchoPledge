# Team workflow

| Owner | Responsibility |
|---|---|
| Palak | Blockchain Finance and Internship Engine. Design and create internship accounts, fund milestones, manage SPL escrow, secure PDAs and vaults, handle financial accounting and valid refunds, implement sponsor-side Solana TypeScript integration and financial security tests, and jointly review blockchain changes. |
| Harshita | Blockchain Verification, Settlement and Integration Engine. Implement student assignment, work submissions, verification authorization, settlement, completion records and reputation accounting. Own the GitHub verification service, student-side Solana TypeScript integration, Devnet deployment coordination, settlement and authorization security tests, and joint blockchain review. |
| Ganga | Complete frontend development. Own student and organization interfaces, internship listings, applications and selection screens, milestone progress, work submission, Proof Vault, funding and verification status, UI tests, and polish. |

Palak and Harshita jointly approve shared account layouts, PDA seeds, status transitions, and instruction signatures before implementing on separate feature branches. Review changes to shared interfaces together before integration. Ganga consumes stable interfaces from both blockchain developers. Private signing keys and blockchain security enforcement stay outside the frontend.
