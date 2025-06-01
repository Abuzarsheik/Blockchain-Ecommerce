import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Search, X, Filter, TrendingUp, Clock, Hash } from 'lucide-react';
import { debounce } from '../utils/performance';
import './EnhancedSearch.css';

const EnhancedSearch = ({
  onSearch,
  onFilterChange,
  placeholder = "Search NFTs, creators, collections...",
  showFilters = true,
  recentSearches = [],
  trendingSearches = [],
  suggestions = [],
  className = ""
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [filters, setFilters] = useState({
    category: '',
    priceRange: { min: '', max: '' },
    creator: '',
    sortBy: 'newest'
  });
  const [isLoading, setIsLoading] = useState(false);

  const searchRef = useRef(null);
  const inputRef = useRef(null);

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce(async (term) => {
      if (term.length < 2) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        // This would normally call the onSearch prop or fetch suggestions
        if (onSearch) {
          onSearch(term, filters);
        }
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setIsLoading(false);
      }
    }, 300),
    [onSearch, filters]
  );

  // Handle search input change
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    setSelectedIndex(-1);
    
    if (value.length > 0) {
      setShowSuggestions(true);
      debouncedSearch(value);
    } else {
      setShowSuggestions(false);
      debouncedSearch('');
    }
  };

  // Handle keyboard navigation
  const handleKeyDown = (e) => {
    const suggestionCount = suggestions.length + recentSearches.length + trendingSearches.length;
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => prev < suggestionCount - 1 ? prev + 1 : prev);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > -1 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0) {
          handleSuggestionClick(getSuggestionByIndex(selectedIndex));
        } else {
          handleSearch();
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedIndex(-1);
        inputRef.current?.blur();
        break;
      default:
        // Default case for other keys
        break;
    }
  };

  // Get suggestion by index
  const getSuggestionByIndex = (index) => {
    const allSuggestions = [
      ...suggestions.map(s => ({ ...s, type: 'suggestion' })),
      ...recentSearches.map(s => ({ text: s, type: 'recent' })),
      ...trendingSearches.map(s => ({ text: s, type: 'trending' }))
    ];
    return allSuggestions[index];
  };

  // Handle suggestion click
  const handleSuggestionClick = (suggestion) => {
    const searchText = suggestion.text || suggestion.name || suggestion;
    setSearchTerm(searchText);
    setShowSuggestions(false);
    setSelectedIndex(-1);
    if (onSearch) {
      onSearch(searchText, filters);
    }
  };

  // Handle search submit
  const handleSearch = useCallback(() => {
    if (onSearch && searchTerm.trim()) {
      onSearch(searchTerm.trim(), filters);
    }
    setShowSuggestions(false);
  }, [onSearch, searchTerm, filters]);

  // Handle filter changes
  const handleFilterChange = (filterType, value) => {
    const newFilters = {
      ...filters,
      [filterType]: value
    };
    setFilters(newFilters);
    if (onFilterChange) {
      onFilterChange(newFilters);
    }
    if (searchTerm) {
      debouncedSearch(searchTerm);
    }
  };

  // Clear search
  const clearSearch = () => {
    setSearchTerm('');
    setShowSuggestions(false);
    setSelectedIndex(-1);
    if (onSearch) {
      onSearch('', filters);
    }
  };

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSuggestions(false);
        setIsExpanded(false);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={searchRef} className={`enhanced-search ${className} ${isExpanded ? 'expanded' : ''}`}>
      <div className="search-input-container">
        <div className="search-input-wrapper">
          <Search className="search-icon" size={20} />
          <input
            ref={inputRef}
            type="text"
            value={searchTerm}
            onChange={handleSearchChange}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              setIsExpanded(true);
              if (searchTerm.length > 0 || recentSearches.length > 0 || trendingSearches.length > 0) {
                setShowSuggestions(true);
              }
            }}
            placeholder={placeholder}
            className="search-input"
            autoComplete="off"
          />
          {searchTerm && (
            <button onClick={clearSearch} className="clear-button">
              <X size={16} />
            </button>
          )}
          {showFilters && (
            <button 
              onClick={() => setIsExpanded(!isExpanded)} 
              className="filter-toggle"
            >
              <Filter size={16} />
            </button>
          )}
        </div>

        {/* Search Suggestions Dropdown */}
        {showSuggestions && (
          <div className="suggestions-dropdown">
            {/* Live Suggestions */}
            {suggestions.length > 0 && (
              <div className="suggestion-group">
                <div className="suggestion-header">
                  <Search size={14} />
                  <span>Suggestions</span>
                </div>
                {suggestions.map((suggestion, index) => (
                  <button
                    key={`suggestion-${index}`}
                    className={`suggestion-item ${selectedIndex === index ? 'selected' : ''}`}
                    onClick={() => handleSuggestionClick(suggestion)}
                  >
                    <div className="suggestion-content">
                      <span className="suggestion-text">{suggestion.name || suggestion.text}</span>
                      {suggestion.category && (
                        <span className="suggestion-category">{suggestion.category}</span>
                      )}
                    </div>
                    {suggestion.count && (
                      <span className="suggestion-count">{suggestion.count}</span>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* Recent Searches */}
            {recentSearches.length > 0 && (
              <div className="suggestion-group">
                <div className="suggestion-header">
                  <Clock size={14} />
                  <span>Recent</span>
                </div>
                {recentSearches.slice(0, 3).map((search, index) => (
                  <button
                    key={`recent-${index}`}
                    className={`suggestion-item ${selectedIndex === suggestions.length + index ? 'selected' : ''}`}
                    onClick={() => handleSuggestionClick(search)}
                  >
                    <span className="suggestion-text">{search}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Trending Searches */}
            {trendingSearches.length > 0 && (
              <div className="suggestion-group">
                <div className="suggestion-header">
                  <TrendingUp size={14} />
                  <span>Trending</span>
                </div>
                {trendingSearches.slice(0, 3).map((search, index) => (
                  <button
                    key={`trending-${index}`}
                    className={`suggestion-item ${selectedIndex === suggestions.length + recentSearches.length + index ? 'selected' : ''}`}
                    onClick={() => handleSuggestionClick(search)}
                  >
                    <div className="suggestion-content">
                      <Hash size={14} />
                      <span className="suggestion-text">{search}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Advanced Filters */}
      {isExpanded && showFilters && (
        <div className="filters-panel">
          <div className="filter-row">
            <div className="filter-group">
              <label>Category</label>
              <select
                value={filters.category}
                onChange={(e) => handleFilterChange('category', e.target.value)}
              >
                <option value="">All Categories</option>
                <option value="art">Art</option>
                <option value="music">Music</option>
                <option value="photography">Photography</option>
                <option value="gaming">Gaming</option>
                <option value="sports">Sports</option>
                <option value="collectibles">Collectibles</option>
              </select>
            </div>

            <div className="filter-group">
              <label>Price Range (ETH)</label>
              <div className="price-range">
                <input
                  type="number"
                  placeholder="Min"
                  value={filters.priceRange.min}
                  onChange={(e) => handleFilterChange('priceRange', { ...filters.priceRange, min: e.target.value })}
                />
                <span>to</span>
                <input
                  type="number"
                  placeholder="Max"
                  value={filters.priceRange.max}
                  onChange={(e) => handleFilterChange('priceRange', { ...filters.priceRange, max: e.target.value })}
                />
              </div>
            </div>

            <div className="filter-group">
              <label>Sort By</label>
              <select
                value={filters.sortBy}
                onChange={(e) => handleFilterChange('sortBy', e.target.value)}
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="price_high">Price: High to Low</option>
                <option value="price_low">Price: Low to High</option>
                <option value="trending">Trending</option>
                <option value="likes">Most Liked</option>
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedSearch; 