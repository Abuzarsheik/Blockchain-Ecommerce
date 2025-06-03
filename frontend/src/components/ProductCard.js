import '../styles/ProductCard.css';
import BlockchainVerification from './BlockchainVerification';
import React, { useState, useCallback, memo } from 'react';
import { Heart, ShoppingCart, Verified, Star, Eye } from 'lucide-react';
import { Link } from 'react-router-dom';
import { addToCart } from '../store/slices/cartSlice';
import { formatPrice, formatAddress } from '../utils/performance';
import { toast } from 'react-toastify';
import { useDispatch, useSelector } from 'react-redux';

const PLACEHOLDER_IMAGE = "data:image/svg+xml,%3Csvg width='400' height='400' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='400' height='400' fill='%23f0f0f0'/%3E%3Ctext x='200' y='200' text-anchor='middle' font-family='Arial, sans-serif' font-size='16' fill='%23999'%3EProduct Image%3C/text%3E%3C/svg%3E";

const ProductCard = memo(({ product, viewMode = 'grid' }) => {
  const dispatch = useDispatch();
  const { user } = useSelector(state => state.auth);
  const [isLiked, setIsLiked] = useState(false);
  const [showVerification, setShowVerification] = useState(false);

  // Check if user is a seller (sellers shouldn't see cart functionality)
  const isSeller = user?.userType === 'seller' && user?.role !== 'admin';

  const handleAddToCart = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!user) {
      toast.error('Please login to add items to cart');
      return;
    }

    if (isSeller) {
      toast.info('Sellers cannot purchase items. You can view and create NFTs instead.');
      return;
    }

    // Get product ID from available fields
    const productId = product._id || product.id;
    
    if (!productId) {
      console.error('Product missing ID fields:', product);
      toast.error('Unable to add product to cart - missing product ID');
      return;
    }
    
    console.log('ProductCard - Adding to cart - Product ID:', productId, 'Product:', product);
    
    dispatch(addToCart({
      productId: productId,
      name: product.name,
      price: product.price,
      image: product.image_url,
      category: product.category,
      isVerified: product.isVerified || false,
      isDigital: true,
      stock: product.stock || 999
    }));
    
    toast.success(`${product.name} added to cart!`);
  }, [dispatch, product, user, isSeller]);

  const handleLike = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsLiked(!isLiked);
    toast.info(isLiked ? 'Removed from favorites' : 'Added to favorites');
  }, [isLiked]);

  const handleVerificationClick = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setShowVerification(true);
  }, []);

  const handleQuickView = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    // Quick view functionality
  }, []);

  if (viewMode === 'list') {
    return (
      <div className="product-card list-view">
        <Link to={`/product/${product.id}`} className="product-link">
          <div className="product-image-container">
            <img 
              src={product.image || PLACEHOLDER_IMAGE} 
              alt={product.name}
              className="product-image"
              loading="lazy"
              onError={(e) => {
                e.target.src = PLACEHOLDER_IMAGE;
              }}
            />
            {product.isVerified && (
              <div className="verification-badge">
                <Verified size={16} />
              </div>
            )}
          </div>

          <div className="product-info">
            <div className="product-header">
              <h3 className="product-title">{product.name}</h3>
              <div className="product-meta">
                <span className="product-category">{product.category}</span>
                {product.creator && (
                  <span className="product-creator">by {formatAddress(product.creator)}</span>
                )}
              </div>
            </div>

            <p className="product-description">{product.description}</p>

            <div className="product-stats">
              <div className="stat-item">
                <Eye size={14} />
                <span>{product.views || 0} views</span>
              </div>
              <div className="stat-item">
                <Star size={14} />
                <span>{product.rating || 0} ({product.reviews_count || 0})</span>
              </div>
            </div>
          </div>

          <div className="product-actions">
            <div className="product-price">
              <span className="price-label">Price</span>
              <span className="price-value">{formatPrice(product.price)}</span>
            </div>

            <div className="action-buttons">
              <button 
                className={`like-button ${isLiked ? 'liked' : ''}`}
                onClick={handleLike}
                title="Add to favorites"
                aria-label="Add to favorites"
              >
                <Heart size={16} fill={isLiked ? 'currentColor' : 'none'} />
              </button>

              {/* Only show Add to Cart for buyers and admins, not for pure sellers */}
              {!isSeller && (
                <button 
                  className="cart-button"
                  onClick={handleAddToCart}
                  title="Add to cart"
                  aria-label="Add to cart"
                >
                  <ShoppingCart size={16} />
                  Add to Cart
                </button>
              )}

              {product.isVerified && (
                <button 
                  className="verify-button"
                  onClick={handleVerificationClick}
                  title="View blockchain verification"
                  aria-label="View blockchain verification"
                >
                  <Verified size={16} />
                </button>
              )}
            </div>
          </div>
        </Link>

        {showVerification && (
          <BlockchainVerification 
            productId={product.id}
            onClose={() => setShowVerification(false)}
          />
        )}
      </div>
    );
  }

  // Grid view (default)
  return (
    <div className="product-card grid-view">
      <Link to={`/product/${product.id}`} className="product-link">
        <div className="product-image-container">
          <img 
            src={product.image || PLACEHOLDER_IMAGE} 
            alt={product.name}
            className="product-image"
            loading="lazy"
            onError={(e) => {
              e.target.src = PLACEHOLDER_IMAGE;
            }}
          />
          
          {/* Overlay on hover */}
          <div className="product-overlay">
            <button 
              className="quick-view-button"
              onClick={handleQuickView}
              aria-label="Quick view"
            >
              <Eye size={16} />
              Quick View
            </button>
          </div>

          {/* Badges */}
          <div className="product-badges">
            {product.isVerified && (
              <div 
                className="verification-badge"
                onClick={handleVerificationClick}
                title="Blockchain Verified"
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && handleVerificationClick(e)}
              >
                <Verified size={16} />
              </div>
            )}
            {product.featured && (
              <div className="featured-badge">
                Featured
              </div>
            )}
          </div>

          {/* Like button */}
          <button 
            className={`like-button-overlay ${isLiked ? 'liked' : ''}`}
            onClick={handleLike}
            aria-label="Add to favorites"
          >
            <Heart size={16} fill={isLiked ? 'currentColor' : 'none'} />
          </button>
        </div>

        <div className="product-info">
          <div className="product-header">
            <h3 className="product-title">{product.name}</h3>
            <div className="product-meta">
              <span className="product-category">{product.category}</span>
              {product.creator && (
                <span className="product-creator">
                  by {formatAddress(product.creator)}
                </span>
              )}
            </div>
          </div>

          <p className="product-description">{product.description}</p>

          <div className="product-stats">
            <div className="stat-item">
              <Eye size={14} />
              <span>{product.views || 0}</span>
            </div>
            <div className="stat-item">
              <Star size={14} />
              <span>{product.rating || 0}</span>
            </div>
          </div>

          <div className="product-price">
            <span className="price-value">{formatPrice(product.price)}</span>
          </div>

          <div className="product-actions">
            <button 
              className={`like-button ${isLiked ? 'liked' : ''}`}
              onClick={handleLike}
              title="Add to favorites"
              aria-label="Add to favorites"
            >
              <Heart size={16} fill={isLiked ? 'currentColor' : 'none'} />
            </button>

            {/* Only show Add to Cart for buyers and admins, not for pure sellers */}
            {!isSeller && (
              <button 
                className="cart-button"
                onClick={handleAddToCart}
                title="Add to cart"
                aria-label="Add to cart"
              >
                <ShoppingCart size={16} />
              </button>
            )}

            {product.isVerified && (
              <button 
                className="verify-button"
                onClick={handleVerificationClick}
                title="View blockchain verification"
                aria-label="View blockchain verification"
              >
                <Verified size={16} />
              </button>
            )}
          </div>
        </div>
      </Link>

      {showVerification && (
        <BlockchainVerification 
          productId={product.id}
          onClose={() => setShowVerification(false)}
        />
      )}
    </div>
  );
});

ProductCard.displayName = 'ProductCard';

export default ProductCard; 