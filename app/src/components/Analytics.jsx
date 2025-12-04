import React, { useState, useEffect } from 'react';

export default function Analytics({ proposals }) {
  const [stats, setStats] = useState({
    totalProposals: 0,
    totalVotes: 0,
    avgVotes: 0,
    totalFunding: 0,
    highestVoteCount: 0
  });

  useEffect(() => {
    calculateStats();
  }, [proposals]);

  const calculateStats = () => {
    if (!proposals || proposals.length === 0) {
      setStats({
        totalProposals: 0,
        totalVotes: 0,
        avgVotes: 0,
        totalFunding: 0,
        highestVoteCount: 0
      });
      return;
    }

    const totalVotes = proposals.reduce((sum, p) => sum + (p.votes || 0), 0);
    const avgVotes = totalVotes / proposals.length;
    const totalFunding = proposals.reduce((sum, p) => sum + (p.fundingNeeded || 0), 0);
    const highestVoteCount = Math.max(...proposals.map(p => p.votes || 0));

    setStats({
      totalProposals: proposals.length,
      totalVotes,
      avgVotes,
      totalFunding,
      highestVoteCount
    });
  };

  return (
    <div className="analytics-panel">
      <h2>📊 Analytics</h2>

      <div className="stat-grid">
        <div className="stat-card">
          <label>Total Proposals</label>
          <span className="big-number">{stats.totalProposals}</span>
        </div>

        <div className="stat-card">
          <label>Total Votes</label>
          <span className="big-number">{(stats.totalVotes / 1e9).toFixed(2)}</span>
          <small>CRYPT</small>
        </div>

        <div className="stat-card">
          <label>Avg Votes per Proposal</label>
          <span className="big-number">{(stats.avgVotes / 1e9).toFixed(2)}</span>
          <small>CRYPT</small>
        </div>

        <div className="stat-card">
          <label>Highest Vote Count</label>
          <span className="big-number">{(stats.highestVoteCount / 1e9).toFixed(2)}</span>
          <small>CRYPT</small>
        </div>

        <div className="stat-card">
          <label>Total Funding Requested</label>
          <span className="big-number">{(stats.totalFunding / 1e9).toFixed(2)}</span>
          <small>CRYPT</small>
        </div>
      </div>

      <div className="analytics-section">
        <h3>📈 Voting Distribution</h3>
        <div className="voting-distribution">
          {proposals && proposals.length > 0 ? (
            <div className="distribution-bars">
              {proposals.slice(0, 5).map((proposal) => (
                <div key={proposal.id} className="distribution-bar">
                  <div className="bar-label">{proposal.id}</div>
                  <div className="bar-container">
                    <div
                      className="bar-fill"
                      style={{
                        width: `${(proposal.votes / stats.highestVoteCount) * 100}%`
                      }}
                    />
                  </div>
                  <div className="bar-value">
                    {(proposal.votes / 1e9).toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p>No proposals yet</p>
          )}
        </div>
      </div>

      <div className="analytics-info">
        <h3>🔐 Quantum-Safe Features</h3>
        <ul>
          <li>✅ RISC Zero STARK voting (hash-based, quantum-safe)</li>
          <li>✅ SHA-256 proof-of-work anti-spam</li>
          <li>✅ Dilithium signatures (post-quantum standard)</li>
          <li>⚠️ Groth16 voting (deprecated, quantum-vulnerable)</li>
        </ul>
      </div>
    </div>
  );
}
