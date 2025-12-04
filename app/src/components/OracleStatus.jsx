import React, { useState, useEffect } from 'react';

export default function OracleStatus({ program, programId }) {
  const [oracles, setOracles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOracleStatus();
  }, [program]);

  const fetchOracleStatus = async () => {
    if (!program) return;

    try {
      setLoading(true);
      // TODO: Fetch actual oracle accounts from program
      setOracles([]);
    } catch (error) {
      console.error('Error fetching oracle status:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading oracle status...</div>;
  }

  return (
    <div className="oracle-status">
      <h2>🔮 Oracle Status</h2>

      <div className="oracle-info">
        <p>
          Oracles verify milestone completion for transhuman projects.
          They stake collateral and earn rewards for accurate attestations.
        </p>
      </div>

      {oracles.length === 0 ? (
        <div className="empty-state">
          <p>No active oracles yet</p>
        </div>
      ) : (
        <div className="oracle-list">
          {oracles.map((oracle) => (
            <div key={oracle.address} className="oracle-card">
              <div className="oracle-header">
                <span className="oracle-address">{oracle.address}</span>
                <span className="oracle-reputation">{oracle.reputation}</span>
              </div>

              <div className="oracle-stats">
                <div className="stat">
                  <label>Collateral Staked</label>
                  <span>{oracle.collateral} CRYPT</span>
                </div>
                <div className="stat">
                  <label>Attestations</label>
                  <span>{oracle.attestationCount}</span>
                </div>
                <div className="stat">
                  <label>Accuracy Rate</label>
                  <span>{oracle.accuracy}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="oracle-info-box">
        <h3>💼 Become an Oracle</h3>
        <p>
          Interested in verifying milestones for transhuman projects? Register as an
          oracle by staking CRYPT tokens as collateral.
        </p>
        <button className="button-secondary">Register as Oracle</button>
      </div>
    </div>
  );
}
