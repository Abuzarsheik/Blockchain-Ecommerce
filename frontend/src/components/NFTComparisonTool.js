import '../styles/theme.css';
import React, { useState } from 'react';
import { 

  Plus, 
  X, 
  ArrowRight, 
  Eye, 
  Heart, 
  DollarSign,
  Tag,
  BarChart3,
  TrendingUp,
  Star
} from 'lucide-react';

const NFTComparisonTool = ({ 
  initialNFTs = [], 
  onClose, 
  onAddNFT, 
  maxComparisons = 4 
}) => {
  const [comparedNFTs, setComparedNFTs] = useState(initialNFTs);
  const [activeView, setActiveView] = useState('overview');
  const [showAddModal, setShowAddModal] = useState(false);

  // Comparison views
  const comparisonViews = [
    { id: 'overview', label: 'Overview', icon: <Eye size={16} /> },
    { id: 'pricing', label: 'Pricing', icon: <DollarSign size={16} /> },
    { id: 'stats', label: 'Statistics', icon: <BarChart3 size={16} /> },
    { id: 'details', label: 'Details', icon: <Tag size={16} /> }
  ];

  // Add NFT to comparison
  const addNFT = (nft) => {
    if (comparedNFTs.length < maxComparisons) {
      setComparedNFTs([...comparedNFTs, nft]);
    }
    setShowAddModal(false);
  };

  // Remove NFT from comparison
  const removeNFT = (nftId) => {
    setComparedNFTs(comparedNFTs.filter(nft => nft.id !== nftId));
  };

  // Calculate comparison insights
  const getComparisonInsights = () => {
    if (comparedNFTs.length < 2) return null;

    const prices = comparedNFTs.map(nft => parseFloat(nft.price) || 0);
    const views = comparedNFTs.map(nft => nft.views || 0);
    const likes = comparedNFTs.map(nft => nft.likes || 0);

    return {
      priceRange: {
        min: Math.min(...prices),
        max: Math.max(...prices),
        avg: prices.reduce((a, b) => a + b, 0) / prices.length
      },
      engagement: {
        totalViews: views.reduce((a, b) => a + b, 0),
        totalLikes: likes.reduce((a, b) => a + b, 0),
        avgViews: views.reduce((a, b) => a + b, 0) / views.length,
        avgLikes: likes.reduce((a, b) => a + b, 0) / likes.length
      },
      recommendations: generateRecommendations(comparedNFTs)
    };
  };

  const generateRecommendations = (nfts) => {
    const recommendations = [];
    
    if (nfts.length >= 2) {
      const sortedByPrice = [...nfts].sort((a, b) => (parseFloat(b.price) || 0) - (parseFloat(a.price) || 0));
      const mostExpensive = sortedByPrice[0];
      const cheapest = sortedByPrice[sortedByPrice.length - 1];
      
      if (parseFloat(mostExpensive.price) > parseFloat(cheapest.price) * 2) {
        recommendations.push({
          type: 'value',
          message: `${cheapest.name} offers better value compared to ${mostExpensive.name}`,
          nft: cheapest
        });
      }

      const sortedByEngagement = [...nfts].sort((a, b) => ((b.views || 0) + (b.likes || 0)) - ((a.views || 0) + (a.likes || 0)));
      const mostEngaged = sortedByEngagement[0];
      
      recommendations.push({
        type: 'popularity',
        message: `${mostEngaged.name} has the highest engagement`,
        nft: mostEngaged
      });
    }

    return recommendations;
  };

  const insights = getComparisonInsights();

  if (comparedNFTs.length === 0) {
    return <EmptyComparison onAddNFT={() => setShowAddModal(true)} />;
  }

  return (
    <div className="nft-comparison-tool">
      <div className="comparison-header">
        <div className="header-content">
          <h2 className="comparison-title">
            NFT Comparison ({comparedNFTs.length}/{maxComparisons})
          </h2>
          <p className="comparison-subtitle">
            Compare NFTs side by side to make informed decisions
          </p>
        </div>
        
        <div className="header-actions">
          {comparedNFTs.length < maxComparisons && (
            <button
              onClick={() => setShowAddModal(true)}
              className="btn btn-outline add-nft-btn"
            >
              <Plus size={16} />
              Add NFT
            </button>
          )}
          <button onClick={onClose} className="close-btn">
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Comparison Views */}
      <div className="comparison-nav">
        {comparisonViews.map(view => (
          <button
            key={view.id}
            onClick={() => setActiveView(view.id)}
            className={`view-btn ${activeView === view.id ? 'active' : ''}`}
          >
            {view.icon}
            <span>{view.label}</span>
          </button>
        ))}
      </div>

      {/* Insights Panel */}
      {insights && (
        <div className="insights-panel">
          <h3 className="insights-title">
            <TrendingUp size={18} />
            Comparison Insights
          </h3>
          <div className="insights-grid">
            <div className="insight-card">
              <span className="insight-label">Price Range</span>
              <span className="insight-value">
                {insights.priceRange.min.toFixed(2)} - {insights.priceRange.max.toFixed(2)} ETH
              </span>
            </div>
            <div className="insight-card">
              <span className="insight-label">Total Engagement</span>
              <span className="insight-value">
                {insights.engagement.totalViews + insights.engagement.totalLikes}
              </span>
            </div>
          </div>
          
          {insights.recommendations.length > 0 && (
            <div className="recommendations">
              {insights.recommendations.map((rec, index) => (
                <div key={index} className={`recommendation ${rec.type}`}>
                  {rec.type === 'value' ? <DollarSign size={14} /> : <Star size={14} />}
                  <span>{rec.message}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Comparison Content */}
      <div className="comparison-content">
        {activeView === 'overview' && <OverviewComparison nfts={comparedNFTs} onRemove={removeNFT} />}
        {activeView === 'pricing' && <PricingComparison nfts={comparedNFTs} onRemove={removeNFT} />}
        {activeView === 'stats' && <StatsComparison nfts={comparedNFTs} onRemove={removeNFT} />}
        {activeView === 'details' && <DetailsComparison nfts={comparedNFTs} onRemove={removeNFT} />}
      </div>

      {/* Add NFT Modal */}
      {showAddModal && (
        <AddNFTModal
          onClose={() => setShowAddModal(false)}
          onAdd={addNFT}
          excludeIds={comparedNFTs.map(nft => nft.id)}
        />
      )}

      <style jsx>{`
        .nft-comparison-tool {
          background: white;
          border-radius: var(--border-radius-xl);
          box-shadow: var(--shadow-xl);
          overflow: hidden;
          max-width: 1400px;
          margin: 0 auto;
        }

        .comparison-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: var(--space-6);
          background: var(--gradient-primary);
          color: white;
        }

        .comparison-title {
          margin: 0 0 var(--space-1) 0;
          font-size: 1.5rem;
          font-weight: 700;
        }

        .comparison-subtitle {
          margin: 0;
          opacity: 0.9;
          font-size: 0.9rem;
        }

        .header-actions {
          display: flex;
          align-items: center;
          gap: var(--space-3);
        }

        .add-nft-btn {
          background: rgba(255, 255, 255, 0.2);
          color: white;
          border: 1px solid rgba(255, 255, 255, 0.3);
        }

        .add-nft-btn:hover {
          background: rgba(255, 255, 255, 0.3);
        }

        .close-btn {
          padding: var(--space-2);
          background: rgba(255, 255, 255, 0.2);
          border: none;
          border-radius: var(--border-radius-lg);
          color: white;
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .close-btn:hover {
          background: rgba(255, 255, 255, 0.3);
        }

        .comparison-nav {
          display: flex;
          background: var(--gray-50);
          border-bottom: 1px solid var(--gray-200);
        }

        .view-btn {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: var(--space-2);
          padding: var(--space-4);
          background: transparent;
          border: none;
          color: var(--gray-600);
          font-weight: 500;
          cursor: pointer;
          transition: all var(--transition-fast);
          border-bottom: 3px solid transparent;
        }

        .view-btn:hover {
          background: var(--gray-100);
          color: var(--gray-900);
        }

        .view-btn.active {
          background: white;
          color: var(--primary-600);
          border-bottom-color: var(--primary-500);
        }

        .insights-panel {
          padding: var(--space-6);
          background: var(--primary-50);
          border-bottom: 1px solid var(--primary-200);
        }

        .insights-title {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          margin: 0 0 var(--space-4) 0;
          color: var(--primary-700);
          font-size: 1.125rem;
          font-weight: 600;
        }

        .insights-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: var(--space-4);
          margin-bottom: var(--space-4);
        }

        .insight-card {
          background: white;
          padding: var(--space-4);
          border-radius: var(--border-radius-lg);
          text-align: center;
          box-shadow: var(--shadow-sm);
        }

        .insight-label {
          display: block;
          font-size: 0.875rem;
          color: var(--gray-600);
          margin-bottom: var(--space-1);
        }

        .insight-value {
          display: block;
          font-size: 1.25rem;
          font-weight: 700;
          color: var(--gray-900);
        }

        .recommendations {
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
        }

        .recommendation {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          padding: var(--space-3);
          background: white;
          border-radius: var(--border-radius-lg);
          font-size: 0.875rem;
          box-shadow: var(--shadow-sm);
        }

        .recommendation.value {
          color: var(--success-700);
          border-left: 4px solid var(--success-500);
        }

        .recommendation.popularity {
          color: var(--warning-700);
          border-left: 4px solid var(--warning-500);
        }

        .comparison-content {
          padding: var(--space-6);
          min-height: 400px;
        }

        @media (max-width: 768px) {
          .comparison-header {
            flex-direction: column;
            align-items: flex-start;
            gap: var(--space-4);
          }

          .header-actions {
            width: 100%;
            justify-content: space-between;
          }

          .comparison-nav {
            flex-direction: column;
          }

          .insights-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};

// Overview Comparison Component
const OverviewComparison = ({ nfts, onRemove }) => {
  return (
    <div className="overview-comparison">
      <div className="nft-grid">
        {nfts.map((nft) => (
          <div key={nft.id} className="nft-comparison-card">
            <button
              onClick={() => onRemove(nft.id)}
              className="remove-btn"
              title="Remove from comparison"
            >
              <X size={16} />
            </button>
            
            <div className="nft-image-container">
              <img src={nft.image} alt={nft.name} className="nft-image" />
            </div>
            
            <div className="nft-content">
              <h3 className="nft-title">{nft.name}</h3>
              <p className="nft-creator">by {nft.creator}</p>
              
              <div className="nft-price">
                <span className="price-label">Price</span>
                <span className="price-value">{nft.price} ETH</span>
              </div>
              
              <div className="nft-stats">
                <div className="stat">
                  <Eye size={14} />
                  <span>{nft.views || 0}</span>
                </div>
                <div className="stat">
                  <Heart size={14} />
                  <span>{nft.likes || 0}</span>
                </div>
              </div>
              
              <button className="view-details-btn">
                View Details
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <style jsx>{`
        .nft-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: var(--space-6);
        }

        .nft-comparison-card {
          position: relative;
          background: white;
          border: 1px solid var(--gray-200);
          border-radius: var(--border-radius-xl);
          overflow: hidden;
          transition: all var(--transition-normal);
        }

        .nft-comparison-card:hover {
          transform: translateY(-4px);
          box-shadow: var(--shadow-lg);
        }

        .remove-btn {
          position: absolute;
          top: var(--space-3);
          right: var(--space-3);
          z-index: 10;
          padding: var(--space-2);
          background: rgba(0, 0, 0, 0.7);
          color: white;
          border: none;
          border-radius: var(--border-radius-full);
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .remove-btn:hover {
          background: var(--danger-600);
          transform: scale(1.1);
        }

        .nft-image-container {
          aspect-ratio: 1;
          overflow: hidden;
        }

        .nft-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform var(--transition-normal);
        }

        .nft-comparison-card:hover .nft-image {
          transform: scale(1.05);
        }

        .nft-content {
          padding: var(--space-4);
        }

        .nft-title {
          margin: 0 0 var(--space-1) 0;
          font-size: 1.125rem;
          font-weight: 600;
          color: var(--gray-900);
        }

        .nft-creator {
          margin: 0 0 var(--space-3) 0;
          color: var(--gray-600);
          font-size: 0.875rem;
        }

        .nft-price {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: var(--space-3);
        }

        .price-label {
          font-size: 0.875rem;
          color: var(--gray-500);
        }

        .price-value {
          font-weight: 700;
          color: var(--primary-600);
          font-size: 1.125rem;
        }

        .nft-stats {
          display: flex;
          gap: var(--space-4);
          margin-bottom: var(--space-4);
        }

        .stat {
          display: flex;
          align-items: center;
          gap: var(--space-1);
          font-size: 0.875rem;
          color: var(--gray-600);
        }

        .view-details-btn {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: var(--space-2);
          padding: var(--space-3);
          background: var(--primary-100);
          color: var(--primary-700);
          border: none;
          border-radius: var(--border-radius-lg);
          font-weight: 500;
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .view-details-btn:hover {
          background: var(--primary-200);
        }

        @media (max-width: 640px) {
          .nft-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};

// Pricing Comparison Component
const PricingComparison = ({ nfts, onRemove }) => {
  const sortedByPrice = [...nfts].sort((a, b) => (parseFloat(b.price) || 0) - (parseFloat(a.price) || 0));
  const maxPrice = parseFloat(sortedByPrice[0]?.price) || 1;

  return (
    <div className="pricing-comparison">
      <div className="price-chart">
        {sortedByPrice.map((nft, index) => {
          const price = parseFloat(nft.price) || 0;
          const percentage = (price / maxPrice) * 100;
          
          return (
            <div key={nft.id} className="price-bar-container">
              <div className="nft-info">
                <img src={nft.image} alt={nft.name} className="nft-thumb" />
                <div className="nft-details">
                  <h4 className="nft-name">{nft.name}</h4>
                  <p className="nft-creator">by {nft.creator}</p>
                </div>
              </div>
              
              <div className="price-bar-wrapper">
                <div 
                  className="price-bar"
                  style={{ width: `${percentage}%` }}
                >
                  <span className="price-label">{nft.price} ETH</span>
                </div>
              </div>
              
              <button
                onClick={() => onRemove(nft.id)}
                className="remove-btn"
              >
                <X size={16} />
              </button>
            </div>
          );
        })}
      </div>

      <style jsx>{`
        .pricing-comparison {
          max-width: 800px;
          margin: 0 auto;
        }

        .price-chart {
          display: flex;
          flex-direction: column;
          gap: var(--space-4);
        }

        .price-bar-container {
          display: flex;
          align-items: center;
          gap: var(--space-4);
          padding: var(--space-4);
          background: var(--gray-50);
          border-radius: var(--border-radius-lg);
          border: 1px solid var(--gray-200);
        }

        .nft-info {
          display: flex;
          align-items: center;
          gap: var(--space-3);
          min-width: 200px;
        }

        .nft-thumb {
          width: 48px;
          height: 48px;
          border-radius: var(--border-radius-lg);
          object-fit: cover;
        }

        .nft-name {
          margin: 0;
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--gray-900);
        }

        .nft-creator {
          margin: 0;
          font-size: 0.75rem;
          color: var(--gray-600);
        }

        .price-bar-wrapper {
          flex: 1;
          height: 40px;
          background: var(--gray-200);
          border-radius: var(--border-radius-full);
          overflow: hidden;
          position: relative;
        }

        .price-bar {
          height: 100%;
          background: var(--gradient-primary);
          border-radius: var(--border-radius-full);
          display: flex;
          align-items: center;
          justify-content: flex-end;
          padding-right: var(--space-3);
          min-width: 80px;
          transition: width var(--transition-slow);
        }

        .price-label {
          color: white;
          font-weight: 600;
          font-size: 0.875rem;
        }

        .remove-btn {
          padding: var(--space-2);
          background: var(--danger-100);
          color: var(--danger-600);
          border: none;
          border-radius: var(--border-radius-lg);
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .remove-btn:hover {
          background: var(--danger-200);
        }

        @media (max-width: 640px) {
          .price-bar-container {
            flex-direction: column;
            align-items: stretch;
          }

          .nft-info {
            min-width: auto;
          }
        }
      `}</style>
    </div>
  );
};

// Stats Comparison Component
const StatsComparison = ({ nfts, onRemove }) => {
  const stats = [
    { key: 'views', label: 'Views', icon: <Eye size={16} /> },
    { key: 'likes', label: 'Likes', icon: <Heart size={16} /> },
    { key: 'price', label: 'Price (ETH)', icon: <DollarSign size={16} /> }
  ];

  return (
    <div className="stats-comparison">
      <div className="stats-table">
        <div className="table-header">
          <div className="header-cell nft-cell">NFT</div>
          {stats.map(stat => (
            <div key={stat.key} className="header-cell stat-cell">
              {stat.icon}
              <span>{stat.label}</span>
            </div>
          ))}
          <div className="header-cell action-cell">Action</div>
        </div>

        {nfts.map((nft) => (
          <div key={nft.id} className="table-row">
            <div className="table-cell nft-cell">
              <img src={nft.image} alt={nft.name} className="nft-thumb" />
              <div className="nft-info">
                <h4 className="nft-name">{nft.name}</h4>
                <p className="nft-creator">by {nft.creator}</p>
              </div>
            </div>
            
            <div className="table-cell stat-cell">
              {nft.views || 0}
            </div>
            
            <div className="table-cell stat-cell">
              {nft.likes || 0}
            </div>
            
            <div className="table-cell stat-cell">
              {nft.price || '0.00'}
            </div>
            
            <div className="table-cell action-cell">
              <button
                onClick={() => onRemove(nft.id)}
                className="remove-btn"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <style jsx>{`
        .stats-comparison {
          overflow-x: auto;
        }

        .stats-table {
          min-width: 600px;
          background: white;
          border: 1px solid var(--gray-200);
          border-radius: var(--border-radius-lg);
          overflow: hidden;
        }

        .table-header {
          display: grid;
          grid-template-columns: 2fr 1fr 1fr 1fr 80px;
          background: var(--gray-50);
          border-bottom: 1px solid var(--gray-200);
        }

        .table-row {
          display: grid;
          grid-template-columns: 2fr 1fr 1fr 1fr 80px;
          border-bottom: 1px solid var(--gray-100);
        }

        .table-row:last-child {
          border-bottom: none;
        }

        .header-cell {
          padding: var(--space-4);
          font-weight: 600;
          color: var(--gray-700);
          display: flex;
          align-items: center;
          gap: var(--space-2);
        }

        .table-cell {
          padding: var(--space-4);
          display: flex;
          align-items: center;
          font-weight: 500;
        }

        .nft-cell {
          gap: var(--space-3);
        }

        .nft-thumb {
          width: 48px;
          height: 48px;
          border-radius: var(--border-radius-lg);
          object-fit: cover;
          flex-shrink: 0;
        }

        .nft-info {
          flex: 1;
          min-width: 0;
        }

        .nft-name {
          margin: 0 0 var(--space-1) 0;
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--gray-900);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .nft-creator {
          margin: 0;
          font-size: 0.75rem;
          color: var(--gray-600);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .stat-cell {
          justify-content: center;
          color: var(--gray-700);
        }

        .action-cell {
          justify-content: center;
        }

        .remove-btn {
          padding: var(--space-2);
          background: var(--danger-100);
          color: var(--danger-600);
          border: none;
          border-radius: var(--border-radius-lg);
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .remove-btn:hover {
          background: var(--danger-200);
        }
      `}</style>
    </div>
  );
};

// Details Comparison Component
const DetailsComparison = ({ nfts, onRemove }) => {
  return (
    <div className="details-comparison">
      {nfts.map((nft) => (
        <div key={nft.id} className="nft-detail-card">
          <div className="detail-header">
            <img src={nft.image} alt={nft.name} className="nft-image" />
            <div className="nft-info">
              <h3 className="nft-title">{nft.name}</h3>
              <p className="nft-creator">by {nft.creator}</p>
              <div className="nft-price">{nft.price} ETH</div>
            </div>
            <button
              onClick={() => onRemove(nft.id)}
              className="remove-btn"
            >
              <X size={20} />
            </button>
          </div>
          
          <div className="detail-content">
            <div className="detail-section">
              <h4>Properties</h4>
              <div className="properties-grid">
                {nft.properties?.map((prop, index) => (
                  <div key={index} className="property-item">
                    <span className="prop-name">{prop.name}</span>
                    <span className="prop-value">{prop.value}</span>
                  </div>
                )) || <p className="no-data">No properties available</p>}
              </div>
            </div>
            
            <div className="detail-section">
              <h4>Description</h4>
              <p className="description">
                {nft.description || 'No description available'}
              </p>
            </div>
            
            <div className="detail-section">
              <h4>Collection Info</h4>
              <div className="collection-info">
                <span>Collection: {nft.collection || 'Unknown'}</span>
                <span>Category: {nft.category || 'Unknown'}</span>
                <span>Created: {nft.createdAt ? new Date(nft.createdAt).toLocaleDateString() : 'Unknown'}</span>
              </div>
            </div>
          </div>
        </div>
      ))}

      <style jsx>{`
        .details-comparison {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
          gap: var(--space-6);
        }

        .nft-detail-card {
          background: white;
          border: 1px solid var(--gray-200);
          border-radius: var(--border-radius-xl);
          overflow: hidden;
        }

        .detail-header {
          display: flex;
          align-items: center;
          gap: var(--space-4);
          padding: var(--space-4);
          background: var(--gray-50);
          border-bottom: 1px solid var(--gray-200);
        }

        .nft-image {
          width: 80px;
          height: 80px;
          border-radius: var(--border-radius-lg);
          object-fit: cover;
        }

        .nft-info {
          flex: 1;
        }

        .nft-title {
          margin: 0 0 var(--space-1) 0;
          font-size: 1.125rem;
          font-weight: 600;
          color: var(--gray-900);
        }

        .nft-creator {
          margin: 0 0 var(--space-2) 0;
          color: var(--gray-600);
          font-size: 0.875rem;
        }

        .nft-price {
          font-weight: 700;
          color: var(--primary-600);
          font-size: 1.125rem;
        }

        .remove-btn {
          padding: var(--space-2);
          background: var(--danger-100);
          color: var(--danger-600);
          border: none;
          border-radius: var(--border-radius-lg);
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .remove-btn:hover {
          background: var(--danger-200);
        }

        .detail-content {
          padding: var(--space-4);
        }

        .detail-section {
          margin-bottom: var(--space-6);
        }

        .detail-section:last-child {
          margin-bottom: 0;
        }

        .detail-section h4 {
          margin: 0 0 var(--space-3) 0;
          font-size: 1rem;
          font-weight: 600;
          color: var(--gray-900);
        }

        .properties-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
          gap: var(--space-2);
        }

        .property-item {
          display: flex;
          flex-direction: column;
          padding: var(--space-3);
          background: var(--gray-50);
          border-radius: var(--border-radius-lg);
          border: 1px solid var(--gray-200);
        }

        .prop-name {
          font-size: 0.75rem;
          color: var(--gray-600);
          text-transform: uppercase;
          margin-bottom: var(--space-1);
        }

        .prop-value {
          font-weight: 600;
          color: var(--gray-900);
        }

        .description {
          color: var(--gray-700);
          line-height: 1.5;
          margin: 0;
        }

        .collection-info {
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
        }

        .collection-info span {
          padding: var(--space-2);
          background: var(--gray-50);
          border-radius: var(--border-radius-md);
          font-size: 0.875rem;
          color: var(--gray-700);
        }

        .no-data {
          color: var(--gray-500);
          font-style: italic;
          margin: 0;
        }

        @media (max-width: 640px) {
          .details-comparison {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};

// Empty state component
const EmptyComparison = ({ onAddNFT }) => {
  return (
    <div className="empty-comparison">
      <div className="empty-content">
        <BarChart3 size={64} className="empty-icon" />
        <h3>Start Comparing NFTs</h3>
        <p>Add NFTs to compare their features, pricing, and statistics side by side.</p>
        <button onClick={onAddNFT} className="btn btn-primary">
          <Plus size={16} />
          Add Your First NFT
        </button>
      </div>

      <style jsx>{`
        .empty-comparison {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 400px;
          background: var(--gray-50);
          border-radius: var(--border-radius-xl);
        }

        .empty-content {
          text-align: center;
          max-width: 400px;
          padding: var(--space-8);
        }

        .empty-icon {
          color: var(--gray-300);
          margin-bottom: var(--space-4);
        }

        .empty-content h3 {
          margin: 0 0 var(--space-2) 0;
          color: var(--gray-900);
          font-size: 1.5rem;
        }

        .empty-content p {
          margin: 0 0 var(--space-6) 0;
          color: var(--gray-600);
          line-height: 1.5;
        }
      `}</style>
    </div>
  );
};

// Add NFT Modal Component (simplified for brevity)
const AddNFTModal = ({ onClose, onAdd, excludeIds }) => {
  // This would typically fetch available NFTs from an API
  const availableNFTs = [
    // Mock data - would be replaced with real data
    { id: 1, name: 'Sample NFT 1', image: '/api/placeholder/200/200', creator: 'Artist1', price: '1.5' },
    { id: 2, name: 'Sample NFT 2', image: '/api/placeholder/200/200', creator: 'Artist2', price: '2.0' }
  ].filter(nft => !excludeIds.includes(nft.id));

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Add NFT to Comparison</h3>
          <button onClick={onClose} className="close-btn">
            <X size={20} />
          </button>
        </div>
        
        <div className="nft-list">
          {availableNFTs.map((nft) => (
            <div key={nft.id} className="nft-item" onClick={() => onAdd(nft)}>
              <img src={nft.image} alt={nft.name} className="nft-thumb" />
              <div className="nft-info">
                <h4>{nft.name}</h4>
                <p>by {nft.creator}</p>
                <span className="price">{nft.price} ETH</span>
              </div>
            </div>
          ))}
        </div>

        <style jsx>{`
          .modal-backdrop {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: var(--z-modal);
          }

          .modal-content {
            background: white;
            border-radius: var(--border-radius-xl);
            max-width: 500px;
            max-height: 80vh;
            overflow: hidden;
            box-shadow: var(--shadow-xl);
          }

          .modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: var(--space-4);
            border-bottom: 1px solid var(--gray-200);
          }

          .modal-header h3 {
            margin: 0;
            color: var(--gray-900);
          }

          .close-btn {
            padding: var(--space-2);
            background: transparent;
            border: none;
            color: var(--gray-500);
            cursor: pointer;
            border-radius: var(--border-radius-lg);
          }

          .close-btn:hover {
            background: var(--gray-100);
          }

          .nft-list {
            padding: var(--space-4);
            max-height: 400px;
            overflow-y: auto;
          }

          .nft-item {
            display: flex;
            align-items: center;
            gap: var(--space-3);
            padding: var(--space-3);
            border-radius: var(--border-radius-lg);
            cursor: pointer;
            transition: all var(--transition-fast);
          }

          .nft-item:hover {
            background: var(--gray-50);
          }

          .nft-thumb {
            width: 60px;
            height: 60px;
            border-radius: var(--border-radius-lg);
            object-fit: cover;
          }

          .nft-info h4 {
            margin: 0 0 var(--space-1) 0;
            font-size: 0.875rem;
            color: var(--gray-900);
          }

          .nft-info p {
            margin: 0 0 var(--space-1) 0;
            font-size: 0.75rem;
            color: var(--gray-600);
          }

          .price {
            font-weight: 600;
            color: var(--primary-600);
            font-size: 0.875rem;
          }
        `}</style>
      </div>
    </div>
  );
};

export default NFTComparisonTool; 