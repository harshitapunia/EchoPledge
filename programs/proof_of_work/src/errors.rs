use anchor_lang::prelude::*;

/// Shared domain errors. Keep existing variants in this order to preserve their codes.
#[error_code]
pub enum ProofOfWorkError {
    #[msg("The milestone status does not permit this instruction")]
    InvalidState,
    #[msg("The instruction deadline has passed")]
    DeadlinePassed,
    #[msg("The refund cutoff has not been reached")]
    RefundTooEarly,
    #[msg("The milestone terms are invalid")]
    InvalidTerms,
    #[msg("The caller or assigned role is invalid")]
    InvalidRole,
    #[msg("The supplied account or commitment does not match the recorded binding")]
    BindingMismatch,
    #[msg("The reward mint is invalid")]
    InvalidMint,
    #[msg("The escrow vault is invalid")]
    InvalidVault,
    #[msg("The token or rent destination is invalid")]
    InvalidDestination,
    #[msg("The escrow balance does not cover the reward")]
    InsufficientEscrow,
    #[msg("Checked arithmetic failed")]
    ArithmeticOverflow,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn domain_error_codes_are_stable() {
        let errors = [
            ProofOfWorkError::InvalidState,
            ProofOfWorkError::DeadlinePassed,
            ProofOfWorkError::RefundTooEarly,
            ProofOfWorkError::InvalidTerms,
            ProofOfWorkError::InvalidRole,
            ProofOfWorkError::BindingMismatch,
            ProofOfWorkError::InvalidMint,
            ProofOfWorkError::InvalidVault,
            ProofOfWorkError::InvalidDestination,
            ProofOfWorkError::InsufficientEscrow,
            ProofOfWorkError::ArithmeticOverflow,
        ];
        for (index, error) in errors.into_iter().enumerate() {
            assert_eq!(u32::from(error), 6000 + index as u32);
        }
    }
}
