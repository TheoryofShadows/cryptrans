/**
 * WalletConnect Component
 *
 * Handles Solana wallet connection and displays user information
 * Supports: Phantom, Magic Eden, Ledger, Solflare, and other SPL wallets
 */

import React, { useEffect, useState } from 'react';

interface WalletInfo {
  publicKey: string;
  balance: number;
  isConnected: boolean;
}

export function WalletConnect() {
  const [walletInfo, setWalletInfo] = useState<WalletInfo>({
    publicKey: '',
    balance: 0,
    isConnected: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  /**
   * Connect to Solana wallet
   */
  const handleConnect = async () => {
    setLoading(true);
    setError('');

    try {
      // In production, this would use @solana/wallet-adapter-react
      // const { publicKey } = useWallet();
      // const connection = new Connection(process.env.VITE_SOLANA_RPC);
      // const balance = await connection.getBalance(publicKey);

      // For now, show the structure
      const mockPublicKey = 'YOUR_WALLET_ADDRESS_HERE';
      const mockBalance = 10.5; // SOL

      setWalletInfo({
        publicKey: mockPublicKey,
        balance: mockBalance,
        isConnected: true,
      });

      console.log('✅ Wallet connected:', mockPublicKey);
    } catch (err) {
      setError(`Failed to connect wallet: ${err instanceof Error ? err.message : String(err)}`);
      console.error('Wallet connection error:', err);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Disconnect wallet
   */
  const handleDisconnect = () => {
    setWalletInfo({
      publicKey: '',
      balance: 0,
      isConnected: false,
    });
    console.log('❌ Wallet disconnected');
  };

  return (
    <div className="wallet-connect-container">
      <div className="card">
        <h2>💰 Solana Wallet</h2>

        {error && <div className="error-message">{error}</div>}

        {walletInfo.isConnected ? (
          <div className="wallet-info">
            <div className="status-badge success">
              <span className="dot"></span> Connected
            </div>

            <div className="wallet-details">
              <div className="detail-row">
                <label>Address:</label>
                <code className="address">
                  {walletInfo.publicKey.slice(0, 8)}...{walletInfo.publicKey.slice(-8)}
                </code>
                <button className="copy-btn" title="Copy address">
                  📋
                </button>
              </div>

              <div className="detail-row">
                <label>Balance:</label>
                <span className="balance">{walletInfo.balance.toFixed(4)} SOL</span>
              </div>

              <div className="detail-row">
                <label>Rent Exempt:</label>
                <span className="status">✅ Yes</span>
              </div>
            </div>

            <button
              onClick={handleDisconnect}
              className="btn btn-secondary btn-full"
              disabled={loading}
            >
              Disconnect Wallet
            </button>
          </div>
        ) : (
          <div className="wallet-empty">
            <p>No wallet connected</p>
            <p className="description">
              Connect your Solana wallet to propose projects, vote, and verify milestones
            </p>

            <button
              onClick={handleConnect}
              className="btn btn-primary btn-full"
              disabled={loading}
            >
              {loading ? '⏳ Connecting...' : '🔗 Connect Wallet'}
            </button>

            <div className="supported-wallets">
              <p>Supported wallets:</p>
              <div className="wallet-badges">
                <span className="badge">Phantom</span>
                <span className="badge">Magic Eden</span>
                <span className="badge">Ledger</span>
                <span className="badge">Solflare</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        .wallet-connect-container {
          margin: 20px 0;
        }

        .card {
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
          border: 2px solid #00ffff;
          border-radius: 8px;
          padding: 20px;
          box-shadow: 0 0 20px rgba(0, 255, 255, 0.3);
        }

        .card h2 {
          margin: 0 0 20px 0;
          color: #00ffff;
          text-transform: uppercase;
          font-weight: bold;
          letter-spacing: 2px;
        }

        .error-message {
          background-color: rgba(255, 0, 0, 0.2);
          border: 1px solid #ff4444;
          border-radius: 4px;
          padding: 12px;
          color: #ff6666;
          margin-bottom: 15px;
          font-size: 14px;
        }

        .status-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          border-radius: 20px;
          background-color: rgba(0, 255, 0, 0.1);
          border: 1px solid #00ff00;
          color: #00ff00;
          font-size: 14px;
          margin-bottom: 15px;
        }

        .status-badge.success {
          background-color: rgba(0, 255, 0, 0.1);
          border-color: #00ff00;
          color: #00ff00;
        }

        .dot {
          width: 8px;
          height: 8px;
          background-color: #00ff00;
          border-radius: 50%;
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        .wallet-info {
          margin: 15px 0;
        }

        .wallet-details {
          background-color: rgba(0, 0, 0, 0.3);
          border-left: 3px solid #ff00ff;
          border-radius: 4px;
          padding: 15px;
          margin: 15px 0;
        }

        .detail-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          padding: 10px 0;
          border-bottom: 1px solid rgba(0, 255, 255, 0.1);
        }

        .detail-row:last-child {
          border-bottom: none;
        }

        .detail-row label {
          color: #00ffff;
          font-weight: bold;
          min-width: 100px;
        }

        .address {
          color: #ff00ff;
          font-family: 'Courier New', monospace;
          font-size: 13px;
          flex: 1;
        }

        .copy-btn {
          background: none;
          border: none;
          color: #00ffff;
          cursor: pointer;
          font-size: 16px;
          padding: 5px;
          transition: all 0.2s;
        }

        .copy-btn:hover {
          transform: scale(1.2);
          color: #00ff00;
        }

        .balance {
          color: #00ff00;
          font-weight: bold;
          font-size: 18px;
        }

        .status {
          color: #00ff00;
          font-weight: bold;
        }

        .wallet-empty {
          text-align: center;
          padding: 20px 0;
        }

        .wallet-empty p {
          color: #ffffff;
          margin: 10px 0;
        }

        .wallet-empty .description {
          color: #00ffff;
          font-size: 14px;
          margin: 15px 0 25px 0;
        }

        .btn {
          padding: 12px 20px;
          border: 2px solid;
          border-radius: 4px;
          font-size: 14px;
          font-weight: bold;
          text-transform: uppercase;
          letter-spacing: 1px;
          cursor: pointer;
          transition: all 0.3s;
          disabled: opacity(0.5);
        }

        .btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .btn-primary {
          background: linear-gradient(45deg, #00ffff, #ff00ff);
          border-color: #00ffff;
          color: #000000;
          font-weight: bold;
        }

        .btn-primary:hover:not(:disabled) {
          box-shadow: 0 0 20px rgba(0, 255, 255, 0.8);
          transform: scale(1.02);
        }

        .btn-secondary {
          background-color: transparent;
          border-color: #ff00ff;
          color: #ff00ff;
        }

        .btn-secondary:hover:not(:disabled) {
          background-color: rgba(255, 0, 255, 0.1);
          box-shadow: 0 0 15px rgba(255, 0, 255, 0.5);
        }

        .btn-full {
          width: 100%;
          margin-top: 10px;
        }

        .supported-wallets {
          margin-top: 20px;
          padding-top: 15px;
          border-top: 1px solid rgba(0, 255, 255, 0.2);
        }

        .supported-wallets p {
          color: #00ffff;
          font-size: 12px;
          text-transform: uppercase;
          margin-bottom: 10px;
        }

        .wallet-badges {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          justify-content: center;
        }

        .badge {
          background-color: rgba(0, 255, 0, 0.1);
          border: 1px solid #00ff00;
          color: #00ff00;
          padding: 6px 12px;
          border-radius: 15px;
          font-size: 12px;
          font-weight: bold;
        }
      `}</style>
    </div>
  );
}

export default WalletConnect;
