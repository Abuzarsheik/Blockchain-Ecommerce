import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { 
  Grid, 
  List, 
  Heart, 
  TrendingUp,
  Users
} from 'lucide-react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { addToCart } from '../store/slices/cartSlice';
import IntelligentSearch from '../components/IntelligentSearch';
import VirtualizedNFTGrid from '../components/VirtualizedNFTGrid';
import { trackPageView } from '../utils/personalization';
import { debounce } from '../utils/performance';
import '../styles/NFTCatalog.css';

const NFTCatalog = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useSelector(state => state.auth);
  
  // State
  const [nfts, setNfts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  
  // Use ref for pagination to avoid dependency issues
  const paginationRef = useRef({
    current: 1,
    pages: 1,
    total: 0,
    hasMore: false
  });
  
  const [filters, setFilters] = useState({
    category: 'All Categories',
    sortBy: 'newest',
    priceRange: { min: '', max: '' },
    verified: false
  });
  
  const [viewMode, setViewMode] = useState('grid');
  const [favorites, setFavorites] = useState(new Set());

  const quickFilters = [
    { label: 'All', value: '', icon: '🎯' },
    { label: 'Under 1 ETH', value: 'under_1', icon: '💎' },
    { label: 'Trending', value: 'trending', icon: '🔥' },
    { label: 'New Today', value: 'new_today', icon: '✨' }
  ];

  // Memoized fetch function
  const fetchNFTs = useCallback(async (isLoadMore = false) => {
    try {
      if (!isLoadMore) {
        setLoading(true);
      }

      const page = isLoadMore ? paginationRef.current.current + 1 : 1;
      const params = new URLSearchParams({
        page: page,
        limit: 12,
        sort: filters.sortBy,
        ...(searchTerm && { search: searchTerm }),
        ...(filters.category && filters.category !== 'All Categories' && { category: filters.category }),
        ...(filters.priceRange.min && { min_price: filters.priceRange.min }),
        ...(filters.priceRange.max && { max_price: filters.priceRange.max })
      });

      const response = await api.get(`/nfts?${params}`);
      
      if (isLoadMore) {
        setNfts(prev => [...prev, ...response.data.nfts]);
      } else {
        setNfts(response.data.nfts);
      }
      
      paginationRef.current = {
        current: page,
        pages: response.data.pagination.pages,
        total: response.data.pagination.total,
        hasMore: page < response.data.pagination.pages
      };
      
      setError(null);
    } catch (error) {
      console.error('Failed to fetch NFTs:', error);
      setError('Failed to load NFTs');
      toast.error('Failed to load NFTs');
    } finally {
      setLoading(false);
    }
  }, [searchTerm, filters]);

  // Debounced search suggestions
  const fetchSearchSuggestions = useCallback((term) => {
    const searchFn = debounce(async (searchTerm) => {
      if (searchTerm.length < 2) {
        setSuggestions([]);
        return;
      }

      try {
        const response = await api.get(`/nfts/search/suggestions?q=${searchTerm}`);
        setSuggestions(response.data.suggestions || []);
      } catch (error) {
        console.error('Failed to fetch suggestions:', error);
        setSuggestions([]);
      }
    }, 200);
    
    searchFn(term);
  }, []);

  // Initial load and personalization tracking
  useEffect(() => {
    const cleanup = trackPageView('nft-catalog');
    fetchNFTs();
    
    return cleanup;
  }, [fetchNFTs]);

  // Handle search
  const handleSearch = useCallback((term, searchFilters = {}) => {
    setSearchTerm(term);
    setFilters(prev => ({ ...prev, ...searchFilters }));
    paginationRef.current = { ...paginationRef.current, current: 1 };
    
    // Fetch suggestions
    fetchSearchSuggestions(term);
  }, [fetchSearchSuggestions]);

  // Handle filter changes
  const handleFilterChange = useCallback((newFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    paginationRef.current = { ...paginationRef.current, current: 1 };
  }, []);

  // Handle quick filter selection
  const handleQuickFilter = useCallback((filterType) => {
    if (filterType === 'all') {
      setFilters({
        category: 'All Categories',
        sortBy: 'newest',
        priceRange: { min: '', max: '' },
        verified: false
      });
    } else if (filterType === 'trending') {
      setFilters(prev => ({ ...prev, sortBy: 'trending' }));
    } else if (filterType === 'new') {
      setFilters(prev => ({ ...prev, sortBy: 'newest' }));
    } else if (filterType === 'price-low') {
      setFilters(prev => ({ ...prev, sortBy: 'price-low' }));
    } else if (filterType === 'price-high') {
      setFilters(prev => ({ ...prev, sortBy: 'price-high' }));
    } else if (filterType === 'reset') {
        setSearchTerm('');
        setFilters(prev => ({ ...prev, priceRange: { min: '', max: '' }, sortBy: 'newest' }));
    }
    paginationRef.current = { ...paginationRef.current, current: 1 };
  }, []);

  // Handle load more for virtual scrolling
  const handleLoadMore = useCallback(() => {
    if (paginationRef.current.hasMore && !loading) {
      fetchNFTs(true);
    }
  }, [loading, fetchNFTs]);

  // Handle NFT interactions
  const handleNFTClick = useCallback((nftId) => {
    navigate(`/nft/${nftId}`);
  }, [navigate]);

  const handleLike = useCallback(async (nftId, e) => {
    e.stopPropagation();
    
    if (!user) {
      toast.error('Please log in to like NFTs');
      navigate('/login');
      return;
    }

    try {
      await api.post(`/nfts/${nftId}/like`);
      
      setFavorites(prev => {
        const newFavorites = new Set(prev);
        if (newFavorites.has(nftId)) {
          newFavorites.delete(nftId);
        } else {
          newFavorites.add(nftId);
        }
        return newFavorites;
      });

      setNfts(prev => prev.map(nft => 
        nft._id === nftId 
          ? { ...nft, like_count: (nft.like_count || 0) + (favorites.has(nftId) ? -1 : 1) }
          : nft
      ));

      toast.success(favorites.has(nftId) ? 'NFT unliked!' : 'NFT liked!');
    } catch (error) {
      console.error('Like error:', error);
      toast.error('Failed to like NFT');
    }
  }, [user, navigate, favorites]);

  const handleAddToCart = useCallback((nft, e) => {
    e.stopPropagation();
    
    if (!user) {
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
    
    toast.success('NFT added to cart!');
  }, [user, navigate, dispatch]);

  // Memoized NFT data with additional properties
  const enhancedNfts = useMemo(() => {
    return nfts.map(nft => ({
      ...nft,
      id: nft._id,
      image: nft.image_url,
      isLiked: favorites.has(nft._id),
      onLike: (e) => handleLike(nft._id, e),
      onAddToCart: (e) => handleAddToCart(nft, e),
      onClick: () => handleNFTClick(nft._id)
    }));
  }, [nfts, favorites, handleLike, handleAddToCart, handleNFTClick]);

  return (
    <div className="nft-catalog">
      <div className="catalog-header">
        <div className="header-content">
          <h1 className="catalog-title">Discover Amazing NFTs</h1>
          <p className="catalog-subtitle">
            Explore thousands of unique digital assets from creators worldwide
          </p>
        </div>

        {/* Enhanced Search */}
        <div className="search-section">
          <IntelligentSearch
            onSearch={handleSearch}
            onFilterChange={handleFilterChange}
            suggestions={suggestions}
            recentSearches={[]}
            trendingSearches={[]}
            className="catalog-search"
          />
        </div>

        {/* Quick Stats */}
        <div className="quick-stats">
          <div className="stat-item">
            <TrendingUp size={20} />
            <span className="stat-number">{paginationRef.current.total || 0}</span>
            <span className="stat-label">NFTs Available</span>
          </div>
          <div className="stat-item">
            <Users size={20} />
            <span className="stat-number">500+</span>
            <span className="stat-label">Creators</span>
          </div>
          <div className="stat-item">
            <Heart size={20} />
            <span className="stat-number">15K+</span>
            <span className="stat-label">Favorites</span>
          </div>
        </div>

        {/* Quick Filters */}
        <div className="quick-filters">
          {quickFilters.map((filter) => (
            <button
              key={filter.value}
              onClick={() => handleQuickFilter(filter.value)}
              className={`quick-filter-btn ${
                (filter.value === '' && !filters.category && filters.sortBy === 'newest' && !filters.priceRange.max) ||
                (filter.value === 'under_1' && filters.priceRange.max === '1') ||
                (filter.value === 'trending' && filters.sortBy === 'trending') ||
                (filter.value === 'new_today' && filters.sortBy === 'newest' && filters.category)
                  ? 'active' : ''
              }`}
            >
              <span className="filter-icon">{filter.icon}</span>
              <span>{filter.label}</span>
            </button>
          ))}
        </div>

        {/* View Controls */}
        <div className="view-controls">
          <div className="view-toggle">
            <button
              onClick={() => setViewMode('grid')}
              className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
            >
              <Grid size={16} />
              <span>Grid</span>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
            >
              <List size={16} />
              <span>List</span>
            </button>
          </div>

          <div className="results-count">
            {loading ? (
              <span>Loading...</span>
            ) : (
              <span>{paginationRef.current.total} NFTs found</span>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="catalog-content">
        {error ? (
          <div className="error-container">
            <p>{error}</p>
            <button onClick={() => fetchNFTs()} className="retry-button">
              Try Again
            </button>
          </div>
        ) : (
          <VirtualizedNFTGrid
            nfts={enhancedNfts}
            loading={loading}
            onLoadMore={handleLoadMore}
            hasNextPage={paginationRef.current.hasMore}
            viewMode={viewMode}
            containerHeight={800}
            cardWidth={viewMode === 'grid' ? 320 : 600}
            cardHeight={viewMode === 'grid' ? 420 : 200}
          />
        )}
      </div>
    </div>
  );
};

export default NFTCatalog; 