import React from 'react';

function StatsPanel({ wallet, tokenBalance, votingPower, proposalsCount }) {
  return (
    <div className="card">
      <div className="card-header">
        <h2 className="card-title">⚡ YOUR STATS</h2>
      </div>

      {!wallet.connected ? (
        <div className="empty-state">
          <div className="empty-state-icon">🔌</div>
          <div className="empty-state-title">Connect Wallet</div>
          <p>Connect your wallet to view stats</p>
        </div>
      ) : (
        <>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-label">Token Balance</div>
              <div className="stat-value">{tokenBalance || 0}</div>
              <div className="stat-subtitle">CRYPT tokens</div>
            </div>

            <div className="stat-card">
              <div className="stat-label">Voting Power</div>
              <div className="stat-value">{votingPower || 0}</div>
              <div className="stat-subtitle">staked tokens</div>
            </div>

            <div className="stat-card">
              <div className="stat-label">Proposals</div>
              <div className="stat-value">{proposalsCount || 0}</div>
              <div className="stat-subtitle">active</div>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Wallet Address</label>
            <input
              type="text"
              className="form-input"
              value={wallet.publicKey?.toString() || ''}
              readOnly
              style={{ fontSize: '0.75rem', cursor: 'pointer' }}
              onClick={(e) => {
                e.target.select();
                navigator.clipboard.writeText(e.target.value);
              }}
            />
          </div>
        </>
      )}
    </div>
  );
}

export default StatsPanel;
