//! Native host execution of Anchor's generated entry point.
//! Clock/rent and the System Program create-account CPI are modeled locally.
//! This is not SBF VM execution or a signed Solana transaction test.

use anchor_lang::{
    prelude::*,
    solana_program::{
        instruction::Instruction,
        program_error::{ProgramError, ProgramResult},
        system_program,
    },
    InstructionData,
};
use proof_of_work::{
    errors::ProofOfWorkError,
    instruction,
    seeds::{INTERNSHIP_SEED, MILESTONE_SEED, SUBMISSION_SEED},
    state::{Internship, Milestone, MilestoneStatus, Submission},
    ID,
};
use solana_sysvar::program_stubs::{set_syscall_stubs, SyscallStubs};
use std::sync::{
    atomic::{AtomicI64, Ordering},
    Mutex, MutexGuard,
};

static HOST_LOCK: Mutex<()> = Mutex::new(());
static NOW: AtomicI64 = AtomicI64::new(100);

struct HostStubs;

impl SyscallStubs for HostStubs {
    fn sol_get_clock_sysvar(&self, address: *mut u8) -> u64 {
        let clock = Clock {
            unix_timestamp: NOW.load(Ordering::SeqCst),
            ..Clock::default()
        };
        // The sysvar ABI supplies an aligned, writable Clock-sized buffer.
        unsafe {
            (address as *mut Clock).write(clock);
        }
        0
    }

    fn sol_get_rent_sysvar(&self, address: *mut u8) -> u64 {
        // The sysvar ABI supplies an aligned, writable Rent-sized buffer.
        unsafe {
            (address as *mut Rent).write(Rent::default());
        }
        0
    }

    fn sol_invoke_signed(
        &self,
        instruction: &Instruction,
        accounts: &[AccountInfo],
        seeds: &[&[&[u8]]],
    ) -> ProgramResult {
        // Support only the fresh-account System CPI used by submission init.
        // The destination buffer is preallocated by the host fixture.
        if instruction.program_id != system_program::ID
            || instruction.data.len() != 52
            || instruction.data[..4] != [0, 0, 0, 0]
            || accounts.len() < 2
        {
            return Err(ProgramError::InvalidInstructionData);
        }
        let payer = &accounts[0];
        let destination = &accounts[1];
        let lamports = u64::from_le_bytes(instruction.data[4..12].try_into().unwrap());
        let space = u64::from_le_bytes(instruction.data[12..20].try_into().unwrap());
        let owner = Pubkey::new_from_array(instruction.data[20..52].try_into().unwrap());
        let derived = seeds.iter().any(|seed| {
            Pubkey::create_program_address(seed, &ID).ok().as_ref() == Some(destination.key)
        });
        if !payer.is_signer || !payer.is_writable || !destination.is_writable || !derived {
            return Err(ProgramError::MissingRequiredSignature);
        }
        if destination.owner != &system_program::ID
            || destination.lamports() != 0
            || destination.data_len() as u64 != space
            || destination.try_borrow_data()?.iter().any(|byte| *byte != 0)
            || owner != ID
        {
            return Err(ProgramError::AccountAlreadyInitialized);
        }
        let remainder = payer
            .lamports()
            .checked_sub(lamports)
            .ok_or(ProgramError::InsufficientFunds)?;
        **payer.try_borrow_mut_lamports()? = remainder;
        **destination.try_borrow_mut_lamports()? = lamports;
        destination.assign(&owner);
        Ok(())
    }
}

struct Environment {
    previous: Option<Box<dyn SyscallStubs>>,
    _lock: MutexGuard<'static, ()>,
}

impl Environment {
    fn new() -> Self {
        let lock = HOST_LOCK.lock().unwrap_or_else(|error| error.into_inner());
        NOW.store(100, Ordering::SeqCst);
        Self {
            previous: Some(set_syscall_stubs(Box::new(HostStubs))),
            _lock: lock,
        }
    }
}

impl Drop for Environment {
    fn drop(&mut self) {
        set_syscall_stubs(self.previous.take().unwrap());
    }
}

fn info(
    key: Pubkey,
    owner: Pubkey,
    signer: bool,
    writable: bool,
    data: Vec<u8>,
    executable: bool,
) -> AccountInfo<'static> {
    AccountInfo::new(
        Box::leak(Box::new(key)),
        signer,
        writable,
        Box::leak(Box::new(
            if data.iter().all(|b| *b == 0) && !data.is_empty() {
                0
            } else {
                10_000_000
            },
        )),
        Box::leak(data.into_boxed_slice()),
        Box::leak(Box::new(owner)),
        executable,
    )
}

fn store<T: AccountSerialize>(account: &AccountInfo, value: &T) {
    value
        .try_serialize(&mut &mut account.try_borrow_mut_data().unwrap()[..])
        .unwrap();
}

fn load<T: AccountDeserialize>(account: &AccountInfo) -> T {
    T::try_deserialize(&mut &account.try_borrow_data().unwrap()[..]).unwrap()
}

fn public_key(seed: u8) -> Pubkey {
    // Deterministic public-only on-curve test fixture. No signing key is generated.
    (seed..=255)
        .map(|byte| Pubkey::new_from_array([byte; 32]))
        .find(|key| key.is_on_curve() && *key != Pubkey::default())
        .unwrap()
}

struct Fixture {
    sponsor: AccountInfo<'static>,
    student: AccountInfo<'static>,
    verifier: AccountInfo<'static>,
    internship: AccountInfo<'static>,
    milestone: AccountInfo<'static>,
    submission: AccountInfo<'static>,
    system: AccountInfo<'static>,
}

impl Fixture {
    fn new(status: MilestoneStatus) -> Self {
        let sponsor_key = public_key(1);
        let student_key = public_key(70);
        let verifier_key = public_key(140);
        let (internship_key, internship_bump) = Pubkey::find_program_address(
            &[INTERNSHIP_SEED, sponsor_key.as_ref(), &1u64.to_le_bytes()],
            &ID,
        );
        let (milestone_key, milestone_bump) = Pubkey::find_program_address(
            &[MILESTONE_SEED, internship_key.as_ref(), &2u64.to_le_bytes()],
            &ID,
        );
        let (submission_key, submission_bump) =
            Pubkey::find_program_address(&[SUBMISSION_SEED, milestone_key.as_ref()], &ID);
        let internship = info(
            internship_key,
            ID,
            false,
            false,
            vec![1; Internship::SPACE],
            false,
        );
        store(
            &internship,
            &Internship {
                sponsor: sponsor_key,
                internship_id: 1,
                bump: internship_bump,
            },
        );
        let milestone = info(
            milestone_key,
            ID,
            false,
            true,
            vec![1; Milestone::SPACE],
            false,
        );
        let has_student = !matches!(status, MilestoneStatus::Created | MilestoneStatus::Funded);
        let has_submission = matches!(
            status,
            MilestoneStatus::Submitted | MilestoneStatus::Verified | MilestoneStatus::Settled
        );
        store(
            &milestone,
            &Milestone {
                internship: internship_key,
                sponsor: sponsor_key,
                student: if has_student {
                    student_key
                } else {
                    Pubkey::default()
                },
                verifier: verifier_key,
                reward_mint: Pubkey::new_from_array([200; 32]),
                submission: if has_submission {
                    submission_key
                } else {
                    Pubkey::default()
                },
                requirements_hash: [5; 32],
                milestone_id: 2,
                reward_amount: 100,
                assign_by: 200,
                submit_by: 300,
                verified_at: if matches!(
                    status,
                    MilestoneStatus::Verified | MilestoneStatus::Settled
                ) {
                    90
                } else {
                    0
                },
                status,
                bump: milestone_bump,
                vault_bump: 0,
                vault_authority_bump: 0,
            },
        );
        let submission = info(
            submission_key,
            if has_submission {
                ID
            } else {
                system_program::ID
            },
            false,
            true,
            vec![if has_submission { 1 } else { 0 }; Submission::SPACE],
            false,
        );
        if has_submission {
            store(
                &submission,
                &Submission {
                    milestone: milestone_key,
                    student: student_key,
                    evidence_hash: [9; 32],
                    submitted_at: 80,
                    bump: submission_bump,
                },
            );
        }
        Self {
            sponsor: info(sponsor_key, system_program::ID, true, false, vec![], false),
            student: info(student_key, system_program::ID, true, true, vec![], false),
            verifier: info(verifier_key, system_program::ID, true, false, vec![], false),
            internship,
            milestone,
            submission,
            system: info(
                system_program::ID,
                system_program::ID,
                false,
                false,
                vec![],
                true,
            ),
        }
    }

    fn assign(&self, student: Pubkey) -> ProgramResult {
        execute(
            vec![
                self.sponsor.clone(),
                self.internship.clone(),
                self.milestone.clone(),
            ],
            instruction::AssignStudent { student }.data(),
        )
    }

    fn submit(&self, evidence_hash: [u8; 32]) -> ProgramResult {
        execute(
            vec![
                self.student.clone(),
                self.internship.clone(),
                self.milestone.clone(),
                self.submission.clone(),
                self.system.clone(),
            ],
            instruction::SubmitMilestone { evidence_hash }.data(),
        )
    }

    fn attest(&self, student: Pubkey, requirements: [u8; 32], evidence: [u8; 32]) -> ProgramResult {
        execute(
            vec![
                self.verifier.clone(),
                self.internship.clone(),
                self.milestone.clone(),
                self.submission.clone(),
            ],
            instruction::AttestMilestone {
                expected_student: student,
                expected_requirements_hash: requirements,
                expected_evidence_hash: evidence,
            }
            .data(),
        )
    }

    fn valid_attestation(&self) -> ProgramResult {
        self.attest(*self.student.key, [5; 32], [9; 32])
    }
}

fn execute(accounts: Vec<AccountInfo<'static>>, data: Vec<u8>) -> ProgramResult {
    let snapshots: Vec<_> = accounts
        .iter()
        .map(|a| {
            (
                a.owner.to_owned(),
                a.lamports(),
                a.try_borrow_data().unwrap().to_vec(),
            )
        })
        .collect();
    let accounts = Box::leak(accounts.into_boxed_slice());
    let data = Box::leak(data.into_boxed_slice());
    let result = proof_of_work::entry(&ID, accounts, data);
    // Model transaction rollback explicitly. The host entry point alone has no bank runtime.
    if result.is_err() {
        for (account, (owner, lamports, bytes)) in accounts.iter().zip(snapshots) {
            account.assign(&owner);
            **account.try_borrow_mut_lamports().unwrap() = lamports;
            account
                .try_borrow_mut_data()
                .unwrap()
                .copy_from_slice(&bytes);
        }
    }
    result
}

fn error(result: ProgramResult, expected: ProofOfWorkError) {
    assert_eq!(result, Err(ProgramError::Custom(u32::from(expected))));
}

#[test]
fn sponsor_assigns_only_once() {
    let _environment = Environment::new();
    let f = Fixture::new(MilestoneStatus::Funded);
    f.assign(*f.student.key).unwrap();
    let milestone: Milestone = load(&f.milestone);
    assert_eq!(milestone.student, *f.student.key);
    assert_eq!(milestone.status, MilestoneStatus::Assigned);
    error(f.assign(*f.student.key), ProofOfWorkError::InvalidState);
}

#[test]
fn assignment_requires_sponsor_signature_and_authority() {
    let _environment = Environment::new();
    let mut f = Fixture::new(MilestoneStatus::Funded);
    f.sponsor.is_signer = false;
    assert!(f.assign(*f.student.key).is_err());
    f.sponsor.is_signer = true;
    f.sponsor = info(
        public_key(210),
        system_program::ID,
        true,
        false,
        vec![],
        false,
    );
    error(f.assign(*f.student.key), ProofOfWorkError::InvalidRole);
}

#[test]
fn assignment_rejects_all_other_states_and_deadline_boundary() {
    let _environment = Environment::new();
    for status in [
        MilestoneStatus::Created,
        MilestoneStatus::Assigned,
        MilestoneStatus::Submitted,
        MilestoneStatus::Verified,
        MilestoneStatus::Settled,
        MilestoneStatus::Refunded,
    ] {
        let f = Fixture::new(status);
        error(f.assign(*f.student.key), ProofOfWorkError::InvalidState);
    }
    for now in [200, 201] {
        NOW.store(now, Ordering::SeqCst);
        let f = Fixture::new(MilestoneStatus::Funded);
        error(f.assign(*f.student.key), ProofOfWorkError::DeadlinePassed);
    }
}

#[test]
fn assignment_rejects_invalid_roles_and_existing_binding() {
    let _environment = Environment::new();
    let f = Fixture::new(MilestoneStatus::Funded);
    let off_curve = Pubkey::find_program_address(&[b"off-curve-test"], &ID).0;
    for student in [
        Pubkey::default(),
        *f.sponsor.key,
        *f.verifier.key,
        off_curve,
    ] {
        error(f.assign(student), ProofOfWorkError::InvalidRole);
    }
    let mut milestone: Milestone = load(&f.milestone);
    milestone.student = *f.student.key;
    store(&f.milestone, &milestone);
    error(f.assign(*f.student.key), ProofOfWorkError::BindingMismatch);
}

#[test]
fn correct_student_submits_and_verifier_attests() {
    let _environment = Environment::new();
    let f = Fixture::new(MilestoneStatus::Assigned);
    f.submit([9; 32]).unwrap();
    let submitted: Submission = load(&f.submission);
    assert_eq!(submitted.milestone, *f.milestone.key);
    assert_eq!(submitted.student, *f.student.key);
    assert_eq!(submitted.evidence_hash, [9; 32]);
    assert_eq!(submitted.submitted_at, 100);
    let milestone: Milestone = load(&f.milestone);
    assert_eq!(milestone.status, MilestoneStatus::Submitted);
    assert_eq!(milestone.submission, *f.submission.key);
    f.valid_attestation().unwrap();
    let verified: Milestone = load(&f.milestone);
    assert_eq!(verified.status, MilestoneStatus::Verified);
    assert_eq!(verified.verified_at, 100);
}

#[test]
fn submission_rejects_wrong_student_and_missing_signature() {
    let _environment = Environment::new();
    let mut f = Fixture::new(MilestoneStatus::Assigned);
    f.student.is_signer = false;
    assert!(f.submit([9; 32]).is_err());
    f.student = info(
        public_key(210),
        system_program::ID,
        true,
        true,
        vec![],
        false,
    );
    error(f.submit([9; 32]), ProofOfWorkError::InvalidRole);
}

#[test]
fn submission_rejects_zero_commitment_and_deadline_boundary() {
    let _environment = Environment::new();
    let f = Fixture::new(MilestoneStatus::Assigned);
    error(f.submit([0; 32]), ProofOfWorkError::InvalidTerms);
    assert_eq!(f.submission.owner, &system_program::ID);
    assert_eq!(f.submission.lamports(), 0);
    for now in [300, 301] {
        NOW.store(now, Ordering::SeqCst);
        error(f.submit([9; 32]), ProofOfWorkError::DeadlinePassed);
    }
}

#[test]
fn submission_rejects_wrong_pda_duplicate_and_existing_link() {
    let _environment = Environment::new();
    let mut f = Fixture::new(MilestoneStatus::Assigned);
    f.submission = info(
        public_key(210),
        system_program::ID,
        false,
        true,
        vec![0; Submission::SPACE],
        false,
    );
    assert!(f.submit([9; 32]).is_err());
    let f = Fixture::new(MilestoneStatus::Assigned);
    let mut milestone: Milestone = load(&f.milestone);
    milestone.submission = *f.submission.key;
    store(&f.milestone, &milestone);
    error(f.submit([9; 32]), ProofOfWorkError::BindingMismatch);
    let f = Fixture::new(MilestoneStatus::Assigned);
    f.submit([9; 32]).unwrap();
    assert!(f.submit([9; 32]).is_err());
}

#[test]
fn submission_rejects_other_lifecycle_states() {
    let _environment = Environment::new();
    for status in [
        MilestoneStatus::Created,
        MilestoneStatus::Funded,
        MilestoneStatus::Submitted,
        MilestoneStatus::Verified,
        MilestoneStatus::Settled,
        MilestoneStatus::Refunded,
    ] {
        let f = Fixture::new(status);
        assert!(f.submit([9; 32]).is_err());
    }
}

#[test]
fn attestation_requires_designated_verifier_and_signature() {
    let _environment = Environment::new();
    let mut f = Fixture::new(MilestoneStatus::Submitted);
    f.verifier.is_signer = false;
    assert!(f.valid_attestation().is_err());
    f.verifier = info(
        public_key(210),
        system_program::ID,
        true,
        false,
        vec![],
        false,
    );
    error(f.valid_attestation(), ProofOfWorkError::InvalidRole);
}

#[test]
fn attestation_rejects_wrong_expected_bindings() {
    let _environment = Environment::new();
    let f = Fixture::new(MilestoneStatus::Submitted);
    error(
        f.attest(public_key(210), [5; 32], [9; 32]),
        ProofOfWorkError::BindingMismatch,
    );
    error(
        f.attest(*f.student.key, [6; 32], [9; 32]),
        ProofOfWorkError::BindingMismatch,
    );
    error(
        f.attest(*f.student.key, [5; 32], [8; 32]),
        ProofOfWorkError::BindingMismatch,
    );
    assert_eq!(
        load::<Milestone>(&f.milestone).status,
        MilestoneStatus::Submitted
    );
}

#[test]
fn attestation_rejects_wrong_submission_scope_and_bump() {
    let _environment = Environment::new();
    let f = Fixture::new(MilestoneStatus::Submitted);
    for field in 0..3 {
        let mut submission: Submission = load(&f.submission);
        if field == 0 {
            submission.student = public_key(210);
        }
        if field == 1 {
            submission.milestone = public_key(210);
        }
        if field == 2 {
            submission.bump = submission.bump.wrapping_sub(1);
        }
        let original = f.submission.try_borrow_data().unwrap().to_vec();
        store(&f.submission, &submission);
        assert!(f.valid_attestation().is_err());
        f.submission
            .try_borrow_mut_data()
            .unwrap()
            .copy_from_slice(&original);
    }
    let mut milestone: Milestone = load(&f.milestone);
    milestone.submission = public_key(210);
    store(&f.milestone, &milestone);
    error(f.valid_attestation(), ProofOfWorkError::BindingMismatch);
}

#[test]
fn attestation_rejects_invalid_timing_and_prior_verification() {
    let _environment = Environment::new();
    for submitted_at in [0, 300, 301, 101] {
        let f = Fixture::new(MilestoneStatus::Submitted);
        let mut submission: Submission = load(&f.submission);
        submission.submitted_at = submitted_at;
        store(&f.submission, &submission);
        error(f.valid_attestation(), ProofOfWorkError::InvalidTerms);
    }
    let f = Fixture::new(MilestoneStatus::Submitted);
    let mut milestone: Milestone = load(&f.milestone);
    milestone.verified_at = 90;
    store(&f.milestone, &milestone);
    error(f.valid_attestation(), ProofOfWorkError::BindingMismatch);
}

#[test]
fn attestation_rejects_replay_and_other_states() {
    let _environment = Environment::new();
    let f = Fixture::new(MilestoneStatus::Submitted);
    f.valid_attestation().unwrap();
    error(f.valid_attestation(), ProofOfWorkError::InvalidState);
    for status in [
        MilestoneStatus::Created,
        MilestoneStatus::Funded,
        MilestoneStatus::Assigned,
        MilestoneStatus::Verified,
        MilestoneStatus::Settled,
        MilestoneStatus::Refunded,
    ] {
        let f = Fixture::new(MilestoneStatus::Submitted);
        let mut milestone: Milestone = load(&f.milestone);
        milestone.status = status;
        store(&f.milestone, &milestone);
        error(f.valid_attestation(), ProofOfWorkError::InvalidState);
    }
}

#[test]
fn parent_pdas_ownership_and_relationships_are_enforced() {
    let _environment = Environment::new();
    let mut f = Fixture::new(MilestoneStatus::Funded);
    let original = f.internship.clone();
    f.internship = info(
        public_key(210),
        ID,
        false,
        false,
        original.try_borrow_data().unwrap().to_vec(),
        false,
    );
    assert!(f.assign(*f.student.key).is_err());
    f.internship = original;
    f.internship.assign(&system_program::ID);
    assert!(f.assign(*f.student.key).is_err());
    f.internship.assign(&ID);
    let mut milestone: Milestone = load(&f.milestone);
    milestone.internship = public_key(210);
    store(&f.milestone, &milestone);
    assert!(f.assign(*f.student.key).is_err());
    milestone.internship = *f.internship.key;
    milestone.sponsor = public_key(210);
    store(&f.milestone, &milestone);
    assert!(f.assign(*f.student.key).is_err());
}

#[test]
fn submission_and_attestation_reject_another_parent() {
    let _environment = Environment::new();
    for status in [MilestoneStatus::Assigned, MilestoneStatus::Submitted] {
        let mut f = Fixture::new(status);
        let (key, bump) = Pubkey::find_program_address(
            &[INTERNSHIP_SEED, f.sponsor.key.as_ref(), &2u64.to_le_bytes()],
            &ID,
        );
        f.internship = info(key, ID, false, false, vec![1; Internship::SPACE], false);
        store(
            &f.internship,
            &Internship {
                sponsor: *f.sponsor.key,
                internship_id: 2,
                bump,
            },
        );
        if status == MilestoneStatus::Assigned {
            assert!(f.submit([9; 32]).is_err());
        } else {
            assert!(f.valid_attestation().is_err());
        }
    }
}

#[test]
fn timely_submission_can_be_verified_after_the_deadline() {
    let _environment = Environment::new();
    let f = Fixture::new(MilestoneStatus::Assigned);
    NOW.store(299, Ordering::SeqCst);
    f.submit([9; 32]).unwrap();
    NOW.store(400, Ordering::SeqCst);
    f.valid_attestation().unwrap();
    let milestone: Milestone = load(&f.milestone);
    assert_eq!(milestone.status, MilestoneStatus::Verified);
    assert_eq!(milestone.verified_at, 400);
}
