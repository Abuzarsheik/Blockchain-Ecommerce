import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Verified, DollarSign, Tag } from 'lucide-react';
import '../styles/ProductFilters.css';

const ProductFilters = ({ 
  categories, 
  activeCategory, 
  onCategoryChange, 
  filters, 
  onFiltersChange 
}) => {
  const [expandedSections, setExpandedSections] = useState({
    categories: true,
    price: true,
    verification: true,
    features: false
  });

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const handlePriceRangeChange = (range) => {
    onFiltersChange({ priceRange: range });
  };

  const handleVerificationToggle = () => {
    onFiltersChange({ verified: !filters.verified });
  };

  const priceRanges = [
    { label: 'Under $50', value: [0, 50] },
    { label: '$50 - $100', value: [50, 100] },
    { label: '$100 - $250', value: [100, 250] },
    { label: '$250 - $500', value: [250, 500] },
    { label: '$500 - $1000', value: [500, 1000] },
    { label: 'Over $1000', value: [1000, 10000] }
  ];

  const clearAllFilters = () => {
    onCategoryChange('');
    onFiltersChange({
      priceRange: [0, 1000],
      verified: false
    });
  };

  const hasActiveFilters = activeCategory || filters.verified || 
    (filters.priceRange[0] !== 0 || filters.priceRange[1] !== 1000);

  return (
    <div className="product-filters">
      <div className="filters-header">
        <h3>Filters</h3>
        {hasActiveFilters && (
          <button className="clear-filters" onClick={clearAllFilters}>
            Clear All
          </button>
        )}
      </div>

      {/* Categories */}
      <div className="filter-section">
        <button 
          className="section-header"
          onClick={() => toggleSection('categories')}
        >
          <div className="section-title">
            <Tag size={16} />
            <span>Categories</span>
          </div>
          {expandedSections.categories ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        
        {expandedSections.categories && (
          <div className="section-content">
            <div className="category-list">
              <button
                className={`category-item ${!activeCategory ? 'active' : ''}`}
                onClick={() => onCategoryChange('')}
              >
                All Categories
              </button>
              {categories.map(category => (
                <button
                  key={category}
                  className={`category-item ${activeCategory === category ? 'active' : ''}`}
                  onClick={() => onCategoryChange(category)}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Price Range */}
      <div className="filter-section">
        <button 
          className="section-header"
          onClick={() => toggleSection('price')}
        >
          <div className="section-title">
            <DollarSign size={16} />
            <span>Price Range</span>
          </div>
          {expandedSections.price ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        
        {expandedSections.price && (
          <div className="section-content">
            <div className="price-ranges">
              {priceRanges.map((range, index) => (
                <button
                  key={index}
                  className={`price-range-item ${
                    filters.priceRange[0] === range.value[0] && 
                    filters.priceRange[1] === range.value[1] ? 'active' : ''
                  }`}
                  onClick={() => handlePriceRangeChange(range.value)}
                >
                  {range.label}
                </button>
              ))}
            </div>
            
            <div className="custom-price-range">
              <label>Custom Range:</label>
              <div className="price-inputs">
                <input
                  type="number"
                  placeholder="Min"
                  value={filters.priceRange[0]}
                  onChange={(e) => handlePriceRangeChange([
                    parseInt(e.target.value) || 0, 
                    filters.priceRange[1]
                  ])}
                />
                <span>to</span>
                <input
                  type="number"
                  placeholder="Max"
                  value={filters.priceRange[1]}
                  onChange={(e) => handlePriceRangeChange([
                    filters.priceRange[0], 
                    parseInt(e.target.value) || 1000
                  ])}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Blockchain Verification */}
      <div className="filter-section">
        <button 
          className="section-header"
          onClick={() => toggleSection('verification')}
        >
          <div className="section-title">
            <Verified size={16} />
            <span>Verification</span>
          </div>
          {expandedSections.verification ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        
        {expandedSections.verification && (
          <div className="section-content">
            <label className="checkbox-item">
              <input
                type="checkbox"
                checked={filters.verified}
                onChange={handleVerificationToggle}
              />
              <span className="checkmark"></span>
              <span className="label-text">
                <Verified size={14} />
                Blockchain Verified Only
              </span>
            </label>
            
            <div className="verification-info">
              <p>Blockchain verified products have their authenticity and ownership verified on the blockchain.</p>
            </div>
          </div>
        )}
      </div>

      {/* Additional Features */}
      <div className="filter-section">
        <button 
          className="section-header"
          onClick={() => toggleSection('features')}
        >
          <div className="section-title">
            <span>Features</span>
          </div>
          {expandedSections.features ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        
        {expandedSections.features && (
          <div className="section-content">
            <label className="checkbox-item">
              <input type="checkbox" />
              <span className="checkmark"></span>
              <span className="label-text">Featured Items</span>
            </label>
            
            <label className="checkbox-item">
              <input type="checkbox" />
              <span className="checkmark"></span>
              <span className="label-text">On Sale</span>
            </label>
            
            <label className="checkbox-item">
              <input type="checkbox" />
              <span className="checkmark"></span>
              <span className="label-text">New Arrivals</span>
            </label>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductFilters; 