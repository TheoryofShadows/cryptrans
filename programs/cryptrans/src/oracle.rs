/// Oracle Infrastructure for Milestone Verification
///
/// This module implements the decentralized oracle system that verifies real-world
/// milestones for transhuman projects (BCI deployment, cryonics revival, asteroid mining, etc.).
///
/// It honors Szabo's smart contracts by making fund release fully automated and verifiable:
/// "Money released when the world proves the milestone happened."

use anchor_lang::prelude::*;

/// Types of milestone verification
#[derive(Clone, Debug, AnchorSerialize, AnchorDeserialize)]
pub enum MilestoneVerificationType {
    /// GitHub commit verified as real
    GitHubCommit {
        repo: String,
        commit_hash: String,
    },
    /// Satellite imagery confirms physical progress
    SatelliteImagery {
        latitude: i32,
        longitude: i32,
        confidence_threshold: u8,
    },
    /// Biometric data proves biological milestone (e.g., cryonics patient revived)
    BiometricData {
        patient_hash: [u8; 32],
        vital_signature: String,
    },
    /// External API verification (Switchboard)
    ExternalAPI {
        oracle_pubkey: Pubkey,
    },
    /// Zero-knowledge proof of milestone achievement
    ZKProof {
        circuit_hash: [u8; 32],
    },
}

/// A single oracle's attestation of a milestone
#[derive(Clone, Debug, AnchorSerialize, AnchorDeserialize)]
pub struct OracleAttestation {
    pub oracle_pubkey: Pubkey,
    pub attestation_time: u64,
    pub confidence_score: u8,  // 0-100, higher = more confident
    pub signed_data: [u8; 128],
    pub slashing_risk: bool,  // If this oracle is caught lying, they lose collateral
}

/// Milestone that must be achieved to release a tranche
#[account]
pub struct Milestone {
    pub id: u64,
    pub tranche_id: u64,
    pub description: String,  // "First BCI implant in human subject"
    pub verification_type: MilestoneVerificationType,
    pub required_attestations: u8,  // Need this many oracles to agree (minimum 3)
    pub attestations: Vec<OracleAttestation>,
    pub verified_at: Option<u64>,
    pub release_triggered: bool,
    pub created_at: u64,
}

/// Alignment score from the oracle (NLP-based scoring)
#[account]
pub struct AlignmentScore {
    pub proposal_id: u64,
    pub raw_score: u8,  // 0-100
    pub oracle_pubkey: Pubkey,
    pub reasoning: String,  // "Contains 'brain-computer interface' + alignment with Extropian principles"
    pub scored_at: u64,
    pub alignment_tier: AlignmentTier,
}

#[derive(Clone, Debug, AnchorSerialize, AnchorDeserialize, PartialEq, Eq)]
pub enum AlignmentTier {
    Visionary,   // 90-100: Direct transhuman/cosmic expansion
    Aligned,     // 70-89:  Strong support for Phase 3 goals
    Neutral,     // 40-69:  Tangential
    Misaligned,  // 0-39:   Not transhuman-focused
}

impl AlignmentTier {
    pub fn from_score(score: u8) -> Self {
        match score {
            90..=100 => AlignmentTier::Visionary,
            70..=89 => AlignmentTier::Aligned,
            40..=69 => AlignmentTier::Neutral,
            _ => AlignmentTier::Misaligned,
        }
    }

    pub fn pow_difficulty_adjustment(&self, base_difficulty: u32) -> u32 {
        match self {
            AlignmentTier::Visionary => base_difficulty,                 // No penalty
            AlignmentTier::Aligned => base_difficulty.saturating_add(1), // +1 difficulty
            AlignmentTier::Neutral => base_difficulty.saturating_add(3), // +3 difficulty
            AlignmentTier::Misaligned => base_difficulty.saturating_add(10), // +10 (essentially blocks)
        }
    }
}

/// Rejected proposal (immutable record of what we said no to)
#[account]
pub struct RejectedProposal {
    pub id: u64,
    pub description: String,
    pub alignment_score: u8,
    pub reason: String,
    pub rejected_at: u64,
    pub creator_hash: [u8; 32],  // Hashed for privacy
}

/// Oracle registry and collateral tracking
#[account]
pub struct OracleRegistry {
    pub oracle_pubkey: Pubkey,
    pub name: String,  // e.g., "Switchboard", "Pyth", "Chainlink"
    pub collateral: u64,  // Stake required to be an oracle (slashed if lying)
    pub reputation_score: u32,  // Starts at 100, decreases on failures
    pub total_attestations: u64,
    pub successful_attestations: u64,
    pub failed_attestations: u64,
    pub last_attested: Option<u64>,
}

impl OracleRegistry {
    pub fn accuracy_rate(&self) -> u8 {
        if self.total_attestations == 0 {
            return 0;
        }
        ((self.successful_attestations * 100) / self.total_attestations) as u8
    }

    pub fn is_healthy(&self) -> bool {
        self.reputation_score > 50 && self.accuracy_rate() > 70
    }
}

/// Soul-bound token reputation badge (non-transferable proof of oracle accuracy)
/// Minted to oracle's wallet, burns when oracle is slashed
#[account]
pub struct OracleReputationToken {
    pub oracle_pubkey: Pubkey,
    pub mint_address: Pubkey,
    pub accuracy_tier: AccuracyTier,  // Bronze, Silver, Gold, Platinum
    pub successful_attestations: u64,
    pub reputation_score: u32,
    pub minted_at: u64,
    pub last_updated: u64,
    pub is_active: bool,
}

#[derive(Clone, Debug, AnchorSerialize, AnchorDeserialize, PartialEq, Eq)]
pub enum AccuracyTier {
    None,      // 0-49 accuracy - no token
    Bronze,    // 50-69 accuracy - basic oracle
    Silver,    // 70-84 accuracy - trusted oracle
    Gold,      // 85-94 accuracy - expert oracle
    Platinum,  // 95-100 accuracy - master oracle
}

impl AccuracyTier {
    pub fn from_accuracy_rate(rate: u8) -> Self {
        match rate {
            95..=100 => AccuracyTier::Platinum,
            85..=94 => AccuracyTier::Gold,
            70..=84 => AccuracyTier::Silver,
            50..=69 => AccuracyTier::Bronze,
            _ => AccuracyTier::None,
        }
    }

    pub fn to_string(&self) -> &'static str {
        match self {
            AccuracyTier::None => "None",
            AccuracyTier::Bronze => "Bronze",
            AccuracyTier::Silver => "Silver",
            AccuracyTier::Gold => "Gold",
            AccuracyTier::Platinum => "Platinum",
        }
    }
}

/// Helper function to verify multiple oracle attestations
pub fn verify_milestone_with_quorum(
    milestone: &Milestone,
    required_quorum: u8,
    min_confidence: u8,
) -> bool {
    let attestation_count = milestone.attestations.len() as u8;
    if attestation_count < required_quorum {
        return false;
    }

    if milestone.attestations.is_empty() {
        return false;
    }

    let avg_confidence: u32 = milestone
        .attestations
        .iter()
        .map(|a| a.confidence_score as u32)
        .sum::<u32>()
        / milestone.attestations.len() as u32;

    avg_confidence as u8 >= min_confidence
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_alignment_tier_from_score() {
        assert_eq!(AlignmentTier::from_score(95), AlignmentTier::Visionary);
        assert_eq!(AlignmentTier::from_score(75), AlignmentTier::Aligned);
        assert_eq!(AlignmentTier::from_score(50), AlignmentTier::Neutral);
        assert_eq!(AlignmentTier::from_score(20), AlignmentTier::Misaligned);
    }

    #[test]
    fn test_pow_difficulty_adjustment() {
        let base = 4u32;
        assert_eq!(
            AlignmentTier::Visionary.pow_difficulty_adjustment(base),
            4
        );
        assert_eq!(
            AlignmentTier::Aligned.pow_difficulty_adjustment(base),
            5
        );
        assert_eq!(
            AlignmentTier::Neutral.pow_difficulty_adjustment(base),
            7
        );
        assert_eq!(
            AlignmentTier::Misaligned.pow_difficulty_adjustment(base),
            14
        );
    }

    #[test]
    fn test_oracle_accuracy_rate() {
        let oracle = OracleRegistry {
            oracle_pubkey: Default::default(),
            name: "TestOracle".to_string(),
            collateral: 1000000,
            reputation_score: 100,
            total_attestations: 100,
            successful_attestations: 95,
            failed_attestations: 5,
            last_attested: None,
        };
        assert_eq!(oracle.accuracy_rate(), 95);
    }

    #[test]
    fn test_oracle_is_healthy() {
        let healthy = OracleRegistry {
            oracle_pubkey: Default::default(),
            name: "HealthyOracle".to_string(),
            collateral: 1000000,
            reputation_score: 80,
            total_attestations: 100,
            successful_attestations: 80,
            failed_attestations: 20,
            last_attested: None,
        };
        assert!(healthy.is_healthy());

        let unhealthy = OracleRegistry {
            oracle_pubkey: Default::default(),
            name: "UnhealthyOracle".to_string(),
            collateral: 1000000,
            reputation_score: 40,
            total_attestations: 100,
            successful_attestations: 60,
            failed_attestations: 40,
            last_attested: None,
        };
        assert!(!unhealthy.is_healthy());
    }
}
