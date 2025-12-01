import React from 'react';

function ProposalsList({ proposals, onSelectProposal }) {
  if (!proposals || proposals.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">📋</div>
        <div className="empty-state-title">No Proposals Yet</div>
        <p>Create the first proposal to get started</p>
      </div>
    );
  }

  return (
    <div className="proposals-list">
      {proposals.map((proposal, index) => (
        <div
          key={index}
          className="proposal-card"
          onClick={() => onSelectProposal(proposal)}
        >
          <div className="proposal-header">
            <span className="proposal-id">#{proposal.id || index}</span>
            <span className={`proposal-status ${proposal.active ? 'active' : 'ended'}`}>
              {proposal.active ? 'ACTIVE' : 'ENDED'}
            </span>
          </div>

          <div className="proposal-description">
            {proposal.description}
          </div>

          <div className="proposal-stats">
            <div className="proposal-stat">
              <span>💰</span>
              <span>{proposal.funding || 0} SOL</span>
            </div>
            <div className="proposal-stat">
              <span>🗳️</span>
              <span>{proposal.voteCount || 0} votes</span>
            </div>
            <div className="proposal-stat">
              <span>🎯</span>
              <span>{proposal.minStake || 100} min stake</span>
            </div>
          </div>

          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${proposal.progress || 0}%` }}
            ></div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default ProposalsList;
