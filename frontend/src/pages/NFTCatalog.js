import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { 
  Search, 
  Filter, 
  Grid, 
  List, 
  ChevronDown, 
  Eye, 
  Heart, 
  ShoppingCart,
  Star,
  TrendingUp,
  Zap,
  Users
} from 'lucide-react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { addToCart } from '../store/slices/cartSlice';
import LoadingSpinner from '../components/LoadingSpinner';
import { getNFTImageUrl } from '../utils/imageUtils';
import '../styles/NFTCatalog.css';

const NFTCatalog = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { isAuthenticated, user } = useSelector(state => state.auth);
  
  const [nfts, setNfts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [priceRange, setPriceRange] = useState({ min: '', max: '' });
  const [pagination, setPagination] = useState({
    current: 1,
    pages: 1,
    total: 0
  });
  const [likedNfts, setLikedNfts] = useState(new Set());

  const categories = [
    'All Categories',
    'Art',
    'Digital Art',
    'Music',
    'Photography',
    'Gaming',
    'Sports',
    'Collectibles',
    'Utility',
    'Domain Names'
  ];

  const sortOptions = [
    { value: 'newest', label: 'Newest First', icon: '🆕' },
    { value: 'oldest', label: 'Oldest First', icon: '📅' },
    { value: 'price_high', label: 'Price: High to Low', icon: '💰' },
    { value: 'price_low', label: 'Price: Low to High', icon: '💸' },
    { value: 'name_asc', label: 'Name: A to Z', icon: '🔤' },
    { value: 'name_desc', label: 'Name: Z to A', icon: '🔠' },
    { value: 'trending', label: 'Trending', icon: '🔥' },
    { value: 'likes', label: 'Most Liked', icon: '❤️' }
  ];

  const quickFilters = [
    { label: 'All', value: '', icon: '🎯' },
    { label: 'Under 1 ETH', value: 'under_1', icon: '💎' },
    { label: 'Trending', value: 'trending', icon: '🔥' },
    { label: 'New Today', value: 'new_today', icon: '✨' }
  ];

  useEffect(() => {
    fetchNFTs();
  }, [searchTerm, sortBy, selectedCategory, pagination.current, priceRange]);

  const fetchNFTs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pagination.current,
        limit: 12,
        sort: sortBy,
        ...(searchTerm && { search: searchTerm }),
        ...(selectedCategory && selectedCategory !== 'All Categories' && { category: selectedCategory }),
        ...(priceRange.min && { min_price: priceRange.min }),
        ...(priceRange.max && { max_price: priceRange.max })
      });

      const response = await api.get(`/nfts?${params}`);
      setNfts(response.data.nfts);
      setPagination(response.data.pagination);
      setError(null);
    } catch (error) {
      console.error('Failed to fetch NFTs:', error);
      setError('Failed to load NFTs');
      toast.error('Failed to load NFTs');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  const handleCategoryChange = (category) => {
    setSelectedCategory(category);
    setPagination(prev => ({ ...prev, current: 1 }));
    setShowFilters(false);
  };

  const handleSortChange = (sortValue) => {
    setSortBy(sortValue);
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  const handleQuickFilter = (filterValue) => {
    switch (filterValue) {
      case 'under_1':
        setPriceRange({ min: '', max: '1' });
        break;
      case 'trending':
        setSortBy('trending');
        break;
      case 'new_today':
        setSortBy('newest');
        break;
      default:
        setPriceRange({ min: '', max: '' });
        setSortBy('newest');
    }
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  const handlePageChange = (page) => {
    setPagination(prev => ({ ...prev, current: page }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNFTClick = (nftId) => {
    navigate(`/nft/${nftId}`);
  };

  const handleLike = async (nftId, e) => {
    e.stopPropagation();
    
    if (!isAuthenticated) {
      toast.error('Please log in to like NFTs');
      navigate('/login');
      return;
    }

    try {
      await api.post(`/nfts/${nftId}/like`);
      
      setLikedNfts(prev => {
        const newLiked = new Set(prev);
        if (newLiked.has(nftId)) {
          newLiked.delete(nftId);
        } else {
          newLiked.add(nftId);
        }
        return newLiked;
      });

      setNfts(prev => prev.map(nft => 
        nft._id === nftId 
          ? { ...nft, like_count: (nft.like_count || 0) + (likedNfts.has(nftId) ? -1 : 1) }
          : nft
      ));

      toast.success(likedNfts.has(nftId) ? 'NFT unliked!' : 'NFT liked!');
    } catch (error) {
      console.error('Like error:', error);
      toast.error('Failed to like NFT');
    }
  };

  const handleAddToCart = (nft, e) => {
    e.stopPropagation();
    
    if (!isAuthenticated) {
      toast.error('Please log in to add items to cart');
      navigate('/login');
      return;
    }
    
    dispatch(addToCart({
      productId: nft._id,
      quantity: 1,
      price: nft.price,
      name: nft.name,
      image: nft.image_url,
      type: 'nft'
    }));
    
    toast.success(`${nft.name} added to cart!`);
  };

  const formatPrice = (price) => {
    return parseFloat(price).toFixed(3);
  };

  const getPopularityBadge = (nft) => {
    const totalInteractions = (nft.view_count || 0) + (nft.like_count || 0);
    if (totalInteractions > 100) return { label: 'Hot', class: 'hot' };
    if (totalInteractions > 50) return { label: 'Popular', class: 'popular' };
    if (totalInteractions > 20) return { label: 'Rising', class: 'rising' };
    return null;
  };

  const NFTCard = ({ nft }) => {
    const popularity = getPopularityBadge(nft);
    const [imageLoaded, setImageLoaded] = useState(false);
    
    return (
      <div 
        className="enhanced-nft-card" 
        onClick={() => handleNFTClick(nft._id)}
      >
        <div className="nft-image-wrapper">
          <img 
            src={getNFTImageUrl(nft.image_url)}
            alt={nft.name}
            className={`nft-image ${imageLoaded ? 'loaded' : ''}`}
            onLoad={() => setImageLoaded(true)}
            onError={(e) => {
              e.target.src = 'https://via.placeholder.com/400x400/667eea/ffffff?text=NFT+Not+Found';
            }}
          />
          
          {/* Badges */}
          <div className="nft-badges">
            <span className="nft-badge primary">NFT</span>
            {popularity && (
              <span className={`nft-badge ${popularity.class}`}>
                {popularity.label}
              </span>
            )}
          </div>
          
          {/* Quick Actions Overlay */}
          <div className="quick-actions-overlay">
            <button 
              className={`action-btn like-btn ${likedNfts.has(nft._id) ? 'liked' : ''}`}
              onClick={(e) => handleLike(nft._id, e)}
              title="Like NFT"
            >
              <Heart size={18} fill={likedNfts.has(nft._id) ? 'currentColor' : 'none'} />
            </button>
            <button 
              className="action-btn view-btn"
              onClick={(e) => {
                e.stopPropagation();
                handleNFTClick(nft._id);
              }}
              title="View Details"
            >
              <Eye size={18} />
            </button>
            <button 
              className="action-btn cart-btn"
              onClick={(e) => handleAddToCart(nft, e)}
              title="Add to Cart"
            >
              <ShoppingCart size={18} />
            </button>
          </div>

          {/* Price Tag */}
          <div className="price-tag">
            <span className="price-eth">{formatPrice(nft.price)} ETH</span>
            <span className="price-usd">${(nft.price * 2000).toFixed(0)}</span>
          </div>
        </div>
        
        <div className="nft-info">
          <div className="nft-category">{nft.category}</div>
          <h3 className="nft-title">{nft.name}</h3>
          <p className="nft-description">{nft.description}</p>
          
          <div className="nft-footer">
            <div className="creator-section">
              <div className="creator-avatar">
                <Users size={16} />
              </div>
              <div className="creator-details">
                <span className="creator-label">Creator</span>
                <span className="creator-name">
                  {nft.creator_id?.firstName} {nft.creator_id?.lastName}
                </span>
              </div>
            </div>
            
            <div className="nft-stats">
              <div className="stat">
                <Eye size={12} />
                <span>{nft.view_count || 0}</span>
              </div>
              <div className="stat">
                <Heart size={12} />
                <span>{nft.like_count || 0}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (loading && nfts.length === 0) {
    return (
      <div className="catalog-loading">
        <LoadingSpinner />
        <p>Discovering amazing NFTs...</p>
      </div>
    );
  }

  return (
    <div className="enhanced-nft-catalog">
      {/* Hero Section */}
      <div className="catalog-hero">
        <div className="hero-content">
          <h1 className="hero-title">
            Discover <span className="gradient-text">Extraordinary</span> NFTs
          </h1>
          <p className="hero-subtitle">
            Explore, collect, and trade unique digital assets from talented creators worldwide
          </p>
          <div className="hero-stats">
            <div className="stat-item">
              <TrendingUp className="stat-icon" />
              <span className="stat-number">{pagination.total}</span>
              <span className="stat-label">NFTs</span>
            </div>
            <div className="stat-item">
              <Users className="stat-icon" />
              <span className="stat-number">1.2K+</span>
              <span className="stat-label">Creators</span>
            </div>
            <div className="stat-item">
              <Zap className="stat-icon" />
              <span className="stat-number">24.5K</span>
              <span className="stat-label">Sales</span>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="catalog-controls">
        <div className="search-section">
          <div className="search-container">
            <Search className="search-icon" size={20} />
            <input
              type="text"
              placeholder="Search NFTs by name, creator, or category..."
              value={searchTerm}
              onChange={handleSearch}
              className="search-input"
            />
          </div>
        </div>

        {/* Quick Filters */}
        <div className="quick-filters">
          {quickFilters.map(filter => (
            <button
              key={filter.value}
              className={`quick-filter ${!filter.value && !priceRange.min && !priceRange.max ? 'active' : ''}`}
              onClick={() => handleQuickFilter(filter.value)}
            >
              <span className="filter-icon">{filter.icon}</span>
              {filter.label}
            </button>
          ))}
        </div>

        <div className="filter-controls">
          {/* Category Filter */}
          <div className="filter-dropdown">
            <button 
              className="filter-button"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter size={16} />
              <span>{selectedCategory || 'All Categories'}</span>
              <ChevronDown size={16} />
            </button>
            
            {showFilters && (
              <div className="filter-options">
                {categories.map(category => (
                  <button
                    key={category}
                    className={`filter-option ${selectedCategory === category ? 'active' : ''}`}
                    onClick={() => handleCategoryChange(category === 'All Categories' ? '' : category)}
                  >
                    {category}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Sort Filter */}
          <select 
            value={sortBy} 
            onChange={(e) => handleSortChange(e.target.value)}
            className="sort-select"
          >
            {sortOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.icon} {option.label}
              </option>
            ))}
          </select>

          {/* View Mode */}
          <div className="view-controls">
            <button 
              className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
              title="Grid View"
            >
              <Grid size={16} />
            </button>
            <button 
              className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
              title="List View"
            >
              <List size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Results */}
      {error ? (
        <div className="error-state">
          <h3>Oops! Something went wrong</h3>
          <p>{error}</p>
          <button onClick={fetchNFTs} className="retry-btn">
            Try Again
          </button>
        </div>
      ) : (
        <>
          <div className="results-header">
            <span className="results-count">
              Showing {nfts.length} of {pagination.total} NFTs
            </span>
            {selectedCategory && (
              <span className="active-filter">
                Category: {selectedCategory}
                <button onClick={() => handleCategoryChange('')}>×</button>
              </span>
            )}
          </div>

          {nfts.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🎨</div>
              <h3>No NFTs Available</h3>
              <p>No seller-created NFTs found. Be the first to create and upload your unique digital artwork!</p>
              {isAuthenticated && (user?.userType === 'seller' || user?.role === 'admin') && (
                <button 
                  onClick={() => navigate('/create-nft')} 
                  className="btn-primary"
                  style={{ marginTop: '1rem' }}
                >
                  Create Your First NFT
                </button>
              )}
              {isAuthenticated && user?.userType !== 'seller' && user?.role !== 'admin' && (
                <p style={{ marginTop: '1rem', color: '#666' }}>
                  Contact support to upgrade your account to seller status to create NFTs.
                </p>
              )}
              {!isAuthenticated && (
                <p style={{ marginTop: '1rem', color: '#666' }}>
                  <button onClick={() => navigate('/login')} className="btn-primary">
                    Log in
                  </button> to start creating NFTs.
                </p>
              )}
            </div>
          ) : (
            <div className={`nfts-grid ${viewMode === 'list' ? 'list-view' : ''}`}>
              {nfts.map(nft => (
                <NFTCard key={nft._id} nft={nft} />
              ))}
            </div>
          )}

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="pagination">
              <button
                className="page-btn prev"
                disabled={pagination.current === 1}
                onClick={() => handlePageChange(pagination.current - 1)}
              >
                Previous
              </button>
              
              {[...Array(pagination.pages)].map((_, index) => (
                <button
                  key={index + 1}
                  className={`page-btn ${pagination.current === index + 1 ? 'active' : ''}`}
                  onClick={() => handlePageChange(index + 1)}
                >
                  {index + 1}
                </button>
              ))}
              
              <button
                className="page-btn next"
                disabled={pagination.current === pagination.pages}
                onClick={() => handlePageChange(pagination.current + 1)}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default NFTCatalog; 