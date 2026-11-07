# Team workflow

| Owner | Responsibility |
|---|---|
| Palak | Finance and Internship Engine. Own `create_internship`, `create_milestone`, `fund_milestone`, `settle_milestone`, and `refund_unclaimed_milestone`, plus escrow and token-transfer helpers, completion records, financial security tests, and the finance TypeScript client. |
| Harshita | Verification and Integration Engine. Own `assign_student`, `submit_milestone`, and `attest_milestone`, plus the GitHub automated verification service, verification authorization and replay protection, verification security tests, the student and verification TypeScript client, and end-to-end integration coordination. |
| Ganga | Complete frontend ownership in `apps/web/`. Own the organization and student dashboards, internship opportunities, Proof Vault, frontend UI tests, and frontend integration. |

Palak and Harshita jointly approve shared account layouts, PDA seeds, status transitions, and instruction signatures before implementing on separate feature branches. Review changes to shared interfaces together before integration. Ganga consumes stable interfaces from both blockchain developers. Private signing keys and blockchain security enforcement stay outside the frontend.

See [Shared Rust foundation](SHARED_FOUNDATION.md) for the shared modules and review boundaries.
