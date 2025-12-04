import React, { useState } from 'react';

export default function ProposalForm({ onSubmit, loading, config }) {
  const [description, setDescription] = useState('');
  const [fundingNeeded, setFundingNeeded] = useState('');
  const [difficulty, setDifficulty] = useState(2);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [estimatedTime, setEstimatedTime] = useState(0);

  const handleDifficultyChange = (e) => {
    const diff = parseInt(e.target.value);
    setDifficulty(diff);
    // Rough estimate: 2^(diff*4) / 10M hashes per second
    const iterations = Math.pow(2, diff * 4);
    const timeMs = (iterations / 10000000) * 1000;
    setEstimatedTime(timeMs);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!description.trim() || !fundingNeeded) {
      alert('Please fill in all required fields');
      return;
    }

    onSubmit({
      description: description.trim(),
      fundingNeeded: parseInt(fundingNeeded),
      difficulty
    });
  };

  return (
    <div className="proposal-form">
      <h2>📝 Create Proposal</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Proposal Description (Max 200 chars)</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value.slice(0, 200))}
            placeholder="Describe your transhuman project..."
            maxLength={200}
            disabled={loading}
          />
          <small>{description.length}/200</small>
        </div>

        <div className="form-group">
          <label>Funding Needed (tokens)</label>
          <input
            type="number"
            value={fundingNeeded}
            onChange={(e) => setFundingNeeded(e.target.value)}
            placeholder="0"
            min="1"
            disabled={loading}
          />
        </div>

        <button
          type="button"
          className="button-secondary"
          onClick={() => setShowAdvanced(!showAdvanced)}
        >
          {showAdvanced ? '▼' : '▶'} Proof of Work Settings
        </button>

        {showAdvanced && (
          <div className="advanced-settings">
            <div className="form-group">
              <label>PoW Difficulty: {difficulty}</label>
              <input
                type="range"
                min="0"
                max="6"
                value={difficulty}
                onChange={handleDifficultyChange}
                disabled={loading}
              />
              <small>
                Estimated time: {estimatedTime < 1000
                  ? `${estimatedTime.toFixed(0)}ms`
                  : `${(estimatedTime / 1000).toFixed(1)}s`}
              </small>
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !description.trim() || !fundingNeeded}
          className="button-primary"
        >
          {loading ? '⏳ Generating PoW...' : '🚀 Submit Proposal'}
        </button>
      </form>
    </div>
  );
}
