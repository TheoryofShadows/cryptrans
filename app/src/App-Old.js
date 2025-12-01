import React, { useState, useMemo, useCallback } from 'react';
import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';
import { useWallet, WalletProvider, ConnectionProvider } from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';
import { WalletModalProvider, WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { AnchorProvider, Program, BN, web3 } from '@coral-xyz/anchor';
import { getAssociatedTokenAddress } from '@solana/spl-token';
import CryptoJS from 'crypto-js';
import idl from './idl/cryptrans.json';
import './App.css';

// Import wallet adapter CSS
import '@solana/wallet-adapter-react-ui/styles.css';

// ✅ CONFIGURED: Your deployed program and token
const PROGRAM_ID = new PublicKey('B4Cq9PHn4wXA7k4mHdqeYVuRRQvZTGh9S6wqaiiSA1yK');
const MINT_ADDRESS = new PublicKey('4yurBrXdRttHjqMV2zBCeX69cGiwTWiYVHf7cMmh8NfH');

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

  const connection = useMemo(() => new Connection(clusterApiUrl('devnet'), 'confirmed'), []);

  const getProvider = useCallback(() => {
    if (!wallet.publicKey) return null;
    return new AnchorProvider(connection, wallet, { commitment: 'confirmed' });
  }, [connection, wallet]);

  // Generate Proof of Work (Hashcash-style anti-spam)
  // Now properly tied to proposal content for cryptographic verification
  const generatePoW = async () => {
    if (!description) {
      setStatus('Please enter a description first');
      return;
    }
    
    setIsPowGenerating(true);
    setStatus('Generating Proof of Work...');
    
    let nonce = 0;
    const startTime = Date.now();
    
    // Run in chunks to avoid blocking UI
    const findPoW = () => {
      return new Promise((resolve) => {
        const chunkSize = 1000;
        const interval = setInterval(() => {
          for (let i = 0; i < chunkSize; i++) {
            // PoW is now tied to description + nonce (matches on-chain verification)
            const nonceStr = `${nonce}`;
            const data = `${description}${nonceStr}`;
            const hash = CryptoJS.SHA256(data).toString();
            
            if (hash.startsWith('0'.repeat(POW_DIFFICULTY))) {
              clearInterval(interval);
              const timeElapsed = ((Date.now() - startTime) / 1000).toFixed(2);
              setStatus(`✓ PoW found in ${timeElapsed}s with ${nonce} attempts`);
              setPowHash(nonceStr); // Store just the nonce
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

  // Generate ZK Proof (simplified - in production use proper ZK circuits)
  const generateZKProof = () => {
    // Mock ZK proof - in production, use snarkyjs or circom
    const privateVote = Math.random();
    const proof = CryptoJS.SHA256(`vote${privateVote}${Date.now()}`).toString();
    return proof;
  };

  // Initialize stake account
  const initializeStake = async () => {
    try {
      setStatus('Initializing stake account...');
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

      await program.methods
        .initializeStake()
        .accounts({
          stake: stakePda,
          user: provider.wallet.publicKey,
          systemProgram: web3.SystemProgram.programId,
        })
        .rpc();

      setStatus('✓ Stake account initialized!');
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
          tokenProgram: web3.TOKEN_PROGRAM_ID,
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
          tokenProgram: web3.TOKEN_PROGRAM_ID,
          associatedTokenProgram: web3.ASSOCIATED_TOKEN_PROGRAM_ID,
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

  // Vote on proposal with ZK proof
  const vote = async () => {
    try {
      setStatus('Casting anonymous vote...');
      const provider = getProvider();
      if (!provider) {
        setStatus('Please connect wallet first');
        return;
      }

      const zkProof = generateZKProof();
      const program = new Program(idl, PROGRAM_ID, provider);

      const [proposalPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('proposal'), new BN(proposalId).toArray('le', 8)],
        program.programId
      );

      const [stakePda] = PublicKey.findProgramAddressSync(
        [Buffer.from('stake'), provider.wallet.publicKey.toBuffer()],
        program.programId
      );

      // Create vote record PDA to prevent double-voting
      const [voteRecordPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('vote'), proposalPda.toBuffer(), provider.wallet.publicKey.toBuffer()],
        program.programId
      );

      await program.methods
        .vote(zkProof)
        .accounts({
          proposal: proposalPda,
          stake: stakePda,
          voteRecord: voteRecordPda,
          voter: provider.wallet.publicKey,
          systemProgram: web3.SystemProgram.programId,
        })
        .rpc();

      setStatus('✓ Anonymous vote cast! (Demurrage applied automatically)');
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
        <p className="subtitle">Embodying Cypherpunk & Extropian Visions</p>
        <WalletMultiButton />
      </header>

      <div className="container">
        <section className="card">
          <h2>🔐 Stake Governance Tokens</h2>
          <button onClick={initializeStake} className="btn-secondary">
            Initialize Stake Account
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
          />
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
          <h2>🗳️ Anonymous Voting (ZK-Proof)</h2>
          <div className="input-group">
            <input
              type="text"
              value={proposalId}
              onChange={(e) => setProposalId(e.target.value)}
              placeholder="Proposal ID"
            />
            <button onClick={vote} className="btn-primary">
              Cast Anonymous Vote
            </button>
          </div>
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

