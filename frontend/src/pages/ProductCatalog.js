import '../styles/ProductCatalog.css';
import React, { useState, useEffect, useCallback, memo } from 'react';
import { Search, Filter, Grid, List, ChevronDown, Star, DollarSign, Package, Verified, X, ShoppingCart } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { addToCart } from '../store/slices/cartSlice';
import { toast } from 'react-toastify';
import { getApiUrl, getImageUrl } from '../config/api';
import { logDebug, logError } from '../utils/logger.production';
import { createProductPlaceholder } from '../utils/imageUtils';

// Local ProductCard component for catalog
const ProductCard = memo(({ product, viewMode }) => {
    const dispatch = useDispatch();
    const { user } = useSelector(state => state.auth);
    const isSeller = user?.userType === 'seller' && user?.role !== 'admin';

    // Handle both _id and id fields (backend transforms _id to id)
    const productId = product._id || product.id;
    
    if (!productId) {
        logError('ProductCard: Product missing both _id and id:', product);
        return null;
    }

    const price = product.price?.value || product.price || 0;

    const handleAddToCart = (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        if (!user) {
            toast.error('Please login to add items to cart');
            return;
        }

        if (isSeller) {
            toast.info('Sellers cannot purchase items. You can view and manage your own products instead.');
            return;
        }

        // Get product ID from available fields - handle both _id and id
        const finalProductId = productId || product._id || product.id;
        
        if (!finalProductId) {
            console.error('Product missing ID fields:', product);
            toast.error('Unable to add product to cart - missing product ID');
            return;
        }
        
        console.log('ProductCatalog - Adding to cart - Product ID:', finalProductId, 'Product:', product);
        
        dispatch(addToCart({
            productId: finalProductId,
            name: product.name,
            price: price,
            image: getProductImageUrl(product),
            category: product.category,
            quantity: 1,
            stock: product.inventory?.quantity || 0
        }));
        
        toast.success(`${product.name} added to cart!`);
    };

    // Helper function to get the right image URL
    const getProductImageUrl = (product) => {
        // Handle the case where product.images is an array of image objects
        if (product?.images && product.images.length > 0) {
            const imageObj = product.images[0];
            // If it's an object with url property, extract the url
            if (typeof imageObj === 'object' && imageObj.url) {
                return getImageUrl(imageObj.url);
            }
            // If it's just a string, use it directly
            if (typeof imageObj === 'string') {
                return getImageUrl(imageObj);
            }
        }
        
        // Legacy fallback for product.image (singular)
        const imageObj = product?.image;
        if (imageObj && imageObj.url) {
            return getImageUrl(imageObj.url);
        }
        
        return null;
    };

    if (viewMode === 'list') {
        return (
            <div className="product-card list">
                <Link to={`/product/${productId}`} className="product-link">
                    <div className="product-image">
                        <img 
                            src={getProductImageUrl(product) || createProductPlaceholder(280, 200, product.category)}
                            alt={product.name}
                            loading="lazy"
                            onError={(e) => {
                                e.target.src = createProductPlaceholder(280, 200, product.category);
                            }}
                        />
                        {product.inventory?.quantity <= product.inventory?.lowStockThreshold && (
                            <div className="low-stock-badge">Low Stock</div>
                        )}
                    </div>
                    <div className="product-info">
                        <h3 className="product-title">{product.name}</h3>
                        <p className="product-description">{product.shortDescription || product.description}</p>
                        <div className="product-meta">
                            <span className="product-category">{product.category}</span>
                            <span className="product-price">${price}</span>
                            <span className="product-stock">Stock: {product.inventory?.quantity || 0}</span>
                        </div>
                    </div>
                </Link>
                {!isSeller && (
                    <div className="product-actions">
                        <button 
                            className="add-to-cart-button"
                            onClick={handleAddToCart}
                            disabled={!product.inventory?.quantity || product.inventory.quantity <= 0}
                        >
                            <ShoppingCart size={16} />
                            Add to Cart
                        </button>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="product-card grid">
            <Link to={`/product/${productId}`} className="product-link">
                <div className="product-image">
                    <img 
                        src={getProductImageUrl(product) || createProductPlaceholder(280, 200, product.category)}
                        alt={product.name}
                        loading="lazy"
                        onError={(e) => {
                            e.target.src = createProductPlaceholder(280, 200, product.category);
                        }}
                    />
                    {product.inventory?.quantity <= product.inventory?.lowStockThreshold && (
                        <div className="low-stock-badge">Low Stock</div>
                    )}
                    {product.status === 'verified' && (
                        <div className="verified-badge">
                            <Verified size={12} />
                        </div>
                    )}
                </div>
                <div className="product-info">
                    <h3 className="product-title">{product.name}</h3>
                    <div className="product-meta">
                        <span className="product-category">{product.category}</span>
                        <span className="product-price">${price}</span>
                    </div>
                    <p className="product-description">{product.shortDescription || product.description?.substring(0, 100)}...</p>
                    <div className="product-footer">
                        <div className="product-stock">Stock: {product.inventory?.quantity || 0}</div>
                        {!isSeller && (
                            <button 
                                className="add-to-cart-button"
                                onClick={handleAddToCart}
                                disabled={!product.inventory?.quantity || product.inventory.quantity <= 0}
                            >
                                <ShoppingCart size={16} />
                                Add to Cart
                            </button>
                        )}
                    </div>
                </div>
            </Link>
        </div>
    );
});

const ProductCatalog = () => {
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(false);
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
    const [totalItems, setTotalItems] = useState(0);
    const itemsPerPage = 12;

    const fetchCategories = useCallback(async () => {
        try {
            const response = await fetch(getApiUrl('/products/categories'));
            if (response.ok) {
                const data = await response.json();
                setCategories(data);
            }
        } catch (error) {
            logError('Failed to fetch categories:', error);
        }
    }, []);

    // Fetch categories when component mounts
    useEffect(() => {
        fetchCategories();
    }, [fetchCategories]);

    const applyAdvancedFilters = useCallback((productsData) => {
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
    }, [priceRange, minRating, showInStock, showVerified]);

    const fetchProducts = useCallback(async () => {
        setLoading(true);
        setError(null);
        
        try {
            const params = new URLSearchParams({
                page: currentPage,
                limit: itemsPerPage,
                sort: sortBy
            });

            if (searchTerm) params.append('search', searchTerm);
            if (selectedCategory) params.append('category', selectedCategory);

            logDebug('ProductCatalog - Fetching products');
            logDebug('API URL:', getApiUrl(`/products?${params}`));

            const response = await fetch(getApiUrl(`/products?${params}`));
            
            if (response.ok) {
                const data = await response.json();
                let filteredProducts = data.products || [];
                
                logDebug('Raw products received:', filteredProducts.length);
                logDebug('Sample product:', filteredProducts[0]);

                // Validate products have required fields
                const productsWithoutId = filteredProducts.filter(p => !p._id && !p.id);
                if (productsWithoutId.length > 0) {
                    logError('Products missing both _id and id:', productsWithoutId.length);
                    logError('Examples:', productsWithoutId.slice(0, 3));
                } else {
                    logDebug('All products have valid IDs (using field:', filteredProducts[0]?._id ? '_id' : 'id', ')');
                }

                // Apply client-side filters that the backend doesn't handle
                filteredProducts = applyAdvancedFilters(filteredProducts);

                logDebug('Filtered products:', filteredProducts.length);
                
                setProducts(filteredProducts);
                setTotalItems(data.pagination?.total_items || 0);
            } else {
                logError('Response not ok:', response.status, response.statusText);
                setError('Failed to fetch products');
            }
        } catch (error) {
            logError('Fetch error:', error);
            setError('Failed to load products');
        } finally {
            setLoading(false);
        }
    }, [currentPage, searchTerm, selectedCategory, sortBy, applyAdvancedFilters]);

    // Fetch products when filters change
    useEffect(() => {
        fetchProducts();
    }, [fetchProducts]);

    // Add search handling in useEffect
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const searchQuery = urlParams.get('q');
        const searchIntent = urlParams.get('intent');
        
        if (searchQuery) {
            setSearchTerm(searchQuery);
            setCurrentPage(1);
        }
        
        if (searchIntent) {
            // Handle search intent if needed
            console.log('Search intent:', searchIntent);
        }
    }, []);

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

    if (error) {
        return (
            <div className="catalog-error">
                <h2>Error Loading Products</h2>
                <p>{error}</p>
                <button onClick={() => window.location.reload()}>Retry</button>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="catalog-loading">
                <div className="loading-spinner"></div>
                <p>Loading products...</p>
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
                    {products.length === 0 ? (
                        <div className="no-products">
                            <Package size={48} />
                            <h3>No products found</h3>
                            <p>Try adjusting your filters or search terms</p>
                        </div>
                    ) : (
                        <>
                            <div className={`products-container ${viewMode}`}>
                                {products.map((product) => (
                                    <ProductCard 
                                        key={product._id || product.id} 
                                        product={product} 
                                        viewMode={viewMode}
                                    />
                                ))}
                            </div>

                            {/* Pagination */}
                            {totalItems > itemsPerPage && (
                                <div className="pagination">
                                    <button 
                                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                        disabled={currentPage === 1}
                                        className="pagination-button"
                                    >
                                        Previous
                                    </button>
                                    
                                    <div className="pagination-info">
                                        Page {currentPage} of {Math.ceil(totalItems / itemsPerPage)}
                                    </div>
                                    
                                    <button 
                                        onClick={() => setCurrentPage(prev => Math.min(Math.ceil(totalItems / itemsPerPage), prev + 1))}
                                        disabled={currentPage >= Math.ceil(totalItems / itemsPerPage)}
                                        className="pagination-button"
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