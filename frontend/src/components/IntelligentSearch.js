import React, { useState, useEffect, useRef } from 'react';
import { Search, X, TrendingUp, Clock } from 'lucide-react';

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
            placeholder="Search NFTs..."
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