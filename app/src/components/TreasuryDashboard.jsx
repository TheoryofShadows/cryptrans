import React, { useState, useEffect } from 'react';

export default function TreasuryDashboard({ program, programId }) {
  const [treasuryInfo, setTreasuryInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchTreasuryInfo();
  }, [program]);

  const fetchTreasuryInfo = async () => {
    if (!program) return;

    try {
      setLoading(true);
      const { PublicKey } = require('@solana/web3.js');

      // Get treasury PDA
      const [treasuryPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('treasury')],
        programId
      );

      // Get balance
      const balance = await program.provider.connection.getBalance(treasuryPda);

      setTreasuryInfo({
        address: treasuryPda.toBase58(),
        balance: balance / 1e9,
        totalFunded: 0,
        totalReleased: 0,
        activeProposals: 0
      });
    } catch (error) {
      console.error('Error fetching treasury info:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading treasury data...</div>;
  }

  return (
    <div className="treasury-dashboard">
      <h2>💰 Treasury Dashboard</h2>

      <div className="tabs">
        <button
          className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button
          className={`tab ${activeTab === 'releases' ? 'active' : ''}`}
          onClick={() => setActiveTab('releases')}
        >
          Fund Releases
        </button>
        <button
          className={`tab ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          History
        </button>
      </div>

      {activeTab === 'overview' && treasuryInfo && (
        <div className="treasury-overview">
          <div className="stat-card large">
            <label>Treasury Balance</label>
            <span className="large-value">{treasuryInfo.balance.toFixed(2)}</span>
            <small>SOL</small>
          </div>

          <div className="stat-grid">
            <div className="stat-card">
              <label>Total Funded</label>
              <span>{treasuryInfo.totalFunded} proposals</span>
            </div>
            <div className="stat-card">
              <label>Total Released</label>
              <span>{treasuryInfo.totalReleased} SOL</span>
            </div>
            <div className="stat-card">
              <label>Active Proposals</label>
              <span>{treasuryInfo.activeProposals}</span>
            </div>
          </div>

          <div className="treasury-info">
            <h3>Treasury Address</h3>
            <code>{treasuryInfo.address}</code>
          </div>
        </div>
      )}

      {activeTab === 'releases' && (
        <div className="treasury-releases">
          <p>Fund release functionality will be implemented through governance votes.</p>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="treasury-history">
          <p>Transaction history will be displayed here.</p>
        </div>
      )}

      <button
        onClick={fetchTreasuryInfo}
        className="button-secondary"
      >
        🔄 Refresh
      </button>
    </div>
  );
}
