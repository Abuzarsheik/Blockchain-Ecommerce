import '../styles/ShoppingCart.css';
import React, { useState, useEffect } from 'react';
import { 
  Trash2, 
  Plus, 
  Minus, 
  ShoppingBag, 
  ArrowRight, 
  Verified, 
  Heart,
  Gift,
  Shield,
  CreditCard,
  Truck,
  RotateCcw
} from 'lucide-react';
import { 
  removeFromCart, 
  updateQuantity, 
  clearCart,
  applyCoupon,
  removeCoupon
} from '../store/slices/cartSlice';
import { getNFTImageUrl, handleImageError } from '../utils/imageUtils';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';

const ShoppingCart = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { items, total, subtotal, tax, shipping, discount, coupon } = useSelector(state => state.cart);
  const { user } = useSelector(state => state.auth);
  
  const [couponCode, setCouponCode] = useState('');
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);

  // Check if user is a seller (sellers shouldn't access cart)
  const isSeller = user?.userType === 'seller' && user?.role !== 'admin';

  // Redirect sellers away from cart
  useEffect(() => {
    if (isSeller) {
      toast.info('Cart is not available for sellers. Redirecting to marketplace...');
      navigate('/catalog');
    }
  }, [isSeller, navigate]);

  // If seller, show nothing while redirecting
  if (isSeller) {
    return null;
  }

  const handleQuantityChange = (productId, newQuantity) => {
    if (newQuantity < 1) {
      handleRemoveItem(productId);
      return;
    }
    dispatch(updateQuantity({ productId, quantity: newQuantity }));
  };

  const handleRemoveItem = (productId) => {
    dispatch(removeFromCart(productId));
    toast.success('Item removed from cart');
  };

  const handleClearCart = () => {
    if (window.confirm('Are you sure you want to clear your cart?')) {
      dispatch(clearCart());
      toast.success('Cart cleared');
    }
  };

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) {
      toast.error('Please enter a coupon code');
      return;
    }
    
    setIsApplyingCoupon(true);
    try {
      await dispatch(applyCoupon(couponCode)).unwrap();
      toast.success('Coupon applied successfully!');
      setCouponCode('');
    } catch (error) {
      toast.error(error.message || 'Invalid coupon code');
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    dispatch(removeCoupon());
    toast.success('Coupon removed');
  };

  const handleCheckout = () => {
    if (!user) {
      toast.error('Please login to proceed to checkout');
      navigate('/login');
      return;
    }
    
    if (items.length === 0) {
      toast.error('Your cart is empty');
      return;
    }
    
    navigate('/checkout');
  };

  const handleContinueShopping = () => {
    navigate('/catalog');
  };

  if (items.length === 0) {
    return (
      <div className="shopping-cart">
        <div className="empty-cart">
          <div className="empty-cart-icon">
            <ShoppingBag size={64} />
          </div>
          <h2>Your cart is empty</h2>
          <p>Looks like you haven't added any items to your cart yet.</p>
          <button 
            className="btn-primary continue-shopping"
            onClick={handleContinueShopping}
          >
            <ShoppingBag size={16} />
            Continue Shopping
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="shopping-cart">
      <div className="cart-header">
        <h1>Shopping Cart</h1>
        <div className="cart-actions">
          <button 
            className="btn-secondary"
            onClick={handleContinueShopping}
          >
            Continue Shopping
          </button>
          <button 
            className="btn-danger clear-cart"
            onClick={handleClearCart}
          >
            <Trash2 size={16} />
            Clear Cart
          </button>
        </div>
      </div>

      <div className="cart-content">
        {/* Cart Items */}
        <div className="cart-items">
          <div className="cart-items-header">
            <h3>Items ({items.length})</h3>
          </div>
          
          <div className="cart-items-list">
            {items.map((item) => (
              <div key={item.productId} className="cart-item">
                <div className="item-image">
                  <img 
                    src={getNFTImageUrl(item.image) || '/api/placeholder/120/120'}
                    alt={item.name}
                    onError={handleImageError}
                  />
                  {item.isVerified && (
                    <div className="verification-badge">
                      <Verified size={16} />
                    </div>
                  )}
                </div>
                
                <div className="item-details">
                  <div className="item-info">
                    <h4 className="item-name">{item.name}</h4>
                    <p className="item-category">{item.category}</p>
                    <div className="item-features">
                      {item.isVerified && (
                        <span className="feature-badge verified">
                          <Shield size={12} />
                          Blockchain Verified
                        </span>
                      )}
                      {item.isDigital && (
                        <span className="feature-badge digital">
                          Digital Asset
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="item-actions">
                    <button 
                      className="action-btn"
                      onClick={() => navigate(`/product/${item.productId}`)}
                      title="View Product"
                    >
                      <Heart size={16} />
                    </button>
                    <button 
                      className="action-btn remove"
                      onClick={() => handleRemoveItem(item.productId)}
                      title="Remove Item"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                
                <div className="item-quantity">
                  <label>Quantity</label>
                  <div className="quantity-controls">
                    <button 
                      onClick={() => handleQuantityChange(item.productId, item.quantity - 1)}
                      disabled={item.quantity <= 1}
                    >
                      <Minus size={16} />
                    </button>
                    <input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => handleQuantityChange(item.productId, parseInt(e.target.value) || 1)}
                      min="1"
                      max={item.stock || 999}
                    />
                    <button 
                      onClick={() => handleQuantityChange(item.productId, item.quantity + 1)}
                      disabled={item.quantity >= (item.stock || 999)}
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                  {item.stock && item.stock <= 5 && (
                    <span className="stock-warning">
                      Only {item.stock} left in stock
                    </span>
                  )}
                </div>
                
                <div className="item-price">
                  <div className="price-per-item">
                    ${item.price.toFixed(2)} each
                  </div>
                  <div className="total-price">
                    ${(item.price * item.quantity).toFixed(2)}
                  </div>
                  {item.originalPrice && item.originalPrice > item.price && (
                    <div className="original-price">
                      ${item.originalPrice.toFixed(2)}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Cart Summary */}
        <div className="cart-summary">
          <div className="summary-card">
            <h3>Order Summary</h3>
            
            {/* Coupon Section */}
            <div className="coupon-section">
              <h4>Promo Code</h4>
              {coupon ? (
                <div className="applied-coupon">
                  <div className="coupon-info">
                    <Gift size={16} />
                    <span>{coupon.code}</span>
                    <span className="coupon-discount">-{coupon.discount}%</span>
                  </div>
                  <button 
                    className="remove-coupon"
                    onClick={handleRemoveCoupon}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ) : (
                <div className="coupon-input">
                  <input
                    type="text"
                    placeholder="Enter coupon code"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleApplyCoupon()}
                  />
                  <button 
                    onClick={handleApplyCoupon}
                    disabled={isApplyingCoupon || !couponCode.trim()}
                    className="apply-coupon"
                  >
                    {isApplyingCoupon ? 'Applying...' : 'Apply'}
                  </button>
                </div>
              )}
            </div>

            {/* Price Breakdown */}
            <div className="price-breakdown">
              <div className="price-row">
                <span>Subtotal ({items.length} items)</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              
              {discount > 0 && (
                <div className="price-row discount">
                  <span>Discount</span>
                  <span>-${discount.toFixed(2)}</span>
                </div>
              )}
              
              <div className="price-row">
                <span>Shipping</span>
                <span>{shipping === 0 ? 'Free' : `$${shipping.toFixed(2)}`}</span>
              </div>
              
              <div className="price-row">
                <span>Tax</span>
                <span>${tax.toFixed(2)}</span>
              </div>
              
              <div className="price-row total">
                <span>Total</span>
                <span>${total.toFixed(2)}</span>
              </div>
            </div>

            {/* Shipping Info */}
            <div className="shipping-info">
              <div className="shipping-option">
                <Truck size={16} />
                <div>
                  <span className="shipping-type">Standard Shipping</span>
                  <span className="shipping-time">5-7 business days</span>
                </div>
              </div>
            </div>

            {/* Security Features */}
            <div className="security-features">
              <div className="security-item">
                <Shield size={16} />
                <span>Secure Checkout</span>
              </div>
              <div className="security-item">
                <RotateCcw size={16} />
                <span>30-day Returns</span>
              </div>
              <div className="security-item">
                <CreditCard size={16} />
                <span>Multiple Payment Options</span>
              </div>
            </div>

            {/* Checkout Button */}
            <button 
              className="btn-primary checkout-btn"
              onClick={handleCheckout}
            >
              <span>Proceed to Checkout</span>
              <ArrowRight size={16} />
            </button>

            {/* Payment Methods */}
            <div className="payment-methods">
              <span>We accept:</span>
              <div className="payment-icons">
                <div className="payment-icon">💳</div>
                <div className="payment-icon">🏦</div>
                <div className="payment-icon">₿</div>
                <div className="payment-icon">Ξ</div>
              </div>
            </div>
          </div>

          {/* Recommended Items */}
          <div className="recommended-section">
            <h4>You might also like</h4>
            <div className="recommended-items">
              <div className="recommended-item">
                <img src="/api/placeholder/80/80" alt="Recommended" />
                <div className="recommended-info">
                  <span className="recommended-name">Digital Art Collection</span>
                  <span className="recommended-price">$29.99</span>
                </div>
              </div>
              <div className="recommended-item">
                <img src="/api/placeholder/80/80" alt="Recommended" />
                <div className="recommended-info">
                  <span className="recommended-name">Gaming Asset Pack</span>
                  <span className="recommended-price">$49.99</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShoppingCart; 