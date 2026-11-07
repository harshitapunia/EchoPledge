use anchor_lang::prelude::*;

use crate::{
    errors::ProofOfWorkError,
    seeds::{INTERNSHIP_SEED, MILESTONE_SEED, SUBMISSION_SEED},
    state::{Internship, Milestone, MilestoneStatus, Submission},
};

#[derive(Accounts)]
pub struct AttestMilestone<'info> {
    #[account(address = milestone.verifier @ ProofOfWorkError::InvalidRole)]
    pub verifier: Signer<'info>,
    #[account(
        seeds = [INTERNSHIP_SEED, internship.sponsor.as_ref(), &internship.internship_id.to_le_bytes()],
        bump = internship.bump,
    )]
    pub internship: Account<'info, Internship>,
    #[account(
        mut,
        seeds = [MILESTONE_SEED, internship.key().as_ref(), &milestone.milestone_id.to_le_bytes()],
        bump = milestone.bump,
        has_one = internship @ ProofOfWorkError::BindingMismatch,
        constraint = milestone.sponsor == internship.sponsor @ ProofOfWorkError::BindingMismatch,
    )]
    pub milestone: Account<'info, Milestone>,
    #[account(
        seeds = [SUBMISSION_SEED, milestone.key().as_ref()],
        bump = submission.bump,
        address = milestone.submission @ ProofOfWorkError::BindingMismatch,
        constraint = submission.milestone == milestone.key() @ ProofOfWorkError::BindingMismatch,
        constraint = submission.student == milestone.student @ ProofOfWorkError::BindingMismatch
    )]
    pub submission: Account<'info, Submission>,
}

pub fn handle_attest_milestone(
    ctx: Context<AttestMilestone>,
    expected_student: Pubkey,
    expected_requirements_hash: [u8; 32],
    expected_evidence_hash: [u8; 32],
) -> Result<()> {
    let now = Clock::get()?.unix_timestamp;
    let milestone = &mut ctx.accounts.milestone;
    let submission = &ctx.accounts.submission;
    require!(
        milestone.status == MilestoneStatus::Submitted,
        ProofOfWorkError::InvalidState
    );
    require!(
        milestone.verified_at == 0,
        ProofOfWorkError::BindingMismatch
    );
    require!(
        submission.submitted_at > 0
            && submission.submitted_at < milestone.submit_by
            && now >= submission.submitted_at,
        ProofOfWorkError::InvalidTerms
    );
    require_keys_eq!(
        expected_student,
        milestone.student,
        ProofOfWorkError::BindingMismatch
    );
    require!(
        expected_requirements_hash == milestone.requirements_hash
            && expected_evidence_hash == submission.evidence_hash,
        ProofOfWorkError::BindingMismatch
    );

    milestone.verified_at = now;
    milestone.status = MilestoneStatus::Verified;
    Ok(())
}
