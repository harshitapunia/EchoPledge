use anchor_lang::prelude::*;

use crate::{
    errors::ProofOfWorkError,
    seeds::{INTERNSHIP_SEED, MILESTONE_SEED, SUBMISSION_SEED},
    state::{Internship, Milestone, MilestoneStatus, Submission},
};

#[derive(Accounts)]
pub struct SubmitMilestone<'info> {
    #[account(mut, address = milestone.student @ ProofOfWorkError::InvalidRole)]
    pub student: Signer<'info>,
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
        init,
        payer = student,
        space = Submission::SPACE,
        seeds = [SUBMISSION_SEED, milestone.key().as_ref()],
        bump
    )]
    pub submission: Account<'info, Submission>,
    pub system_program: Program<'info, System>,
}

pub fn handle_submit_milestone(
    ctx: Context<SubmitMilestone>,
    evidence_hash: [u8; 32],
) -> Result<()> {
    let now = Clock::get()?.unix_timestamp;
    let milestone = &mut ctx.accounts.milestone;
    require!(
        milestone.status == MilestoneStatus::Assigned,
        ProofOfWorkError::InvalidState
    );
    require!(now < milestone.submit_by, ProofOfWorkError::DeadlinePassed);
    require!(evidence_hash != [0; 32], ProofOfWorkError::InvalidTerms);
    require_keys_eq!(
        milestone.submission,
        Pubkey::default(),
        ProofOfWorkError::BindingMismatch
    );

    ctx.accounts.submission.set_inner(Submission {
        milestone: milestone.key(),
        student: ctx.accounts.student.key(),
        evidence_hash,
        submitted_at: now,
        bump: ctx.bumps.submission,
    });
    milestone.submission = ctx.accounts.submission.key();
    milestone.status = MilestoneStatus::Submitted;
    Ok(())
}
