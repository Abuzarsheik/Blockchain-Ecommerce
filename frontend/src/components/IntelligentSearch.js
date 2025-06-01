import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Filter, TrendingUp, Clock } from 'lucide-react';

const IntelligentSearch = ({ 
  onSearch, 
  onFilterChange, 
  placeholder = "Search NFTs...", 
  aiEnabled = false,
  showTrending = false,
  showRecent = false,
  className = ""
}) => {
  const [query, setQuery] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filters, setFilters] = useState({});
  const searchRef = useRef(null);

  // Mock suggestions data
  const suggestions = [
    'Digital Art',
    'Abstract Collections',
    'Photography',
    'Gaming NFTs',
    'Music',
    'Sports Cards'
  ];

  const trendingSearches = [
    'Cyberpunk Collection',
    'Abstract Landscapes',
    'Digital Portraits',
    'Gaming Assets'
  ];

  const recentSearches = [
    'Sunset Photography',
    'Modern Art',
    'Digital Sculptures'
  ];

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSuggestions(false);
        setIsExpanded(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query, { filters });
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = (suggestion) => {
    setQuery(suggestion);
    onSearch(suggestion, { filters });
    setShowSuggestions(false);
  };

  const handleFocus = () => {
    setIsExpanded(true);
    setShowSuggestions(true);
  };

  const clearSearch = () => {
    setQuery('');
    setIsExpanded(false);
    setShowSuggestions(false);
  };

  return (
    <div ref={searchRef} className={`intelligent-search ${className}`}>
      <form onSubmit={handleSubmit} className={`search-form ${isExpanded ? 'expanded' : ''}`}>
        <div className="search-input-container">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={handleFocus}
            placeholder={placeholder}
            className="search-input"
          />
          {query && (
            <button type="button" onClick={clearSearch} className="clear-button">
              <X size={16} />
            </button>
          )}
          {aiEnabled && (
            <button type="button" className="ai-button" title="AI Search">
              ✨
            </button>
          )}
        </div>
      </form>

      {showSuggestions && (
        <div className="search-suggestions">
          {query && (
            <div className="suggestion-section">
              <div className="suggestion-header">Suggestions</div>
              {suggestions
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

          {showTrending && (
            <div className="suggestion-section">
              <div className="suggestion-header">
                <TrendingUp size={14} />
                Trending
              </div>
              {trendingSearches.slice(0, 3).map((trend, index) => (
                <button
                  key={index}
                  onClick={() => handleSuggestionClick(trend)}
                  className="suggestion-item trending"
                >
                  <TrendingUp size={14} />
                  <span>{trend}</span>
                </button>
              ))}
            </div>
          )}

          {showRecent && recentSearches.length > 0 && (
            <div className="suggestion-section">
              <div className="suggestion-header">
                <Clock size={14} />
                Recent
              </div>
              {recentSearches.slice(0, 3).map((recent, index) => (
                <button
                  key={index}
                  onClick={() => handleSuggestionClick(recent)}
                  className="suggestion-item recent"
                >
                  <Clock size={14} />
                  <span>{recent}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <style jsx>{`
        .intelligent-search {
          position: relative;
          width: 100%;
          max-width: 400px;
        }

        .search-form {
          position: relative;
          transition: all 0.3s ease;
        }

        .search-input-container {
          display: flex;
          align-items: center;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 8px;
          padding: 0.5rem;
          transition: all 0.3s ease;
        }

        .search-form.expanded .search-input-container {
          background: white;
          border-color: #667eea;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .search-icon {
          color: rgba(255, 255, 255, 0.7);
          margin-right: 0.5rem;
        }

        .search-form.expanded .search-icon {
          color: #667eea;
        }

        .search-input {
          flex: 1;
          background: none;
          border: none;
          outline: none;
          color: white;
          font-size: 0.9rem;
        }

        .search-form.expanded .search-input {
          color: #2c3e50;
        }

        .search-input::placeholder {
          color: rgba(255, 255, 255, 0.5);
        }

        .search-form.expanded .search-input::placeholder {
          color: #7f8c8d;
        }

        .clear-button,
        .ai-button {
          background: none;
          border: none;
          color: rgba(255, 255, 255, 0.7);
          cursor: pointer;
          padding: 0.25rem;
          border-radius: 4px;
          transition: all 0.2s ease;
        }

        .search-form.expanded .clear-button,
        .search-form.expanded .ai-button {
          color: #7f8c8d;
        }

        .clear-button:hover,
        .ai-button:hover {
          background: rgba(255, 255, 255, 0.1);
          color: white;
        }

        .search-form.expanded .clear-button:hover,
        .search-form.expanded .ai-button:hover {
          background: #f8f9fa;
          color: #495057;
        }

        .search-suggestions {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          background: white;
          border: 1px solid #e9ecef;
          border-radius: 8px;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
          z-index: 1000;
          max-height: 300px;
          overflow-y: auto;
          margin-top: 0.5rem;
        }

        .suggestion-section {
          padding: 0.5rem 0;
        }

        .suggestion-section:not(:last-child) {
          border-bottom: 1px solid #f1f3f4;
        }

        .suggestion-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          font-size: 0.8rem;
          font-weight: 600;
          color: #7f8c8d;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .suggestion-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          width: 100%;
          padding: 0.75rem 1rem;
          background: none;
          border: none;
          text-align: left;
          cursor: pointer;
          transition: all 0.2s ease;
          color: #2c3e50;
        }

        .suggestion-item:hover {
          background: #f8f9fa;
          color: #667eea;
        }

        .suggestion-item.trending {
          color: #e67e22;
        }

        .suggestion-item.recent {
          color: #7f8c8d;
        }

        @media (max-width: 768px) {
          .intelligent-search {
            max-width: none;
          }
          
          .search-suggestions {
            position: fixed;
            top: auto;
            left: 1rem;
            right: 1rem;
            margin-top: 1rem;
          }
        }
      `}</style>
    </div>
  );
};

export default IntelligentSearch; 