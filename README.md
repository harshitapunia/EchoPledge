# 🛡️ EchoPledge

### Private Reports. Verifiable Response.

**A privacy-conscious institutional accountability platform powered by Solana.**

EchoPledge is a Web3-based reporting and accountability system designed to make institutional response commitments more transparent, verifiable, and enforceable.

The platform enables individuals to submit sensitive reports without requiring cryptocurrency wallets or blockchain knowledge. Behind the scenes, Solana smart contracts manage institutional accountability bonds, enforce acknowledgment deadlines, and apply predefined consequences when institutions fail to meet their commitments.

**Our vision is simple: People deserve to be heard, and institutions should be accountable for responding.**

> **Development Notice:** EchoPledge is a hackathon prototype operating exclusively on Solana Devnet. It uses fictional reports and DEMO tokens. It is not a production reporting service or an emergency assistance platform.

---

## 🌍 The Problem

Reporting harassment, misconduct, discrimination, or other sensitive incidents can be difficult, particularly when individuals lack confidence in the institutions responsible for addressing their complaints.

Traditional reporting systems may face several challenges:

* **Limited transparency:** Reporters may not know whether their complaints were acknowledged or processed.
* **Centralized control:** Institutions may control the reporting database, status updates, and administrative records.
* **Lack of enforceable accountability:** Missing a response deadline may have no independently enforceable consequence.
* **Privacy concerns:** Reporters may worry about exposing personal information or sensitive evidence.
* **Technical barriers:** Blockchain-based reporting systems may require cryptocurrency wallets, transaction fees, or unfamiliar technology.

These challenges can discourage individuals from using formal reporting mechanisms.

**The central question behind EchoPledge is:**

*What if institutions could make verifiable response commitments, while reporters could access the system without ever needing to understand blockchain?*

---

## 💡 Our Solution

EchoPledge combines a simple, walletless reporting interface with a programmable accountability protocol built on Solana.

Participating institutions voluntarily establish acknowledgment policies and deposit accountability bonds into smart-contract-controlled vaults.

When an independent intake authority admits an eligible report and attests that the institution has been notified, the blockchain records an acknowledgment deadline.

The institution must acknowledge the case before the deadline.

If it fails to do so, an independent caller can trigger a predefined penalty enforced by the smart contract.

Unlike traditional reporting systems, the institution cannot unilaterally rewrite an already established on-chain obligation through its administrative dashboard.

### What Makes EchoPledge Different?

**Private reporting for users. Verifiable accountability for institutions.**

Reporters interact with a familiar web application, while Solana handles the financial and deadline-enforcement logic.

The blockchain does not determine whether an allegation is true or whether an investigation was successful. It enforces specific acknowledgment commitments that participating institutions have agreed to.

---

## ⚙️ How EchoPledge Works

### 1. Institution Creates an Accountability Policy

A participating institution registers an acknowledgment policy.

The policy specifies:

* Authorized institutional officer.
* Independent intake authority.
* Maximum acknowledgment response time.
* Penalty amount for missed deadlines.
* Designated penalty recipient.
* Accountability bond deposited in DEMO tokens.

The bond is stored in a Solana program-controlled vault.

### 2. Reporter Submits a Report

A reporter accesses EchoPledge through a standard web interface.

**No cryptocurrency wallet, SOL tokens, or blockchain knowledge is required.**

The reporter submits information through a privacy-conscious form.

Sensitive report information is protected off-chain rather than published on the blockchain.

The system generates a private tracking credential for checking report progress.

### 3. Independent Intake Reviews the Report

An authorized intake service reviews whether the submission qualifies under the institution's reporting policy.

Once the report is admitted, the intake process records confirmation that the institution was notified through its designated channel.

This step is performed by a trusted intake authority.

### 4. Blockchain Records the Accountability Obligation

An authorized intake signer submits the case admission transaction to Solana.

A separate relayer pays the transaction fee.

The smart contract:

* Verifies the intake authority.
* Records an opaque commitment associated with the case.
* Establishes the acknowledgment deadline.
* Reserves the required penalty amount from the institutional bond.

The acknowledgment clock begins at the on-chain admission event following the trusted notification attestation.

### 5. Institution Acknowledges the Case

The institution's authorized officer can acknowledge the admitted case before its deadline.

The smart contract verifies the officer's authority.

If acknowledgment is successful:

* The case becomes `ACKNOWLEDGED`.
* The reserved bond liability is released.
* No penalty is charged.

Acknowledgment confirms receipt of the case. It does not establish that an investigation or resolution has occurred.

### 6. Missed Deadline Triggers Accountability

If the deadline passes without acknowledgment, an eligible caller can invoke the enforcement instruction.

The Solana program verifies that the deadline has expired and the case remains active.

It then:

* Marks the case as `PENALIZED`.
* Transfers the predefined DEMO-token penalty to the designated recipient.
* Releases the case's reserved liability.
* Prevents duplicate penalties.

**The accountability rules are enforced by the smart contract rather than an institution-controlled dashboard.**

### 7. Transparent Status Tracking

Reporters can check their case status using their private tracking credentials.

Institutions can monitor acknowledgment obligations.

Observers can inspect non-sensitive on-chain accountability records without accessing private report contents.

---

## ✨ Core Features

### 🔐 Walletless Reporting

Reporters can submit and track fictional cases without creating or connecting a Solana wallet.

### 🛡️ Privacy-Conscious Evidence Handling

Sensitive report contents remain off-chain. Only minimal, opaque commitments and accountability metadata are recorded publicly.

### ⛓️ Programmable Institutional Bonds

Institutions deposit DEMO tokens into PDA-controlled vaults governed by Solana smart contracts.

### ⏳ Enforceable Acknowledgment Deadlines

The on-chain Clock sysvar determines whether an institution has fulfilled its acknowledgment obligation within the agreed window.

### 💰 Automated-Rule Penalty Enforcement

When a deadline is missed, an independent caller can trigger the predefined penalty without requiring institutional approval.

### 🔑 Role-Based Authorization

Separate authorities control report admission, institutional acknowledgment, and transaction fee payment.

### 📊 Accountability Tracking

The platform displays report progress, institutional obligations, bond balances, and confirmed blockchain transactions.

### 🧪 Security Attack Lab

The prototype demonstrates how the smart contract rejects unauthorized actions, premature penalties, and duplicate enforcement attempts.

---

## ⛓️ Why Blockchain?

EchoPledge uses blockchain for more than recording reports.

Its central purpose is to make specific institutional accountability commitments independently enforceable.

A conventional reporting application can store deadlines in a database. However, an administrator controlling that database may also control how obligations are recorded and enforced.

EchoPledge uses Solana to provide:

| Blockchain Capability         | Purpose                                                  |
| ----------------------------- | -------------------------------------------------------- |
| Program-controlled escrow     | Holds institutional accountability bonds                 |
| Immutable transaction history | Provides auditable records of on-chain actions           |
| Smart-contract authorization  | Restricts who can admit and acknowledge cases            |
| Deadline enforcement          | Validates acknowledgment deadlines using on-chain time   |
| Programmable penalties        | Controls predetermined bond transfers                    |
| Permissionless enforcement    | Allows independent callers to trigger eligible penalties |
| Transparent accounting        | Tracks reserved liabilities and financial consequences   |

The protocol still relies on trusted off-chain intake and notification processes. Blockchain provides verifiable enforcement of admitted obligations, not independent verification of real-world allegations.

---

## 🛠️ Technology Stack

| Layer                  | Technology                                                                   |
| ---------------------- | ---------------------------------------------------------------------------- |
| Blockchain             | Solana Devnet                                                                |
| Smart Contracts        | Rust                                                                         |
| Blockchain Framework   | Anchor                                                                       |
| Token Operations       | SPL Token Program                                                            |
| Blockchain Integration | Solana SDK and Anchor TypeScript Client                                      |
| Frontend               | Next.js, TypeScript                                                          |
| Styling                | Tailwind CSS                                                                 |
| Backend                | Node.js                                                                      |
| Database               | Supabase                                                                     |
| Security               | Cryptographic commitments, authorization checks, protected off-chain storage |
| Testing                | Anchor integration tests and Solana program testing tools                    |
| Version Control        | Git and GitHub                                                               |

---

## 🏗️ System Architecture

EchoPledge separates private reporting from public blockchain enforcement.

```text
                 ECHOPLEDGE
                     |
                     v
             Reporter Web Portal
                (No Wallet)
                     |
                     v
                Backend API
                     |
          +----------+----------+
          |                     |
          v                     v
   Protected Report       Private Tracking
        Storage              Credential
          |
          v
    Independent Intake
          |
          v
   Notification Attestation
          |
          v
    Authorized Transaction
          |
          v
      Solana Relayer
          |
          v
       SOLANA DEVNET
          |
          v
     Rust / Anchor Program
          |
       +--+-------------------+
       |                      |
       v                      v
 Institutional           Case Lifecycle
  Bond & Policy             Engine
       |                      |
       v                      v
  PDA Token Vault       Deadline Validation
       |                      |
       +-----------+----------+
                   |
                   v
           Acknowledgment
                  OR
          Penalty Enforcement
                   |
                   v
          Accountability Status
```

### On-Chain Components

The Solana program manages:

* Institutional policy accounts.
* PDA-controlled token vaults.
* Authorized roles.
* Case commitments.
* Acknowledgment deadlines.
* Case lifecycle states.
* Reserved bond liabilities.
* Penalty transfers.

### Off-Chain Components

The backend manages:

* Fictional report intake.
* Protected report storage.
* Private tracking credentials.
* Intake eligibility decisions.
* Simulated institutional notifications.
* Transaction preparation and submission.

This separation helps reduce unnecessary exposure of sensitive reporting information on public blockchain accounts.

---

## 🔒 Security and Privacy

Because EchoPledge addresses sensitive reporting, privacy and security are fundamental design considerations.

### Reporter Privacy

* Reporters do not require blockchain wallets.
* Personal report details are not stored on-chain.
* Private tracking credentials are not published publicly.
* The prototype does not require government identity documents.
* Public blockchain records use opaque identifiers and minimal metadata.

Walletless reporting reduces direct wallet-to-reporter linkage, but it does not guarantee complete anonymity.

### Smart Contract Security

The protocol is designed to enforce the following invariants:

1. Only an authorized intake authority can admit a case.
2. Only the designated officer can acknowledge that institution's case.
3. Penalties cannot be enforced before the applicable deadline.
4. An already penalized case cannot be penalized again.
5. Reserved bond liability cannot exceed available vault funds.
6. Each terminal case transition releases its liability reservation exactly once.
7. Penalty transfers can only reach the policy's authorized recipient.
8. Institutions cannot withdraw their accountability bonds through the MVP program.

These guarantees must be validated through automated tests before being considered implemented.

### Important Trust Assumptions

EchoPledge does not claim complete decentralization.

**Trusted components:** Independent intake, eligibility review, notification attestation, backend infrastructure, and signer custody.

**Blockchain-enforced components:** Authorized state transitions, acknowledgment deadlines, liability accounting, and predefined bond penalties.

A blockchain commitment does not prove that a complaint is true, and an acknowledgment does not prove that the underlying issue has been resolved.

---

## 🎯 HerHack 2026 — Project Relevance

EchoPledge is being developed for the **Web3/Blockchain track at HerHack 2026**.

The project connects two important areas:

### Meaningful Blockchain Engineering

EchoPledge demonstrates practical Solana development through:

* Rust smart contracts.
* Anchor account constraints.
* Program Derived Addresses.
* SPL token operations.
* Cross-Program Invocations.
* On-chain state machines.
* Time-based enforcement.
* Permissionless transaction execution.

### Women's Safety and Institutional Accountability

EchoPledge explores how technology could improve accountability in reporting processes relevant to harassment, discrimination, and institutional misconduct.

The project emphasizes accessibility, privacy-conscious reporting, and verifiable acknowledgment commitments.

Its purpose is not to replace existing legal, institutional, or emergency reporting procedures.

Instead, it demonstrates how programmable financial commitments could support more accountable reporting workflows.

---

## 🚀 Development Scope

### Current MVP Goals

The hackathon prototype focuses on:

* Walletless fictional reporting.
* Secure tracking credentials.
* Institutional policy creation.
* DEMO-token bond funding.
* Authorized case admission.
* Acknowledgment deadlines.
* Bond liability accounting.
* Officer acknowledgment.
* Missed-deadline penalty enforcement.
* Solana Devnet integration.
* Security tests and Attack Lab demonstrations.

### Future Possibilities

Potential extensions include:

* Multi-stage investigation and resolution commitments.
* Independent oversight networks.
* Privacy-preserving batch commitments.
* Zero-knowledge eligibility proofs.
* Enhanced confidential reporting infrastructure.
* Real institutional and support-organization partnerships.
* More sophisticated accountability and dispute mechanisms.

These are future development directions, not features claimed to be completed in the MVP.

---

## 🧪 Demonstration Environment

EchoPledge is currently a development-stage hackathon concept.

The planned demonstration uses:

**Network:** Solana Devnet
**Tokens:** Custom DEMO tokens
**Reports:** Fictional test cases
**Institutions:** Simulated institutional roles
**Financial penalties:** Demonstration-token transfers only

No real funds, real complaints, or production institutional agreements are involved.

The prototype is not intended to receive genuine sensitive reports or provide emergency assistance.

---

## 🌟 Our Vision

Reporting systems should be accessible to everyone, regardless of technical knowledge.

At the same time, institutional commitments should be transparent and accountable.

EchoPledge explores how a simple reporting experience can be combined with blockchain-based enforcement of measurable institutional obligations.

**We believe blockchain should work in the background—making accountability stronger without making the user's experience harder.**

### EchoPledge

**Private Reports. Verifiable Response.**
