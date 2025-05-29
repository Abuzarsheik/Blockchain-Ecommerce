import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
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
  TrendingUp
} from 'lucide-react';
import { fetchProductById } from '../store/slices/productsSlice';
import { addToCart } from '../store/slices/cartSlice';
import { toast } from 'react-toastify';
import LoadingSpinner from '../components/LoadingSpinner';
import BlockchainVerification from '../components/BlockchainVerification';
import '../styles/ProductDetail.css';

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  
  const { currentProduct: product, loading, error } = useSelector(state => state.products);
  const { user } = useSelector(state => state.auth);
  
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [showVerification, setShowVerification] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [activeTab, setActiveTab] = useState('description');

  useEffect(() => {
    if (id) {
      dispatch(fetchProductById(id));
    }
  }, [dispatch, id]);

  const handleAddToCart = () => {
    if (!user) {
      toast.error('Please login to add items to cart');
      navigate('/login');
      return;
    }
    
    dispatch(addToCart({
      productId: product.id,
      quantity: quantity,
      price: product.price
    }));
    
    toast.success(`${product.name} added to cart!`);
  };

  const handleBuyNow = () => {
    if (!user) {
      toast.error('Please login to purchase');
      navigate('/login');
      return;
    }
    
    dispatch(addToCart({
      productId: product.id,
      quantity: quantity,
      price: product.price
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
    { id: 'blockchain', label: 'Blockchain Info' },
    { id: 'reviews', label: `Reviews (${product.reviews?.length || 0})` },
    { id: 'history', label: 'Transaction History' }
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
              src={product.images?.[selectedImageIndex] || product.image} 
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
            
            {product.isVerified && (
              <div className="verification-badge">
                <Verified size={20} />
                <span>Verified</span>
              </div>
            )}
          </div>
          
          {product.images && product.images.length > 1 && (
            <div className="thumbnail-gallery">
              {product.images.map((image, index) => (
                <img
                  key={index}
                  src={image}
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
                {product.isVerified && (
                  <button 
                    className="verification-link"
                    onClick={() => setShowVerification(true)}
                  >
                    <Shield size={16} />
                    Blockchain Verified
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

          {/* Creator Info */}
          <div className="creator-info">
            <img 
              src={product.creator?.avatar || '/api/placeholder/40/40'} 
              alt={product.creator?.name}
              className="creator-avatar"
            />
            <div className="creator-details">
              <span className="creator-label">Created by</span>
              <span className="creator-name">{product.creator?.name}</span>
            </div>
            {product.creator?.isVerified && (
              <Verified className="creator-verified" size={16} />
            )}
          </div>

          {/* Stats */}
          <div className="product-stats">
            <div className="stat-item">
              <Eye size={16} />
              <span>{product.views || 0} views</span>
            </div>
            <div className="stat-item">
              <Heart size={16} />
              <span>{product.likes || 0} likes</span>
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
                <span className="price-label">Current Price</span>
                <div className="price-value">
                  <span className="price-amount">${product.price}</span>
                  <span className="price-currency">USD</span>
                </div>
                {product.originalPrice && product.originalPrice > product.price && (
                  <span className="original-price">${product.originalPrice}</span>
                )}
              </div>
              
              {product.cryptoPrice && (
                <div className="crypto-price">
                  <Zap size={16} />
                  <span>{product.cryptoPrice} ETH</span>
                </div>
              )}
            </div>

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
                  max={product.stock || 999}
                />
                <button 
                  onClick={() => setQuantity(quantity + 1)}
                  disabled={quantity >= (product.stock || 999)}
                >
                  +
                </button>
              </div>
              {product.stock && (
                <span className="stock-info">{product.stock} available</span>
              )}
            </div>

            <div className="purchase-buttons">
              <button 
                className="btn-primary btn-buy-now"
                onClick={handleBuyNow}
                disabled={!product.stock || product.stock === 0}
              >
                <Zap size={16} />
                Buy Now
              </button>
              <button 
                className="btn-secondary btn-add-cart"
                onClick={handleAddToCart}
                disabled={!product.stock || product.stock === 0}
              >
                <ShoppingCart size={16} />
                Add to Cart
              </button>
            </div>

            {(!product.stock || product.stock === 0) && (
              <div className="out-of-stock">
                <span>Out of Stock</span>
              </div>
            )}
          </div>

          {/* Key Features */}
          {product.features && (
            <div className="product-features">
              <h3>Key Features</h3>
              <ul>
                {product.features.map((feature, index) => (
                  <li key={index}>
                    <Award size={16} />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          )}
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
                
                {product.specifications && (
                  <div className="specifications">
                    <h4>Specifications</h4>
                    <dl>
                      {Object.entries(product.specifications).map(([key, value]) => (
                        <div key={key} className="spec-item">
                          <dt>{key}</dt>
                          <dd>{value}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'blockchain' && (
            <div className="tab-pane">
              <h3>Blockchain Information</h3>
              <div className="blockchain-info">
                {product.isVerified ? (
                  <div className="verified-info">
                    <div className="verification-status">
                      <Verified size={24} />
                      <div>
                        <h4>Blockchain Verified</h4>
                        <p>This product has been verified on the blockchain</p>
                      </div>
                    </div>
                    
                    <div className="blockchain-details">
                      <div className="detail-item">
                        <span className="label">Contract Address:</span>
                        <span className="value">{product.contractAddress || '0x1234...5678'}</span>
                      </div>
                      <div className="detail-item">
                        <span className="label">Token ID:</span>
                        <span className="value">{product.tokenId || '#1234'}</span>
                      </div>
                      <div className="detail-item">
                        <span className="label">Blockchain:</span>
                        <span className="value">{product.blockchain || 'Ethereum'}</span>
                      </div>
                      <div className="detail-item">
                        <span className="label">Created:</span>
                        <span className="value">{new Date(product.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    
                    <button 
                      className="view-blockchain-btn"
                      onClick={() => setShowVerification(true)}
                    >
                      <ExternalLink size={16} />
                      View on Blockchain Explorer
                    </button>
                  </div>
                ) : (
                  <div className="not-verified">
                    <p>This product is not yet verified on the blockchain.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'reviews' && (
            <div className="tab-pane">
              <h3>Customer Reviews</h3>
              <div className="reviews-section">
                {product.reviews && product.reviews.length > 0 ? (
                  <div className="reviews-list">
                    {product.reviews.map((review, index) => (
                      <div key={index} className="review-item">
                        <div className="review-header">
                          <div className="reviewer-info">
                            <img 
                              src={review.user?.avatar || '/api/placeholder/32/32'} 
                              alt={review.user?.name}
                              className="reviewer-avatar"
                            />
                            <span className="reviewer-name">{review.user?.name}</span>
                          </div>
                          <div className="review-rating">
                            {[...Array(5)].map((_, i) => (
                              <Star 
                                key={i} 
                                size={16} 
                                fill={i < review.rating ? 'currentColor' : 'none'}
                              />
                            ))}
                          </div>
                        </div>
                        <p className="review-text">{review.comment}</p>
                        <span className="review-date">
                          {new Date(review.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="no-reviews">
                    <p>No reviews yet. Be the first to review this product!</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="tab-pane">
              <h3>Transaction History</h3>
              <div className="transaction-history">
                {product.transactions && product.transactions.length > 0 ? (
                  <div className="transactions-list">
                    {product.transactions.map((tx, index) => (
                      <div key={index} className="transaction-item">
                        <div className="transaction-icon">
                          <TrendingUp size={16} />
                        </div>
                        <div className="transaction-details">
                          <span className="transaction-type">{tx.type}</span>
                          <span className="transaction-amount">${tx.amount}</span>
                          <span className="transaction-date">
                            {new Date(tx.date).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="no-transactions">
                    <p>No transaction history available.</p>
                  </div>
                )}
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