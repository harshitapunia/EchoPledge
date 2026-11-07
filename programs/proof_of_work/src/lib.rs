//! Shared ProofOfWork Anchor accounts and instruction namespaces.

use anchor_lang::prelude::*;

pub mod errors;
pub mod instructions;
pub mod seeds;
pub mod state;

declare_id!("J2FkqDuuuHT14gxjVMhSryrX3Bs4Knct45NMLA79dGdZ");

#[program]
pub mod proof_of_work {}
