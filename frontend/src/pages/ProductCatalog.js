import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Search, Filter, Grid, List, ChevronDown, Verified } from 'lucide-react';
import { fetchProducts, setFilters } from '../store/slices/productsSlice';
import { debounce } from '../utils/performance';
import ProductCard from '../components/ProductCard';
import ProductFilters from '../components/ProductFilters';
import Pagination from '../components/Pagination';
import LoadingSpinner from '../components/LoadingSpinner';
import '../styles/ProductCatalog.css';

const ProductCatalog = () => {
  const dispatch = useDispatch();
  const { 
    items: products,
    categories,
    loading, 
    error, 
    filters,
    pagination
  } = useSelector(state => state.products);

  const [viewMode, setViewMode] = useState('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState(filters.search || '');
  const [sortBy, setSortBy] = useState(filters.sortBy || 'newest');

  // Load products on component mount and when filters change
  useEffect(() => {
    dispatch(fetchProducts({
      page: pagination.currentPage,
      limit: pagination.itemsPerPage,
      search: searchTerm,
      category: filters.category,
      sortBy: sortBy
    }));
  }, [dispatch, pagination.currentPage, pagination.itemsPerPage, filters.category, sortBy]);

  // Memoized debounced search function
  const debouncedSearch = useMemo(
    () => debounce((term) => {
      dispatch(fetchProducts({
        page: 1,
        search: term,
        category: filters.category,
        sortBy: sortBy
      }));
    }, 300),
    [dispatch, filters.category, sortBy]
  );

  // Handle search
  const handleSearch = useCallback((e) => {
    e.preventDefault();
    debouncedSearch(searchTerm);
  }, [debouncedSearch, searchTerm]);

  const handleSearchInputChange = useCallback((e) => {
    const value = e.target.value;
    setSearchTerm(value);
    debouncedSearch(value);
  }, [debouncedSearch]);

  const handleSortChange = useCallback((newSortBy) => {
    setSortBy(newSortBy);
    dispatch(setFilters({ sortBy: newSortBy }));
    dispatch(fetchProducts({
      page: 1,
      search: searchTerm,
      category: filters.category,
      sortBy: newSortBy
    }));
  }, [dispatch, searchTerm, filters.category]);

  const handleCategoryFilter = useCallback((category) => {
    dispatch(setFilters({ category }));
    dispatch(fetchProducts({
      page: 1,
      search: searchTerm,
      category: category,
      sortBy: sortBy
    }));
  }, [dispatch, searchTerm, sortBy]);

  const handlePageChange = useCallback((page) => {
    dispatch(fetchProducts({
      page: page,
      search: searchTerm,
      category: filters.category,
      sortBy: sortBy
    }));
  }, [dispatch, searchTerm, filters.category, sortBy]);

  const sortOptions = [
    { value: 'newest', label: 'Newest First' },
    { value: 'oldest', label: 'Oldest First' },
    { value: 'price-low', label: 'Price: Low to High' },
    { value: 'price-high', label: 'Price: High to Low' },
    { value: 'name', label: 'Name A-Z' },
    { value: 'popular', label: 'Most Popular' }
  ];

  // Use productManager categories
  const productCategories = categories || [];
  const stats = {
    totalProducts: products.length,
    verifiedProducts: products.filter(p => p.verified).length,
    demoProducts: products.filter(p => p.demo).length,
    sellerProducts: products.filter(p => p.seller).length
  };

  if (error) {
    return (
      <div className="catalog-error">
        <h2>Error Loading Products</h2>
        <p>{error}</p>
        <button onClick={() => window.location.reload()}>Retry</button>
      </div>
    );
  }

  return (
    <div className="product-catalog">
      {/* Header */}
      <div className="catalog-header">
        <div className="catalog-title">
          <h1>Blockchain Marketplace</h1>
          <p>Discover verified digital assets and collectibles</p>
        </div>
        
        {/* Search Bar */}
        <form className="search-form" onSubmit={handleSearch}>
          <div className="search-input-group">
            <Search className="search-icon" size={20} />
            <input
              type="text"
              placeholder="Search products, collections, or creators..."
              value={searchTerm}
              onChange={handleSearchInputChange}
              className="search-input"
            />
            <button type="submit" className="search-button">
              Search
            </button>
          </div>
        </form>
      </div>

      {/* Stats Bar */}
      <div className="catalog-stats">
        <div className="stats-item">
          <span className="stats-number">{stats.totalProducts}</span>
          <span className="stats-label">Total Items</span>
        </div>
        <div className="stats-item">
          <span className="stats-number">{productCategories.length}</span>
          <span className="stats-label">Categories</span>
        </div>
        <div className="stats-item">
          <Verified className="verified-icon" size={16} />
          <span className="stats-number">{stats.verifiedProducts}</span>
          <span className="stats-label">Verified</span>
        </div>
        <div className="stats-item">
          <span className="stats-number">{stats.demoProducts}</span>
          <span className="stats-label">Demo Products</span>
        </div>
        <div className="stats-item">
          <span className="stats-number">{stats.sellerProducts}</span>
          <span className="stats-label">Seller Products</span>
        </div>
      </div>

      {/* Controls */}
      <div className="catalog-controls">
        <div className="controls-left">
          <button 
            className={`filter-toggle ${showFilters ? 'active' : ''}`}
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter size={16} />
            Filters
          </button>
          
          {filters.category && (
            <div className="active-filter">
              <span>Category: {filters.category}</span>
              <button onClick={() => handleCategoryFilter('')}>×</button>
            </div>
          )}
        </div>

        <div className="controls-right">
          <div className="sort-dropdown">
            <select 
              value={sortBy} 
              onChange={(e) => handleSortChange(e.target.value)}
              className="sort-select"
            >
              {sortOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <ChevronDown className="dropdown-icon" size={16} />
          </div>

          <div className="view-toggle">
            <button 
              className={`view-button ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
              aria-label="Grid view"
            >
              <Grid size={16} />
            </button>
            <button 
              className={`view-button ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
              aria-label="List view"
            >
              <List size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="catalog-content">
        {/* Sidebar Filters */}
        {showFilters && (
          <div className="catalog-sidebar">
            <ProductFilters 
              categories={productCategories}
              activeCategory={filters.category}
              onCategoryChange={handleCategoryFilter}
              filters={filters}
              onFiltersChange={(newFilters) => dispatch(setFilters(newFilters))}
            />
          </div>
        )}

        {/* Products Grid/List */}
        <div className="catalog-main">
          {loading ? (
            <div className="catalog-loading">
              <LoadingSpinner />
              <p>Loading products...</p>
            </div>
          ) : products.length === 0 ? (
            <div className="catalog-empty">
              <h3>No products found</h3>
              <p>Try adjusting your search terms or filters</p>
            </div>
          ) : (
            <>
              <div className={`products-${viewMode}`}>
                {products.map(product => (
                  <ProductCard 
                    key={product.id} 
                    product={product}
                    viewMode={viewMode}
                  />
                ))}
              </div>

              {/* Pagination */}
              <Pagination 
                currentPage={pagination.currentPage}
                totalPages={pagination.totalPages}
                onPageChange={handlePageChange}
                totalItems={pagination.totalItems}
                itemsPerPage={pagination.itemsPerPage}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductCatalog; 