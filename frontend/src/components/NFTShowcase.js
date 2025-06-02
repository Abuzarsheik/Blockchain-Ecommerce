import React, { useState } from 'react';
import { 
  TrendingUp, 
  Eye, 
  Heart, 
  Share2, 
  MoreHorizontal,
  Grid,
  List
} from 'lucide-react';
import './NFTShowcase.css';

const NFTShowcase = ({ nftData = [], salesData = [], loading = false, hasRealData = false, isNewUser = false }) => {
  const [viewMode, setViewMode] = useState('grid');
  const [sortBy, setSortBy] = useState('recent');
  const [filterBy, setFilterBy] = useState('all');

  // Don't show NFT showcase for new users without NFTs
  if (isNewUser && !hasRealData) {
    return null;
  }

  // Only show real NFT data, no mock data
  const displayNFTs = hasRealData ? nftData : [];

  const filteredNFTs = displayNFTs.filter(nft => {
    if (filterBy === 'all') return true;
    if (filterBy === 'trending') return nft.trending;
    return nft.category?.toLowerCase() === filterBy.toLowerCase();
  });

  const sortedNFTs = [...filteredNFTs].sort((a, b) => {
    switch (sortBy) {
      case 'price_high':
        return b.price - a.price;
      case 'price_low':
        return a.price - b.price;
      case 'popular':
        return (b.likes || 0) - (a.likes || 0);
      case 'views':
        return (b.views || 0) - (a.views || 0);
      default:
        return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    }
  });

  if (loading) {
    return (
      <div className="nft-showcase">
        <div className="showcase-header">
          <h3>Your NFT Collection</h3>
        </div>
        <div className="loading-grid">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="nft-card-skeleton">
              <div className="skeleton-image"></div>
              <div className="skeleton-content">
                <div className="skeleton-line"></div>
                <div className="skeleton-line short"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="nft-showcase enhanced-showcase">
      <div className="showcase-header">
        <h3>Your NFT Collection</h3>
        {sortedNFTs.length > 0 && (
          <div className="showcase-controls">
            <div className="view-controls">
              <button 
                className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
                onClick={() => setViewMode('grid')}
              >
                <Grid size={16} />
              </button>
              <button 
                className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
                onClick={() => setViewMode('list')}
              >
                <List size={16} />
              </button>
            </div>
            
            <div className="filter-controls">
              <select 
                value={filterBy} 
                onChange={(e) => setFilterBy(e.target.value)}
                className="filter-select"
              >
                <option value="all">All Categories</option>
                <option value="trending">Trending</option>
                <option value="art">Art</option>
                <option value="gaming">Gaming</option>
                <option value="music">Music</option>
              </select>
              
              <select 
                value={sortBy} 
                onChange={(e) => setSortBy(e.target.value)}
                className="sort-select"
              >
                <option value="recent">Most Recent</option>
                <option value="price_high">Price: High to Low</option>
                <option value="price_low">Price: Low to High</option>
                <option value="popular">Most Liked</option>
                <option value="views">Most Viewed</option>
              </select>
            </div>
          </div>
        )}
      </div>

      <div className={`nft-grid ${viewMode}`}>
        {sortedNFTs.length > 0 ? (
          sortedNFTs.map((nft) => (
            <div key={nft.id} className="nft-card">
              <div className="nft-image">
                <img 
                  src={nft.image} 
                  alt={nft.name}
                  onError={(e) => {
                    e.target.src = '/api/placeholder/300/300';
                  }}
                />
                {nft.trending && (
                  <div className="trending-badge">
                    <TrendingUp size={12} />
                    Trending
                  </div>
                )}
                <div className="nft-overlay">
                  <button className="action-btn">
                    <Heart size={16} />
                  </button>
                  <button className="action-btn">
                    <Share2 size={16} />
                  </button>
                  <button className="action-btn">
                    <MoreHorizontal size={16} />
                  </button>
                </div>
              </div>
              
              <div className="nft-info">
                <h4 className="nft-name">{nft.name}</h4>
                <div className="nft-price">{nft.price} ETH</div>
                <div className="nft-stats">
                  <span className="stat">
                    <Heart size={12} />
                    {nft.likes || 0}
                  </span>
                  <span className="stat">
                    <Eye size={12} />
                    {nft.views || 0}
                  </span>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="empty-showcase">
            <div className="empty-showcase-content">
              <h4>No NFTs in Your Collection</h4>
              <p>Start creating or purchasing NFTs to build your collection!</p>
              <div className="empty-showcase-actions">
                <a href="/catalog" className="showcase-action-btn primary">
                  Browse NFTs
                </a>
                <a href="/create-nft" className="showcase-action-btn secondary">
                  Create NFT
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NFTShowcase; 