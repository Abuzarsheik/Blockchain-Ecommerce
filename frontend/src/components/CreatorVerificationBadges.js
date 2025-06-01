import React from 'react';
import { 
  Shield, 
  Star, 
  Award, 
  Crown, 
  CheckCircle, 
  Verified,
  Diamond
} from 'lucide-react';
import '../styles/theme.css';

const CreatorVerificationBadges = ({ 
  creator, 
  size = 'medium', 
  showLabel = true, 
  showTooltip = true,
  className = '' 
}) => {
  if (!creator?.verification) return null;

  const { level, verified, featured, trending, topSeller, authenticated } = creator.verification;

  const badgeConfig = {
    verified: {
      icon: <CheckCircle size={getBadgeSize(size)} />,
      color: '#10b981', // emerald-500
      bgColor: '#d1fae5', // emerald-100
      label: 'Verified',
      description: 'Identity verified by Blocmerce team'
    },
    authenticated: {
      icon: <Shield size={getBadgeSize(size)} />,
      color: '#3b82f6', // blue-500
      bgColor: '#dbeafe', // blue-100
      label: 'Authenticated',
      description: 'Wallet and identity authenticated'
    },
    featured: {
      icon: <Star size={getBadgeSize(size)} />,
      color: '#f59e0b', // amber-500
      bgColor: '#fef3c7', // amber-100
      label: 'Featured',
      description: 'Featured creator on Blocmerce'
    },
    trending: {
      icon: <Star size={getBadgeSize(size)} />,
      color: '#ec4899', // pink-500
      bgColor: '#fce7f3', // pink-100
      label: 'Trending',
      description: 'Currently trending creator'
    },
    topSeller: {
      icon: <Award size={getBadgeSize(size)} />,
      color: '#8b5cf6', // violet-500
      bgColor: '#ede9fe', // violet-100
      label: 'Top Seller',
      description: 'High-performing seller'
    },
    premium: {
      icon: <Crown size={getBadgeSize(size)} />,
      color: '#dc2626', // red-600
      bgColor: '#fee2e2', // red-100
      label: 'Premium',
      description: 'Premium verified creator'
    },
    diamond: {
      icon: <Diamond size={getBadgeSize(size)} />,
      color: '#06b6d4', // cyan-500
      bgColor: '#cffafe', // cyan-100
      label: 'Diamond',
      description: 'Elite verified creator'
    }
  };

  function getBadgeSize(size) {
    switch (size) {
      case 'small': return 12;
      case 'medium': return 16;
      case 'large': return 20;
      case 'xl': return 24;
      default: return 16;
    }
  }

  const getVerificationLevel = () => {
    if (level === 'diamond') return 'diamond';
    if (level === 'premium') return 'premium';
    if (topSeller) return 'topSeller';
    if (trending) return 'trending';
    if (featured) return 'featured';
    if (verified) return 'verified';
    if (authenticated) return 'authenticated';
    return null;
  };

  const primaryBadge = getVerificationLevel();
  const additionalBadges = [];

  // Collect additional badges
  if (primaryBadge !== 'verified' && verified) {
    additionalBadges.push('verified');
  }
  if (primaryBadge !== 'authenticated' && authenticated) {
    additionalBadges.push('authenticated');
  }
  if (primaryBadge !== 'featured' && featured) {
    additionalBadges.push('featured');
  }

  if (!primaryBadge) return null;

  const primaryConfig = badgeConfig[primaryBadge];

  return (
    <div className={`verification-badges ${size} ${className}`}>
      {/* Primary Badge */}
      <div 
        className="primary-badge badge-item"
        title={showTooltip ? primaryConfig.description : ''}
      >
        <div 
          className="badge-icon"
          style={{ 
            color: primaryConfig.color,
            backgroundColor: primaryConfig.bgColor
          }}
        >
          {primaryConfig.icon}
        </div>
        {showLabel && (
          <span className="badge-label">{primaryConfig.label}</span>
        )}
      </div>

      {/* Additional Badges */}
      {additionalBadges.length > 0 && (
        <div className="additional-badges">
          {additionalBadges.slice(0, 2).map((badgeType) => {
            const config = badgeConfig[badgeType];
            return (
              <div
                key={badgeType}
                className="badge-item secondary-badge"
                title={showTooltip ? config.description : ''}
              >
                <div 
                  className="badge-icon"
                  style={{ 
                    color: config.color,
                    backgroundColor: config.bgColor
                  }}
                >
                  {config.icon}
                </div>
              </div>
            );
          })}
          {additionalBadges.length > 2 && (
            <div className="more-badges">
              +{additionalBadges.length - 2}
            </div>
          )}
        </div>
      )}

      <style jsx>{`
        .verification-badges {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          flex-wrap: wrap;
        }

        .badge-item {
          display: flex;
          align-items: center;
          gap: var(--space-1);
          transition: all var(--transition-fast);
        }

        .primary-badge {
          cursor: help;
        }

        .primary-badge:hover {
          transform: scale(1.05);
        }

        .badge-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: var(--border-radius-full);
          padding: var(--space-1);
          border: 1px solid rgba(0, 0, 0, 0.1);
        }

        .badge-label {
          font-size: 0.875rem;
          font-weight: 500;
          color: var(--gray-700);
          white-space: nowrap;
        }

        .additional-badges {
          display: flex;
          align-items: center;
          gap: var(--space-1);
        }

        .secondary-badge {
          cursor: help;
        }

        .secondary-badge:hover {
          transform: scale(1.1);
        }

        .secondary-badge .badge-icon {
          padding: 2px;
        }

        .more-badges {
          font-size: 0.75rem;
          color: var(--gray-500);
          background: var(--gray-100);
          padding: 2px 6px;
          border-radius: var(--border-radius-full);
          cursor: help;
        }

        /* Size variants */
        .verification-badges.small .badge-label {
          font-size: 0.75rem;
        }

        .verification-badges.small .badge-icon {
          padding: 2px;
        }

        .verification-badges.large .badge-label {
          font-size: 1rem;
        }

        .verification-badges.large .badge-icon {
          padding: var(--space-2);
        }

        .verification-badges.xl .badge-label {
          font-size: 1.125rem;
        }

        .verification-badges.xl .badge-icon {
          padding: var(--space-3);
        }

        /* Mobile responsive */
        @media (max-width: 640px) {
          .verification-badges {
            gap: var(--space-1);
          }

          .badge-label {
            display: none;
          }

          .primary-badge .badge-label {
            display: inline;
          }
        }
      `}</style>
    </div>
  );
};

// Verification Status Component for Creator Profiles
export const CreatorVerificationStatus = ({ creator, detailed = false }) => {
  if (!creator?.verification) return null;

  const { level, verifiedAt, verifiedBy, documents } = creator.verification;

  const statusConfig = {
    pending: {
      color: '#f59e0b',
      bgColor: '#fef3c7',
      label: 'Verification Pending',
      description: 'Your verification is being reviewed'
    },
    verified: {
      color: '#10b981',
      bgColor: '#d1fae5',
      label: 'Verified Creator',
      description: 'Your account has been verified'
    },
    premium: {
      color: '#8b5cf6',
      bgColor: '#ede9fe',
      label: 'Premium Verified',
      description: 'Premium verification with enhanced features'
    },
    diamond: {
      color: '#06b6d4',
      bgColor: '#cffafe',
      label: 'Diamond Verified',
      description: 'Highest level of verification'
    }
  };

  const status = statusConfig[level] || statusConfig.verified;

  return (
    <div className="verification-status">
      <div className="status-header">
        <div 
          className="status-indicator"
          style={{
            backgroundColor: status.bgColor,
            color: status.color
          }}
        >
          <CheckCircle size={20} />
          <span className="status-label">{status.label}</span>
        </div>
      </div>

      {detailed && (
        <div className="status-details">
          <p className="status-description">{status.description}</p>
          
          {verifiedAt && (
            <div className="verification-info">
              <span className="info-label">Verified:</span>
              <span className="info-value">
                {new Date(verifiedAt).toLocaleDateString()}
              </span>
            </div>
          )}

          {verifiedBy && (
            <div className="verification-info">
              <span className="info-label">Verified by:</span>
              <span className="info-value">{verifiedBy}</span>
            </div>
          )}

          {documents && documents.length > 0 && (
            <div className="verification-documents">
              <span className="info-label">Verified Documents:</span>
              <ul className="document-list">
                {documents.map((doc, index) => (
                  <li key={index} className="document-item">
                    <CheckCircle size={14} />
                    <span>{doc.type}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <style jsx>{`
        .verification-status {
          background: white;
          border: 1px solid var(--gray-200);
          border-radius: var(--border-radius-xl);
          padding: var(--space-4);
        }

        .status-header {
          margin-bottom: var(--space-3);
        }

        .status-indicator {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          padding: var(--space-3);
          border-radius: var(--border-radius-lg);
          font-weight: 500;
        }

        .status-label {
          font-size: 1rem;
        }

        .status-details {
          margin-top: var(--space-3);
          padding-top: var(--space-3);
          border-top: 1px solid var(--gray-200);
        }

        .status-description {
          color: var(--gray-600);
          margin-bottom: var(--space-3);
          line-height: 1.5;
        }

        .verification-info {
          display: flex;
          justify-content: space-between;
          margin-bottom: var(--space-2);
          font-size: 0.875rem;
        }

        .info-label {
          color: var(--gray-600);
          font-weight: 500;
        }

        .info-value {
          color: var(--gray-900);
        }

        .verification-documents {
          margin-top: var(--space-3);
        }

        .document-list {
          list-style: none;
          padding: 0;
          margin: var(--space-2) 0 0 0;
        }

        .document-item {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          padding: var(--space-1) 0;
          font-size: 0.875rem;
          color: var(--gray-600);
        }

        .document-item svg {
          color: var(--success-500);
        }
      `}</style>
    </div>
  );
};

// Verification Application Form Component
export const VerificationApplicationForm = ({ onSubmit, onCancel }) => {
  const [formData, setFormData] = React.useState({
    applicationType: 'basic',
    personalInfo: {
      fullName: '',
      email: '',
      phoneNumber: '',
      country: '',
      dateOfBirth: ''
    },
    professionalInfo: {
      occupation: '',
      experience: '',
      portfolio: '',
      socialMedia: {
        twitter: '',
        instagram: '',
        website: ''
      }
    },
    documents: [],
    additionalInfo: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="verification-form">
      <div className="form-header">
        <h2>Creator Verification Application</h2>
        <p>Complete your verification to gain trust and unlock premium features</p>
      </div>

      {/* Verification Type */}
      <div className="form-section">
        <label className="section-label">Verification Type</label>
        <div className="verification-types">
          <label className="type-option">
            <input
              type="radio"
              name="applicationType"
              value="basic"
              checked={formData.applicationType === 'basic'}
              onChange={(e) => setFormData({...formData, applicationType: e.target.value})}
            />
            <div className="type-card">
              <CheckCircle size={24} />
              <h4>Basic Verification</h4>
              <p>Identity verification with basic features</p>
            </div>
          </label>

          <label className="type-option">
            <input
              type="radio"
              name="applicationType"
              value="premium"
              checked={formData.applicationType === 'premium'}
              onChange={(e) => setFormData({...formData, applicationType: e.target.value})}
            />
            <div className="type-card">
              <Crown size={24} />
              <h4>Premium Verification</h4>
              <p>Enhanced verification with premium features</p>
            </div>
          </label>
        </div>
      </div>

      {/* Form continues with other sections... */}
      
      <div className="form-actions">
        <button type="button" onClick={onCancel} className="btn btn-outline">
          Cancel
        </button>
        <button type="submit" className="btn btn-primary">
          Submit Application
        </button>
      </div>

      <style jsx>{`
        .verification-form {
          max-width: 600px;
          margin: 0 auto;
          background: white;
          border-radius: var(--border-radius-xl);
          padding: var(--space-8);
          box-shadow: var(--shadow-lg);
        }

        .form-header {
          text-align: center;
          margin-bottom: var(--space-8);
        }

        .form-header h2 {
          margin-bottom: var(--space-2);
          color: var(--gray-900);
        }

        .form-header p {
          color: var(--gray-600);
        }

        .form-section {
          margin-bottom: var(--space-6);
        }

        .section-label {
          display: block;
          font-weight: 600;
          color: var(--gray-900);
          margin-bottom: var(--space-3);
        }

        .verification-types {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: var(--space-4);
        }

        .type-option {
          cursor: pointer;
        }

        .type-option input[type="radio"] {
          display: none;
        }

        .type-card {
          padding: var(--space-4);
          border: 2px solid var(--gray-200);
          border-radius: var(--border-radius-lg);
          text-align: center;
          transition: all var(--transition-fast);
        }

        .type-option input[type="radio"]:checked + .type-card {
          border-color: var(--primary-500);
          background: var(--primary-50);
        }

        .type-card svg {
          color: var(--primary-600);
          margin-bottom: var(--space-2);
        }

        .type-card h4 {
          margin: 0 0 var(--space-1) 0;
          color: var(--gray-900);
        }

        .type-card p {
          margin: 0;
          font-size: 0.875rem;
          color: var(--gray-600);
        }

        .form-actions {
          display: flex;
          gap: var(--space-3);
          justify-content: flex-end;
          margin-top: var(--space-8);
          padding-top: var(--space-6);
          border-top: 1px solid var(--gray-200);
        }

        @media (max-width: 640px) {
          .verification-types {
            grid-template-columns: 1fr;
          }

          .form-actions {
            flex-direction: column;
          }
        }
      `}</style>
    </form>
  );
};

export default CreatorVerificationBadges; 