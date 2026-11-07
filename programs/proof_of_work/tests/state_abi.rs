use anchor_lang::prelude::*;
use proof_of_work::state::{CompletionRecord, Internship, Milestone, MilestoneStatus, Submission};

fn assert_payload<T>(value: T, expected: &[u8], account_space: usize)
where
    T: AnchorSerialize + AnchorDeserialize + std::fmt::Debug + PartialEq,
{
    let bytes = borsh::to_vec(&value).unwrap();
    assert_eq!(bytes, expected);
    assert_eq!(bytes.len() + 8, account_space);
    assert_eq!(T::try_from_slice(expected).unwrap(), value);
}

#[test]
fn internship_matches_approved_payload() {
    let value = Internship {
        sponsor: Pubkey::new_from_array([1; 32]),
        internship_id: 2 * 256 + 1,
        bump: 3,
    };
    let mut expected = Vec::new();
    expected.extend_from_slice(&[1; 32]);
    expected.extend_from_slice(&[1, 2, 0, 0, 0, 0, 0, 0]);
    expected.extend_from_slice(&[3]);
    assert_payload(value, &expected, Internship::SPACE);
}

#[test]
fn milestone_matches_approved_payload() {
    let value = Milestone {
        internship: Pubkey::new_from_array([1; 32]),
        sponsor: Pubkey::new_from_array([2; 32]),
        student: Pubkey::new_from_array([3; 32]),
        verifier: Pubkey::new_from_array([4; 32]),
        reward_mint: Pubkey::new_from_array([5; 32]),
        submission: Pubkey::new_from_array([6; 32]),
        requirements_hash: [7; 32],
        milestone_id: 8 * 256 + 1,
        reward_amount: 9 * 256 + 1,
        assign_by: -10,
        submit_by: -11,
        verified_at: -12,
        status: MilestoneStatus::Verified,
        bump: 14,
        vault_bump: 15,
        vault_authority_bump: 16,
    };
    let mut expected = Vec::new();
    expected.extend_from_slice(&[1; 32]);
    expected.extend_from_slice(&[2; 32]);
    expected.extend_from_slice(&[3; 32]);
    expected.extend_from_slice(&[4; 32]);
    expected.extend_from_slice(&[5; 32]);
    expected.extend_from_slice(&[6; 32]);
    expected.extend_from_slice(&[7; 32]);
    expected.extend_from_slice(&[1, 8, 0, 0, 0, 0, 0, 0]);
    expected.extend_from_slice(&[1, 9, 0, 0, 0, 0, 0, 0]);
    expected.extend_from_slice(&[246, 255, 255, 255, 255, 255, 255, 255]);
    expected.extend_from_slice(&[245, 255, 255, 255, 255, 255, 255, 255]);
    expected.extend_from_slice(&[244, 255, 255, 255, 255, 255, 255, 255]);
    expected.extend_from_slice(&[4]);
    expected.extend_from_slice(&[14]);
    expected.extend_from_slice(&[15]);
    expected.extend_from_slice(&[16]);
    assert_payload(value, &expected, Milestone::SPACE);
}

#[test]
fn submission_matches_approved_payload() {
    let value = Submission {
        milestone: Pubkey::new_from_array([1; 32]),
        student: Pubkey::new_from_array([2; 32]),
        evidence_hash: [3; 32],
        submitted_at: -4,
        bump: 5,
    };
    let mut expected = Vec::new();
    expected.extend_from_slice(&[1; 32]);
    expected.extend_from_slice(&[2; 32]);
    expected.extend_from_slice(&[3; 32]);
    expected.extend_from_slice(&[252, 255, 255, 255, 255, 255, 255, 255]);
    expected.extend_from_slice(&[5]);
    assert_payload(value, &expected, Submission::SPACE);
}

#[test]
fn completion_record_matches_approved_payload() {
    let value = CompletionRecord {
        milestone: Pubkey::new_from_array([1; 32]),
        student: Pubkey::new_from_array([2; 32]),
        sponsor: Pubkey::new_from_array([3; 32]),
        verifier: Pubkey::new_from_array([4; 32]),
        submission: Pubkey::new_from_array([5; 32]),
        requirements_hash: [6; 32],
        evidence_hash: [7; 32],
        verified_at: -8,
        settled_at: -9,
        bump: 10,
    };
    let mut expected = Vec::new();
    expected.extend_from_slice(&[1; 32]);
    expected.extend_from_slice(&[2; 32]);
    expected.extend_from_slice(&[3; 32]);
    expected.extend_from_slice(&[4; 32]);
    expected.extend_from_slice(&[5; 32]);
    expected.extend_from_slice(&[6; 32]);
    expected.extend_from_slice(&[7; 32]);
    expected.extend_from_slice(&[248, 255, 255, 255, 255, 255, 255, 255]);
    expected.extend_from_slice(&[247, 255, 255, 255, 255, 255, 255, 255]);
    expected.extend_from_slice(&[10]);
    assert_payload(value, &expected, CompletionRecord::SPACE);
}

#[test]
fn status_discriminants_follow_contract_order() {
    let variants = [
        MilestoneStatus::Created,
        MilestoneStatus::Funded,
        MilestoneStatus::Assigned,
        MilestoneStatus::Submitted,
        MilestoneStatus::Verified,
        MilestoneStatus::Settled,
        MilestoneStatus::Refunded,
    ];
    for (tag, status) in variants.into_iter().enumerate() {
        let expected = [tag as u8];
        assert_eq!(borsh::to_vec(&status).unwrap(), expected);
        assert_eq!(MilestoneStatus::try_from_slice(&expected).unwrap(), status);
    }
    assert!(MilestoneStatus::try_from_slice(&[7]).is_err());
}
