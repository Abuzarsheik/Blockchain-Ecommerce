import '../styles/ProductDetail.css';
import BlockchainVerification from '../components/BlockchainVerification';
import LoadingSpinner from '../components/LoadingSpinner';
import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Heart, 
  Share2, 
  Shield, 
  Verified, 
  Star, 
  ShoppingCart, 
  Eye,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Zap,
  Award,
  TrendingUp,
  Package,
  Truck
} from 'lucide-react';
import { addToCart } from '../store/slices/cartSlice';
import { toast } from 'react-toastify';
import { useDispatch, useSelector } from 'react-redux';
import { useParams, useNavigate } from 'react-router-dom';

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  
  // Local state for product data instead of Redux
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const { user } = useSelector(state => state.auth);
  
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [showVerification, setShowVerification] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [activeTab, setActiveTab] = useState('description');

  // Check if user is a seller (sellers shouldn't see purchase options)
  const isSeller = user?.userType === 'seller' && user?.role !== 'admin';

  useEffect(() => {
    fetchProduct();
  }, [id]);

  const fetchProduct = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔍 ProductDetail - Fetching product');
      console.log('- Product ID from useParams:', id);
      console.log('- ID type:', typeof id);
      console.log('- Current URL:', window.location.href);
      
      const apiUrl = `http://localhost:5000/api/products/${id}`;
      console.log('- API URL:', apiUrl);
      
      const response = await fetch(apiUrl);
      
      console.log('- Response status:', response.status);
      console.log('- Response ok:', response.ok);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.log('- Error response:', errorData);
        throw new Error('Product not found');
      }
      
      const data = await response.json();
      console.log('- Response data:', data);
      setProduct(data.product);
    } catch (err) {
      console.error('Error fetching product:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = () => {
    if (!user) {
      toast.error('Please login to add items to cart');
      navigate('/login');
      return;
    }

    if (isSeller) {
      toast.info('Sellers cannot purchase items. You can view and manage your own products instead.');
      return;
    }
    
    dispatch(addToCart({
      productId: product._id,
      name: product.name,
      price: product.price,
      image: product.images?.[0]?.url ? `http://localhost:5000${product.images[0].url}` : null,
      category: product.category,
      quantity: quantity,
      stock: product.inventory?.quantity || 0,
      originalPrice: product.originalPrice
    }));
    
    toast.success(`${product.name} added to cart!`);
  };

  const handleBuyNow = () => {
    if (!user) {
      toast.error('Please login to purchase');
      navigate('/login');
      return;
    }

    if (isSeller) {
      toast.info('Sellers cannot purchase items. You can view and manage your own products instead.');
      return;
    }
    
    dispatch(addToCart({
      productId: product._id,
      name: product.name,
      price: product.price,
      image: product.images?.[0]?.url ? `http://localhost:5000${product.images[0].url}` : null,
      category: product.category,
      quantity: quantity,
      stock: product.inventory?.quantity || 0,
      originalPrice: product.originalPrice
    }));
    
    navigate('/checkout');
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: product.name,
          text: product.description,
          url: window.location.href,
        });
      } catch (err) {
        console.log('Error sharing:', err);
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied to clipboard!');
    }
  };

  const nextImage = () => {
    setSelectedImageIndex((prev) => 
      prev === product.images.length - 1 ? 0 : prev + 1
    );
  };

  const prevImage = () => {
    setSelectedImageIndex((prev) => 
      prev === 0 ? product.images.length - 1 : prev - 1
    );
  };

  const getImageUrl = (imageObj) => {
    if (imageObj && imageObj.url) {
      return `http://localhost:5000${imageObj.url}`;
    }
    return '/api/placeholder/400/400';
  };

  const getMainImageUrl = () => {
    if (product?.images && product.images.length > 0) {
      return getImageUrl(product.images[selectedImageIndex]);
    }
    return '/api/placeholder/400/400';
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price);
  };

  const calculateDiscount = () => {
    if (product?.originalPrice && product.originalPrice > product.price) {
      return Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100);
    }
    return 0;
  };

  const isOutOfStock = () => {
    return !product?.inventory?.quantity || product.inventory.quantity <= 0;
  };

  const isLowStock = () => {
    return product?.inventory?.quantity <= (product?.inventory?.lowStockThreshold || 5);
  };

  if (loading) {
    return (
      <div className="product-detail-loading">
        <LoadingSpinner size="large" />
        <p>Loading product details...</p>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="product-detail-error">
        <h2>Product Not Found</h2>
        <p>{error || 'The product you are looking for does not exist.'}</p>
        <button onClick={() => navigate('/catalog')} className="back-button">
          <ArrowLeft size={16} />
          Back to Catalog
        </button>
      </div>
    );
  }

  const tabs = [
    { id: 'description', label: 'Description' },
    { id: 'specifications', label: 'Specifications' },
    { id: 'shipping', label: 'Shipping & Returns' },
    { id: 'seller', label: 'Seller Information' }
  ];

  return (
    <div className="product-detail">
      {/* Breadcrumb */}
      <div className="breadcrumb">
        <button onClick={() => navigate('/catalog')} className="breadcrumb-link">
          <ArrowLeft size={16} />
          Back to Catalog
        </button>
        <span className="breadcrumb-separator">/</span>
        <span className="breadcrumb-current">{product.name}</span>
      </div>

      <div className="product-detail-content">
        {/* Image Gallery */}
        <div className="product-gallery">
          <div className="main-image-container">
            <img 
              src={getMainImageUrl()} 
              alt={product.name}
              className="main-image"
            />
            
            {product.images && product.images.length > 1 && (
              <>
                <button className="image-nav prev" onClick={prevImage}>
                  <ChevronLeft size={24} />
                </button>
                <button className="image-nav next" onClick={nextImage}>
                  <ChevronRight size={24} />
                </button>
              </>
            )}
            
            {product.status === 'verified' && (
              <div className="verification-badge">
                <Verified size={20} />
                <span>Verified</span>
              </div>
            )}

            {/* Stock status badge */}
            {isOutOfStock() && (
              <div className="stock-badge out-of-stock">
                Out of Stock
              </div>
            )}
            {isLowStock() && !isOutOfStock() && (
              <div className="stock-badge low-stock">
                Low Stock
              </div>
            )}
          </div>
          
          {product.images && product.images.length > 1 && (
            <div className="thumbnail-gallery">
              {product.images.map((image, index) => (
                <img
                  key={index}
                  src={getImageUrl(image)}
                  alt={`${product.name} ${index + 1}`}
                  className={`thumbnail ${index === selectedImageIndex ? 'active' : ''}`}
                  onClick={() => setSelectedImageIndex(index)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="product-info">
          <div className="product-header">
            <div className="product-title-section">
              <h1 className="product-title">{product.name}</h1>
              <div className="product-meta">
                <span className="product-category">{product.category}</span>
                {product.status === 'verified' && (
                  <button 
                    className="verification-link"
                    onClick={() => setShowVerification(true)}
                  >
                    <Shield size={16} />
                    Verified Product
                  </button>
                )}
              </div>
            </div>
            
            <div className="product-actions">
              <button 
                className={`action-button ${isLiked ? 'liked' : ''}`}
                onClick={() => setIsLiked(!isLiked)}
              >
                <Heart size={20} fill={isLiked ? 'currentColor' : 'none'} />
              </button>
              <button className="action-button" onClick={handleShare}>
                <Share2 size={20} />
              </button>
            </div>
          </div>

          {/* Seller Info */}
          <div className="creator-info">
            <img 
              src={product.seller?.avatar || '/api/placeholder/40/40'} 
              alt={product.seller?.firstName || 'Seller'}
              className="creator-avatar"
            />
            <div className="creator-details">
              <span className="creator-label">Sold by</span>
              <span className="creator-name">
                {product.seller?.sellerProfile?.storeName || 
                 `${product.seller?.firstName || ''} ${product.seller?.lastName || ''}`.trim() ||
                 product.seller?.username || 'Unknown Seller'}
              </span>
            </div>
            {product.seller?.isVerified && (
              <Verified className="creator-verified" size={16} />
            )}
          </div>

          {/* Product Stats */}
          <div className="product-stats">
            <div className="stat-item">
              <Eye size={16} />
              <span>{product.sales?.views || 0} views</span>
            </div>
            <div className="stat-item">
              <Package size={16} />
              <span>{product.inventory?.quantity || 0} in stock</span>
            </div>
            <div className="stat-item">
              <Star size={16} />
              <span>{product.rating || 0} ({product.reviews?.length || 0} reviews)</span>
            </div>
          </div>

          {/* Price and Purchase */}
          <div className="purchase-section">
            <div className="price-section">
              <div className="current-price">
                <span className="price-label">Price</span>
                <div className="price-value">
                  <span className="price-amount">{formatPrice(product.price)}</span>
                  {product.originalPrice && product.originalPrice > product.price && (
                    <>
                      <span className="original-price">{formatPrice(product.originalPrice)}</span>
                      <span className="discount-badge">-{calculateDiscount()}%</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {!isSeller && (
              <div className="quantity-section">
                <label htmlFor="quantity">Quantity</label>
                <div className="quantity-controls">
                  <button 
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    disabled={quantity <= 1}
                  >
                    -
                  </button>
                  <input
                    id="quantity"
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    min="1"
                    max={product.inventory?.quantity || 999}
                  />
                  <button 
                    onClick={() => setQuantity(quantity + 1)}
                    disabled={quantity >= (product.inventory?.quantity || 999)}
                  >
                    +
                  </button>
                </div>
                <span className="stock-info">
                  {product.inventory?.quantity || 0} available
                  {isLowStock() && !isOutOfStock() && ' • Low stock!'}
                </span>
              </div>
            )}

            {!isSeller && (
              <div className="purchase-buttons">
                <button 
                  className="btn-primary btn-buy-now"
                  onClick={handleBuyNow}
                  disabled={isOutOfStock()}
                >
                  <Zap size={16} />
                  Buy Now
                </button>
                <button 
                  className="btn-secondary btn-add-cart"
                  onClick={handleAddToCart}
                  disabled={isOutOfStock()}
                >
                  <ShoppingCart size={16} />
                  Add to Cart
                </button>
              </div>
            )}

            {isOutOfStock() && (
              <div className="out-of-stock">
                <span>Out of Stock</span>
              </div>
            )}

            {isSeller && (
              <div className="seller-notice">
                <p>This is a product listing view. Sellers cannot purchase items.</p>
              </div>
            )}
          </div>

          {/* Shipping Information */}
          <div className="shipping-info">
            <div className="shipping-item">
              <Truck size={16} />
              <span>
                {product.shipping?.freeShipping 
                  ? 'Free Shipping' 
                  : `Shipping: ${formatPrice(product.shipping?.shippingCost || 0)}`
                }
              </span>
            </div>
            {product.shipping?.weight && (
              <div className="shipping-item">
                <Package size={16} />
                <span>Weight: {product.shipping.weight.value} {product.shipping.weight.unit}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs Section */}
      <div className="product-tabs">
        <div className="tab-headers">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`tab-header ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="tab-content">
          {activeTab === 'description' && (
            <div className="tab-pane">
              <h3>Product Description</h3>
              <div className="description-content">
                <p>{product.description}</p>
                {product.shortDescription && (
                  <div className="short-description">
                    <h4>Quick Overview</h4>
                    <p>{product.shortDescription}</p>
                  </div>
                )}
                {product.tags && product.tags.length > 0 && (
                  <div className="product-tags">
                    <h4>Tags</h4>
                    <div className="tags-list">
                      {product.tags.map((tag, index) => (
                        <span key={index} className="tag">{tag}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'specifications' && (
            <div className="tab-pane">
              <h3>Product Specifications</h3>
              <div className="specifications">
                {product.specifications && product.specifications.length > 0 ? (
                  <dl>
                    {product.specifications.map((spec, index) => (
                      <div key={index} className="spec-item">
                        <dt>{spec.name}</dt>
                        <dd>{spec.value}</dd>
                      </div>
                    ))}
                  </dl>
                ) : (
                  <p>No detailed specifications available.</p>
                )}
                <div className="basic-specs">
                  <h4>Basic Information</h4>
                  <dl>
                    <div className="spec-item">
                      <dt>Category</dt>
                      <dd>{product.category}</dd>
                    </div>
                    {product.subcategory && (
                      <div className="spec-item">
                        <dt>Subcategory</dt>
                        <dd>{product.subcategory}</dd>
                      </div>
                    )}
                    <div className="spec-item">
                      <dt>SKU</dt>
                      <dd>{product.inventory?.sku || 'N/A'}</dd>
                    </div>
                    <div className="spec-item">
                      <dt>Status</dt>
                      <dd>{product.status}</dd>
                    </div>
                  </dl>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'shipping' && (
            <div className="tab-pane">
              <h3>Shipping & Returns</h3>
              <div className="shipping-details">
                <div className="shipping-section">
                  <h4>Shipping Information</h4>
                  <p>
                    {product.shipping?.freeShipping 
                      ? 'This item ships for free!'
                      : `Shipping cost: ${formatPrice(product.shipping?.shippingCost || 0)}`
                    }
                  </p>
                  {product.shipping?.weight && (
                    <p>Package weight: {product.shipping.weight.value} {product.shipping.weight.unit}</p>
                  )}
                  {product.shipping?.dimensions && (
                    <p>
                      Dimensions: {product.shipping.dimensions.length}" × {product.shipping.dimensions.width}" × {product.shipping.dimensions.height}"
                    </p>
                  )}
                </div>
                <div className="return-policy">
                  <h4>Return Policy</h4>
                  <p>Returns accepted within 30 days of purchase. Item must be in original condition.</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'seller' && (
            <div className="tab-pane">
              <h3>Seller Information</h3>
              <div className="seller-details">
                <div className="seller-profile">
                  <img 
                    src={product.seller?.avatar || '/api/placeholder/80/80'} 
                    alt="Seller avatar"
                    className="seller-avatar-large"
                  />
                  <div className="seller-info">
                    <h4>
                      {product.seller?.sellerProfile?.storeName || 
                       `${product.seller?.firstName || ''} ${product.seller?.lastName || ''}`.trim() ||
                       product.seller?.username || 'Unknown Seller'}
                    </h4>
                    {product.seller?.sellerProfile?.storeDescription && (
                      <p>{product.seller.sellerProfile.storeDescription}</p>
                    )}
                    <div className="seller-stats">
                      <span>Member since: {new Date(product.seller?.createdAt || Date.now()).getFullYear()}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Blockchain Verification Modal */}
      {showVerification && (
        <BlockchainVerification 
          product={product}
          onClose={() => setShowVerification(false)}
        />
      )}
    </div>
  );
};

export default ProductDetail; 