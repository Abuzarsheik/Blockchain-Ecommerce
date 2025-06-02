import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { 
  Upload, 
  Image as ImageIcon, 
  DollarSign, 
  Package, 
  Tag, 
  CheckCircle,
  AlertCircle,
  X
} from 'lucide-react';
import { getCategoryOptions } from '../utils/constants';
import '../styles/CreateProduct.css';

const CreateProduct = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useSelector(state => state.auth);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    category: '',
    condition: 'new',
    brand: '',
    images: [],
    tags: '',
    inventory: '1',
    shippingWeight: '',
    dimensions: {
      length: '',
      width: '',
      height: ''
    },
    status: 'active'
  });

  const [imageFiles, setImageFiles] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  const categories = getCategoryOptions();

  useEffect(() => {
    if (!isAuthenticated || (user?.userType !== 'seller' && user?.role !== 'admin')) {
      navigate('/login');
    }
  }, [isAuthenticated, user, navigate]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    if (name.includes('dimensions.')) {
      const dimension = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        dimensions: {
          ...prev.dimensions,
          [dimension]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    
    if (files.length + imageFiles.length > 5) {
      setErrors(prev => ({
        ...prev,
        images: 'Maximum 5 images allowed'
      }));
      return;
    }

    const validFiles = files.filter(file => {
      const isValidType = file.type.startsWith('image/');
      const isValidSize = file.size <= 5 * 1024 * 1024; // 5MB limit
      
      if (!isValidType) {
        setErrors(prev => ({
          ...prev,
          images: 'Only image files are allowed'
        }));
        return false;
      }
      
      if (!isValidSize) {
        setErrors(prev => ({
          ...prev,
          images: 'Image size must be less than 5MB'
        }));
        return false;
      }
      
      return true;
    });

    setImageFiles(prev => [...prev, ...validFiles]);
    
    // Create previews
    validFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreviews(prev => [...prev, e.target.result]);
      };
      reader.readAsDataURL(file);
    });

    // Clear image errors
    setErrors(prev => ({
      ...prev,
      images: ''
    }));
  };

  const removeImage = (index) => {
    setImageFiles(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Product name is required';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Product description is required';
    }

    if (!formData.price || parseFloat(formData.price) <= 0) {
      newErrors.price = 'Valid price is required';
    }

    if (!formData.category) {
      newErrors.category = 'Category is required';
    }

    if (imageFiles.length === 0) {
      newErrors.images = 'At least one product image is required';
    }

    if (!formData.inventory || parseInt(formData.inventory) < 1) {
      newErrors.inventory = 'Inventory must be at least 1';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const productData = new FormData();
      
      // Debug logging to track what's being sent
      console.log('🔍 FRONTEND DEBUG - CreateProduct form submission:');
      console.log('- Category from formData:', `"${formData.category}"`);
      console.log('- Available categories:', categories);
      console.log('- Selected category details:', categories.find(c => c.value === formData.category));
      
      // Add product details
      productData.append('name', formData.name);
      productData.append('description', formData.description);
      productData.append('price', formData.price);
      productData.append('category', formData.category);
      productData.append('condition', formData.condition);
      productData.append('brand', formData.brand);
      productData.append('quantity', formData.inventory);
      productData.append('weight', formData.shippingWeight);
      productData.append('tags', formData.tags);
      productData.append('status', 'active');
      
      // Debug what's actually being sent in FormData
      console.log('🔍 FRONTEND DEBUG - FormData contents:');
      for (let [key, value] of productData.entries()) {
        console.log(`- ${key}:`, `"${value}"`);
      }
      
      // Add dimensions
      productData.append('dimensions', JSON.stringify(formData.dimensions));
      
      // Add images
      imageFiles.forEach((file, index) => {
        productData.append('images', file);
      });

      const token = localStorage.getItem('token') || localStorage.getItem('authToken');
      const response = await fetch('http://localhost:5000/api/products', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: productData
      });

      if (response.ok) {
        const result = await response.json();
        
        // Show success message with marketplace confirmation
        setErrors({ 
          success: 'Product created successfully and is now live in the marketplace! Buyers can now discover and purchase your product.' 
        });
        
        // Reset form
        setFormData({
          name: '',
          description: '',
          price: '',
          category: '',
          condition: 'new',
          brand: '',
          images: [],
          tags: '',
          inventory: '1',
          shippingWeight: '',
          dimensions: {
            length: '',
            width: '',
            height: ''
          },
          status: 'active'
        });
        setImageFiles([]);
        setImagePreviews([]);
        
        // Redirect after a short delay to let user see success message
        setTimeout(() => {
          navigate('/seller-dashboard?tab=products');
        }, 2000);
        
      } else {
        const error = await response.json();
        setErrors({ submit: error.message || 'Failed to create product' });
      }
    } catch (error) {
      console.error('Error creating product:', error);
      setErrors({ submit: 'Network error. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="create-product-page">
      <div className="create-product-container">
        <div className="create-product-header">
          <h1>List New Product</h1>
          <p>Add your product to the Blocmerce marketplace</p>
        </div>

        <form onSubmit={handleSubmit} className="create-product-form">
          {/* Product Images */}
          <div className="form-section">
            <h2>
              <ImageIcon size={20} />
              Product Images
            </h2>
            
            <div className="image-upload-section">
              <div className="image-upload-area">
                <input
                  type="file"
                  id="images"
                  multiple
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="image-input"
                />
                <label htmlFor="images" className="image-upload-label">
                  <Upload size={32} />
                  <span>Upload Images</span>
                  <small>PNG, JPG up to 5MB (Max 5 images)</small>
                </label>
              </div>

              {imagePreviews.length > 0 && (
                <div className="image-previews">
                  {imagePreviews.map((preview, index) => (
                    <div key={index} className="image-preview">
                      <img src={preview} alt={`Preview ${index + 1}`} />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="remove-image-btn"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {errors.images && (
                <div className="error-message">
                  <AlertCircle size={16} />
                  {errors.images}
                </div>
              )}
            </div>
          </div>

          {/* Basic Information */}
          <div className="form-section">
            <h2>
              <Package size={20} />
              Basic Information
            </h2>

            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="name">Product Name *</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Enter product name"
                  className={errors.name ? 'error' : ''}
                />
                {errors.name && <span className="error-text">{errors.name}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="brand">Brand</label>
                <input
                  type="text"
                  id="brand"
                  name="brand"
                  value={formData.brand}
                  onChange={handleInputChange}
                  placeholder="Product brand"
                />
              </div>

              <div className="form-group">
                <label htmlFor="category">Category *</label>
                <select
                  id="category"
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  className={errors.category ? 'error' : ''}
                >
                  <option value="">Select category</option>
                  {categories.map(category => (
                    <option key={category.value} value={category.value}>
                      {category.label}
                    </option>
                  ))}
                </select>
                {errors.category && <span className="error-text">{errors.category}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="condition">Condition</label>
                <select
                  id="condition"
                  name="condition"
                  value={formData.condition}
                  onChange={handleInputChange}
                >
                  <option value="new">New</option>
                  <option value="like-new">Like New</option>
                  <option value="good">Good</option>
                  <option value="fair">Fair</option>
                </select>
              </div>
            </div>

            <div className="form-group full-width">
              <label htmlFor="description">Description *</label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Describe your product in detail..."
                rows="5"
                className={errors.description ? 'error' : ''}
              />
              {errors.description && <span className="error-text">{errors.description}</span>}
            </div>
          </div>

          {/* Pricing & Inventory */}
          <div className="form-section">
            <h2>
              <DollarSign size={20} />
              Pricing & Inventory
            </h2>

            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="price">Price (USD) *</label>
                <input
                  type="number"
                  id="price"
                  name="price"
                  value={formData.price}
                  onChange={handleInputChange}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  className={errors.price ? 'error' : ''}
                />
                {errors.price && <span className="error-text">{errors.price}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="inventory">Inventory Quantity *</label>
                <input
                  type="number"
                  id="inventory"
                  name="inventory"
                  value={formData.inventory}
                  onChange={handleInputChange}
                  placeholder="1"
                  min="1"
                  className={errors.inventory ? 'error' : ''}
                />
                {errors.inventory && <span className="error-text">{errors.inventory}</span>}
              </div>
            </div>
          </div>

          {/* Shipping Information */}
          <div className="form-section">
            <h2>
              <Package size={20} />
              Shipping Information
            </h2>

            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="shippingWeight">Weight (lbs)</label>
                <input
                  type="number"
                  id="shippingWeight"
                  name="shippingWeight"
                  value={formData.shippingWeight}
                  onChange={handleInputChange}
                  placeholder="0.0"
                  step="0.1"
                  min="0"
                />
              </div>

              <div className="form-group">
                <label htmlFor="dimensions.length">Length (inches)</label>
                <input
                  type="number"
                  id="dimensions.length"
                  name="dimensions.length"
                  value={formData.dimensions.length}
                  onChange={handleInputChange}
                  placeholder="0"
                  step="0.1"
                  min="0"
                />
              </div>

              <div className="form-group">
                <label htmlFor="dimensions.width">Width (inches)</label>
                <input
                  type="number"
                  id="dimensions.width"
                  name="dimensions.width"
                  value={formData.dimensions.width}
                  onChange={handleInputChange}
                  placeholder="0"
                  step="0.1"
                  min="0"
                />
              </div>

              <div className="form-group">
                <label htmlFor="dimensions.height">Height (inches)</label>
                <input
                  type="number"
                  id="dimensions.height"
                  name="dimensions.height"
                  value={formData.dimensions.height}
                  onChange={handleInputChange}
                  placeholder="0"
                  step="0.1"
                  min="0"
                />
              </div>
            </div>
          </div>

          {/* Additional Details */}
          <div className="form-section">
            <h2>
              <Tag size={20} />
              Additional Details
            </h2>

            <div className="form-group">
              <label htmlFor="tags">Tags (comma-separated)</label>
              <input
                type="text"
                id="tags"
                name="tags"
                value={formData.tags}
                onChange={handleInputChange}
                placeholder="smartphone, electronics, apple, mobile"
              />
              <small>Help customers find your product with relevant tags</small>
            </div>
          </div>

          {/* Submit Errors */}
          {errors.submit && (
            <div className="error-message submit-error">
              <AlertCircle size={16} />
              {errors.submit}
            </div>
          )}

          {/* Success Messages */}
          {errors.success && (
            <div className="success-message submit-success">
              <CheckCircle size={16} />
              {errors.success}
            </div>
          )}

          {/* Submit Button */}
          <div className="form-actions">
            <button
              type="button"
              onClick={() => navigate('/seller-dashboard')}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary"
            >
              {isSubmitting ? (
                <>
                  <div className="spinner" />
                  Listing Product...
                </>
              ) : (
                <>
                  <CheckCircle size={16} />
                  List Product
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateProduct; 