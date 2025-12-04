import React, { useState } from 'react';

export default function ExplorerTabs({ proposals, selectedProposal, onSelectProposal }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('recent');

  const filteredProposals = (proposals || []).filter((p) =>
    p.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.id?.toString().includes(searchTerm)
  );

  const sortedProposals = [...filteredProposals].sort((a, b) => {
    switch (sortBy) {
      case 'recent':
        return (b.createdAt || 0) - (a.createdAt || 0);
      case 'votes':
        return (b.votes || 0) - (a.votes || 0);
      case 'funding':
        return (b.fundingNeeded || 0) - (a.fundingNeeded || 0);
      default:
        return 0;
    }
  });

  return (
    <div className="explorer-tabs">
      <div className="explorer-controls">
        <input
          type="text"
          placeholder="🔍 Search proposals..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="sort-select"
        >
          <option value="recent">Recent</option>
          <option value="votes">Most Voted</option>
          <option value="funding">Highest Funding</option>
        </select>
      </div>

      <div className="explorer-list">
        {sortedProposals.length === 0 ? (
          <div className="empty-state">
            <p>No proposals found</p>
          </div>
        ) : (
          sortedProposals.map((proposal) => (
            <div
              key={proposal.id}
              className={`explorer-item ${
                selectedProposal?.id === proposal.id ? 'selected' : ''
              }`}
              onClick={() => onSelectProposal(proposal)}
            >
              <div className="item-header">
                <span className="item-id">#{proposal.id}</span>
                <span className="item-description">{proposal.description}</span>
              </div>

              <div className="item-stats">
                <div className="item-stat">
                  <span className="stat-label">Votes:</span>
                  <span className="stat-value">
                    {(proposal.votes / 1e9).toFixed(2)} CRYPT
                  </span>
                </div>

                <div className="item-stat">
                  <span className="stat-label">Funding:</span>
                  <span className="stat-value">
                    {(proposal.fundingNeeded / 1e9).toFixed(2)} CRYPT
                  </span>
                </div>

                <div className="item-stat">
                  <span className="stat-label">Status:</span>
                  <span className="stat-value">
                    {proposal.funded ? '✅ Funded' : '⏳ Active'}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
