import '../styles/theme.css';
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { 

  Filter, 
  X, 
  ChevronDown, 
  Search, 
  Star, 
  Grid,
  List,
  SlidersHorizontal,
  Tag,
  User,
  Calendar,
  DollarSign
} from 'lucide-react';

const AdvancedFilters = ({ 
  onFiltersChange, 
  initialFilters = {},
  nftCategories = [],
  creators = [],
  isOpen,
  onToggle 
}) => {
  const [filters, setFilters] = useState({
    category: initialFilters.category || '',
    priceRange: initialFilters.priceRange || [0, 100],
    creator: initialFilters.creator || '',
    status: initialFilters.status || '',
    rarity: initialFilters.rarity || '',
    dateRange: initialFilters.dateRange || '',
    verified: initialFilters.verified || false,
    featured: initialFilters.featured || false,
    sortBy: initialFilters.sortBy || 'newest',
    viewMode: initialFilters.viewMode || 'grid',
    searchQuery: initialFilters.searchQuery || ''
  });

  const [activeDropdown, setActiveDropdown] = useState(null);
  const filterRef = useRef(null);

  const filterOptions = {
    status: [
      { value: 'all', label: 'All NFTs' },
      { value: 'sale', label: 'For Sale' },
      { value: 'auction', label: 'On Auction' },
      { value: 'sold', label: 'Recently Sold' },
      { value: 'new', label: 'New Listings' }
    ],
    rarity: [
      { value: 'all', label: 'All Rarities' },
      { value: 'common', label: 'Common' },
      { value: 'uncommon', label: 'Uncommon' },
      { value: 'rare', label: 'Rare' },
      { value: 'epic', label: 'Epic' },
      { value: 'legendary', label: 'Legendary' }
    ],
    dateRange: [
      { value: 'all', label: 'All Time' },
      { value: 'today', label: 'Today' },
      { value: 'week', label: 'This Week' },
      { value: 'month', label: 'This Month' },
      { value: 'year', label: 'This Year' }
    ],
    sortBy: [
      { value: 'newest', label: 'Newest First' },
      { value: 'oldest', label: 'Oldest First' },
      { value: 'price_high', label: 'Price: High to Low' },
      { value: 'price_low', label: 'Price: Low to High' },
      { value: 'most_liked', label: 'Most Liked' },
      { value: 'most_viewed', label: 'Most Viewed' },
      { value: 'trending', label: 'Trending' }
    ]
  };

  // Handle filter changes
  const handleFilterChange = useCallback((key, value) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    if (onFiltersChange) {
      onFiltersChange(newFilters);
    }
  }, [filters, onFiltersChange]);

  // Handle price range change
  const handlePriceRangeChange = useCallback((range) => {
    handleFilterChange('priceRange', range);
  }, [handleFilterChange]);

  // Reset all filters
  const resetFilters = useCallback(() => {
    const resetFilters = {
      category: '',
      priceRange: [0, 100],
      creator: '',
      status: '',
      rarity: '',
      dateRange: '',
      verified: false,
      featured: false,
      sortBy: 'newest',
      viewMode: 'grid',
      searchQuery: ''
    };
    setFilters(resetFilters);
    if (onFiltersChange) {
      onFiltersChange(resetFilters);
    }
  }, [onFiltersChange]);

  // Get active filter count
  const getActiveFilterCount = () => {
    let count = 0;
    if (filters.category) count++;
    if (filters.creator) count++;
    if (filters.status) count++;
    if (filters.rarity) count++;
    if (filters.dateRange) count++;
    if (filters.verified) count++;
    if (filters.featured) count++;
    if (filters.searchQuery) count++;
    if (filters.priceRange[0] > 0 || filters.priceRange[1] < 100) count++;
    return count;
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (filterRef.current && !filterRef.current.contains(event.target)) {
        setActiveDropdown(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const activeFilterCount = getActiveFilterCount();

  return (
    <div className="advanced-filters" ref={filterRef}>
      {/* Filter Toggle Button */}
      <button
        onClick={onToggle}
        className={`filter-toggle ${isOpen ? 'active' : ''}`}
      >
        <Filter size={18} />
        <span>Filters</span>
        {activeFilterCount > 0 && (
          <span className="filter-count">{activeFilterCount}</span>
        )}
        <ChevronDown size={16} className={`chevron ${isOpen ? 'rotated' : ''}`} />
      </button>

      {/* Filter Panel */}
      {isOpen && (
        <div className="filter-panel">
          {/* Quick Actions */}
          <div className="filter-header">
            <div className="filter-title">
              <SlidersHorizontal size={20} />
              <span>Advanced Filters</span>
            </div>
            <div className="filter-actions">
              {activeFilterCount > 0 && (
                <button onClick={resetFilters} className="reset-btn">
                  Clear All ({activeFilterCount})
                </button>
              )}
              <button onClick={onToggle} className="close-btn">
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="filter-section">
            <label className="filter-label">
              <Search size={16} />
              Search NFTs
            </label>
            <input
              type="text"
              placeholder="Search by name, description, or collection..."
              value={filters.searchQuery}
              onChange={(e) => handleFilterChange('searchQuery', e.target.value)}
              className="filter-input"
            />
          </div>

          {/* View Mode & Sort */}
          <div className="filter-row">
            <div className="filter-section">
              <label className="filter-label">View</label>
              <div className="view-toggle">
                <button
                  onClick={() => handleFilterChange('viewMode', 'grid')}
                  className={`view-btn ${filters.viewMode === 'grid' ? 'active' : ''}`}
                >
                  <Grid size={16} />
                </button>
                <button
                  onClick={() => handleFilterChange('viewMode', 'list')}
                  className={`view-btn ${filters.viewMode === 'list' ? 'active' : ''}`}
                >
                  <List size={16} />
                </button>
              </div>
            </div>

            <div className="filter-section">
              <label className="filter-label">Sort By</label>
              <FilterDropdown
                value={filters.sortBy}
                options={filterOptions.sortBy}
                onChange={(value) => handleFilterChange('sortBy', value)}
                placeholder="Sort order"
                isActive={activeDropdown === 'sortBy'}
                onToggle={() => setActiveDropdown(activeDropdown === 'sortBy' ? null : 'sortBy')}
              />
            </div>
          </div>

          {/* Category & Status */}
          <div className="filter-row">
            <div className="filter-section">
              <label className="filter-label">
                <Tag size={16} />
                Category
              </label>
              <FilterDropdown
                value={filters.category}
                options={[
                  { value: '', label: 'All Categories' },
                  ...nftCategories.map(cat => ({ value: cat.id, label: cat.name }))
                ]}
                onChange={(value) => handleFilterChange('category', value)}
                placeholder="Select category"
                isActive={activeDropdown === 'category'}
                onToggle={() => setActiveDropdown(activeDropdown === 'category' ? null : 'category')}
              />
            </div>

            <div className="filter-section">
              <label className="filter-label">Status</label>
              <FilterDropdown
                value={filters.status}
                options={filterOptions.status}
                onChange={(value) => handleFilterChange('status', value)}
                placeholder="Select status"
                isActive={activeDropdown === 'status'}
                onToggle={() => setActiveDropdown(activeDropdown === 'status' ? null : 'status')}
              />
            </div>
          </div>

          {/* Creator & Rarity */}
          <div className="filter-row">
            <div className="filter-section">
              <label className="filter-label">
                <User size={16} />
                Creator
              </label>
              <FilterDropdown
                value={filters.creator}
                options={[
                  { value: '', label: 'All Creators' },
                  ...creators.map(creator => ({ value: creator.id, label: creator.name }))
                ]}
                onChange={(value) => handleFilterChange('creator', value)}
                placeholder="Select creator"
                isActive={activeDropdown === 'creator'}
                onToggle={() => setActiveDropdown(activeDropdown === 'creator' ? null : 'creator')}
              />
            </div>

            <div className="filter-section">
              <label className="filter-label">
                <Star size={16} />
                Rarity
              </label>
              <FilterDropdown
                value={filters.rarity}
                options={filterOptions.rarity}
                onChange={(value) => handleFilterChange('rarity', value)}
                placeholder="Select rarity"
                isActive={activeDropdown === 'rarity'}
                onToggle={() => setActiveDropdown(activeDropdown === 'rarity' ? null : 'rarity')}
              />
            </div>
          </div>

          {/* Price Range */}
          <div className="filter-section">
            <label className="filter-label">
              <DollarSign size={16} />
              Price Range (ETH)
            </label>
            <PriceRangeSlider
              value={filters.priceRange}
              onChange={handlePriceRangeChange}
              min={0}
              max={100}
              step={0.1}
            />
          </div>

          {/* Date Range */}
          <div className="filter-section">
            <label className="filter-label">
              <Calendar size={16} />
              Date Range
            </label>
            <FilterDropdown
              value={filters.dateRange}
              options={filterOptions.dateRange}
              onChange={(value) => handleFilterChange('dateRange', value)}
              placeholder="Select date range"
              isActive={activeDropdown === 'dateRange'}
              onToggle={() => setActiveDropdown(activeDropdown === 'dateRange' ? null : 'dateRange')}
            />
          </div>

          {/* Special Filters */}
          <div className="filter-section">
            <label className="filter-label">Special Filters</label>
            <div className="checkbox-group">
              <label className="checkbox-item">
                <input
                  type="checkbox"
                  checked={filters.verified}
                  onChange={(e) => handleFilterChange('verified', e.target.checked)}
                />
                <span className="checkmark"></span>
                <span>Verified Creators Only</span>
              </label>
              <label className="checkbox-item">
                <input
                  type="checkbox"
                  checked={filters.featured}
                  onChange={(e) => handleFilterChange('featured', e.target.checked)}
                />
                <span className="checkmark"></span>
                <span>Featured NFTs Only</span>
              </label>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .advanced-filters {
          position: relative;
        }

        .filter-toggle {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          padding: var(--space-3) var(--space-4);
          background: white;
          border: 1px solid var(--gray-300);
          border-radius: var(--border-radius-lg);
          cursor: pointer;
          transition: all var(--transition-fast);
          font-weight: 500;
          color: var(--gray-700);
        }

        .filter-toggle:hover {
          border-color: var(--primary-400);
          background: var(--primary-50);
        }

        .filter-toggle.active {
          border-color: var(--primary-500);
          background: var(--primary-100);
          color: var(--primary-700);
        }

        .filter-count {
          background: var(--primary-500);
          color: white;
          font-size: 0.75rem;
          font-weight: 600;
          padding: 2px 6px;
          border-radius: var(--border-radius-full);
          min-width: 18px;
          text-align: center;
        }

        .chevron {
          transition: transform var(--transition-fast);
        }

        .chevron.rotated {
          transform: rotate(180deg);
        }

        .filter-panel {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          margin-top: var(--space-2);
          background: white;
          border: 1px solid var(--gray-200);
          border-radius: var(--border-radius-xl);
          box-shadow: var(--shadow-xl);
          z-index: var(--z-dropdown);
          min-width: 600px;
          max-height: 80vh;
          overflow-y: auto;
        }

        .filter-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: var(--space-4);
          border-bottom: 1px solid var(--gray-200);
          background: var(--gray-50);
        }

        .filter-title {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          font-weight: 600;
          color: var(--gray-900);
        }

        .filter-actions {
          display: flex;
          gap: var(--space-2);
        }

        .reset-btn {
          padding: var(--space-2) var(--space-3);
          background: var(--danger-100);
          color: var(--danger-700);
          border: none;
          border-radius: var(--border-radius-lg);
          font-size: 0.875rem;
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .reset-btn:hover {
          background: var(--danger-200);
        }

        .close-btn {
          padding: var(--space-2);
          background: transparent;
          border: none;
          color: var(--gray-500);
          cursor: pointer;
          border-radius: var(--border-radius-lg);
          transition: all var(--transition-fast);
        }

        .close-btn:hover {
          background: var(--gray-200);
          color: var(--gray-700);
        }

        .filter-section {
          padding: var(--space-4);
          border-bottom: 1px solid var(--gray-100);
        }

        .filter-section:last-child {
          border-bottom: none;
        }

        .filter-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: var(--space-4);
        }

        .filter-row .filter-section {
          border-bottom: none;
          border-right: 1px solid var(--gray-100);
        }

        .filter-row .filter-section:last-child {
          border-right: none;
        }

        .filter-label {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          font-weight: 500;
          color: var(--gray-700);
          margin-bottom: var(--space-2);
          font-size: 0.875rem;
        }

        .filter-input {
          width: 100%;
          padding: var(--space-3);
          border: 1px solid var(--gray-300);
          border-radius: var(--border-radius-lg);
          font-size: 0.875rem;
          transition: all var(--transition-fast);
        }

        .filter-input:focus {
          outline: none;
          border-color: var(--primary-500);
          box-shadow: 0 0 0 3px var(--primary-100);
        }

        .view-toggle {
          display: flex;
          background: var(--gray-100);
          border-radius: var(--border-radius-lg);
          padding: var(--space-1);
        }

        .view-btn {
          flex: 1;
          padding: var(--space-2);
          background: transparent;
          border: none;
          border-radius: var(--border-radius-md);
          cursor: pointer;
          transition: all var(--transition-fast);
          color: var(--gray-600);
        }

        .view-btn:hover {
          background: var(--gray-200);
        }

        .view-btn.active {
          background: white;
          color: var(--primary-600);
          box-shadow: var(--shadow-sm);
        }

        .checkbox-group {
          display: flex;
          flex-direction: column;
          gap: var(--space-3);
        }

        .checkbox-item {
          display: flex;
          align-items: center;
          gap: var(--space-3);
          cursor: pointer;
          font-size: 0.875rem;
        }

        .checkbox-item input[type="checkbox"] {
          display: none;
        }

        .checkmark {
          width: 18px;
          height: 18px;
          border: 2px solid var(--gray-300);
          border-radius: var(--border-radius-sm);
          position: relative;
          transition: all var(--transition-fast);
        }

        .checkbox-item input[type="checkbox"]:checked + .checkmark {
          background: var(--primary-500);
          border-color: var(--primary-500);
        }

        .checkbox-item input[type="checkbox"]:checked + .checkmark::after {
          content: '✓';
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          color: white;
          font-weight: bold;
          font-size: 12px;
        }

        @media (max-width: 768px) {
          .filter-panel {
            min-width: auto;
            right: auto;
            width: 90vw;
          }

          .filter-row {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};

// Filter Dropdown Component
const FilterDropdown = ({ value, options, onChange, placeholder, isActive, onToggle }) => {
  const selectedOption = options.find(option => option.value === value);

  return (
    <div className="filter-dropdown">
      <button onClick={onToggle} className={`dropdown-trigger ${isActive ? 'active' : ''}`}>
        <span>{selectedOption ? selectedOption.label : placeholder}</span>
        <ChevronDown size={16} className={`chevron ${isActive ? 'rotated' : ''}`} />
      </button>

      {isActive && (
        <div className="dropdown-menu">
          {options.map((option) => (
            <button
              key={option.value}
              onClick={() => {
                onChange(option.value);
                onToggle();
              }}
              className={`dropdown-item ${value === option.value ? 'selected' : ''}`}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}

      <style jsx>{`
        .filter-dropdown {
          position: relative;
          width: 100%;
        }

        .dropdown-trigger {
          width: 100%;
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: var(--space-3);
          background: white;
          border: 1px solid var(--gray-300);
          border-radius: var(--border-radius-lg);
          cursor: pointer;
          transition: all var(--transition-fast);
          font-size: 0.875rem;
        }

        .dropdown-trigger:hover {
          border-color: var(--primary-400);
        }

        .dropdown-trigger.active {
          border-color: var(--primary-500);
          box-shadow: 0 0 0 3px var(--primary-100);
        }

        .dropdown-menu {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          margin-top: var(--space-1);
          background: white;
          border: 1px solid var(--gray-200);
          border-radius: var(--border-radius-lg);
          box-shadow: var(--shadow-lg);
          z-index: var(--z-popover);
          max-height: 200px;
          overflow-y: auto;
        }

        .dropdown-item {
          width: 100%;
          padding: var(--space-3);
          background: transparent;
          border: none;
          text-align: left;
          cursor: pointer;
          transition: all var(--transition-fast);
          font-size: 0.875rem;
        }

        .dropdown-item:hover {
          background: var(--gray-100);
        }

        .dropdown-item.selected {
          background: var(--primary-100);
          color: var(--primary-700);
        }
      `}</style>
    </div>
  );
};

// Price Range Slider Component
const PriceRangeSlider = ({ value, onChange, min, max, step }) => {
  const [localValue, setLocalValue] = useState(value);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleChange = (index, newValue) => {
    const newRange = [...localValue];
    newRange[index] = parseFloat(newValue);
    setLocalValue(newRange);
    onChange(newRange);
  };

  return (
    <div className="price-range-slider">
      <div className="range-inputs">
        <div className="range-input-group">
          <label>Min</label>
          <input
            type="number"
            value={localValue[0]}
            onChange={(e) => handleChange(0, e.target.value)}
            min={min}
            max={localValue[1]}
            step={step}
            className="range-input"
          />
        </div>
        <span className="range-separator">to</span>
        <div className="range-input-group">
          <label>Max</label>
          <input
            type="number"
            value={localValue[1]}
            onChange={(e) => handleChange(1, e.target.value)}
            min={localValue[0]}
            max={max}
            step={step}
            className="range-input"
          />
        </div>
      </div>

      <div className="range-display">
        {localValue[0]} ETH - {localValue[1]} ETH
      </div>

      <style jsx>{`
        .price-range-slider {
          width: 100%;
        }

        .range-inputs {
          display: flex;
          align-items: center;
          gap: var(--space-3);
          margin-bottom: var(--space-2);
        }

        .range-input-group {
          flex: 1;
        }

        .range-input-group label {
          display: block;
          font-size: 0.75rem;
          color: var(--gray-600);
          margin-bottom: var(--space-1);
        }

        .range-input {
          width: 100%;
          padding: var(--space-2);
          border: 1px solid var(--gray-300);
          border-radius: var(--border-radius-md);
          font-size: 0.875rem;
        }

        .range-input:focus {
          outline: none;
          border-color: var(--primary-500);
          box-shadow: 0 0 0 2px var(--primary-100);
        }

        .range-separator {
          font-size: 0.875rem;
          color: var(--gray-500);
          margin-top: 20px;
        }

        .range-display {
          text-align: center;
          font-size: 0.875rem;
          color: var(--gray-600);
          padding: var(--space-2);
          background: var(--gray-50);
          border-radius: var(--border-radius-md);
        }
      `}</style>
    </div>
  );
};

export default AdvancedFilters; 