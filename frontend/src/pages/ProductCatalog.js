import React, { useState, useEffect, useCallback } from 'react';
import { Search, Filter, Grid, List, ChevronDown, Star, DollarSign, Package, Verified, X } from 'lucide-react';
import '../styles/ProductCatalog.css';

const ProductCatalog = () => {
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    // UI State
    const [viewMode, setViewMode] = useState('grid');
    const [showFilters, setShowFilters] = useState(false);
    
    // Search & Filter State
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('');
    const [sortBy, setSortBy] = useState('newest');
    const [priceRange, setPriceRange] = useState({ min: '', max: '' });
    const [minRating, setMinRating] = useState(0);
    const [showInStock, setShowInStock] = useState(false);
    const [showVerified, setShowVerified] = useState(false);
    
    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const itemsPerPage = 12;

    // Fetch categories on component mount
    useEffect(() => {
        fetchCategories();
    }, []);

    const fetchCategories = async () => {
        try {
            const response = await fetch('http://localhost:5000/api/products/categories');
            if (response.ok) {
                const data = await response.json();
                setCategories(data.categories);
            }
        } catch (error) {
            console.error('Error fetching categories:', error);
        }
    };

    const fetchProducts = useCallback(async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams({
                page: currentPage,
                limit: itemsPerPage,
                sort: sortBy
            });

            if (searchTerm) params.append('search', searchTerm);
            if (selectedCategory) params.append('category', selectedCategory);

            const response = await fetch(`http://localhost:5000/api/products?${params}`);
            if (response.ok) {
                const data = await response.json();
                let filteredProducts = data.products || [];

                // Apply client-side filters that the backend doesn't handle
                filteredProducts = applyAdvancedFilters(filteredProducts);

                setProducts(filteredProducts);
                setTotalPages(data.pagination?.total_pages || 1);
                setTotalItems(data.pagination?.total_items || 0);
            } else {
                setError('Failed to fetch products');
            }
        } catch (error) {
            console.error('Error fetching products:', error);
            setError('Error fetching products');
        } finally {
            setLoading(false);
        }
    }, [currentPage, searchTerm, selectedCategory, sortBy, priceRange, minRating, showInStock, showVerified]);

    // Fetch products when filters change
    useEffect(() => {
        fetchProducts();
    }, [fetchProducts]);

    const applyAdvancedFilters = (productsData) => {
        return productsData.filter(product => {
            // Price range filter
            if (priceRange.min && product.price < parseFloat(priceRange.min)) return false;
            if (priceRange.max && product.price > parseFloat(priceRange.max)) return false;

            // Rating filter
            if (minRating > 0 && product.rating < minRating) return false;

            // Stock availability filter
            if (showInStock && (!product.inventory || product.inventory.quantity <= 0)) return false;

            // Verified filter
            if (showVerified && !product.verified) return false;

            return true;
        });
    };

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        setCurrentPage(1);
        fetchProducts();
    };

    const handleSearchChange = useCallback((e) => {
        setSearchTerm(e.target.value);
        setCurrentPage(1);
    }, []);

    const handleCategoryChange = (category) => {
        setSelectedCategory(category);
        setCurrentPage(1);
    };

    const handleSortChange = (sort) => {
        setSortBy(sort);
        setCurrentPage(1);
    };

    const handlePriceRangeChange = (field, value) => {
        setPriceRange(prev => ({
            ...prev,
            [field]: value
        }));
        setCurrentPage(1);
    };

    const clearFilters = () => {
        setSearchTerm('');
        setSelectedCategory('');
        setPriceRange({ min: '', max: '' });
        setMinRating(0);
        setShowInStock(false);
        setShowVerified(false);
        setCurrentPage(1);
    };

    const getActiveFiltersCount = () => {
        let count = 0;
        if (selectedCategory) count++;
        if (priceRange.min || priceRange.max) count++;
        if (minRating > 0) count++;
        if (showInStock) count++;
        if (showVerified) count++;
        return count;
    };

    const sortOptions = [
        { value: 'newest', label: 'Newest First' },
        { value: 'oldest', label: 'Oldest First' },
        { value: 'price-low', label: 'Price: Low to High' },
        { value: 'price-high', label: 'Price: High to Low' },
        { value: 'name', label: 'Name A-Z' },
        { value: 'rating', label: 'Best Ratings' }
    ];

    const renderStars = (rating) => {
        return Array.from({ length: 5 }, (_, index) => (
            <Star
                key={index}
                size={14}
                className={index < rating ? 'star-filled' : 'star-empty'}
                fill={index < rating ? 'currentColor' : 'none'}
            />
        ));
    };

    const formatPrice = (price) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(price);
    };

    const ProductCard = ({ product }) => (
        <div className={`product-card ${viewMode}`}>
            <div className="product-image">
                {product.images && product.images.length > 0 ? (
                    <img 
                        src={`http://localhost:5000${product.images[0].url}`} 
                        alt={product.name}
                    />
                ) : (
                    <div className="no-image">
                        <Package size={40} />
                    </div>
                )}
                {product.verified && (
                    <div className="verified-badge">
                        <Verified size={16} />
                    </div>
                )}
                {product.inventory && product.inventory.quantity <= product.inventory.lowStockThreshold && (
                    <div className="low-stock-badge">Low Stock</div>
                )}
            </div>
            
            <div className="product-info">
                <h3 className="product-title">{product.name}</h3>
                <p className="product-description">{product.shortDescription || product.description}</p>
                
                <div className="product-rating">
                    {renderStars(Math.round(product.rating || 0))}
                    <span className="rating-count">({product.sales?.views || 0})</span>
                </div>
                
                <div className="product-price">
                    <span className="current-price">{formatPrice(product.price)}</span>
                    {product.originalPrice && product.originalPrice > product.price && (
                        <span className="original-price">{formatPrice(product.originalPrice)}</span>
                    )}
                </div>
                
                <div className="product-meta">
                    <span className="product-category">{product.category}</span>
                    {product.inventory && (
                        <span className={`stock-status ${product.inventory.quantity > 0 ? 'in-stock' : 'out-of-stock'}`}>
                            {product.inventory.quantity > 0 ? `${product.inventory.quantity} in stock` : 'Out of stock'}
                        </span>
                    )}
                </div>
                
                <button className="view-product-btn">
                    View Details
                </button>
            </div>
        </div>
    );

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
                    <h1>Product Catalog</h1>
                    <p>Discover amazing products from verified sellers</p>
                </div>
                
                {/* Search Bar */}
                <form className="search-form" onSubmit={handleSearchSubmit}>
                    <div className="search-input-group">
                        <Search className="search-icon" size={20} />
                        <input
                            type="text"
                            placeholder="Search products, keywords, or seller names..."
                            value={searchTerm}
                            onChange={handleSearchChange}
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
                    <span className="stats-number">{totalItems}</span>
                    <span className="stats-label">Total Products</span>
                </div>
                <div className="stats-item">
                    <span className="stats-number">{categories.length}</span>
                    <span className="stats-label">Categories</span>
                </div>
                <div className="stats-item">
                    <Verified className="verified-icon" size={16} />
                    <span className="stats-number">{products.filter(p => p.verified).length}</span>
                    <span className="stats-label">Verified</span>
                </div>
                <div className="stats-item">
                    <Package className="stock-icon" size={16} />
                    <span className="stats-number">{products.filter(p => p.inventory && p.inventory.quantity > 0).length}</span>
                    <span className="stats-label">In Stock</span>
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
                        {getActiveFiltersCount() > 0 && (
                            <span className="filter-count">{getActiveFiltersCount()}</span>
                        )}
                    </button>
                    
                    {getActiveFiltersCount() > 0 && (
                        <button className="clear-filters" onClick={clearFilters}>
                            Clear All
                        </button>
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
                        <div className="filters-panel">
                            <div className="filters-header">
                                <h3>Filters</h3>
                                <button className="close-filters" onClick={() => setShowFilters(false)}>
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Category Filter */}
                            <div className="filter-section">
                                <h4>Category</h4>
                                <div className="category-list">
                                    <label className="category-item">
                                        <input
                                            type="radio"
                                            name="category"
                                            value=""
                                            checked={selectedCategory === ''}
                                            onChange={() => handleCategoryChange('')}
                                        />
                                        <span>All Categories</span>
                                    </label>
                                    {categories.map(category => (
                                        <label key={category.value} className="category-item">
                                            <input
                                                type="radio"
                                                name="category"
                                                value={category.value}
                                                checked={selectedCategory === category.value}
                                                onChange={() => handleCategoryChange(category.value)}
                                            />
                                            <span>{category.label}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Price Range Filter */}
                            <div className="filter-section">
                                <h4>Price Range</h4>
                                <div className="price-range">
                                    <div className="price-input-group">
                                        <DollarSign size={16} />
                                        <input
                                            type="number"
                                            placeholder="Min"
                                            value={priceRange.min}
                                            onChange={(e) => handlePriceRangeChange('min', e.target.value)}
                                            className="price-input"
                                        />
                                    </div>
                                    <span className="price-separator">to</span>
                                    <div className="price-input-group">
                                        <DollarSign size={16} />
                                        <input
                                            type="number"
                                            placeholder="Max"
                                            value={priceRange.max}
                                            onChange={(e) => handlePriceRangeChange('max', e.target.value)}
                                            className="price-input"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Rating Filter */}
                            <div className="filter-section">
                                <h4>Minimum Rating</h4>
                                <div className="rating-filter">
                                    {[0, 1, 2, 3, 4, 5].map(rating => (
                                        <label key={rating} className="rating-item">
                                            <input
                                                type="radio"
                                                name="rating"
                                                value={rating}
                                                checked={minRating === rating}
                                                onChange={() => setMinRating(rating)}
                                            />
                                            <div className="rating-display">
                                                {rating === 0 ? (
                                                    <span>Any Rating</span>
                                                ) : (
                                                    <>
                                                        {renderStars(rating)}
                                                        <span>& Up</span>
                                                    </>
                                                )}
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Availability Filter */}
                            <div className="filter-section">
                                <h4>Availability</h4>
                                <label className="checkbox-item">
                                    <input
                                        type="checkbox"
                                        checked={showInStock}
                                        onChange={(e) => setShowInStock(e.target.checked)}
                                    />
                                    <span>In Stock Only</span>
                                </label>
                                <label className="checkbox-item">
                                    <input
                                        type="checkbox"
                                        checked={showVerified}
                                        onChange={(e) => setShowVerified(e.target.checked)}
                                    />
                                    <span>Verified Products Only</span>
                                </label>
                            </div>
                        </div>
                    </div>
                )}

                {/* Products Grid/List */}
                <div className="catalog-main">
                    {loading ? (
                        <div className="catalog-loading">
                            <div className="loading-spinner"></div>
                            <p>Loading products...</p>
                        </div>
                    ) : products.length === 0 ? (
                        <div className="catalog-empty">
                            <h3>No products found</h3>
                            <p>Try adjusting your search terms or filters</p>
                            <button onClick={clearFilters} className="reset-btn">
                                Reset Filters
                            </button>
                        </div>
                    ) : (
                        <>
                            <div className={`products-${viewMode}`}>
                                {products.map(product => (
                                    <ProductCard 
                                        key={product._id} 
                                        product={product}
                                    />
                                ))}
                            </div>

                            {/* Pagination */}
                            {totalPages > 1 && (
                                <div className="pagination">
                                    <button
                                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                        disabled={currentPage === 1}
                                        className="pagination-btn"
                                    >
                                        Previous
                                    </button>
                                    
                                    <div className="pagination-info">
                                        <span>Page {currentPage} of {totalPages}</span>
                                        <span>({totalItems} total items)</span>
                                    </div>
                                    
                                    <button
                                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                        disabled={currentPage === totalPages}
                                        className="pagination-btn"
                                    >
                                        Next
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ProductCatalog; 