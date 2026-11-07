use anchor_lang::prelude::*;

use crate::{
    errors::ProofOfWorkError,
    seeds::{INTERNSHIP_SEED, MILESTONE_SEED},
    state::{Internship, Milestone, MilestoneStatus},
};

#[derive(Accounts)]
pub struct AssignStudent<'info> {
    #[account(address = internship.sponsor @ ProofOfWorkError::InvalidRole)]
    pub sponsor: Signer<'info>,
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
}

pub fn handle_assign_student(ctx: Context<AssignStudent>, student: Pubkey) -> Result<()> {
    let milestone = &mut ctx.accounts.milestone;
    require!(
        milestone.status == MilestoneStatus::Funded,
        ProofOfWorkError::InvalidState
    );
    require!(
        Clock::get()?.unix_timestamp < milestone.assign_by,
        ProofOfWorkError::DeadlinePassed
    );
    require_keys_eq!(
        milestone.student,
        Pubkey::default(),
        ProofOfWorkError::BindingMismatch
    );
    require!(
        student != Pubkey::default()
            && student.is_on_curve()
            && student != milestone.sponsor
            && student != milestone.verifier,
        ProofOfWorkError::InvalidRole
    );

    milestone.student = student;
    milestone.status = MilestoneStatus::Assigned;
    Ok(())
}
