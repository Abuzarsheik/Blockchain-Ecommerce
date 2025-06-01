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

const NFTShowcase = ({ nftData = [], salesData = [], loading = false }) => {
  const [viewMode, setViewMode] = useState('grid');
  const [sortBy, setSortBy] = useState('recent');
  const [filterBy, setFilterBy] = useState('all');

  // Mock data if none provided
  const mockNFTs = [
    {
      id: 1,
      name: 'Digital Dreams #42',
      price: 2.5,
      image: '/api/placeholder/300/300',
      likes: 24,
      views: 156,
      category: 'Art',
      trending: true
    },
    {
      id: 2,
      name: 'Cosmic Cat',
      price: 1.8,
      image: '/api/placeholder/300/300',
      likes: 12,
      views: 89,
      category: 'Gaming',
      trending: false
    },
    {
      id: 3,
      name: 'Neon Lights',
      price: 3.2,
      image: '/api/placeholder/300/300',
      likes: 31,
      views: 203,
      category: 'Art',
      trending: true
    }
  ];

  const displayNFTs = nftData.length > 0 ? nftData : mockNFTs;

  const filteredNFTs = displayNFTs.filter(nft => {
    if (filterBy === 'all') return true;
    if (filterBy === 'trending') return nft.trending;
    return nft.category.toLowerCase() === filterBy.toLowerCase();
  });

  const sortedNFTs = [...filteredNFTs].sort((a, b) => {
    switch (sortBy) {
      case 'price_high':
        return b.price - a.price;
      case 'price_low':
        return a.price - b.price;
      case 'popular':
        return b.likes - a.likes;
      case 'views':
        return b.views - a.views;
      default:
        return b.id - a.id; // Most recent first
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
    <div className="nft-showcase">
      <div className="showcase-header">
        <h3>Your NFT Collection</h3>
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
      </div>

      <div className={`nft-grid ${viewMode}`}>
        {sortedNFTs.map((nft) => (
          <div key={nft.id} className="nft-card">
            <div className="nft-image">
              <img src={nft.image} alt={nft.name} />
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
                  {nft.likes}
                </span>
                <span className="stat">
                  <Eye size={12} />
                  {nft.views}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {sortedNFTs.length === 0 && (
        <div className="empty-showcase">
          <p>No NFTs found matching your criteria.</p>
        </div>
      )}
    </div>
  );
};

export default NFTShowcase; 