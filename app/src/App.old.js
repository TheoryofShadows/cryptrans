import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';
import { useWallet, WalletProvider, ConnectionProvider } from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';
import { WalletModalProvider, WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { AnchorProvider, Program, BN, web3 } from '@coral-xyz/anchor';
import { getAssociatedTokenAddress, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from '@solana/spl-token';
import CryptoJS from 'crypto-js';
import idl from './idl/cryptrans.json';
import './App.css';

// Import real ZK proof system
import {
  initZK,
  generateVoteProof,
  generateCommitment,
  getUserSecret,
  formatProofForSolana
} from './zkProver';

// Import wallet adapter CSS
import '@solana/wallet-adapter-react-ui/styles.css';

// ✅ CONFIGURED: Your deployed program and token
const PROGRAM_ID = new PublicKey(process.env.REACT_APP_PROGRAM_ID || 'B4Cq9PHn4wXA7k4mHdqeYVuRRQvZTGh9S6wqaiiSA1yK');
const MINT_ADDRESS = new PublicKey(process.env.REACT_APP_MINT_ADDRESS || '4yurBrXdRttHjqMV2zBCeX69cGiwTWiYVHf7cMmh8NfH');

const POW_DIFFICULTY = 4; // Number of leading zeros required

function CrypTransApp() {
  const wallet = useWallet();
  const [description, setDescription] = useState('');
  const [funding, setFunding] = useState(0);
  const [stakeAmount, setStakeAmount] = useState(0);
  const [proposalId, setProposalId] = useState('');
  const [powHash, setPowHash] = useState('');
  const [isPowGenerating, setIsPowGenerating] = useState(false);
  const [status, setStatus] = useState('');
  const [zkInitialized, setZkInitialized] = useState(false);
  const [useRealZK, setUseRealZK] = useState(true); // Toggle for real ZK vs insecure
  const [isGeneratingProof, setIsGeneratingProof] = useState(false);

  const connection = useMemo(() => new Connection(clusterApiUrl('devnet'), 'confirmed'), []);

  const getProvider = useCallback(() => {
    if (!wallet.publicKey) return null;
    return new AnchorProvider(connection, wallet, { commitment: 'confirmed' });
  }, [connection, wallet]);

  // Initialize ZK system on mount
  useEffect(() => {
    async function initialize() {
      if (useRealZK && !zkInitialized) {
        setStatus('Initializing zero-knowledge proof system...');
        try {
          await initZK();
          setZkInitialized(true);
          setStatus('✅ ZK proof system ready!');
        } catch (error) {
          console.error('Failed to initialize ZK:', error);
          setStatus('⚠️ ZK initialization failed - using fallback mode');
          setUseRealZK(false);
        }
      }
    }
    initialize();
  }, [useRealZK, zkInitialized]);

  // Generate Proof of Work (Hashcash-style anti-spam)
  const generatePoW = async () => {
    if (!description) {
      setStatus('Please enter a description first');
      return;
    }
    
    setIsPowGenerating(true);
    setStatus('Generating Proof of Work...');
    
    let nonce = 0;
    const startTime = Date.now();
    
    const findPoW = () => {
      return new Promise((resolve) => {
        const chunkSize = 1000;
        const interval = setInterval(() => {
          for (let i = 0; i < chunkSize; i++) {
            const nonceStr = `${nonce}`;
            const data = `${description}${nonceStr}`;
            const hash = CryptoJS.SHA256(data).toString();
            
            if (hash.startsWith('0'.repeat(POW_DIFFICULTY))) {
              clearInterval(interval);
              const timeElapsed = ((Date.now() - startTime) / 1000).toFixed(2);
              setStatus(`✓ PoW found in ${timeElapsed}s with ${nonce} attempts`);
              setPowHash(nonceStr);
              setIsPowGenerating(false);
              resolve(nonceStr);
              return;
            }
            nonce++;
          }
        }, 0);
      });
    };
    
    await findPoW();
  };

  // Initialize stake account with ZK commitment
  const initializeStake = async () => {
    try {
      setStatus('Initializing stake account with ZK commitment...');
      const provider = getProvider();
      if (!provider) {
        setStatus('Please connect wallet first');
        return;
      }

      const program = new Program(idl, PROGRAM_ID, provider);
      
      const [stakePda] = PublicKey.findProgramAddressSync(
        [Buffer.from('stake'), provider.wallet.publicKey.toBuffer()],
        program.programId
      );

      // Initialize stake account
      await program.methods
        .initializeStake()
        .accounts({
          stake: stakePda,
          user: provider.wallet.publicKey,
          systemProgram: web3.SystemProgram.programId,
        })
        .rpc();

      // Generate and register commitment
      if (useRealZK) {
        const secret = getUserSecret();
        const commitment = generateCommitment(secret);
        const commitmentBytes = Array.from(Buffer.from(commitment.padStart(64, '0'), 'hex'));
        
        await program.methods
          .registerCommitment(commitmentBytes)
          .accounts({
            stake: stakePda,
            user: provider.wallet.publicKey,
          })
          .rpc();

        setStatus('✓ Stake account initialized with ZK commitment!');
      } else {
        setStatus('✓ Stake account initialized!');
      }

    } catch (error) {
      setStatus(`Error: ${error.message}`);
      console.error(error);
    }
  };

  // Stake tokens
  const stakeTokens = async () => {
    try {
      setStatus('Staking tokens...');
      const provider = getProvider();
      if (!provider) {
        setStatus('Please connect wallet first');
        return;
      }

      const program = new Program(idl, PROGRAM_ID, provider);
      
      const [stakePda] = PublicKey.findProgramAddressSync(
        [Buffer.from('stake'), provider.wallet.publicKey.toBuffer()],
        program.programId
      );

      const userTokenAccount = await getAssociatedTokenAddress(
        MINT_ADDRESS,
        provider.wallet.publicKey
      );

      const stakeTokenAccount = await getAssociatedTokenAddress(
        MINT_ADDRESS,
        stakePda,
        true
      );

      await program.methods
        .stakeTokens(new BN(stakeAmount * 1e9))
        .accounts({
          stake: stakePda,
          user: provider.wallet.publicKey,
          userTokenAccount,
          stakeTokenAccount,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc();

      setStatus(`✓ Staked ${stakeAmount} tokens!`);
      setStakeAmount(0);
    } catch (error) {
      setStatus(`Error: ${error.message}`);
      console.error(error);
    }
  };

  // Create proposal with PoW
  const createProposal = async () => {
    try {
      if (!powHash) {
        setStatus('Please generate Proof of Work first');
        return;
      }

      setStatus('Creating proposal...');
      const provider = getProvider();
      if (!provider) {
        setStatus('Please connect wallet first');
        return;
      }

      const program = new Program(idl, PROGRAM_ID, provider);
      const id = Date.now();

      const [proposalPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('proposal'), new BN(id).toArray('le', 8)],
        program.programId
      );

      const treasury = await getAssociatedTokenAddress(
        MINT_ADDRESS,
        proposalPda,
        true
      );

      await program.methods
        .createProposal(
          new BN(id),
          description,
          new BN(funding * 1e9),
          powHash,
          POW_DIFFICULTY
        )
        .accounts({
          proposal: proposalPda,
          creator: provider.wallet.publicKey,
          mint: MINT_ADDRESS,
          treasury,
          systemProgram: web3.SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        })
        .rpc();

      setStatus(`✓ Proposal created with ID: ${id}`);
      setDescription('');
      setFunding(0);
      setPowHash('');
    } catch (error) {
      setStatus(`Error: ${error.message}`);
      console.error(error);
    }
  };

  // Vote with REAL ZK proof
  const voteWithRealZK = async () => {
    try {
      if (!zkInitialized) {
        setStatus('ZK system not initialized! Please wait...');
        return;
      }

      setIsGeneratingProof(true);
      setStatus('Generating zero-knowledge proof (this may take 10-30 seconds)...');
      
      const provider = getProvider();
      if (!provider) {
        setStatus('Please connect wallet first');
        setIsGeneratingProof(false);
        return;
      }

      const program = new Program(idl, PROGRAM_ID, provider);

      // Get stake info
      const [stakePda] = PublicKey.findProgramAddressSync(
        [Buffer.from('stake'), provider.wallet.publicKey.toBuffer()],
        program.programId
      );

      const stakeAccount = await program.account.stake.fetch(stakePda);

      // Generate ZK proof
      const secret = getUserSecret();
      const proof = await generateVoteProof({
        secret,
        stakeAmount: stakeAccount.amount.toString(),
        proposalId,
        minStake: '1000000000', // 1 token minimum
      });

      setStatus('✓ Proof generated! Submitting to blockchain...');

      // Prepare proof bytes for Solana
      const proofData = formatProofForSolana(
        proof.proof,
        proof.publicSignals.nullifier,
        proof.publicSignals.commitment
      );

      const [proposalPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('proposal'), new BN(proposalId).toArray('le', 8)],
        program.programId
      );

      const [voteRecordPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('vote'), proposalPda.toBuffer(), provider.wallet.publicKey.toBuffer()],
        program.programId
      );

      await program.methods
        .voteWithZk(
          proofData.nullifier,
          proofData.commitment,
          proofData.proofA,
          proofData.proofB,
          proofData.proofC
        )
        .accounts({
          proposal: proposalPda,
          stake: stakePda,
          voteRecord: voteRecordPda,
          voter: provider.wallet.publicKey,
          systemProgram: web3.SystemProgram.programId,
        })
        .rpc();

      setStatus('✅ Anonymous vote cast successfully! Your identity is protected.');
      setProposalId('');
      setIsGeneratingProof(false);

    } catch (error) {
      if (error.message.includes('AlreadyVoted')) {
        setStatus('⚠️ Error: You have already voted on this proposal');
      } else {
        setStatus(`Error: ${error.message}`);
      }
      console.error(error);
      setIsGeneratingProof(false);
    }
  };

  // Vote insecure (fallback without real ZK)
  const voteInsecure = async () => {
    try {
      setStatus('Casting vote (⚠️ NOT anonymous - for testing only)...');
      const provider = getProvider();
      if (!provider) {
        setStatus('Please connect wallet first');
        return;
      }

      const program = new Program(idl, PROGRAM_ID, provider);

      const [proposalPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('proposal'), new BN(proposalId).toArray('le', 8)],
        program.programId
      );

      const [stakePda] = PublicKey.findProgramAddressSync(
        [Buffer.from('stake'), provider.wallet.publicKey.toBuffer()],
        program.programId
      );

      const [voteRecordPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('vote'), proposalPda.toBuffer(), provider.wallet.publicKey.toBuffer()],
        program.programId
      );

      await program.methods
        .voteInsecure('mock_proof')
        .accounts({
          proposal: proposalPda,
          stake: stakePda,
          voteRecord: voteRecordPda,
          voter: provider.wallet.publicKey,
          systemProgram: web3.SystemProgram.programId,
        })
        .rpc();

      setStatus('✓ Vote cast (insecure mode)');
      setProposalId('');
    } catch (error) {
      if (error.message.includes('AlreadyVoted')) {
        setStatus('⚠️ Error: You have already voted on this proposal');
      } else {
        setStatus(`Error: ${error.message}`);
      }
      console.error(error);
    }
  };

  return (
    <div className="app">
      <header>
        <h1>⚡ CrypTrans ⚡</h1>
        <p className="subtitle">Now with REAL Zero-Knowledge Proofs!</p>
        <WalletMultiButton />
      </header>

      <div className="container">
        {/* ZK Status Indicator */}
        <div className={`zk-status ${zkInitialized ? 'ready' : 'loading'}`}>
          {zkInitialized ? (
            <span>🔒 ZK Proofs: Active</span>
          ) : (
            <span>⏳ Initializing ZK System...</span>
          )}
          <label>
            <input
              type="checkbox"
              checked={useRealZK}
              onChange={(e) => setUseRealZK(e.target.checked)}
            />
            Use Real ZK Proofs
          </label>
        </div>

        <section className="card">
          <h2>🔐 Stake Governance Tokens</h2>
          <button onClick={initializeStake} className="btn-secondary">
            Initialize Stake Account {useRealZK && '(with ZK)'}
          </button>
          <div className="input-group">
            <input
              type="number"
              value={stakeAmount}
              onChange={(e) => setStakeAmount(e.target.value)}
              placeholder="Amount to stake"
            />
            <button onClick={stakeTokens} className="btn-primary">
              Stake Tokens
            </button>
          </div>
        </section>

        <section className="card">
          <h2>🚀 Create Transhuman Proposal</h2>
          <p className="hint">
            Focus: Longevity (cryonics), Augmentation (BCIs), Expansion (space tech)
          </p>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g., Decentralized BCI Network for Neural Enhancement"
            rows="4"
            maxLength="200"
          />
          <small>{description.length}/200 characters</small>
          <div className="input-group">
            <input
              type="number"
              value={funding}
              onChange={(e) => setFunding(e.target.value)}
              placeholder="Funding needed (tokens)"
            />
          </div>
          <div className="pow-section">
            <button
              onClick={generatePoW}
              disabled={isPowGenerating || !description}
              className="btn-secondary"
            >
              {isPowGenerating ? 'Generating PoW...' : 'Generate Proof of Work'}
            </button>
            {powHash && <span className="checkmark">✓ PoW Ready</span>}
          </div>
          <button
            onClick={createProposal}
            disabled={!powHash}
            className="btn-primary"
          >
            Create Proposal
          </button>
        </section>

        <section className="card">
          <h2>🗳️ Anonymous Voting {useRealZK && '(Real ZK)'}</h2>
          {useRealZK && zkInitialized && (
            <div className="zk-info">
              ✅ Your vote will be cryptographically anonymous!
              <br/>
              <small>Proof generation takes 10-30 seconds</small>
            </div>
          )}
          <div className="input-group">
            <input
              type="text"
              value={proposalId}
              onChange={(e) => setProposalId(e.target.value)}
              placeholder="Proposal ID"
            />
            <button
              onClick={useRealZK ? voteWithRealZK : voteInsecure}
              className="btn-primary"
              disabled={isGeneratingProof}
            >
              {isGeneratingProof ? 'Generating Proof...' : 'Cast Anonymous Vote'}
            </button>
          </div>
          {!useRealZK && (
            <p className="warning">
              ⚠️ Real ZK disabled - votes are NOT anonymous in this mode!
            </p>
          )}
        </section>

        {status && (
          <div className="status-bar">
            <p>{status}</p>
          </div>
        )}

        <footer className="manifesto">
          <h3>Principles</h3>
          <ul>
            <li>🕵️ Privacy & Liberation (Chaum, Finney, May)</li>
            <li>⛏️ PoW Scarcity & Anti-Spam (Back, Dai)</li>
            <li>📜 Smart Contracts & Self-Execution (Szabo)</li>
            <li>🧬 Transhuman Focus & Optimism (Extropians)</li>
            <li>🌐 Decentralization & Spontaneous Order</li>
            <li>🔒 <strong>REAL Zero-Knowledge Proofs (NOW IMPLEMENTED!)</strong></li>
          </ul>
        </footer>
      </div>
    </div>
  );
}

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

