import '../styles/SellerDashboard.css';
import React, { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { logger } from '../utils/logger';
import { api } from '../services/api';
import { toast } from 'react-toastify';
import { 
  BarChart3, Users, ShoppingCart, DollarSign, TrendingUp, 
  AlertTriangle, Package, Plus, Eye, Edit3, Trash2,
  User, Star, CheckCircle 
} from 'lucide-react';
import { getCategoryOptions } from '../utils/constants';

const SellerDashboard = () => {
    const { user } = useSelector(state => state.auth);
    const location = useLocation();
    const navigate = useNavigate();
    
    // Redirect pure admins (not sellers) to admin dashboard
    useEffect(() => {
        if (user?.role === 'admin' && user?.userType !== 'seller' && !user?.isSeller) {
            navigate('/admin/dashboard', { replace: true });
        }
    }, [user, navigate]);
    
    // Determine initial tab based on URL
    const getInitialTab = () => {
        const path = location.pathname;
        if (path.includes('/analytics')) return 'analytics';
        if (path.includes('/listings')) return 'products';
        if (path.includes('/inventory')) return 'inventory';
        if (path.includes('/revenue')) return 'analytics';
        return 'overview';
    };
    
    const [activeTab, setActiveTab] = useState(getInitialTab());
    const [products, setProducts] = useState([]);
    const [stats, setStats] = useState({});
    const [analyticsData, setAnalyticsData] = useState({
        totalRevenue: 0,
        totalSales: 0,
        productsListed: 0,
        ordersReceived: 0,
        averageRating: 0,
        pendingPayouts: 0,
        monthlyRevenue: [],
        topProducts: [],
        recentOrders: []
    });
    const [loading, setLoading] = useState(true);
    const [analyticsLoading, setAnalyticsLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [pagination, setPagination] = useState({});
    
    // Product form state
    const [showProductForm, setShowProductForm] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);

    // Check if user is new (account created less than 7 days ago)
    const isNewUser = user ? (() => {
        if (!user.createdAt) return true;
        const accountDate = new Date(user.createdAt);
        const now = new Date();
        const daysDiff = (now - accountDate) / (1000 * 60 * 60 * 24);
        return daysDiff < 7;
    })() : true;

    // Check if user profile is complete (specific for sellers)
    const checkProfileCompletion = () => {
        if (!user) return { isComplete: false, missingFields: true, hasAvatar: false };
        
        // Define required fields for a complete seller profile
        const requiredFields = [
            user.firstName,
            user.lastName,
            user.email,
            user.phoneNumber,
            user.address?.street,
            user.address?.city,
            user.address?.country
        ];
        
        // Additional seller-specific requirements
        const sellerRequiredFields = [
            user.sellerProfile?.storeName,
            user.sellerProfile?.storeDescription
        ];
        
        // Check if all required fields are filled
        const basicComplete = requiredFields.every(field => field && field.trim() !== '');
        const sellerComplete = sellerRequiredFields.every(field => field && field.trim() !== '');
        const isComplete = basicComplete && sellerComplete;
        
        // Also check if user has uploaded an avatar
        const hasAvatar = user.avatar && user.avatar !== '';
        
        return {
            isComplete: isComplete && hasAvatar,
            missingFields: !basicComplete || !sellerComplete,
            hasAvatar,
            needsSellerInfo: !sellerComplete
        };
    };

    const profileStatus = checkProfileCompletion();

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
        specifications: [],
        quantity: '',
        lowStockThreshold: '',
        sku: '',
        barcode: '',
        weight: '',
        dimensions: { length: '', width: '', height: '' },
        shippingClass: '',
        metaTitle: '',
        metaDescription: '',
        status: 'active'
    });
    const [selectedImages, setSelectedImages] = useState([]);
    const [existingImages, setExistingImages] = useState([]);
    const [imagePreviews, setImagePreviews] = useState([]);
    const [dragActive, setDragActive] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formErrors, setFormErrors] = useState({});
    const [currentStep, setCurrentStep] = useState(1);
    const totalSteps = 4;

    const categories = getCategoryOptions();

    const fetchProducts = useCallback(async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token') || localStorage.getItem('authToken');
            
            if (!token) {
                console.error('No authentication token found');
                setProducts([]);
                setStats({});
                return;
            }
            
            const params = new URLSearchParams({
                page: currentPage,
                limit: 10,
                ...(searchTerm && { search: searchTerm }),
                ...(statusFilter && { status: statusFilter })
            });

            console.log('Fetching products from:', `http://localhost:5000/api/products/my?${params}`);

            const response = await fetch(`http://localhost:5000/api/products/my?${params}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            console.log('Products fetch response status:', response.status);

            if (response.ok) {
                const data = await response.json();
                console.log('Products data received:', data);
                setProducts(data.products || []);
                setPagination(data.pagination || {});
                setStats(data.stats || {});
            } else {
                const errorData = await response.json();
                console.error('Failed to fetch products:', response.status, errorData);
                
                if (response.status === 401) {
                    console.error('Authentication failed - token may be expired');
                    // Optionally redirect to login or refresh token
                }
            }
        } catch (error) {
            logger.error('Error fetching products:', error);
            console.error('Error fetching products:', error);
            setProducts([]);
            setStats({});
        } finally {
            setLoading(false);
        }
    }, [currentPage, searchTerm, statusFilter]);

    const fetchAnalytics = useCallback(async () => {
        try {
            setAnalyticsLoading(true);
            
            // Fetch seller stats
            const response = await api.get('/users/seller-stats');
            if (response.data.success) {
                setAnalyticsData(prev => ({
                    ...prev,
                    ...response.data.data
                }));
            }
        } catch (error) {
            logger.error('Error fetching analytics:', error);
            console.error('Analytics fetch failed:', error);
        } finally {
            setAnalyticsLoading(false);
        }
    }, []);

    // Handle tab changes with proper URL navigation
    const handleTabChange = (newTab) => {
        setActiveTab(newTab);
        
        // Update URL based on tab selection
        switch (newTab) {
            case 'analytics':
                navigate('/seller/analytics', { replace: true });
                break;
            case 'products':
                navigate('/seller/listings', { replace: true });
                break;
            case 'inventory':
                navigate('/seller/inventory', { replace: true });
                break;
            case 'overview':
            default:
                navigate('/seller-dashboard', { replace: true });
                break;
        }
        
        // Fetch analytics data if switching to analytics tab
        if (newTab === 'analytics') {
            fetchAnalytics();
        }
    };

    useEffect(() => {
        fetchProducts();
        
        // Fetch analytics if on analytics tab
        if (activeTab === 'analytics') {
            fetchAnalytics();
        }
    }, [fetchProducts, fetchAnalytics, activeTab]);

    // Update active tab when URL changes
    useEffect(() => {
        const newTab = getInitialTab();
        if (newTab !== activeTab) {
            setActiveTab(newTab);
            
            // Fetch analytics if switching to analytics tab
            if (newTab === 'analytics') {
                fetchAnalytics();
            }
        }
    }, [location.pathname, activeTab, fetchAnalytics]);

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        
        // Reset form errors
        setFormErrors({});
        
        // Validate all steps before submission
        const allErrors = validateAllSteps();
        if (Object.keys(allErrors).length > 0) {
            setFormErrors(allErrors);
            // Find the first step with errors and navigate to it
            const errorSteps = {
                1: ['name', 'category', 'description'],
                2: ['images'],
                3: ['price', 'quantity'],
                4: []
            };
            
            for (let step = 1; step <= 4; step++) {
                const hasStepError = errorSteps[step].some(field => allErrors[field]);
                if (hasStepError) {
                    setCurrentStep(step);
                    break;
                }
            }
            return;
        }

        setIsSubmitting(true);

        try {
            const token = localStorage.getItem('token') || localStorage.getItem('authToken');
            
            if (!token) {
                setFormErrors({ submit: 'Authentication required. Please log in again.' });
                return;
            }

            console.log('Creating product with data:', {
                name: formData.name,
                category: formData.category,
                price: formData.price,
                description: formData.description,
                specifications: formData.specifications
            });

            // Debug logging to track what's being sent
            console.log('🔍 FRONTEND DEBUG - SellerDashboard form submission:');
            console.log('- Category from formData:', `"${formData.category}"`);
            console.log('- Available categories:', categories);
            console.log('- Selected category details:', categories.find(c => c.value === formData.category));

            const productData = new FormData();
            
            // Basic product information
            productData.append('name', formData.name);
            productData.append('description', formData.description);
            productData.append('shortDescription', formData.shortDescription);
            productData.append('price', formData.price);
            productData.append('category', formData.category);
            productData.append('subcategory', formData.subcategory);
            productData.append('status', formData.status || 'active'); // Set to active by default

            // Debug what's actually being sent in FormData
            console.log('🔍 FRONTEND DEBUG - FormData contents:');
            for (let [key, value] of productData.entries()) {
                console.log(`- ${key}:`, `"${value}"`);
            }

            // Process specifications correctly - only include complete specs
            const validSpecs = formData.specifications?.filter(spec => 
                spec && spec.name && spec.name.trim() !== '' && spec.value && spec.value.trim() !== ''
            ) || [];
            
            console.log('Valid specifications:', validSpecs);
            
            // Only send specifications if there are valid ones
            if (validSpecs.length > 0) {
                productData.append('specifications', JSON.stringify(validSpecs));
            }

            // Process tags correctly
            const tagsToSend = Array.isArray(formData.tags) 
                ? formData.tags.filter(tag => tag && tag.trim() !== '')
                : typeof formData.tags === 'string' 
                    ? formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag !== '')
                    : [];

            // Optional fields
            if (formData.originalPrice) productData.append('originalPrice', formData.originalPrice);
            if (formData.discountPercentage) productData.append('discountPercentage', formData.discountPercentage);
            if (tagsToSend.length > 0) {
                productData.append('tags', JSON.stringify(tagsToSend));
            }

            // Inventory information
            productData.append('quantity', formData.quantity);
            if (formData.lowStockThreshold) productData.append('lowStockThreshold', formData.lowStockThreshold);
            if (formData.trackInventory !== undefined) productData.append('trackInventory', formData.trackInventory);
            if (formData.allowBackorders !== undefined) productData.append('allowBackorders', formData.allowBackorders);
            if (formData.sku) productData.append('sku', formData.sku);

            // Shipping information
            if (formData.weight) productData.append('weight', formData.weight);
            if (formData.dimensions && (formData.dimensions.length || formData.dimensions.width || formData.dimensions.height)) {
                productData.append('dimensions', JSON.stringify(formData.dimensions));
            }
            if (formData.freeShipping !== undefined) productData.append('freeShipping', formData.freeShipping);
            if (formData.shippingCost) productData.append('shippingCost', formData.shippingCost);

            // SEO information
            if (formData.metaTitle) productData.append('metaTitle', formData.metaTitle);
            if (formData.metaDescription) productData.append('metaDescription', formData.metaDescription);

            // Handle images
            if (selectedImages.length > 0) {
                selectedImages.forEach((image) => {
                    productData.append('images', image);
                });
            }

            console.log('Submitting to:', editingProduct ? 
                `http://localhost:5000/api/products/${editingProduct._id}` : 
                'http://localhost:5000/api/products');

            const url = editingProduct ? 
                `http://localhost:5000/api/products/${editingProduct._id}` : 
                'http://localhost:5000/api/products';
            const method = editingProduct ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method: method,
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: productData
            });

            console.log('Response status:', response.status);
            const result = await response.json();
            console.log('Response data:', result);

            if (response.ok) {
                // Show success message
                toast.success(editingProduct ? 'Product updated successfully!' : 'Product created successfully and is now live in the marketplace!');
                
                // Reset form and close
                setShowProductForm(false);
                setEditingProduct(null);
                resetForm();
                
                // Refresh all data
                await Promise.all([
                    fetchProducts(),
                    fetchAnalytics()
                ]);
                
                // Switch to products tab to show the new/updated product
                handleTabChange('products');
                
            } else {
                const errorData = await response.json();
                setFormErrors({ 
                    submit: errorData.message || 'Failed to save product. Please try again.' 
                });
            }
        } catch (error) {
            console.error('Error saving product:', error);
            logger.error('Error saving product:', error);
            setFormErrors({ 
                submit: 'Network error. Please check your connection and try again.' 
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    // Enhanced form validation function for all steps
    const validateAllSteps = () => {
        const errors = {};
        
        // Step 1: Basic Info validation
        if (!formData.name || formData.name.trim().length < 3) {
            errors.name = 'Product name must be at least 3 characters long';
        }
        
        if (!formData.description || formData.description.trim().length < 10) {
            errors.description = 'Description must be at least 10 characters long';
        }
        
        if (!formData.category) {
            errors.category = 'Please select a category';
        }
        
        // Step 2: Images validation
        if (!editingProduct && selectedImages.length === 0) {
            errors.images = 'Please add at least one product image';
        }
        
        // Step 3: Pricing & Inventory validation
        if (!formData.price || parseFloat(formData.price) <= 0) {
            errors.price = 'Please enter a valid price greater than 0';
        }
        
        if (!formData.quantity || parseInt(formData.quantity) < 0) {
            errors.quantity = 'Please enter a valid quantity';
        }
        
        // Price validation
        if (formData.originalPrice && parseFloat(formData.originalPrice) < parseFloat(formData.price)) {
            errors.originalPrice = 'Original price should be greater than or equal to current price';
        }
        
        if (formData.discountPercentage && (parseFloat(formData.discountPercentage) < 0 || parseFloat(formData.discountPercentage) > 100)) {
            errors.discountPercentage = 'Discount percentage must be between 0 and 100';
        }
        
        return errors;
    };

    // Step-by-step validation
    const validateCurrentStep = () => {
        const errors = {};
        
        switch (currentStep) {
            case 1:
                if (!formData.name || formData.name.trim().length < 3) {
                    errors.name = 'Product name must be at least 3 characters long';
                }
                if (!formData.description || formData.description.trim().length < 10) {
                    errors.description = 'Description must be at least 10 characters long';
                }
                if (!formData.category) {
                    errors.category = 'Please select a category';
                }
                break;
                
            case 2:
                if (!editingProduct && selectedImages.length === 0) {
                    errors.images = 'Please add at least one product image';
                }
                break;
                
            case 3:
                if (!formData.price || parseFloat(formData.price) <= 0) {
                    errors.price = 'Please enter a valid price greater than 0';
                }
                if (!formData.quantity || parseInt(formData.quantity) < 0) {
                    errors.quantity = 'Please enter a valid quantity';
                }
                if (formData.originalPrice && parseFloat(formData.originalPrice) < parseFloat(formData.price)) {
                    errors.originalPrice = 'Original price should be greater than or equal to current price';
                }
                if (formData.discountPercentage && (parseFloat(formData.discountPercentage) < 0 || parseFloat(formData.discountPercentage) > 100)) {
                    errors.discountPercentage = 'Discount percentage must be between 0 and 100';
                }
                break;
                
            case 4:
                // Step 4 is optional, no required validation
                break;
        }
        
        return errors;
    };

    // Handle next step with validation
    const handleNextStep = () => {
        // Clear previous errors
        setFormErrors({});
        
        // Validate current step
        const stepErrors = validateCurrentStep();
        
        if (Object.keys(stepErrors).length > 0) {
            setFormErrors(stepErrors);
            return; // Don't proceed to next step
        }
        
        // Proceed to next step
        setCurrentStep(prev => Math.min(totalSteps, prev + 1));
    };

    // Handle previous step
    const handlePreviousStep = () => {
        setFormErrors({}); // Clear errors when going back
        setCurrentStep(prev => Math.max(1, prev - 1));
    };

    // Form validation function
    const validateForm = () => {
        return validateAllSteps();
    };

    // Notification helper function
    const showNotification = (message, type = 'info') => {
        // You can implement a toast notification here
        alert(message); // For now, using alert
    };

    // Enhanced image handling
    const handleImageSelection = (files) => {
        const validFiles = Array.from(files).filter(file => {
            // Validate file type
            if (!file.type.startsWith('image/')) {
                setFormErrors(prev => ({ ...prev, images: 'Only image files are allowed' }));
                return false;
            }
            
            // Validate file size (5MB limit)
            if (file.size > 5 * 1024 * 1024) {
                setFormErrors(prev => ({ ...prev, images: 'Image size must be less than 5MB' }));
                return false;
            }
            
            return true;
        });

        if (validFiles.length + selectedImages.length > 5) {
            setFormErrors(prev => ({ ...prev, images: 'Maximum 5 images allowed' }));
            return;
        }

        // Clear image errors
        setFormErrors(prev => ({ ...prev, images: '' }));
        
        // Add files
        setSelectedImages(prev => [...prev, ...validFiles]);
        
        // Create previews
        validFiles.forEach(file => {
            const reader = new FileReader();
            reader.onload = (e) => {
                setImagePreviews(prev => [...prev, {
                    file: file,
                    url: e.target.result,
                    name: file.name
                }]);
            };
            reader.readAsDataURL(file);
        });
    };

    // Drag and drop handlers
    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleImageSelection(e.dataTransfer.files);
        }
    };

    const removeImage = (index) => {
        setSelectedImages(prev => prev.filter((_, i) => i !== index));
        setImagePreviews(prev => prev.filter((_, i) => i !== index));
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
            specifications: [],
            quantity: '',
            lowStockThreshold: '',
            sku: '',
            barcode: '',
            weight: '',
            dimensions: { length: '', width: '', height: '' },
            shippingClass: '',
            metaTitle: '',
            metaDescription: '',
            status: 'active'
        });
        setSelectedImages([]);
        setExistingImages([]);
        setImagePreviews([]);
        setDragActive(false);
        setIsSubmitting(false);
        setFormErrors({});
        setCurrentStep(1);
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
                const token = localStorage.getItem('token') || localStorage.getItem('authToken');
                const response = await fetch(`http://localhost:5000/api/products/${productId}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (response.ok) {
                    alert('Product deleted successfully!');
                    fetchProducts();
                } else {
                    const result = await response.json();
                    alert(result.message || 'Failed to delete product.');
                }
            } catch (error) {
                logger.error('Error deleting product:', error);
                alert('An error occurred while deleting the product.');
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
            {/* Profile Completion Banner for Sellers */}
            {!profileStatus.isComplete && isNewUser && (
                <div className="profile-completion-banner seller-banner">
                    <div className="banner-content">
                        <h3>🏪 Complete Your Seller Profile</h3>
                        <p>
                            {profileStatus.needsSellerInfo 
                                ? 'Set up your store information to start selling effectively'
                                : 'Add missing information to get the most out of your seller experience'
                            }
                        </p>
                        <Link to="/profile-settings" className="enhanced-action-btn warning">
                            <div className="btn-icon">
                                <User size={20} />
                            </div>
                            <div className="btn-content">
                                <span className="btn-title">Complete Seller Profile</span>
                                <span className="btn-subtitle">
                                    {profileStatus.needsSellerInfo 
                                        ? 'Add store details'
                                        : 'Add missing details'
                                    }
                                </span>
                            </div>
                            <div className="btn-arrow">
                                <Star size={16} />
                            </div>
                        </Link>
                    </div>
                </div>
            )}

            {/* Quick Actions Section - Most Prominent */}
            <div className="quick-actions-section">
                <h3>🚀 Quick Actions</h3>
                <div className="quick-actions-grid">
                    <div className="action-card primary-action" onClick={() => {
                        resetForm();
                        setShowProductForm(true);
                    }}>
                        <div className="action-icon">🆕</div>
                        <div className="action-content">
                            <h4>Add New Product</h4>
                            <p>Start selling by adding your first product</p>
                        </div>
                        <div className="action-arrow">→</div>
                    </div>
                    
                    <div className="action-card" onClick={() => handleTabChange('products')}>
                        <div className="action-icon">📦</div>
                        <div className="action-content">
                            <h4>Manage Products</h4>
                            <p>View and edit your existing products</p>
                        </div>
                        <div className="action-arrow">→</div>
                    </div>
                    
                    <div className="action-card" onClick={() => handleTabChange('inventory')}>
                        <div className="action-icon">📋</div>
                        <div className="action-content">
                            <h4>Check Inventory</h4>
                            <p>Monitor stock levels and alerts</p>
                        </div>
                        <div className="action-arrow">→</div>
                    </div>
                    
                    <div className="action-card" onClick={() => handleTabChange('analytics')}>
                        <div className="action-icon">📊</div>
                        <div className="action-content">
                            <h4>View Analytics</h4>
                            <p>Track sales and performance</p>
                        </div>
                        <div className="action-arrow">→</div>
                    </div>

                    {/* Conditional Profile Completion Button */}
                    {!profileStatus.isComplete && (
                        <Link to="/profile-settings" className="action-card profile-completion">
                            <div className="action-icon">
                                {profileStatus.isComplete ? <CheckCircle /> : <User />}
                            </div>
                            <div className="action-content">
                                <h4>
                                    {profileStatus.isComplete ? 'View Profile' : 'Complete Profile'}
                                </h4>
                                <p>
                                    {profileStatus.needsSellerInfo 
                                        ? 'Set up your store information'
                                        : profileStatus.isComplete 
                                            ? 'Manage your seller account'
                                            : 'Complete your seller profile'
                                    }
                                </p>
                            </div>
                            <div className="action-arrow">
                                {profileStatus.isComplete ? <CheckCircle size={16} /> : <Star size={16} />}
                            </div>
                        </Link>
                    )}
                </div>
            </div>

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
                <div className="section-header">
                    <h3>Recent Products</h3>
                    {products.length === 0 ? (
                        <button 
                            className="add-first-product-btn"
                            onClick={() => {
                                resetForm();
                                setShowProductForm(true);
                            }}
                        >
                            + Add Your First Product
                        </button>
                    ) : (
                        <button 
                            className="btn-secondary"
                            onClick={() => {
                                resetForm();
                                setShowProductForm(true);
                            }}
                        >
                            + Add Product
                        </button>
                    )}
                </div>
                
                {products.length === 0 ? (
                    <div className="empty-products-state">
                        <div className="empty-state-icon">📦</div>
                        <h4>No Products Yet</h4>
                        <p>Start your selling journey by adding your first product to the marketplace.</p>
                        <button 
                            className="btn-primary large-btn"
                            onClick={() => {
                                resetForm();
                                setShowProductForm(true);
                            }}
                        >
                            🆕 Create Your First Product
                        </button>
                    </div>
                ) : (
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
                )}
            </div>
        </div>
    );

    const renderAnalytics = () => (
        <div className="analytics-dashboard">
            {analyticsLoading ? (
                <div className="loading">Loading analytics...</div>
            ) : (
                <>
                    <div className="analytics-header">
                        <h3>📊 Sales Analytics</h3>
                        <p>Track your performance and sales metrics</p>
                    </div>

                    <div className="analytics-stats-grid">
                        <div className="analytics-stat-card">
                            <div className="stat-icon">💰</div>
                            <div className="stat-info">
                                <h3>${analyticsData.totalRevenue || 0}</h3>
                                <p>Total Revenue</p>
                            </div>
                        </div>
                        <div className="analytics-stat-card">
                            <div className="stat-icon">📦</div>
                            <div className="stat-info">
                                <h3>{analyticsData.totalSales || 0}</h3>
                                <p>Total Sales</p>
                            </div>
                        </div>
                        <div className="analytics-stat-card">
                            <div className="stat-icon">🛍️</div>
                            <div className="stat-info">
                                <h3>{analyticsData.productsListed || 0}</h3>
                                <p>Products Listed</p>
                            </div>
                        </div>
                        <div className="analytics-stat-card">
                            <div className="stat-icon">📋</div>
                            <div className="stat-info">
                                <h3>{analyticsData.ordersReceived || 0}</h3>
                                <p>Orders Received</p>
                            </div>
                        </div>
                        <div className="analytics-stat-card">
                            <div className="stat-icon">⭐</div>
                            <div className="stat-info">
                                <h3>{analyticsData.averageRating || 0}/5</h3>
                                <p>Average Rating</p>
                            </div>
                        </div>
                        <div className="analytics-stat-card">
                            <div className="stat-icon">💳</div>
                            <div className="stat-info">
                                <h3>${analyticsData.pendingPayouts || 0}</h3>
                                <p>Pending Payouts</p>
                            </div>
                        </div>
                    </div>

                    <div className="analytics-charts">
                        <div className="chart-section">
                            <h4>📈 Performance Summary</h4>
                            <div className="performance-metrics">
                                <div className="metric">
                                    <span className="metric-label">Conversion Rate:</span>
                                    <span className="metric-value">
                                        {analyticsData.totalSales && analyticsData.ordersReceived 
                                            ? Math.round((analyticsData.totalSales / analyticsData.ordersReceived) * 100)
                                            : 0
                                        }%
                                    </span>
                                </div>
                                <div className="metric">
                                    <span className="metric-label">Average Order Value:</span>
                                    <span className="metric-value">
                                        ${analyticsData.totalSales 
                                            ? Math.round(analyticsData.totalRevenue / analyticsData.totalSales)
                                            : 0
                                        }
                                    </span>
                                </div>
                                <div className="metric">
                                    <span className="metric-label">Revenue per Product:</span>
                                    <span className="metric-value">
                                        ${analyticsData.productsListed 
                                            ? Math.round(analyticsData.totalRevenue / analyticsData.productsListed)
                                            : 0
                                        }
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="chart-section">
                            <h4>🎯 Quick Insights</h4>
                            <div className="insights-grid">
                                <div className="insight-card">
                                    <h5>Sales Performance</h5>
                                    <p>
                                        {analyticsData.totalSales > 0 
                                            ? "You're making sales! Keep up the good work."
                                            : "Time to boost your sales. Consider promotional strategies."
                                        }
                                    </p>
                                </div>
                                <div className="insight-card">
                                    <h5>Product Portfolio</h5>
                                    <p>
                                        {analyticsData.productsListed > 5 
                                            ? "Great product variety! Diverse inventory attracts more customers."
                                            : "Consider adding more products to expand your reach."
                                        }
                                    </p>
                                </div>
                                <div className="insight-card">
                                    <h5>Customer Satisfaction</h5>
                                    <p>
                                        {analyticsData.averageRating >= 4 
                                            ? "Excellent customer ratings! Your quality service shows."
                                            : "Focus on improving customer satisfaction and ratings."
                                        }
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="analytics-actions">
                        <button 
                            className="analytics-action-btn"
                            onClick={() => handleTabChange('products')}
                        >
                            📦 Manage Products
                        </button>
                        <button 
                            className="analytics-action-btn primary"
                            onClick={() => {
                                resetForm();
                                setShowProductForm(true);
                            }}
                        >
                            🆕 Add Product
                        </button>
                        <button 
                            className="analytics-action-btn"
                            onClick={fetchAnalytics}
                        >
                            🔄 Refresh Data
                        </button>
                    </div>
                </>
            )}
        </div>
    );

    const renderProductManagement = () => (
        <div className="product-management">
            <div className="management-header">
                <div className="header-text">
                    <h3>Product Management</h3>
                    <p>Manage your product listings and inventory</p>
                </div>
                <button 
                    className="btn-primary enhanced-add-btn"
                    onClick={() => {
                        resetForm();
                        setShowProductForm(true);
                    }}
                >
                    <span className="btn-icon">🆕</span>
                    <span className="btn-text">Add New Product</span>
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
            ) : products.length === 0 ? (
                <div className="empty-products-management">
                    <div className="empty-state-icon">📦</div>
                    <h4>No Products Found</h4>
                    <p>
                        {searchTerm || statusFilter 
                            ? "No products match your current filters. Try adjusting your search or filter criteria."
                            : "You haven't created any products yet. Start building your inventory by adding your first product."
                        }
                    </p>
                    {!searchTerm && !statusFilter && (
                        <button 
                            className="btn-primary large-btn"
                            onClick={() => {
                                resetForm();
                                setShowProductForm(true);
                            }}
                        >
                            🆕 Add Your First Product
                        </button>
                    )}
                    {(searchTerm || statusFilter) && (
                        <div className="filter-actions">
                            <button 
                                className="btn-secondary"
                                onClick={() => {
                                    setSearchTerm('');
                                    setStatusFilter('');
                                }}
                            >
                                Clear Filters
                            </button>
                            <button 
                                className="btn-primary"
                                onClick={() => {
                                    resetForm();
                                    setShowProductForm(true);
                                }}
                            >
                                Add Product Instead
                            </button>
                        </div>
                    )}
                </div>
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

    const renderInventory = () => (
        <div className="inventory-management">
            <div className="inventory-header">
                <h3>📋 Inventory Management</h3>
                <p>Monitor your stock levels and inventory status</p>
            </div>

            <div className="inventory-alerts">
                {products.filter(p => p.isLowStock).length > 0 && (
                    <div className="alert-card low-stock-alert">
                        <div className="alert-icon">⚠️</div>
                        <div className="alert-content">
                            <h4>Low Stock Alert</h4>
                            <p>
                                {products.filter(p => p.isLowStock).length} products are running low on stock.
                            </p>
                        </div>
                    </div>
                )}
                
                {products.filter(p => p.inventory.quantity === 0).length > 0 && (
                    <div className="alert-card out-of-stock-alert">
                        <div className="alert-icon">🚫</div>
                        <div className="alert-content">
                            <h4>Out of Stock</h4>
                            <p>
                                {products.filter(p => p.inventory.quantity === 0).length} products are out of stock.
                            </p>
                        </div>
                    </div>
                )}
            </div>

            <div className="inventory-filters">
                <div className="filters">
                    <input
                        type="text"
                        placeholder="Search inventory..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="search-input"
                    />
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="status-filter"
                    >
                        <option value="">All Items</option>
                        <option value="low_stock">Low Stock</option>
                        <option value="out_of_stock">Out of Stock</option>
                        <option value="in_stock">In Stock</option>
                    </select>
                </div>
            </div>

            {loading ? (
                <div className="loading">Loading inventory...</div>
            ) : (
                <>
                    <div className="inventory-table">
                        <table>
                            <thead>
                                <tr>
                                    <th>Product</th>
                                    <th>SKU</th>
                                    <th>Current Stock</th>
                                    <th>Low Stock Threshold</th>
                                    <th>Status</th>
                                    <th>Last Updated</th>
                                </tr>
                            </thead>
                            <tbody>
                                {products.filter(product => {
                                    // Apply search filter
                                    const matchesSearch = !searchTerm || 
                                        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                        (product.inventory.sku && product.inventory.sku.toLowerCase().includes(searchTerm.toLowerCase()));
                                    
                                    // Apply status filter
                                    let matchesStatus = true;
                                    if (statusFilter === 'low_stock') {
                                        matchesStatus = product.isLowStock && product.inventory.quantity > 0;
                                    } else if (statusFilter === 'out_of_stock') {
                                        matchesStatus = product.inventory.quantity === 0;
                                    } else if (statusFilter === 'in_stock') {
                                        matchesStatus = product.inventory.quantity > 0 && !product.isLowStock;
                                    }
                                    
                                    return matchesSearch && matchesStatus;
                                }).map(product => (
                                    <tr key={product._id} className={product.isLowStock ? 'low-stock-row' : ''}>
                                        <td>
                                            <div className="product-info-cell">
                                                {product.images[0] ? (
                                                    <img 
                                                        src={`http://localhost:5000${product.images[0].url}`} 
                                                        alt={product.name}
                                                        className="table-product-image"
                                                    />
                                                ) : (
                                                    <div className="no-image-small">📷</div>
                                                )}
                                                <div className="product-details">
                                                    <strong>{product.name}</strong>
                                                    <span className="product-price">${product.price}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <span className="sku-code">{product.inventory.sku || 'N/A'}</span>
                                        </td>
                                        <td>
                                            <div className="stock-display">
                                                <span className={`stock-number ${product.isLowStock ? 'low' : 'normal'}`}>
                                                    {product.inventory.quantity}
                                                </span>
                                                {product.inventory.quantity === 0 && <span className="out-badge">OUT</span>}
                                                {product.isLowStock && product.inventory.quantity > 0 && <span className="low-badge">LOW</span>}
                                            </div>
                                        </td>
                                        <td>{product.inventory.lowStockThreshold}</td>
                                        <td>
                                            <div className="inventory-status">
                                                {product.inventory.quantity === 0 ? (
                                                    <span className="status-out">Out of Stock</span>
                                                ) : product.isLowStock ? (
                                                    <span className="status-low">Low Stock</span>
                                                ) : (
                                                    <span className="status-in">In Stock</span>
                                                )}
                                            </div>
                                        </td>
                                        <td>
                                            <span className="last-updated">
                                                {new Date(product.updatedAt).toLocaleDateString()}
                                            </span>
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
            <div className="product-form advanced-form">
                <div className="form-header">
                    <div className="header-content">
                        <h3>{editingProduct ? 'Edit Product' : 'Add New Product'}</h3>
                        <div className="form-progress">
                            <div className="progress-steps">
                                {[1, 2, 3, 4].map(step => (
                                    <div key={step} className={`step ${currentStep >= step ? 'active' : ''} ${currentStep === step ? 'current' : ''}`}>
                                        <span>{step}</span>
                                        {step < totalSteps && <div className="step-line"></div>}
                                    </div>
                                ))}
                            </div>
                            <div className="step-labels">
                                <span className={currentStep === 1 ? 'active' : ''}>Basic Info</span>
                                <span className={currentStep === 2 ? 'active' : ''}>Images</span>
                                <span className={currentStep === 3 ? 'active' : ''}>Pricing & Inventory</span>
                                <span className={currentStep === 4 ? 'active' : ''}>Details & SEO</span>
                            </div>
                        </div>
                    </div>
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
                    {/* Step 1: Basic Information */}
                    {currentStep === 1 && (
                        <div className="form-step active">
                            <div className="step-header">
                                <h4>📝 Basic Product Information</h4>
                                <p>Start with the essential details about your product</p>
                            </div>
                            
                            <div className="form-section">
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Product Name *</label>
                                        <input
                                            type="text"
                                            value={formData.name}
                                            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                            placeholder="Enter a compelling product name..."
                                            className={formErrors.name ? 'error' : ''}
                                        />
                                        {formErrors.name && <span className="error-message">{formErrors.name}</span>}
                                    </div>
                                    
                                    <div className="form-group">
                                        <label>Category *</label>
                                        <select
                                            value={formData.category}
                                            onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                                            className={formErrors.category ? 'error' : ''}
                                        >
                                            <option value="">Select Category</option>
                                            {categories.map(cat => (
                                                <option key={cat.value} value={cat.value}>{cat.label}</option>
                                            ))}
                                        </select>
                                        {formErrors.category && <span className="error-message">{formErrors.category}</span>}
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label>Product Description *</label>
                                    <textarea
                                        value={formData.description}
                                        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                        placeholder="Provide a detailed description of your product. Include key features, benefits, and specifications..."
                                        rows="5"
                                        className={formErrors.description ? 'error' : ''}
                                    />
                                    <div className="character-count">
                                        {formData.description.length}/2000 characters
                                    </div>
                                    {formErrors.description && <span className="error-message">{formErrors.description}</span>}
                                </div>

                                <div className="form-group">
                                    <label>Short Description</label>
                                    <textarea
                                        value={formData.shortDescription}
                                        onChange={(e) => setFormData(prev => ({ ...prev, shortDescription: e.target.value }))}
                                        placeholder="A brief summary that will appear in product listings..."
                                        rows="2"
                                    />
                                    <div className="character-count">
                                        {formData.shortDescription.length}/500 characters
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label>Product Tags</label>
                                    <input
                                        type="text"
                                        value={Array.isArray(formData.tags) ? formData.tags.join(', ') : formData.tags}
                                        onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
                                        placeholder="Enter tags separated by commas (e.g., wireless, bluetooth, portable)"
                                    />
                                    <small>Tags help customers find your product more easily</small>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 2: Images */}
                    {currentStep === 2 && (
                        <div className="form-step active">
                            <div className="step-header">
                                <h4>📸 Product Images</h4>
                                <p>Upload high-quality images to showcase your product</p>
                            </div>
                            
                            <div className="form-section">
                                <div className="image-upload-advanced">
                                    <div 
                                        className={`drag-drop-area ${dragActive ? 'drag-active' : ''} ${formErrors.images ? 'error' : ''}`}
                                        onDragEnter={handleDrag}
                                        onDragLeave={handleDrag}
                                        onDragOver={handleDrag}
                                        onDrop={handleDrop}
                                    >
                                        <input
                                            type="file"
                                            id="images"
                                            multiple
                                            accept="image/*"
                                            onChange={(e) => handleImageSelection(e.target.files)}
                                            style={{ display: 'none' }}
                                        />
                                        <label htmlFor="images" className="upload-label">
                                            <div className="upload-icon">📸</div>
                                            <h4>Drag & Drop Images Here</h4>
                                            <p>or <span className="browse-link">browse files</span></p>
                                            <small>PNG, JPG, WebP up to 5MB each (Max 5 images)</small>
                                        </label>
                                    </div>
                                    
                                    {formErrors.images && <span className="error-message">{formErrors.images}</span>}
                                    
                                    {(imagePreviews.length > 0 || existingImages.length > 0) && (
                                        <div className="image-gallery">
                                            <h5>📷 Product Gallery ({imagePreviews.length + existingImages.length}/5)</h5>
                                            <div className="image-grid">
                                                {/* Existing images */}
                                                {existingImages.map((image, index) => (
                                                    <div key={`existing-${index}`} className="image-item existing">
                                                        <img src={`http://localhost:5000${image.url}`} alt={`Product ${index + 1}`} />
                                                        <div className="image-overlay">
                                                            <span className="image-label">Existing</span>
                                                            {image.isPrimary && <span className="primary-badge">Primary</span>}
                                                        </div>
                                                    </div>
                                                ))}
                                                
                                                {/* New image previews */}
                                                {imagePreviews.map((preview, index) => (
                                                    <div key={`new-${index}`} className="image-item new">
                                                        <img src={preview.url} alt={`Preview ${index + 1}`} />
                                                        <div className="image-overlay">
                                                            <span className="image-label">New</span>
                                                            <button
                                                                type="button"
                                                                onClick={() => removeImage(index)}
                                                                className="remove-btn"
                                                            >
                                                                ✕
                                                            </button>
                                                        </div>
                                                        {index === 0 && existingImages.length === 0 && (
                                                            <span className="primary-badge">Primary</span>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="image-tips">
                                                <p><strong>💡 Image Tips:</strong></p>
                                                <ul>
                                                    <li>First image will be the main product image</li>
                                                    <li>Use high-resolution images (at least 800x800px)</li>
                                                    <li>Show different angles and details</li>
                                                    <li>Use good lighting and clean backgrounds</li>
                                                </ul>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Pricing & Inventory */}
                    {currentStep === 3 && (
                        <div className="form-step active">
                            <div className="step-header">
                                <h4>💰 Pricing & Inventory</h4>
                                <p>Set your pricing strategy and manage inventory</p>
                            </div>
                            
                            <div className="form-section">
                                <div className="pricing-section">
                                    <h5>💲 Pricing</h5>
                                    <div className="form-row">
                                        <div className="form-group">
                                            <label>Current Price *</label>
                                            <div className="price-input">
                                                <span className="currency">$</span>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    value={formData.price}
                                                    onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                                                    placeholder="0.00"
                                                    className={formErrors.price ? 'error' : ''}
                                                />
                                            </div>
                                            {formErrors.price && <span className="error-message">{formErrors.price}</span>}
                                        </div>
                                        
                                        <div className="form-group">
                                            <label>Original Price</label>
                                            <div className="price-input">
                                                <span className="currency">$</span>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    value={formData.originalPrice}
                                                    onChange={(e) => setFormData(prev => ({ ...prev, originalPrice: e.target.value }))}
                                                    placeholder="0.00"
                                                    className={formErrors.originalPrice ? 'error' : ''}
                                                />
                                            </div>
                                            {formErrors.originalPrice && <span className="error-message">{formErrors.originalPrice}</span>}
                                        </div>
                                        
                                        <div className="form-group">
                                            <label>Discount %</label>
                                            <input
                                                type="number"
                                                min="0"
                                                max="100"
                                                value={formData.discountPercentage}
                                                onChange={(e) => setFormData(prev => ({ ...prev, discountPercentage: e.target.value }))}
                                                placeholder="0"
                                                className={formErrors.discountPercentage ? 'error' : ''}
                                            />
                                            {formErrors.discountPercentage && <span className="error-message">{formErrors.discountPercentage}</span>}
                                        </div>
                                    </div>
                                    
                                    {formData.price && formData.originalPrice && (
                                        <div className="pricing-preview">
                                            <div className="price-display">
                                                <span className="current-price">${formData.price}</span>
                                                {formData.originalPrice > formData.price && (
                                                    <>
                                                        <span className="original-price">${formData.originalPrice}</span>
                                                        <span className="savings">
                                                            Save ${(parseFloat(formData.originalPrice) - parseFloat(formData.price)).toFixed(2)}
                                                        </span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="inventory-section">
                                    <h5>📦 Inventory Management</h5>
                                    <div className="form-row">
                                        <div className="form-group">
                                            <label>Stock Quantity *</label>
                                            <input
                                                type="number"
                                                min="0"
                                                value={formData.quantity}
                                                onChange={(e) => setFormData(prev => ({ ...prev, quantity: e.target.value }))}
                                                placeholder="0"
                                                className={formErrors.quantity ? 'error' : ''}
                                            />
                                            {formErrors.quantity && <span className="error-message">{formErrors.quantity}</span>}
                                        </div>
                                        
                                        <div className="form-group">
                                            <label>Low Stock Alert</label>
                                            <input
                                                type="number"
                                                min="0"
                                                value={formData.lowStockThreshold}
                                                onChange={(e) => setFormData(prev => ({ ...prev, lowStockThreshold: e.target.value }))}
                                                placeholder="5"
                                            />
                                            <small>Get notified when stock falls below this level</small>
                                        </div>
                                        
                                        <div className="form-group">
                                            <label>SKU</label>
                                            <input
                                                type="text"
                                                value={formData.sku}
                                                onChange={(e) => setFormData(prev => ({ ...prev, sku: e.target.value }))}
                                                placeholder="AUTO-GENERATED"
                                            />
                                            <small>Leave empty for auto-generation</small>
                                        </div>
                                    </div>

                                    <div className="form-row">
                                        <div className="form-group checkbox-group">
                                            <label className="checkbox-label">
                                                <input
                                                    type="checkbox"
                                                    checked={formData.trackInventory}
                                                    onChange={(e) => setFormData(prev => ({ ...prev, trackInventory: e.target.checked }))}
                                                />
                                                <span className="checkmark"></span>
                                                Track Inventory
                                            </label>
                                            <small>Monitor stock levels and get low stock alerts</small>
                                        </div>
                                        
                                        <div className="form-group checkbox-group">
                                            <label className="checkbox-label">
                                                <input
                                                    type="checkbox"
                                                    checked={formData.allowBackorders}
                                                    onChange={(e) => setFormData(prev => ({ ...prev, allowBackorders: e.target.checked }))}
                                                />
                                                <span className="checkmark"></span>
                                                Allow Backorders
                                            </label>
                                            <small>Continue selling when out of stock</small>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 4: Details & SEO */}
                    {currentStep === 4 && (
                        <div className="form-step active">
                            <div className="step-header">
                                <h4>🔍 Additional Details & SEO</h4>
                                <p>Optimize your product for search and discovery</p>
                            </div>
                            
                            <div className="form-section">
                                <div className="shipping-section">
                                    <h5>🚚 Shipping Information</h5>
                                    <div className="form-row">
                                        <div className="form-group">
                                            <label>Weight (lbs)</label>
                                            <input
                                                type="number"
                                                step="0.1"
                                                value={formData.weight}
                                                onChange={(e) => setFormData(prev => ({ ...prev, weight: e.target.value }))}
                                                placeholder="0.0"
                                            />
                                        </div>
                                        
                                        <div className="form-group">
                                            <label>Shipping Cost</label>
                                            <div className="price-input">
                                                <span className="currency">$</span>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    value={formData.shippingCost}
                                                    onChange={(e) => setFormData(prev => ({ ...prev, shippingCost: e.target.value }))}
                                                    placeholder="0.00"
                                                    disabled={formData.freeShipping}
                                                />
                                            </div>
                                        </div>
                                        
                                        <div className="form-group checkbox-group">
                                            <label className="checkbox-label">
                                                <input
                                                    type="checkbox"
                                                    checked={formData.freeShipping}
                                                    onChange={(e) => setFormData(prev => ({ 
                                                        ...prev, 
                                                        freeShipping: e.target.checked,
                                                        shippingCost: e.target.checked ? '0' : prev.shippingCost
                                                    }))}
                                                />
                                                <span className="checkmark"></span>
                                                Free Shipping
                                            </label>
                                        </div>
                                    </div>
                                </div>

                                <div className="seo-section">
                                    <h5>🔍 SEO Optimization</h5>
                                    <div className="form-group">
                                        <label>Meta Title</label>
                                        <input
                                            type="text"
                                            value={formData.metaTitle}
                                            onChange={(e) => setFormData(prev => ({ ...prev, metaTitle: e.target.value }))}
                                            placeholder={formData.name || "Product Meta Title"}
                                        />
                                        <div className="character-count">
                                            {formData.metaTitle.length}/60 characters
                                        </div>
                                    </div>
                                    
                                    <div className="form-group">
                                        <label>Meta Description</label>
                                        <textarea
                                            value={formData.metaDescription}
                                            onChange={(e) => setFormData(prev => ({ ...prev, metaDescription: e.target.value }))}
                                            placeholder={formData.shortDescription || formData.description.substring(0, 160) || "Brief description for search engines"}
                                            rows="3"
                                        />
                                        <div className="character-count">
                                            {formData.metaDescription.length}/160 characters
                                        </div>
                                    </div>
                                </div>

                                <div className="status-section">
                                    <h5>📊 Product Status</h5>
                                    <div className="form-group">
                                        <label>Publication Status</label>
                                        <select
                                            value={formData.status}
                                            onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                                        >
                                            <option value="draft">Draft - Not visible to customers</option>
                                            <option value="active">Active - Live and visible to customers</option>
                                            <option value="inactive">Inactive - Hidden from customers</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Error Display */}
                    {formErrors.submit && (
                        <div className="form-error">
                            <span>❌ {formErrors.submit}</span>
                        </div>
                    )}

                    {/* Form Navigation */}
                    <div className="form-actions">
                        <div className="action-buttons">
                            {currentStep > 1 && (
                                <button 
                                    type="button" 
                                    className="btn-secondary"
                                    onClick={handlePreviousStep}
                                >
                                    ← Previous
                                </button>
                            )}
                            
                            {currentStep < totalSteps ? (
                                <button 
                                    type="button" 
                                    className="btn-primary"
                                    onClick={handleNextStep}
                                >
                                    Next →
                                </button>
                            ) : (
                                <button 
                                    type="submit" 
                                    className="btn-primary submit-btn"
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? (
                                        <>
                                            <span>🔄</span>
                                            <span>{editingProduct ? 'Updating...' : 'Creating...'}</span>
                                        </>
                                    ) : (
                                        <>
                                            <span>✨</span>
                                            <span>{editingProduct ? 'Update Product' : 'Create Product'}</span>
                                        </>
                                    )}
                                </button>
                            )}
                        </div>
                        
                        <button 
                            type="button" 
                            className="btn-text"
                            onClick={() => {
                                setShowProductForm(false);
                                setEditingProduct(null);
                                resetForm();
                            }}
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );

    return (
        <div className="seller-dashboard">
            <div className="dashboard-header">
                <div className="header-content">
                    <div className="header-main">
                        <h1>Seller Dashboard</h1>
                        <div className="header-subtitle">
                            <p>Welcome back, {user?.firstName}!</p>
                            <div className="current-section">
                                <span className="section-indicator">
                                    {activeTab === 'overview' && '📊 Overview'}
                                    {activeTab === 'analytics' && '📈 Analytics'}
                                    {activeTab === 'products' && '📦 Products'}
                                    {activeTab === 'inventory' && '📋 Inventory'}
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className="header-actions">
                        <button
                            className="header-add-product-btn"
                            onClick={() => {
                                resetForm();
                                setShowProductForm(true);
                            }}
                            title="Add a new product to your store"
                        >
                            <span className="btn-icon">🆕</span>
                            <span className="btn-text">Add Product</span>
                        </button>
                    </div>
                </div>
            </div>

            <div className="dashboard-nav">
                <button
                    className={activeTab === 'overview' ? 'active' : ''}
                    onClick={() => handleTabChange('overview')}
                    title="View dashboard overview and key metrics"
                >
                    📊 Overview
                </button>
                <button
                    className={activeTab === 'analytics' ? 'active' : ''}
                    onClick={() => handleTabChange('analytics')}
                    title="View detailed sales analytics and insights"
                >
                    📈 Analytics
                </button>
                <button
                    className={activeTab === 'products' ? 'active' : ''}
                    onClick={() => handleTabChange('products')}
                    title="Manage your product listings"
                >
                    📦 Products
                </button>
                <button
                    className={activeTab === 'inventory' ? 'active' : ''}
                    onClick={() => handleTabChange('inventory')}
                    title="Monitor inventory levels and stock"
                >
                    📋 Inventory
                </button>
            </div>

            <div className="dashboard-content">
                {activeTab === 'overview' && renderOverview()}
                {activeTab === 'analytics' && renderAnalytics()}
                {activeTab === 'products' && renderProductManagement()}
                {activeTab === 'inventory' && renderInventory()}
            </div>

            {showProductForm && renderProductForm()}
        </div>
    );
};

export default SellerDashboard; 
