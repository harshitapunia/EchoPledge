//! Canonical seed components before the bump. PDA derivation requires the real program ID.

use anchor_lang::prelude::Pubkey;

pub const INTERNSHIP_SEED: &[u8] = b"internship";
pub const MILESTONE_SEED: &[u8] = b"milestone";
pub const VAULT_SEED: &[u8] = b"vault";
pub const VAULT_AUTHORITY_SEED: &[u8] = b"vault_authority";
pub const SUBMISSION_SEED: &[u8] = b"submission";
pub const COMPLETION_SEED: &[u8] = b"completion";

/// Encode a scoped internship or milestone ID as exactly eight little-endian bytes.
pub const fn encode_id(id: u64) -> [u8; 8] {
    id.to_le_bytes()
}

pub fn internship_seeds<'a>(sponsor: &'a Pubkey, id: &'a [u8; 8]) -> [&'a [u8]; 3] {
    [INTERNSHIP_SEED, sponsor.as_ref(), id]
}

pub fn milestone_seeds<'a>(internship: &'a Pubkey, id: &'a [u8; 8]) -> [&'a [u8]; 3] {
    [MILESTONE_SEED, internship.as_ref(), id]
}

pub fn vault_seeds(milestone: &Pubkey) -> [&[u8]; 2] {
    [VAULT_SEED, milestone.as_ref()]
}

pub fn vault_authority_seeds(milestone: &Pubkey) -> [&[u8]; 2] {
    [VAULT_AUTHORITY_SEED, milestone.as_ref()]
}

pub fn submission_seeds(milestone: &Pubkey) -> [&[u8]; 2] {
    [SUBMISSION_SEED, milestone.as_ref()]
}

pub fn completion_seeds(milestone: &Pubkey) -> [&[u8]; 2] {
    [COMPLETION_SEED, milestone.as_ref()]
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn scoped_ids_are_eight_little_endian_bytes() {
        let sponsor = Pubkey::new_from_array([11; 32]);
        let internship = Pubkey::new_from_array([22; 32]);
        let id = encode_id(0x0807_0605_0403_0201);
        let expected_id = [1, 2, 3, 4, 5, 6, 7, 8];

        assert_eq!(id, expected_id);
        assert_eq!(encode_id(0), [0; 8]);
        assert_eq!(encode_id(u64::MAX), [255; 8]);
        assert_eq!(
            internship_seeds(&sponsor, &id),
            [b"internship".as_slice(), &[11; 32], &expected_id]
        );
        assert_eq!(
            milestone_seeds(&internship, &id),
            [b"milestone".as_slice(), &[22; 32], &expected_id]
        );
    }

    #[test]
    fn child_seeds_use_the_distinct_prefix_and_milestone_key() {
        let milestone = Pubkey::new_from_array([33; 32]);

        assert_eq!(vault_seeds(&milestone), [b"vault".as_slice(), &[33; 32]]);
        assert_eq!(
            vault_authority_seeds(&milestone),
            [b"vault_authority".as_slice(), &[33; 32]]
        );
        assert_eq!(
            submission_seeds(&milestone),
            [b"submission".as_slice(), &[33; 32]]
        );
        assert_eq!(
            completion_seeds(&milestone),
            [b"completion".as_slice(), &[33; 32]]
        );
    }
}
