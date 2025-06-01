import '../styles/Checkout.css';
import React, { useState, useEffect } from 'react';
import { 
  CreditCard, 
  Wallet, 
  Check, 
  ArrowLeft, 
  Shield,
  Info
} from 'lucide-react';
import { clearCart } from '../store/slices/cartSlice';
import { getNFTImageUrl, handleImageError } from '../utils/imageUtils';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { logger } from '../utils/logger';

const Checkout = () => {
  const [step, setStep] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [formData, setFormData] = useState({
    // Billing Information
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    
    // Billing Address
    address: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'United States',
    
    // Payment Information
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    cardName: '',
    
    // Crypto Wallet
    walletAddress: '',
    
    // Options
    saveInfo: false,
    sameAsShipping: true,
    
    // Shipping Address (if different)
    shippingAddress: '',
    shippingCity: '',
    shippingState: '',
    shippingZipCode: '',
    shippingCountry: 'United States'
  });

  const [errors, setErrors] = useState({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [orderComplete, setOrderComplete] = useState(false);

  const cart = useSelector(state => state.cart);
  const user = useSelector(state => state.auth.user);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  useEffect(() => {
    if (cart.items.length === 0 && !orderComplete) {
      navigate('/catalog');
      toast.info('Your cart is empty. Add some items to checkout.');
    }
  }, [cart.items.length, navigate, orderComplete]);

  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || ''
      }));
    }
  }, [user]);

  const validateStep1 = () => {
    const newErrors = {};
    
    if (!formData.firstName.trim()) newErrors.firstName = 'First name is required';
    if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    if (!formData.phone.trim()) newErrors.phone = 'Phone number is required';
    if (!formData.address.trim()) newErrors.address = 'Address is required';
    if (!formData.city.trim()) newErrors.city = 'City is required';
    if (!formData.state.trim()) newErrors.state = 'State is required';
    if (!formData.zipCode.trim()) newErrors.zipCode = 'ZIP code is required';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = () => {
    const newErrors = {};
    
    if (paymentMethod === 'card') {
      if (!formData.cardNumber.trim()) newErrors.cardNumber = 'Card number is required';
      if (!formData.expiryDate.trim()) newErrors.expiryDate = 'Expiry date is required';
      if (!formData.cvv.trim()) newErrors.cvv = 'CVV is required';
      if (!formData.cardName.trim()) newErrors.cardName = 'Cardholder name is required';
    } else if (paymentMethod === 'crypto') {
      if (!formData.walletAddress.trim()) newErrors.walletAddress = 'Wallet address is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));

    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleCardNumberChange = (e) => {
    let value = e.target.value.replace(/\s/g, '');
    value = value.replace(/(.{4})/g, '$1 ').trim();
    if (value.length <= 19) {
      setFormData(prev => ({
        ...prev,
        cardNumber: value
      }));
    }
  };

  const handleExpiryChange = (e) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length >= 2) {
      value = value.substring(0, 2) + '/' + value.substring(2, 4);
    }
    setFormData(prev => ({
      ...prev,
      expiryDate: value
    }));
  };

  const nextStep = () => {
    if (step === 1 && validateStep1()) {
      setStep(2);
    } else if (step === 2 && validateStep2()) {
      setStep(3);
    }
  };

  const prevStep = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const processOrder = async () => {
    setIsProcessing(true);
    
    try {
      // Prepare order data
      const orderData = {
        items: cart.items.map(item => ({
          product_id: item.productId,
          name: item.name,
          image: item.image,
          category: item.category,
          quantity: item.quantity,
          price: item.price
        })),
        subtotal: cart.subtotal,
        tax: cart.tax,
        shipping: cart.shipping,
        discount: cart.discount,
        total: cart.total,
        payment_method: paymentMethod,
        billing_info: {
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phone: formData.phone,
          address: formData.address,
          city: formData.city,
          state: formData.state,
          zipCode: formData.zipCode,
          country: formData.country
        },
        shipping_address: {
          street: formData.address,
          city: formData.city,
          state: formData.state,
          zipCode: formData.zipCode,
          country: formData.country
        }
      };

      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Create order via API
      const response = await fetch('http://localhost:5000/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(orderData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create order');
      }

      const result = await response.json();
      const order = result.order;

      // Clear cart and show success
      dispatch(clearCart());
      setOrderComplete(true);
      toast.success('Order placed successfully!');
      
      // Redirect to order confirmation after a delay
      setTimeout(() => {
        navigate('/orders', { state: { newOrder: order } });
      }, 3000);
      
    } catch (error) {
      logger.error('Order creation failed:', error);
      toast.error(error.message || 'Payment failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (orderComplete) {
    return (
      <div className="checkout-container">
        <div className="order-success">
          <div className="success-icon">
            <Check size={64} />
          </div>
          <h1>Order Confirmed!</h1>
          <p>Thank you for your purchase. You will receive a confirmation email shortly.</p>
          <button 
            className="success-button"
            onClick={() => navigate('/dashboard')}
          >
            View Order Details
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="checkout-container">
      <div className="checkout-header">
        <button className="back-button" onClick={() => navigate('/cart')}>
          <ArrowLeft size={20} />
          Back to Cart
        </button>
        <h1>Checkout</h1>
      </div>

      <div className="checkout-content">
        {/* Progress Steps */}
        <div className="checkout-steps">
          <div className={`step ${step >= 1 ? 'active' : ''}`}>
            <div className="step-number">1</div>
            <span>Billing Info</span>
          </div>
          <div className={`step ${step >= 2 ? 'active' : ''}`}>
            <div className="step-number">2</div>
            <span>Payment</span>
          </div>
          <div className={`step ${step >= 3 ? 'active' : ''}`}>
            <div className="step-number">3</div>
            <span>Review</span>
          </div>
        </div>

        <div className="checkout-main">
          <div className="checkout-form">
            {/* Step 1: Billing Information */}
            {step === 1 && (
              <div className="step-content">
                <h2>Billing Information</h2>
                
                <div className="form-grid">
                  <div className="form-group">
                    <label>First Name</label>
                    <input
                      type="text"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleInputChange}
                      className={errors.firstName ? 'error' : ''}
                      placeholder="Enter first name"
                    />
                    {errors.firstName && <span className="error-message">{errors.firstName}</span>}
                  </div>

                  <div className="form-group">
                    <label>Last Name</label>
                    <input
                      type="text"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleInputChange}
                      className={errors.lastName ? 'error' : ''}
                      placeholder="Enter last name"
                    />
                    {errors.lastName && <span className="error-message">{errors.lastName}</span>}
                  </div>

                  <div className="form-group">
                    <label>Email Address</label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className={errors.email ? 'error' : ''}
                      placeholder="Enter email address"
                    />
                    {errors.email && <span className="error-message">{errors.email}</span>}
                  </div>

                  <div className="form-group">
                    <label>Phone Number</label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className={errors.phone ? 'error' : ''}
                      placeholder="Enter phone number"
                    />
                    {errors.phone && <span className="error-message">{errors.phone}</span>}
                  </div>
                </div>

                <div className="form-group full-width">
                  <label>Address</label>
                  <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    className={errors.address ? 'error' : ''}
                    placeholder="Enter street address"
                  />
                  {errors.address && <span className="error-message">{errors.address}</span>}
                </div>

                <div className="form-grid">
                  <div className="form-group">
                    <label>City</label>
                    <input
                      type="text"
                      name="city"
                      value={formData.city}
                      onChange={handleInputChange}
                      className={errors.city ? 'error' : ''}
                      placeholder="Enter city"
                    />
                    {errors.city && <span className="error-message">{errors.city}</span>}
                  </div>

                  <div className="form-group">
                    <label>State</label>
                    <input
                      type="text"
                      name="state"
                      value={formData.state}
                      onChange={handleInputChange}
                      className={errors.state ? 'error' : ''}
                      placeholder="Enter state"
                    />
                    {errors.state && <span className="error-message">{errors.state}</span>}
                  </div>

                  <div className="form-group">
                    <label>ZIP Code</label>
                    <input
                      type="text"
                      name="zipCode"
                      value={formData.zipCode}
                      onChange={handleInputChange}
                      className={errors.zipCode ? 'error' : ''}
                      placeholder="Enter ZIP code"
                    />
                    {errors.zipCode && <span className="error-message">{errors.zipCode}</span>}
                  </div>

                  <div className="form-group">
                    <label>Country</label>
                    <select
                      name="country"
                      value={formData.country}
                      onChange={handleInputChange}
                    >
                      <option value="United States">United States</option>
                      <option value="Canada">Canada</option>
                      <option value="United Kingdom">United Kingdom</option>
                      <option value="Australia">Australia</option>
                    </select>
                  </div>
                </div>

                <div className="form-actions">
                  <button className="next-button" onClick={nextStep}>
                    Continue to Payment
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Payment Method */}
            {step === 2 && (
              <div className="step-content">
                <h2>Payment Method</h2>

                <div className="payment-methods">
                  <div 
                    className={`payment-option ${paymentMethod === 'card' ? 'selected' : ''}`}
                    onClick={() => setPaymentMethod('card')}
                  >
                    <CreditCard size={24} />
                    <span>Credit/Debit Card</span>
                  </div>
                  <div 
                    className={`payment-option ${paymentMethod === 'crypto' ? 'selected' : ''}`}
                    onClick={() => setPaymentMethod('crypto')}
                  >
                    <Wallet size={24} />
                    <span>Cryptocurrency</span>
                  </div>
                </div>

                {paymentMethod === 'card' && (
                  <div className="card-form">
                    <div className="form-group">
                      <label>Card Number</label>
                      <input
                        type="text"
                        name="cardNumber"
                        value={formData.cardNumber}
                        onChange={handleCardNumberChange}
                        className={errors.cardNumber ? 'error' : ''}
                        placeholder="1234 5678 9012 3456"
                        maxLength="19"
                      />
                      {errors.cardNumber && <span className="error-message">{errors.cardNumber}</span>}
                    </div>

                    <div className="form-grid">
                      <div className="form-group">
                        <label>Expiry Date</label>
                        <input
                          type="text"
                          name="expiryDate"
                          value={formData.expiryDate}
                          onChange={handleExpiryChange}
                          className={errors.expiryDate ? 'error' : ''}
                          placeholder="MM/YY"
                          maxLength="5"
                        />
                        {errors.expiryDate && <span className="error-message">{errors.expiryDate}</span>}
                      </div>

                      <div className="form-group">
                        <label>CVV</label>
                        <input
                          type="text"
                          name="cvv"
                          value={formData.cvv}
                          onChange={handleInputChange}
                          className={errors.cvv ? 'error' : ''}
                          placeholder="123"
                          maxLength="4"
                        />
                        {errors.cvv && <span className="error-message">{errors.cvv}</span>}
                      </div>
                    </div>

                    <div className="form-group">
                      <label>Cardholder Name</label>
                      <input
                        type="text"
                        name="cardName"
                        value={formData.cardName}
                        onChange={handleInputChange}
                        className={errors.cardName ? 'error' : ''}
                        placeholder="Enter cardholder name"
                      />
                      {errors.cardName && <span className="error-message">{errors.cardName}</span>}
                    </div>
                  </div>
                )}

                {paymentMethod === 'crypto' && (
                  <div className="crypto-form">
                    <div className="crypto-info">
                      <Info size={20} />
                      <span>Pay with Ethereum (ETH). Make sure you have enough ETH in your wallet.</span>
                    </div>
                    
                    <div className="form-group">
                      <label>Wallet Address</label>
                      <input
                        type="text"
                        name="walletAddress"
                        value={formData.walletAddress}
                        onChange={handleInputChange}
                        className={errors.walletAddress ? 'error' : ''}
                        placeholder="0x..."
                      />
                      {errors.walletAddress && <span className="error-message">{errors.walletAddress}</span>}
                    </div>
                  </div>
                )}

                <div className="form-actions">
                  <button className="prev-button" onClick={prevStep}>
                    Back
                  </button>
                  <button className="next-button" onClick={nextStep}>
                    Review Order
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Order Review */}
            {step === 3 && (
              <div className="step-content">
                <h2>Review Your Order</h2>

                <div className="order-review">
                  <div className="review-section">
                    <h3>Billing Information</h3>
                    <div className="review-info">
                      <p>{formData.firstName} {formData.lastName}</p>
                      <p>{formData.email}</p>
                      <p>{formData.phone}</p>
                      <p>{formData.address}</p>
                      <p>{formData.city}, {formData.state} {formData.zipCode}</p>
                      <p>{formData.country}</p>
                    </div>
                  </div>

                  <div className="review-section">
                    <h3>Payment Method</h3>
                    <div className="review-info">
                      {paymentMethod === 'card' ? (
                        <p>Card ending in {formData.cardNumber.slice(-4)}</p>
                      ) : (
                        <p>Cryptocurrency (ETH)</p>
                      )}
                    </div>
                  </div>

                  <div className="security-notice">
                    <Shield size={20} />
                    <span>Your payment information is secure and encrypted.</span>
                  </div>
                </div>

                <div className="form-actions">
                  <button className="prev-button" onClick={prevStep}>
                    Back
                  </button>
                  <button 
                    className="place-order-button"
                    onClick={processOrder}
                    disabled={isProcessing}
                  >
                    {isProcessing ? (
                      <>
                        <div className="loading-spinner"></div>
                        Processing...
                      </>
                    ) : (
                      'Place Order'
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Order Summary Sidebar */}
          <div className="order-summary">
            <h3>Order Summary</h3>
            
            <div className="summary-items">
              {cart.items.map(item => (
                <div key={item.productId} className="summary-item">
                  <img 
                    src={getNFTImageUrl(item.image) || 'https://via.placeholder.com/80x80?text=No+Image'}
                    alt={item.name}
                    onError={handleImageError}
                  />
                  <div className="item-details">
                    <span className="item-name">{item.name}</span>
                    <span className="item-price">{item.price} ETH</span>
                  </div>
                  <span className="item-quantity">×{item.quantity}</span>
                </div>
              ))}
            </div>

            <div className="summary-totals">
              <div className="total-line">
                <span>Subtotal</span>
                <span>{cart.subtotal.toFixed(3)} ETH</span>
              </div>
              {cart.discount > 0 && (
                <div className="total-line discount">
                  <span>Discount</span>
                  <span>-{cart.discount.toFixed(3)} ETH</span>
                </div>
              )}
              <div className="total-line">
                <span>Tax</span>
                <span>{cart.tax.toFixed(3)} ETH</span>
              </div>
              <div className="total-line">
                <span>Shipping</span>
                <span>{cart.shipping.toFixed(3)} ETH</span>
              </div>
              <div className="total-line final">
                <span>Total</span>
                <span>{cart.total.toFixed(3)} ETH</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout; 