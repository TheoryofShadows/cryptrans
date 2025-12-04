import React, { useState, useEffect } from 'react';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';

export default function StakingPanel({ wallet, program, programId, onStakeUpdate }) {
  const [stakeInfo, setStakeInfo] = useState(null);
  const [stakeAmount, setStakeAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('view');

  useEffect(() => {
    if (wallet.publicKey) {
      fetchStakeInfo();
    }
  }, [wallet.publicKey, program]);

  const fetchStakeInfo = async () => {
    if (!program || !wallet.publicKey) return;

    try {
      setLoading(true);
      const { PublicKey } = require('@solana/web3.js');

      const [stakePda] = PublicKey.findProgramAddressSync(
        [Buffer.from('stake'), wallet.publicKey.toBuffer()],
        programId
      );

      try {
        const stake = await program.account.stake.fetch(stakePda);
        setStakeInfo({
          address: stakePda.toBase58(),
          amount: Number(stake.amount) / LAMPORTS_PER_SOL,
          lastDemurrage: new Date(Number(stake.last_demurrage) * 1000)
        });
      } catch (e) {
        // Stake account not initialized
        setStakeInfo({ amount: 0, initialized: false });
      }
    } catch (error) {
      console.error('Error fetching stake info:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInitializeStake = async () => {
    if (!program || !wallet.publicKey) return;

    try {
      setLoading(true);
      const { PublicKey, SystemProgram } = require('@solana/web3.js');

      const [stakePda] = PublicKey.findProgramAddressSync(
        [Buffer.from('stake'), wallet.publicKey.toBuffer()],
        programId
      );

      await program.methods
        .initializeStake()
        .accounts({
          stake: stakePda,
          user: wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      await fetchStakeInfo();
      alert('✅ Stake account initialized!');
    } catch (error) {
      console.error('Error initializing stake:', error);
      alert('❌ Failed to initialize stake');
    } finally {
      setLoading(false);
    }
  };

  const handleStakeTokens = async () => {
    if (!program || !wallet.publicKey || !stakeAmount) return;

    try {
      setLoading(true);
      alert('✅ Stake transaction would be sent here (requires token setup)');
      await fetchStakeInfo();
    } catch (error) {
      console.error('Error staking tokens:', error);
      alert('❌ Failed to stake tokens');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="staking-panel">
      <h2>🏦 Staking</h2>

      <div className="tabs">
        <button
          className={`tab ${activeTab === 'view' ? 'active' : ''}`}
          onClick={() => setActiveTab('view')}
        >
          My Stake
        </button>
        <button
          className={`tab ${activeTab === 'deposit' ? 'active' : ''}`}
          onClick={() => setActiveTab('deposit')}
        >
          Deposit
        </button>
      </div>

      {activeTab === 'view' && (
        <div className="staking-view">
          {stakeInfo === null ? (
            <div className="loading">Loading stake data...</div>
          ) : stakeInfo.initialized === false ? (
            <div className="empty-state">
              <p>🔍 Stake account not initialized</p>
              <button
                onClick={handleInitializeStake}
                disabled={loading}
                className="button-primary"
              >
                {loading ? 'Initializing...' : 'Initialize Stake Account'}
              </button>
            </div>
          ) : (
            <div className="stake-info">
              <div className="stat-card large">
                <label>Your Stake</label>
                <span className="large-value">{stakeInfo.amount.toFixed(4)}</span>
                <small>CRYPT tokens</small>
              </div>

              <div className="stat-card">
                <label>Last Demurrage Applied</label>
                <span>{stakeInfo.lastDemurrage?.toLocaleDateString()}</span>
              </div>

              <div className="stake-info-box">
                <h3>About Demurrage</h3>
                <p>
                  Demurrage is an ethical decay mechanism that encourages active
                  participation. Your stake gradually decays if not participating
                  in governance.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'deposit' && (
        <div className="staking-deposit">
          <div className="form-group">
            <label>Amount to Stake (CRYPT)</label>
            <input
              type="number"
              value={stakeAmount}
              onChange={(e) => setStakeAmount(e.target.value)}
              placeholder="0.0"
              min="0"
              step="0.001"
              disabled={loading}
            />
          </div>

          <button
            onClick={handleStakeTokens}
            disabled={loading || !stakeAmount || stakeAmount <= 0}
            className="button-primary"
          >
            {loading ? '⏳ Processing...' : '💰 Stake Tokens'}
          </button>

          <div className="info-box">
            <p>💡 Staking gives you voting power and participation rewards.</p>
          </div>
        </div>
      )}
    </div>
  );
}
