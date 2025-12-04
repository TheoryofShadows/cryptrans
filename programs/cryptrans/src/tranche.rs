/// Perpetual Tranche System for Multi-Year Transhuman Project Funding
///
/// This module implements the vision of funding ambitious transhuman projects (cryonics,
/// whole-brain emulation, asteroid mining, mind uploading) over 5-10 years with strict
/// milestone gates between tranches.
///
/// Each tranche:
/// - Has a hard unlock date (can't release before this, even if milestone met)
/// - Requires milestone achievement (verified by oracles)
/// - Requires supermajority governance vote (66%+) to actually release
/// - Is immutably recorded forever on Arweave
///
/// This honors Szabo's original smart contract vision: "The money waits. The ledger waits.
/// When the world proves you succeeded, the contract executes automatically."
use anchor_lang::prelude::*;

/// Status of a transhuman project
#[derive(Clone, Debug, AnchorSerialize, AnchorDeserialize, PartialEq, Eq)]
pub enum ProjectStatus {
    Proposed,           // Voting is open
    Approved,          // Governance approved, milestone gates active
    InProgress,        // Executing tranches
    Completed,         // All tranches released successfully
    Abandoned,         // Community vote to abandon (funds recalled via governance)
    Failed,            // Project failed (immutable record of what we tried)
}

/// A single funding tranche (e.g., "Year 3: $2M for patient recruitment")
#[derive(Clone, Debug, AnchorSerialize, AnchorDeserialize)]
pub struct Tranche {
    pub id: u64,
    pub sequence: u8,           // Tranche 1, 2, 3...
    pub funding_amount: u64,    // Amount in lamports
    pub unlock_date: u64,       // Unix timestamp, can't release before this
    pub milestone_id: u64,      // Link to Milestone account for verification
    pub released: bool,         // Has this tranche been released?
    pub released_at: Option<u64>, // When was it released?
    pub recipient: Pubkey,      // Where funds go
}

impl Tranche {
    pub fn is_unlocked(&self, current_time: u64) -> bool {
        current_time >= self.unlock_date
    }

    pub fn can_release(&self, current_time: u64, milestone_verified: bool) -> bool {
        !self.released && self.is_unlocked(current_time) && milestone_verified
    }
}

/// A transhuman project with multiple funding tranches
#[account]
pub struct TranhumanProject {
    pub id: u64,
    pub name: String,  // "First Whole-Brain Emulation"
    pub description: String,
    pub creator: Pubkey,
    pub total_funding_needed: u64,
    pub treasury: Pubkey,       // Where the escrow sits
    pub tranches: Vec<Tranche>,
    pub status: ProjectStatus,
    pub approval_votes_required: u64,  // Supermajority threshold (66%)
    pub created_at: u64,
    pub completed_at: Option<u64>,
    pub arweave_hash: Option<String>,  // Link to permanent record
    pub immutable_record: bool,  // Even after completion, stays on-chain forever
}

impl TranhumanProject {
    pub fn next_available_tranche(&self, current_time: u64) -> Option<&Tranche> {
        self.tranches.iter().find(|t| t.can_release(current_time, false))
    }

    pub fn total_released(&self) -> u64 {
        self.tranches
            .iter()
            .filter(|t| t.released)
            .map(|t| t.funding_amount)
            .sum()
    }

    pub fn total_pending(&self) -> u64 {
        self.tranches
            .iter()
            .filter(|t| !t.released)
            .map(|t| t.funding_amount)
            .sum()
    }

    pub fn is_fully_funded(&self) -> bool {
        self.total_released() == self.total_funding_needed
    }
}

/// Immutable record of a tranche release (stored and archived)
#[account]
pub struct TrancheReleaseRecord {
    pub project_id: u64,
    pub project_name: String,
    pub tranche_id: u64,
    pub tranche_sequence: u8,
    pub milestone_description: String,
    pub amount: u64,
    pub recipient: Pubkey,
    pub released_at: u64,
    pub oracle_attestations_count: u8,
    pub vote_approval_rate: u8,  // Percentage of votes in favor
    pub arweave_hash: Option<String>,  // Proof of immutable storage
}

/// Proposal to release a tranche (requires community vote)
#[account]
pub struct TrancheReleaseProposal {
    pub id: u64,
    pub project_id: u64,
    pub tranche_id: u64,
    pub proposed_at: u64,
    pub voting_deadline: u64,
    pub votes_yes: u64,
    pub votes_no: u64,
    pub votes_abstain: u64,
    pub status: TrancheVoteStatus,
}

#[derive(Clone, Debug, AnchorSerialize, AnchorDeserialize, PartialEq, Eq)]
pub enum TrancheVoteStatus {
    Open,          // Voting in progress
    Approved,      // 66%+ voted yes, ready to execute
    Rejected,      // Majority voted no
    Expired,       // Voting window closed
    Executed,      // Funds released
}

impl TrancheReleaseProposal {
    pub fn approval_rate(&self) -> u8 {
        let total = self.votes_yes.saturating_add(self.votes_no).saturating_add(self.votes_abstain);
        if total == 0 {
            return 0;
        }
        ((self.votes_yes * 100) / total) as u8
    }

    pub fn is_approved(&self, current_time: u64) -> bool {
        current_time >= self.voting_deadline
            && self.approval_rate() >= 66
            && self.votes_yes > self.votes_no
    }

    pub fn is_rejected(&self, current_time: u64) -> bool {
        current_time >= self.voting_deadline && self.votes_no >= self.votes_yes
    }
}

/// Vote on whether to release a tranche
pub struct TrancheVote {
    pub voter: Pubkey,
    pub proposal_id: u64,
    pub vote: TrancheVoteType,
    pub weight: u64,  // Voting power (from stake)
    pub voted_at: u64,
}

#[derive(Clone, Debug, AnchorSerialize, AnchorDeserialize)]
pub enum TrancheVoteType {
    Yes,
    No,
    Abstain,
}

/// Event: Project proposed (immutable record)
#[event]
pub struct ProjectProposed {
    pub project_id: u64,
    pub project_name: String,
    pub creator: Pubkey,
    pub total_funding: u64,
    pub tranches_count: u8,
    pub created_at: u64,
}

/// Event: Tranche released (immutable record)
#[event]
pub struct TrancheReleased {
    pub project_id: u64,
    pub project_name: String,
    pub tranche_id: u64,
    pub milestone: String,
    pub amount: u64,
    pub recipient: Pubkey,
    pub released_at: u64,
    pub vote_approval: u8,
}

/// Event: Tranche release proposed (immutable record)
#[event]
pub struct TrancheReleaseProposed {
    pub project_id: u64,
    pub tranche_id: u64,
    pub required_votes: u64,
    pub voting_deadline: u64,
}

/// Event: Project completed (immutable record)
#[event]
pub struct ProjectCompleted {
    pub project_id: u64,
    pub project_name: String,
    pub total_funded: u64,
    pub completed_at: u64,
    pub arweave_hash: String,
}

// Error types for tranche operations
#[error_code]
pub enum TrancheErrorCode {
    #[msg("Tranche is not yet unlocked")]
    TrancheNotYetUnlocked,
    #[msg("Milestone has not been verified")]
    MilestoneNotVerified,
    #[msg("Tranche has already been released")]
    TrancheAlreadyReleased,
    #[msg("Insufficient vote approval for release")]
    InsufficientVoteApproval,
    #[msg("Project status is invalid for this operation")]
    ProjectStatusInvalid,
    #[msg("Tranche not found")]
    TrancheNotFound,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_tranche_unlock_logic() {
        let tranche = Tranche {
            id: 1,
            sequence: 1,
            funding_amount: 1_000_000,
            unlock_date: 100,
            milestone_id: 1,
            released: false,
            released_at: None,
            recipient: Default::default(),
        };

        assert!(!tranche.is_unlocked(50));
        assert!(tranche.is_unlocked(100));
        assert!(tranche.is_unlocked(150));
    }

    #[test]
    fn test_project_funding_totals() {
        let project = TranhumanProject {
            id: 1,
            name: "Test Project".to_string(),
            description: "Test".to_string(),
            creator: Default::default(),
            total_funding_needed: 5_000_000,
            treasury: Default::default(),
            tranches: vec![
                Tranche {
                    id: 1,
                    sequence: 1,
                    funding_amount: 1_000_000,
                    unlock_date: 100,
                    milestone_id: 1,
                    released: true,
                    released_at: Some(100),
                    recipient: Default::default(),
                },
                Tranche {
                    id: 2,
                    sequence: 2,
                    funding_amount: 2_000_000,
                    unlock_date: 200,
                    milestone_id: 2,
                    released: false,
                    released_at: None,
                    recipient: Default::default(),
                },
                Tranche {
                    id: 3,
                    sequence: 3,
                    funding_amount: 2_000_000,
                    unlock_date: 300,
                    milestone_id: 3,
                    released: false,
                    released_at: None,
                    recipient: Default::default(),
                },
            ],
            status: ProjectStatus::InProgress,
            approval_votes_required: 66,
            created_at: 50,
            completed_at: None,
            arweave_hash: None,
            immutable_record: true,
        };

        assert_eq!(project.total_released(), 1_000_000);
        assert_eq!(project.total_pending(), 4_000_000);
        assert!(!project.is_fully_funded());
    }

    #[test]
    fn test_tranche_vote_approval_rate() {
        let vote_proposal = TrancheReleaseProposal {
            id: 1,
            project_id: 1,
            tranche_id: 1,
            proposed_at: 100,
            voting_deadline: 200,
            votes_yes: 66,
            votes_no: 20,
            votes_abstain: 14,
            status: TrancheVoteStatus::Open,
        };

        assert_eq!(vote_proposal.approval_rate(), 66);
    }
}
