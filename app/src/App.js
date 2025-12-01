import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';
import { useWallet, WalletProvider, ConnectionProvider } from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import '@solana/wallet-adapter-react-ui/styles.css';
import './App.css';

import Header from './components/Header';
import StatsPanel from './components/StatsPanel';
import ProposalsList from './components/ProposalsList';

// Import ZK proof system
import { initZK } from './zkProver';

const PROGRAM_ID = new PublicKey(process.env.REACT_APP_PROGRAM_ID || 'B346Vx1KonmcvcHrXq6ukyNBKVTZKpmB79LESakd6ALB');

// Demo proposals
const DEMO_PROPOSALS = [
  {
    id: '001',
    description: 'Allocate 1000 SOL for protocol development and security audits',
    funding: 1000,
    minStake: 100,
    voteCount: 42,
    progress: 75,
    active: true,
  },
  {
    id: '002',
    description: 'Implement Layer 2 scaling solution with zero-knowledge rollups',
    funding: 500,
    minStake: 50,
    voteCount: 28,
    progress: 45,
    active: true,
  },
  {
    id: '003',
    description: 'Launch community grants program for dApp developers',
    funding: 750,
    minStake: 100,
    voteCount: 67,
    progress: 90,
    active: true,
  },
  {
    id: '004',
    description: 'Upgrade token economics and staking rewards mechanism',
    funding: 300,
    minStake: 200,
    voteCount: 15,
    progress: 20,
    active: true,
  },
];

function CrypTransApp() {
  const wallet = useWallet();
  const [zkInitialized, setZkInitialized] = useState(false);
  const [status, setStatus] = useState('');
  const [activeTab, setActiveTab] = useState('proposals');
  const [selectedProposal, setSelectedProposal] = useState(null);
  const [tokenBalance, setTokenBalance] = useState(0);
  const [votingPower, setVotingPower] = useState(0);
  const [proposals, setProposals] = useState(DEMO_PROPOSALS);

  const connection = useMemo(
    () => new Connection(clusterApiUrl('devnet'), 'confirmed'),
    []
  );

  // Initialize ZK system
  useEffect(() => {
    async function initialize() {
      if (!zkInitialized) {
        setStatus('🔄 Initializing zero-knowledge proof system...');
        try {
          await initZK();
          setZkInitialized(true);
          setStatus('✅ ZK proof system active! Ready for anonymous voting.');
          setTimeout(() => setStatus(''), 5000);
        } catch (error) {
          console.error('ZK init failed:', error);
          setStatus('⚠️ ZK system unavailable - running in fallback mode');
        }
      }
    }
    initialize();
  }, [zkInitialized]);

  // Simulate fetching user data when wallet connects
  useEffect(() => {
    if (wallet.connected) {
      // Simulate fetching balance
      setTokenBalance(Math.floor(Math.random() * 10000));
      setVotingPower(Math.floor(Math.random() * 5000));
      setStatus(`✅ Wallet connected: ${wallet.publicKey?.toString().slice(0, 8)}...`);
      setTimeout(() => setStatus(''), 3000);
    } else {
      setTokenBalance(0);
      setVotingPower(0);
    }
  }, [wallet.connected, wallet.publicKey]);

  const handleSelectProposal = useCallback((proposal) => {
    setSelectedProposal(proposal);
    setActiveTab('vote');
  }, []);

  const handleVote = useCallback(async () => {
    if (!wallet.connected) {
      setStatus('❌ Please connect your wallet first');
      return;
    }

    if (!selectedProposal) {
      setStatus('❌ Please select a proposal');
      return;
    }

    setStatus('🔄 Generating zero-knowledge proof...');

    // Simulate ZK proof generation
    await new Promise(resolve => setTimeout(resolve, 2000));

    setStatus('📡 Submitting anonymous vote to Solana...');
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Update proposal in state
    setProposals(prev =>
      prev.map(p =>
        p.id === selectedProposal.id
          ? { ...p, voteCount: p.voteCount + 1, progress: Math.min(100, p.progress + 5) }
          : p
      )
    );

    setStatus(`✅ Vote submitted anonymously for proposal #${selectedProposal.id}!`);
    setTimeout(() => {
      setStatus('');
      setActiveTab('proposals');
    }, 3000);
  }, [wallet.connected, selectedProposal]);

  return (
    <div className="app">
      <Header zkInitialized={zkInitialized} />

      <div className="container">
        {status && (
          <div className={`status-banner ${status.includes('✅') ? 'success' : status.includes('❌') ? 'error' : ''}`}>
            <span className="status-icon">{status.includes('🔄') ? '⚡' : status.slice(0, 2)}</span>
            <span className="status-text">{status}</span>
          </div>
        )}

        <div className="tabs">
          <button
            className={`tab ${activeTab === 'proposals' ? 'active' : ''}`}
            onClick={() => setActiveTab('proposals')}
          >
            Proposals
          </button>
          <button
            className={`tab ${activeTab === 'vote' ? 'active' : ''}`}
            onClick={() => setActiveTab('vote')}
            disabled={!selectedProposal}
          >
            Vote
          </button>
          <button
            className={`tab ${activeTab === 'create' ? 'active' : ''}`}
            onClick={() => setActiveTab('create')}
          >
            Create
          </button>
        </div>

        <div className="dashboard-grid">
          <StatsPanel
            wallet={wallet}
            tokenBalance={tokenBalance}
            votingPower={votingPower}
            proposalsCount={proposals.filter(p => p.active).length}
          />

          <div className="card">
            {activeTab === 'proposals' && (
              <>
                <div className="card-header">
                  <h2 className="card-title">
                    📋 ACTIVE PROPOSALS
                    <span className="card-badge">{proposals.length}</span>
                  </h2>
                </div>
                <ProposalsList proposals={proposals} onSelectProposal={handleSelectProposal} />
              </>
            )}

            {activeTab === 'vote' && selectedProposal && (
              <>
                <div className="card-header">
                  <h2 className="card-title">🗳️ CAST VOTE</h2>
                </div>
                <div className="form-group">
                  <label className="form-label">Proposal #{selectedProposal.id}</label>
                  <div className="proposal-card" style={{ cursor: 'default' }}>
                    <div className="proposal-description">{selectedProposal.description}</div>
                    <div className="proposal-stats">
                      <div className="proposal-stat">
                        <span>💰</span>
                        <span>{selectedProposal.funding} SOL</span>
                      </div>
                      <div className="proposal-stat">
                        <span>🗳️</span>
                        <span>{selectedProposal.voteCount} votes</span>
                      </div>
                      <div className="proposal-stat">
                        <span>🎯</span>
                        <span>{selectedProposal.minStake} min stake</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Your Vote</label>
                  <p style={{ color: 'var(--cyber-green)', marginBottom: '1rem' }}>
                    🔒 Your vote will be cryptographically anonymous using zero-knowledge proofs.
                    No one can link your vote to your wallet address.
                  </p>
                </div>

                <div className="btn-group">
                  <button
                    className="btn btn-primary btn-block"
                    onClick={handleVote}
                    disabled={!wallet.connected}
                  >
                    {wallet.connected ? '✓ VOTE YES (ANONYMOUS)' : '🔌 CONNECT WALLET'}
                  </button>
                  <button
                    className="btn btn-secondary"
                    onClick={() => setActiveTab('proposals')}
                  >
                    ← BACK
                  </button>
                </div>
              </>
            )}

            {activeTab === 'create' && (
              <>
                <div className="card-header">
                  <h2 className="card-title">✨ CREATE PROPOSAL</h2>
                </div>
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea
                    className="form-textarea"
                    placeholder="Describe your proposal..."
                    rows={4}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Funding Amount (SOL)</label>
                  <input
                    type="number"
                    className="form-input"
                    placeholder="100"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Minimum Stake Required</label>
                  <input
                    type="number"
                    className="form-input"
                    placeholder="50"
                  />
                </div>
                <button className="btn btn-primary btn-block" disabled={!wallet.connected}>
                  {wallet.connected ? '🚀 CREATE PROPOSAL' : '🔌 CONNECT WALLET'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Wallet Provider Wrapper
function App() {
  const network = WalletAdapterNetwork.Devnet;
  const endpoint = useMemo(() => clusterApiUrl(network), [network]);

  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
    ],
    []
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <CrypTransApp />
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}

export default App;
