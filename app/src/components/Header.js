import React from 'react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

function Header({ zkInitialized }) {
  return (
    <header className="header">
      <div className="header-content">
        <div className="logo">
          <div className="logo-icon">⚡</div>
          <div className="logo-text">
            <h1>CRYPTRANS</h1>
            <p>Zero-Knowledge Governance</p>
          </div>
        </div>

        <div className="header-actions">
          {zkInitialized && (
            <div className="zk-status">
              <span className="status-dot"></span>
              <span>ZK PROOF SYSTEM ACTIVE</span>
            </div>
          )}
          <WalletMultiButton />
        </div>
      </div>
    </header>
  );
}

export default Header;
