import React, { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import '../styles/SellerDashboard.css';

const SellerDashboard = () => {
    const { user } = useSelector(state => state.auth);
    const [activeTab, setActiveTab] = useState('overview');
    const [products, setProducts] = useState([]);
    const [stats, setStats] = useState({});
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [pagination, setPagination] = useState({});
    
    // Product form state
    const [showProductForm, setShowProductForm] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        shortDescription: '',
        price: '',
        originalPrice: '',
        discountPercentage: '',
        category: '',
        subcategory: '',
        tags: [],
        quantity: '',
        lowStockThreshold: '5',
        trackInventory: true,
        allowBackorders: false,
        sku: '',
        specifications: [],
        weight: '',
        dimensions: { length: '', width: '', height: '' },
        freeShipping: false,
        shippingCost: '',
        metaTitle: '',
        metaDescription: '',
        status: 'draft'
    });
    const [selectedImages, setSelectedImages] = useState([]);
    const [existingImages, setExistingImages] = useState([]);

    const categories = [
        { value: 'electronics', label: 'Electronics' },
        { value: 'clothing', label: 'Clothing & Fashion' },
        { value: 'home-garden', label: 'Home & Garden' },
        { value: 'sports', label: 'Sports & Outdoors' },
        { value: 'books', label: 'Books & Media' },
        { value: 'beauty', label: 'Beauty & Personal Care' },
        { value: 'toys', label: 'Toys & Games' },
        { value: 'automotive', label: 'Automotive' },
        { value: 'jewelry', label: 'Jewelry & Accessories' },
        { value: 'art-collectibles', label: 'Art & Collectibles' },
        { value: 'other', label: 'Other' }
    ];

    const fetchProducts = useCallback(async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('authToken');
            const params = new URLSearchParams({
                page: currentPage,
                limit: 10,
                ...(searchTerm && { search: searchTerm }),
                ...(statusFilter && { status: statusFilter })
            });

            const response = await fetch(`http://localhost:5000/api/products/my?${params}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                setProducts(data.products);
                setPagination(data.pagination);
                setStats(data.stats);
            }
        } catch (error) {
            console.error('Error fetching products:', error);
        } finally {
            setLoading(false);
        }
    }, [currentPage, searchTerm, statusFilter]);

    useEffect(() => {
        fetchProducts();
    }, [fetchProducts]);

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        
        try {
            const token = localStorage.getItem('authToken');
            const formDataToSend = new FormData();
            
            // Add form fields
            Object.keys(formData).forEach(key => {
                if (key === 'tags' || key === 'specifications') {
                    formDataToSend.append(key, JSON.stringify(formData[key]));
                } else if (key === 'dimensions') {
                    formDataToSend.append(key, JSON.stringify(formData[key]));
                } else {
                    formDataToSend.append(key, formData[key]);
                }
            });

            // Add images
            selectedImages.forEach(image => {
                formDataToSend.append(editingProduct ? 'newImages' : 'images', image);
            });

            const url = editingProduct 
                ? `http://localhost:5000/api/products/${editingProduct._id}`
                : 'http://localhost:5000/api/products';
            
            const method = editingProduct ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formDataToSend
            });

            if (response.ok) {
                setShowProductForm(false);
                setEditingProduct(null);
                resetForm();
                fetchProducts();
            }
        } catch (error) {
            console.error('Error saving product:', error);
        }
    };

    const resetForm = () => {
        setFormData({
            name: '',
            description: '',
            shortDescription: '',
            price: '',
            originalPrice: '',
            discountPercentage: '',
            category: '',
            subcategory: '',
            tags: [],
            quantity: '',
            lowStockThreshold: '5',
            trackInventory: true,
            allowBackorders: false,
            sku: '',
            specifications: [],
            weight: '',
            dimensions: { length: '', width: '', height: '' },
            freeShipping: false,
            shippingCost: '',
            metaTitle: '',
            metaDescription: '',
            status: 'draft'
        });
        setSelectedImages([]);
        setExistingImages([]);
    };

    const handleEdit = (product) => {
        setEditingProduct(product);
        setFormData({
            name: product.name,
            description: product.description,
            shortDescription: product.shortDescription || '',
            price: product.price.toString(),
            originalPrice: product.originalPrice?.toString() || '',
            discountPercentage: product.discountPercentage?.toString() || '',
            category: product.category,
            subcategory: product.subcategory || '',
            tags: product.tags || [],
            quantity: product.inventory.quantity.toString(),
            lowStockThreshold: product.inventory.lowStockThreshold.toString(),
            trackInventory: product.inventory.trackInventory,
            allowBackorders: product.inventory.allowBackorders,
            sku: product.inventory.sku || '',
            specifications: product.specifications || [],
            weight: product.shipping?.weight?.toString() || '',
            dimensions: product.shipping?.dimensions || { length: '', width: '', height: '' },
            freeShipping: product.shipping?.freeShipping || false,
            shippingCost: product.shipping?.shippingCost?.toString() || '',
            metaTitle: product.seo?.metaTitle || '',
            metaDescription: product.seo?.metaDescription || '',
            status: product.status
        });
        setExistingImages(product.images || []);
        setShowProductForm(true);
    };

    const handleDelete = async (productId) => {
        if (window.confirm('Are you sure you want to delete this product?')) {
            try {
                const token = localStorage.getItem('authToken');
                const response = await fetch(`http://localhost:5000/api/products/${productId}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (response.ok) {
                    fetchProducts();
                }
            } catch (error) {
                console.error('Error deleting product:', error);
            }
        }
    };

    const getStatusBadge = (status) => {
        const statusConfig = {
            active: { class: 'status-active', text: 'Active' },
            draft: { class: 'status-draft', text: 'Draft' },
            inactive: { class: 'status-inactive', text: 'Inactive' },
            out_of_stock: { class: 'status-out-of-stock', text: 'Out of Stock' },
            discontinued: { class: 'status-discontinued', text: 'Discontinued' }
        };
        
        const config = statusConfig[status] || { class: '', text: status };
        return <span className={`status-badge ${config.class}`}>{config.text}</span>;
    };

    const renderOverview = () => (
        <div className="dashboard-overview">
            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon">📦</div>
                    <div className="stat-info">
                        <h3>{stats.totalProducts || 0}</h3>
                        <p>Total Products</p>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon">✅</div>
                    <div className="stat-info">
                        <h3>{stats.activeProducts || 0}</h3>
                        <p>Active Products</p>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon">📊</div>
                    <div className="stat-info">
                        <h3>{stats.totalInventory || 0}</h3>
                        <p>Total Inventory</p>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon">⚠️</div>
                    <div className="stat-info">
                        <h3>{stats.lowStockCount || 0}</h3>
                        <p>Low Stock Items</p>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon">💰</div>
                    <div className="stat-info">
                        <h3>${stats.totalRevenue || 0}</h3>
                        <p>Total Revenue</p>
                    </div>
                </div>
            </div>

            <div className="recent-products">
                <h3>Recent Products</h3>
                <div className="products-list">
                    {products.slice(0, 5).map(product => (
                        <div key={product._id} className="product-item">
                            <div className="product-image">
                                {product.images[0] ? (
                                    <img src={`http://localhost:5000${product.images[0].url}`} alt={product.name} />
                                ) : (
                                    <div className="no-image">📷</div>
                                )}
                            </div>
                            <div className="product-info">
                                <h4>{product.name}</h4>
                                <p className="product-price">${product.price}</p>
                                <p className="product-stock">Stock: {product.inventory.quantity}</p>
                                {getStatusBadge(product.status)}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );

    const renderProductManagement = () => (
        <div className="product-management">
            <div className="management-header">
                <h3>Product Management</h3>
                <button 
                    className="btn-primary"
                    onClick={() => {
                        resetForm();
                        setShowProductForm(true);
                    }}
                >
                    + Add New Product
                </button>
            </div>

            <div className="filters">
                <input
                    type="text"
                    placeholder="Search products..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="search-input"
                />
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="status-filter"
                >
                    <option value="">All Status</option>
                    <option value="active">Active</option>
                    <option value="draft">Draft</option>
                    <option value="inactive">Inactive</option>
                    <option value="out_of_stock">Out of Stock</option>
                    <option value="discontinued">Discontinued</option>
                </select>
            </div>

            {loading ? (
                <div className="loading">Loading products...</div>
            ) : (
                <>
                    <div className="products-table">
                        <table>
                            <thead>
                                <tr>
                                    <th>Image</th>
                                    <th>Name</th>
                                    <th>Price</th>
                                    <th>Stock</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {products.map(product => (
                                    <tr key={product._id}>
                                        <td>
                                            {product.images[0] ? (
                                                <img 
                                                    src={`http://localhost:5000${product.images[0].url}`} 
                                                    alt={product.name}
                                                    className="table-product-image"
                                                />
                                            ) : (
                                                <div className="no-image-small">📷</div>
                                            )}
                                        </td>
                                        <td>
                                            <div className="product-name-cell">
                                                <strong>{product.name}</strong>
                                                <span className="product-sku">SKU: {product.inventory.sku}</span>
                                            </div>
                                        </td>
                                        <td>${product.price}</td>
                                        <td>
                                            <div className="stock-cell">
                                                <span className={product.isLowStock ? 'low-stock' : ''}>
                                                    {product.inventory.quantity}
                                                </span>
                                                {product.isLowStock && <span className="low-stock-warning">⚠️</span>}
                                            </div>
                                        </td>
                                        <td>{getStatusBadge(product.status)}</td>
                                        <td>
                                            <div className="action-buttons">
                                                <button
                                                    onClick={() => handleEdit(product)}
                                                    className="btn-edit"
                                                    title="Edit"
                                                >
                                                    ✏️
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(product._id)}
                                                    className="btn-delete"
                                                    title="Delete"
                                                >
                                                    🗑️
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {pagination.pages > 1 && (
                        <div className="pagination">
                            <button
                                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                disabled={currentPage === 1}
                            >
                                Previous
                            </button>
                            <span>Page {currentPage} of {pagination.pages}</span>
                            <button
                                onClick={() => setCurrentPage(prev => Math.min(pagination.pages, prev + 1))}
                                disabled={currentPage === pagination.pages}
                            >
                                Next
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );

    const renderProductForm = () => (
        <div className="product-form-overlay">
            <div className="product-form">
                <div className="form-header">
                    <h3>{editingProduct ? 'Edit Product' : 'Add New Product'}</h3>
                    <button 
                        className="close-btn"
                        onClick={() => {
                            setShowProductForm(false);
                            setEditingProduct(null);
                            resetForm();
                        }}
                    >
                        ×
                    </button>
                </div>

                <form onSubmit={handleFormSubmit} className="form-content">
                    <div className="form-section">
                        <h4>Basic Information</h4>
                        <div className="form-row">
                            <div className="form-group">
                                <label>Product Name *</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>Category *</label>
                                <select
                                    value={formData.category}
                                    onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                                    required
                                >
                                    <option value="">Select Category</option>
                                    {categories.map(cat => (
                                        <option key={cat.value} value={cat.value}>{cat.label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Description *</label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                required
                                rows="4"
                            />
                        </div>

                        <div className="form-group">
                            <label>Short Description</label>
                            <textarea
                                value={formData.shortDescription}
                                onChange={(e) => setFormData(prev => ({ ...prev, shortDescription: e.target.value }))}
                                rows="2"
                            />
                        </div>
                    </div>

                    <div className="form-section">
                        <h4>Pricing</h4>
                        <div className="form-row">
                            <div className="form-group">
                                <label>Price *</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={formData.price}
                                    onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>Original Price</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={formData.originalPrice}
                                    onChange={(e) => setFormData(prev => ({ ...prev, originalPrice: e.target.value }))}
                                />
                            </div>
                            <div className="form-group">
                                <label>Discount %</label>
                                <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={formData.discountPercentage}
                                    onChange={(e) => setFormData(prev => ({ ...prev, discountPercentage: e.target.value }))}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="form-section">
                        <h4>Inventory</h4>
                        <div className="form-row">
                            <div className="form-group">
                                <label>Quantity *</label>
                                <input
                                    type="number"
                                    min="0"
                                    value={formData.quantity}
                                    onChange={(e) => setFormData(prev => ({ ...prev, quantity: e.target.value }))}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>Low Stock Threshold</label>
                                <input
                                    type="number"
                                    min="0"
                                    value={formData.lowStockThreshold}
                                    onChange={(e) => setFormData(prev => ({ ...prev, lowStockThreshold: e.target.value }))}
                                />
                            </div>
                            <div className="form-group">
                                <label>SKU</label>
                                <input
                                    type="text"
                                    value={formData.sku}
                                    onChange={(e) => setFormData(prev => ({ ...prev, sku: e.target.value }))}
                                />
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group checkbox-group">
                                <label>
                                    <input
                                        type="checkbox"
                                        checked={formData.trackInventory}
                                        onChange={(e) => setFormData(prev => ({ ...prev, trackInventory: e.target.checked }))}
                                    />
                                    Track Inventory
                                </label>
                            </div>
                            <div className="form-group checkbox-group">
                                <label>
                                    <input
                                        type="checkbox"
                                        checked={formData.allowBackorders}
                                        onChange={(e) => setFormData(prev => ({ ...prev, allowBackorders: e.target.checked }))}
                                    />
                                    Allow Backorders
                                </label>
                            </div>
                        </div>
                    </div>

                    <div className="form-section">
                        <h4>Images</h4>
                        <div className="form-group">
                            <label>Product Images</label>
                            <input
                                type="file"
                                multiple
                                accept="image/*"
                                onChange={(e) => setSelectedImages(Array.from(e.target.files))}
                            />
                            <small>Upload up to 5 images. First image will be the primary image.</small>
                        </div>

                        {existingImages.length > 0 && (
                            <div className="existing-images">
                                <h5>Existing Images</h5>
                                <div className="image-preview">
                                    {existingImages.map((image, index) => (
                                        <div key={index} className="image-item">
                                            <img 
                                                src={`http://localhost:5000${image.url}`} 
                                                alt={`Product ${index + 1}`}
                                            />
                                            {image.isPrimary && <span className="primary-badge">Primary</span>}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="form-section">
                        <h4>Status</h4>
                        <div className="form-group">
                            <label>Product Status</label>
                            <select
                                value={formData.status}
                                onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                            >
                                <option value="draft">Draft</option>
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                            </select>
                        </div>
                    </div>

                    <div className="form-actions">
                        <button type="button" onClick={() => setShowProductForm(false)}>
                            Cancel
                        </button>
                        <button type="submit" className="btn-primary">
                            {editingProduct ? 'Update Product' : 'Create Product'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );

    return (
        <div className="seller-dashboard">
            <div className="dashboard-header">
                <h1>Seller Dashboard</h1>
                <p>Welcome back, {user?.firstName}!</p>
            </div>

            <div className="dashboard-nav">
                <button
                    className={activeTab === 'overview' ? 'active' : ''}
                    onClick={() => setActiveTab('overview')}
                >
                    📊 Overview
                </button>
                <button
                    className={activeTab === 'products' ? 'active' : ''}
                    onClick={() => setActiveTab('products')}
                >
                    📦 Products
                </button>
                <button
                    className={activeTab === 'inventory' ? 'active' : ''}
                    onClick={() => setActiveTab('inventory')}
                >
                    📋 Inventory
                </button>
            </div>

            <div className="dashboard-content">
                {activeTab === 'overview' && renderOverview()}
                {activeTab === 'products' && renderProductManagement()}
                {activeTab === 'inventory' && renderProductManagement()}
            </div>

            {showProductForm && renderProductForm()}
        </div>
    );
};

export default SellerDashboard; 