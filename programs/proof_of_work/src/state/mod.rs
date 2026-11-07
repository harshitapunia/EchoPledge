//! Approved account payloads. Anchor account ownership and discriminators
//! will be attached when the real program ID is configured.

use anchor_lang::prelude::*;

const DISCRIMINATOR_BYTES: usize = 8;

#[derive(AnchorSerialize, AnchorDeserialize, InitSpace, Debug, PartialEq, Eq)]
pub struct Internship {
    pub sponsor: Pubkey,
    pub internship_id: u64,
    pub bump: u8,
}

impl Internship {
    /// Total account allocation, including the future Anchor discriminator.
    pub const SPACE: usize = DISCRIMINATOR_BYTES + Self::INIT_SPACE;
}

const _: [(); 49] = [(); Internship::SPACE];

#[derive(AnchorSerialize, AnchorDeserialize, InitSpace, Debug, PartialEq, Eq)]
pub struct Milestone {
    pub internship: Pubkey,
    pub sponsor: Pubkey,
    pub student: Pubkey,
    pub verifier: Pubkey,
    pub reward_mint: Pubkey,
    pub submission: Pubkey,
    pub requirements_hash: [u8; 32],
    pub milestone_id: u64,
    pub reward_amount: u64,
    pub assign_by: i64,
    pub submit_by: i64,
    pub verified_at: i64,
    pub status: MilestoneStatus,
    pub bump: u8,
    pub vault_bump: u8,
    pub vault_authority_bump: u8,
}

impl Milestone {
    /// Total account allocation, including the future Anchor discriminator.
    pub const SPACE: usize = DISCRIMINATOR_BYTES + Self::INIT_SPACE;
}

const _: [(); 276] = [(); Milestone::SPACE];

#[derive(AnchorSerialize, AnchorDeserialize, InitSpace, Debug, PartialEq, Eq)]
pub struct Submission {
    pub milestone: Pubkey,
    pub student: Pubkey,
    pub evidence_hash: [u8; 32],
    pub submitted_at: i64,
    pub bump: u8,
}

impl Submission {
    /// Total account allocation, including the future Anchor discriminator.
    pub const SPACE: usize = DISCRIMINATOR_BYTES + Self::INIT_SPACE;
}

const _: [(); 113] = [(); Submission::SPACE];

#[derive(AnchorSerialize, AnchorDeserialize, InitSpace, Debug, PartialEq, Eq)]
pub struct CompletionRecord {
    pub milestone: Pubkey,
    pub student: Pubkey,
    pub sponsor: Pubkey,
    pub verifier: Pubkey,
    pub submission: Pubkey,
    pub requirements_hash: [u8; 32],
    pub evidence_hash: [u8; 32],
    pub verified_at: i64,
    pub settled_at: i64,
    pub bump: u8,
}

impl CompletionRecord {
    /// Total account allocation, including the future Anchor discriminator.
    pub const SPACE: usize = DISCRIMINATOR_BYTES + Self::INIT_SPACE;
}

const _: [(); 249] = [(); CompletionRecord::SPACE];

#[derive(AnchorSerialize, AnchorDeserialize, InitSpace, Debug, Clone, Copy, PartialEq, Eq)]
pub enum MilestoneStatus {
    Created,
    Funded,
    Assigned,
    Submitted,
    Verified,
    Settled,
    Refunded,
}
