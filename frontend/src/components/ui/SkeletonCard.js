import './SkeletonCard.css';
import React from 'react';

const SkeletonCard = ({ variant = 'nft' }) => {
  if (variant === 'list') {
    return (
      <div className="skeleton-card skeleton-list">
        <div className="skeleton-image"></div>
        <div className="skeleton-content">
          <div className="skeleton-title"></div>
          <div className="skeleton-subtitle"></div>
          <div className="skeleton-description"></div>
          <div className="skeleton-meta">
            <div className="skeleton-price"></div>
            <div className="skeleton-stats"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="skeleton-card skeleton-grid">
      <div className="skeleton-image">
        <div className="skeleton-shimmer"></div>
      </div>
      <div className="skeleton-content">
        <div className="skeleton-title"></div>
        <div className="skeleton-subtitle"></div>
        <div className="skeleton-meta">
          <div className="skeleton-price"></div>
          <div className="skeleton-creator"></div>
        </div>
        <div className="skeleton-actions">
          <div className="skeleton-button skeleton-like"></div>
          <div className="skeleton-button skeleton-cart"></div>
        </div>
      </div>
    </div>
  );
};

export const SkeletonGrid = ({ count = 12 }) => {
  return (
    <div className="skeleton-grid-container">
      {Array.from({ length: count }, (_, index) => (
        <SkeletonCard key={index} variant="nft" />
      ))}
    </div>
  );
};

export const SkeletonProfile = () => {
  return (
    <div className="skeleton-profile">
      <div className="skeleton-avatar"></div>
      <div className="skeleton-profile-content">
        <div className="skeleton-name"></div>
        <div className="skeleton-bio"></div>
        <div className="skeleton-stats-row">
          <div className="skeleton-stat"></div>
          <div className="skeleton-stat"></div>
          <div className="skeleton-stat"></div>
        </div>
      </div>
    </div>
  );
};

export const SkeletonDashboard = () => {
  return (
    <div className="skeleton-dashboard">
      <div className="skeleton-dashboard-header">
        <div className="skeleton-title-large"></div>
        <div className="skeleton-subtitle"></div>
      </div>
      <div className="skeleton-dashboard-stats">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="skeleton-stat-card">
            <div className="skeleton-stat-icon"></div>
            <div className="skeleton-stat-value"></div>
            <div className="skeleton-stat-label"></div>
          </div>
        ))}
      </div>
      <div className="skeleton-dashboard-content">
        <div className="skeleton-section">
          <div className="skeleton-section-title"></div>
          <SkeletonGrid count={6} />
        </div>
      </div>
    </div>
  );
};

export default SkeletonCard; 