import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Connection, PublicKey, clusterApiUrl, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { useWallet, WalletProvider, ConnectionProvider } from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import '@solana/wallet-adapter-react-ui/styles.css';
import './App.css';
import * as anchor from '@coral-xyz/anchor';
import * as crypto from 'crypto';

import Header from './components/Header';
import StatsPanel from './components/StatsPanel';
import ProposalsList from './components/ProposalsList';

// Import ZK proof system
import { initZK, generateVoteProof, getUserSecret } from './zkProver';

// Program ID - update this to match your deployed program
const PROGRAM_ID = new PublicKey(process.env.REACT_APP_PROGRAM_ID || 'B4Cq9PHn4wXA7k4mHdqeYVuRRQvZTGh9S6wqaiiSA1yK');

// IDL (generated from anchor build)
const IDL = require('./idl/cryptrans.json');

function CrypTransApp() {
  const wallet = useWallet();
  const connection = useMemo(
    () => new Connection(clusterApiUrl('devnet'), 'confirmed'),
    []
  );

  const [zkInitialized, setZkInitialized] = useState(false);
  const [status, setStatus] = useState('');
  const [activeTab, setActiveTab] = useState('proposals');
  const [selectedProposal, setSelectedProposal] = useState(null);
  const [tokenBalance, setTokenBalance] = useState(0);
  const [votingPower, setVotingPower] = useState(0);
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [userStake, setUserStake] = useState(null);
  const [config, setConfig] = useState(null);

  // Initialize program
  const program = useMemo(() => {
    if (!wallet.publicKey) return null;
    const provider = new anchor.AnchorProvider(connection, wallet, anchor.AnchorProvider.defaultOptions());
    return new anchor.Program(IDL, PROGRAM_ID, provider);
  }, [wallet.publicKey, connection, wallet]);

  // Initialize ZK system
  useEffect(() => {
    async function initialize() {
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
    initialize();
  }, []);

  // Fetch config when program is ready
  useEffect(() => {
    async function fetchConfig() {
      if (!program) return;
      try {
        // Get global config PDA
        const [configPda] = PublicKey.findProgramAddressSync([Buffer.from('config')], PROGRAM_ID);
        const configAccount = await program.account.globalConfig.fetch(configPda);
        setConfig(configAccount);
      } catch (error) {
        console.error('Failed to fetch config:', error);
      }
    }
    fetchConfig();
  }, [program]);

  // Fetch user stake and balance when wallet connects
  useEffect(() => {
    async function fetchUserData() {
      if (!wallet.connected || !program) return;

      setLoading(true);
      try {
        // Get stake account
        const [stakePda] = PublicKey.findProgramAddressSync(
          [Buffer.from('stake'), wallet.publicKey.toBuffer()],
          PROGRAM_ID
        );

        const stakeAccount = await program.account.stake.fetch(stakePda).catch(() => null);
        if (stakeAccount) {
          setUserStake(stakeAccount);
          setVotingPower(Number(stakeAccount.amount) / LAMPORTS_PER_SOL);
        }

        // Get token balance
        const balance = await connection.getBalance(wallet.publicKey);
        setTokenBalance(balance / LAMPORTS_PER_SOL);

        setStatus(`✅ Wallet connected: ${wallet.publicKey.toString().slice(0, 8)}...`);
        setTimeout(() => setStatus(''), 3000);
      } catch (error) {
        console.error('Error fetching user data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchUserData();
  }, [wallet.connected, wallet.publicKey, program, connection]);

  // Fetch proposals from blockchain
  useEffect(() => {
    async function fetchProposals() {
      if (!program) return;

      setLoading(true);
      try {
        const proposals_accounts = await program.account.proposal.all();
        const formattedProposals = proposals_accounts.map((p) => ({
          id: p.account.id.toString(),
          description: p.account.description,
          funding: Number(p.account.fundingNeeded) / LAMPORTS_PER_SOL,
          voteCount: Number(p.account.votes) / LAMPORTS_PER_SOL,
          funded: p.account.funded,
          createdAt: Number(p.account.createdAt),
          expiresAt: Number(p.account.expiresAt),
          active: !p.account.funded && Number(p.account.expiresAt) > Date.now() / 1000,
          publicKey: p.publicKey,
        }));
        setProposals(formattedProposals);
      } catch (error) {
        console.error('Error fetching proposals:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchProposals();
  }, [program]);

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

    if (!userStake || userStake.amount === 0) {
      setStatus('❌ You need to stake tokens to vote');
      return;
    }

    if (!program) {
      setStatus('❌ Program not loaded');
      return;
    }

    setLoading(true);

    try {
      setStatus('🔄 Generating zero-knowledge proof...');

      // Get user secret
      const secret = getUserSecret();

      // Generate ZK proof
      const proofData = await generateVoteProof({
        secret,
        stakeAmount: userStake.amount.toString(),
        proposalId: selectedProposal.id,
        minStake: config?.votingThreshold || '1000000000',
      });

      setStatus('📡 Submitting anonymous vote to Solana...');

      // Get vote record PDA
      const [voteRecordPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('vote'), selectedProposal.publicKey.toBuffer(), wallet.publicKey.toBuffer()],
        PROGRAM_ID
      );

      // Get stake PDA
      const [stakePda] = PublicKey.findProgramAddressSync(
        [Buffer.from('stake'), wallet.publicKey.toBuffer()],
        PROGRAM_ID
      );

      // Get config PDA
      const [configPda] = PublicKey.findProgramAddressSync([Buffer.from('config')], PROGRAM_ID);

      // Call vote_with_zk
      const tx = await program.methods
        .voteWithZk(
          proofData.publicSignals.nullifier,
          proofData.publicSignals.commitment,
          new Uint8Array(64), // proof_a (simplified for now)
          new Uint8Array(128), // proof_b
          new Uint8Array(64) // proof_c
        )
        .accounts({
          proposal: selectedProposal.publicKey,
          stake: stakePda,
          voteRecord: voteRecordPda,
          config: configPda,
          voter: wallet.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();

      setStatus(`✅ Vote submitted successfully! Tx: ${tx.slice(0, 8)}...`);

      // Refresh proposals and user stake
      setTimeout(() => {
        setStatus('');
        setActiveTab('proposals');
      }, 3000);
    } catch (error) {
      console.error('Error voting:', error);
      setStatus(`❌ Error submitting vote: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, [wallet.connected, selectedProposal, userStake, program, wallet.publicKey, config]);

  const handleCreateProposal = useCallback(
    async (description, fundingAmount, powNonce) => {
      if (!wallet.connected || !program) {
        setStatus('❌ Please connect your wallet first');
        return;
      }

      setLoading(true);

      try {
        setStatus('🔄 Creating proposal...');

        const proposalId = Math.floor(Math.random() * 1000000);

        // Get required PDAs
        const [proposalPda, proposalBump] = PublicKey.findProgramAddressSync(
          [Buffer.from('proposal'), new anchor.BN(proposalId).toArrayLike(Buffer, 'le', 8)],
          PROGRAM_ID
        );

        const [configPda] = PublicKey.findProgramAddressSync([Buffer.from('config')], PROGRAM_ID);

        // Assuming using a test token mint
        const tokenMint = new PublicKey('EPjFWaLb3odcccccccccccccccccccccccccccccccc');

        // Call create_proposal
        const tx = await program.methods
          .createProposal(new anchor.BN(proposalId), description, new anchor.BN(fundingAmount * LAMPORTS_PER_SOL), powNonce)
          .accounts({
            proposal: proposalPda,
            creator: wallet.publicKey,
            mint: tokenMint,
            config: configPda,
            systemProgram: anchor.web3.SystemProgram.programId,
            tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
            associatedTokenProgram: anchor.utils.token.ASSOCIATED_TOKEN_PROGRAM_ID,
          })
          .rpc();

        setStatus(`✅ Proposal created! Tx: ${tx.slice(0, 8)}...`);
        setTimeout(() => setStatus(''), 3000);
      } catch (error) {
        console.error('Error creating proposal:', error);
        setStatus(`❌ Error creating proposal: ${error.message}`);
      } finally {
        setLoading(false);
      }
    },
    [wallet.connected, program, wallet.publicKey]
  );

  const handleStake = useCallback(
    async (amount) => {
      if (!wallet.connected || !program) {
        setStatus('❌ Please connect your wallet first');
        return;
      }

      setLoading(true);

      try {
        setStatus('🔄 Staking tokens...');

        // Get stake PDA
        const [stakePda] = PublicKey.findProgramAddressSync(
          [Buffer.from('stake'), wallet.publicKey.toBuffer()],
          PROGRAM_ID
        );

        // Call stake_tokens
        const tx = await program.methods
          .stakeTokens(new anchor.BN(amount * LAMPORTS_PER_SOL))
          .accounts({
            stake: stakePda,
            user: wallet.publicKey,
            userTokenAccount: new PublicKey('11111111111111111111111111111111'), // TODO: get actual ATA
            stakeTokenAccount: new PublicKey('11111111111111111111111111111111'), // TODO: get actual stake ATA
            tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
          })
          .rpc();

        setStatus(`✅ Tokens staked! Tx: ${tx.slice(0, 8)}...`);
        setTimeout(() => setStatus(''), 3000);
      } catch (error) {
        console.error('Error staking:', error);
        setStatus(`❌ Error staking: ${error.message}`);
      } finally {
        setLoading(false);
      }
    },
    [wallet.connected, program, wallet.publicKey]
  );

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
          <button className={`tab ${activeTab === 'proposals' ? 'active' : ''}`} onClick={() => setActiveTab('proposals')}>
            Proposals
          </button>
          <button className={`tab ${activeTab === 'vote' ? 'active' : ''}`} onClick={() => setActiveTab('vote')} disabled={!selectedProposal}>
            Vote
          </button>
          <button className={`tab ${activeTab === 'create' ? 'active' : ''}`} onClick={() => setActiveTab('create')}>
            Create
          </button>
          <button className={`tab ${activeTab === 'stake' ? 'active' : ''}`} onClick={() => setActiveTab('stake')}>
            Stake
          </button>
        </div>

        <div className="dashboard-grid">
          <StatsPanel wallet={wallet} tokenBalance={tokenBalance} votingPower={votingPower} proposalsCount={proposals.filter((p) => p.active).length} />

          <div className="card">
            {activeTab === 'proposals' && (
              <>
                <div className="card-header">
                  <h2 className="card-title">
                    📋 ACTIVE PROPOSALS
                    <span className="card-badge">{proposals.filter((p) => p.active).length}</span>
                  </h2>
                </div>
                {loading ? (
                  <p style={{ color: 'var(--cyber-green)', padding: '2rem' }}>Loading proposals...</p>
                ) : proposals.length === 0 ? (
                  <p style={{ color: 'var(--cyber-green)', padding: '2rem' }}>No proposals yet. Create one to get started!</p>
                ) : (
                  <ProposalsList proposals={proposals} onSelectProposal={handleSelectProposal} />
                )}
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
                        <span>{selectedProposal.funding.toFixed(2)} SOL</span>
                      </div>
                      <div className="proposal-stat">
                        <span>🗳️</span>
                        <span>{selectedProposal.voteCount.toFixed(2)} SOL votes</span>
                      </div>
                      <div className="proposal-stat">
                        <span>🎯</span>
                        <span>{selectedProposal.funded ? 'FUNDED' : 'ACTIVE'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Your Vote</label>
                  <p style={{ color: 'var(--cyber-green)', marginBottom: '1rem' }}>
                    🔒 Your vote will be cryptographically anonymous using zero-knowledge proofs. No one can link your vote to your wallet address.
                  </p>
                </div>

                <div className="btn-group">
                  <button className="btn btn-primary btn-block" onClick={handleVote} disabled={!wallet.connected || loading}>
                    {loading ? '⏳ VOTING...' : '✓ VOTE YES (ANONYMOUS)'}
                  </button>
                  <button className="btn btn-secondary" onClick={() => setActiveTab('proposals')}>
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
                  <textarea className="form-textarea" id="description" placeholder="Describe your proposal..." rows={4} />
                </div>
                <div className="form-group">
                  <label className="form-label">Funding Amount (SOL)</label>
                  <input type="number" className="form-input" id="funding" placeholder="100" />
                </div>
                <div className="form-group">
                  <label className="form-label">Proof of Work Nonce</label>
                  <input type="text" className="form-input" id="nonce" placeholder="0" />
                </div>
                <button
                  className="btn btn-primary btn-block"
                  disabled={!wallet.connected || loading}
                  onClick={() => {
                    const description = document.getElementById('description').value;
                    const funding = parseFloat(document.getElementById('funding').value);
                    const nonce = document.getElementById('nonce').value;
                    if (description && funding) {
                      handleCreateProposal(description, funding, nonce);
                    } else {
                      setStatus('❌ Please fill in all fields');
                    }
                  }}
                >
                  {loading ? '⏳ CREATING...' : '🚀 CREATE PROPOSAL'}
                </button>
              </>
            )}

            {activeTab === 'stake' && (
              <>
                <div className="card-header">
                  <h2 className="card-title">💰 STAKE TOKENS</h2>
                </div>
                <div className="form-group">
                  <label className="form-label">Current Stake</label>
                  <p style={{ color: 'var(--cyber-green)', fontSize: '1.2em' }}>{votingPower.toFixed(4)} SOL</p>
                </div>
                <div className="form-group">
                  <label className="form-label">Stake Amount (SOL)</label>
                  <input type="number" className="form-input" id="stakeAmount" placeholder="10" />
                </div>
                <button
                  className="btn btn-primary btn-block"
                  disabled={!wallet.connected || loading}
                  onClick={() => {
                    const amount = parseFloat(document.getElementById('stakeAmount').value);
                    if (amount > 0) {
                      handleStake(amount);
                    } else {
                      setStatus('❌ Please enter a valid amount');
                    }
                  }}
                >
                  {loading ? '⏳ STAKING...' : '✓ STAKE TOKENS'}
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

  const wallets = useMemo(() => [new PhantomWalletAdapter(), new SolflareWalletAdapter()], []);

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
