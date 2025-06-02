import React, { useState, useEffect, useRef } from 'react';
import { Search, X, TrendingUp, Clock } from 'lucide-react';
import './IntelligentSearch.css';

const IntelligentSearch = ({ onSearch, onClose, autoFocus = true }) => {
  const [query, setQuery] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const searchInputRef = useRef(null);

  // Mock suggestions data
  const suggestionsData = [
    'Digital Art',
    'Abstract Collections',
    'Photography',
    'Gaming NFTs',
    'Music',
    'Sports Cards'
  ];

  const trendingTerms = [
    'Cyberpunk Collection',
    'Abstract Landscapes',
    'Digital Portraits',
    'Gaming Assets'
  ];

  const recentSearchesData = [
    'Sunset Photography',
    'Modern Art',
    'Digital Sculptures'
  ];

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchInputRef.current && !searchInputRef.current.contains(event.target)) {
        setShowAdvanced(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query);
      setShowAdvanced(false);
    }
  };

  const handleSuggestionClick = (suggestion) => {
    setQuery(suggestion);
    onSearch(suggestion);
    setShowAdvanced(false);
  };

  const handleFocus = () => {
    setShowAdvanced(true);
  };

  const clearSearch = () => {
    setQuery('');
    setShowAdvanced(false);
  };

  return (
    <div ref={searchInputRef} className="intelligent-search">
      <form onSubmit={handleSubmit} className={`search-form ${showAdvanced ? 'expanded' : ''}`}>
        <div className="search-input-container">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={handleFocus}
            placeholder="Search products..."
            className="search-input"
          />
          {query && (
            <button type="button" onClick={clearSearch} className="clear-button">
              <X size={16} />
            </button>
          )}
        </div>
      </form>

      {showAdvanced && (
        <div className="search-suggestions">
          {query && (
            <div className="suggestion-section">
              <div className="suggestion-header">Suggestions</div>
              {suggestionsData
                .filter(s => s.toLowerCase().includes(query.toLowerCase()))
                .slice(0, 3)
                .map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="suggestion-item"
                  >
                    <Search size={14} />
                    <span>{suggestion}</span>
                  </button>
                ))
              }
            </div>
          )}

          {trendingTerms.length > 0 && (
            <div className="suggestion-section">
              <div className="suggestion-header">
                <TrendingUp size={14} />
                Trending
              </div>
              {trendingTerms.slice(0, 3).map((trending, index) => (
                <button
                  key={index}
                  onClick={() => handleSuggestionClick(trending)}
                  className="suggestion-item trending"
                >
                  <TrendingUp size={12} />
                  {trending}
                </button>
              ))}
            </div>
          )}

          {recentSearchesData.length > 0 && (
            <div className="suggestion-section">
              <div className="suggestion-header">
                <Clock size={14} />
                Recent
              </div>
              {recentSearchesData.slice(0, 3).map((recent, index) => (
                <button
                  key={index}
                  onClick={() => handleSuggestionClick(recent)}
                  className="suggestion-item recent"
                >
                  <Clock size={12} />
                  {recent}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default IntelligentSearch; 