import React, { useState } from 'react';

export default function VotingInterface({ proposal, userVotingPower, onVote, loading }) {
  const [voteMethod, setVoteMethod] = useState('stark');
  const [showForm, setShowForm] = useState(false);
  const [imageId, setImageId] = useState('');

  const handleVoteClick = () => {
    if (!proposal) {
      alert('Please select a proposal first');
      return;
    }
    setShowForm(true);
  };

  const handleSubmitVote = () => {
    if (voteMethod === 'stark' && !imageId.trim()) {
      alert('Please enter the RISC Zero Image ID');
      return;
    }

    onVote({
      proposalId: proposal.id,
      method: voteMethod,
      imageId: imageId || null
    });

    setShowForm(false);
    setImageId('');
  };

  return (
    <div className="voting-interface">
      <h2>🗳️ Vote on Proposal</h2>

      {proposal && (
        <div className="proposal-voting-card">
          <div className="proposal-header">
            <h3>{proposal.description}</h3>
            <span className="proposal-id">#{proposal.id}</span>
          </div>

          <div className="proposal-stats">
            <div className="stat">
              <label>Current Votes</label>
              <span>{(proposal.votes / 1e9).toFixed(2)} CRYPT</span>
            </div>
            <div className="stat">
              <label>Funding Needed</label>
              <span>{(proposal.fundingNeeded / 1e9).toFixed(2)} CRYPT</span>
            </div>
            <div className="stat">
              <label>Your Voting Power</label>
              <span>{userVotingPower.toFixed(4)} votes</span>
            </div>
          </div>

          {!showForm ? (
            <button
              onClick={handleVoteClick}
              disabled={loading || userVotingPower === 0}
              className="button-primary"
            >
              ✅ Vote Now
            </button>
          ) : (
            <div className="vote-form">
              <div className="form-group">
                <label>Voting Method</label>
                <div className="radio-group">
                  <label>
                    <input
                      type="radio"
                      value="stark"
                      checked={voteMethod === 'stark'}
                      onChange={(e) => setVoteMethod(e.target.value)}
                    />
                    🔐 STARK (Quantum-Safe)
                  </label>
                  <label>
                    <input
                      type="radio"
                      value="zk"
                      checked={voteMethod === 'zk'}
                      onChange={(e) => setVoteMethod(e.target.value)}
                    />
                    ⚠️ Groth16 (Deprecated)
                  </label>
                </div>
              </div>

              {voteMethod === 'stark' && (
                <div className="form-group">
                  <label>RISC Zero Image ID</label>
                  <input
                    type="text"
                    value={imageId}
                    onChange={(e) => setImageId(e.target.value)}
                    placeholder="2bcf48fc03156687af1019e50e30731e5182211300a64e9e4b346af0bc89ce95"
                  />
                </div>
              )}

              <div className="vote-actions">
                <button
                  onClick={handleSubmitVote}
                  disabled={loading}
                  className="button-primary"
                >
                  {loading ? '⏳ Submitting...' : '🗳️ Cast Vote'}
                </button>
                <button
                  onClick={() => setShowForm(false)}
                  className="button-secondary"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {!proposal && (
        <div className="empty-state">
          <p>Select a proposal from the list to vote</p>
        </div>
      )}
    </div>
  );
}
