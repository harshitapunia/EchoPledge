// Scaffold counter only; EchoPledge business logic is not implemented.
pub mod constants;
pub mod error;
pub mod instructions;
pub mod state;
pub mod utils;

use anchor_lang::prelude::*;

pub use constants::*;
pub use instructions::*;
pub use state::Counter;

declare_id!("9EVUkNr4cFo2ggLC6VTp5xCbmi1dUZ6t6E3kuEhPrtFY");

#[program]
pub mod echopledge {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        crate::instructions::initialize::handle_initialize(ctx)
    }

    pub fn increment(ctx: Context<Increment>) -> Result<()> {
        crate::instructions::increment::handle_increment(ctx)
    }
}
