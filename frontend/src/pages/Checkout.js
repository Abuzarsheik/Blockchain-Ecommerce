import '../styles/Checkout.css';
import { getApiUrl } from '../config/api';
import { logDebug } from '../utils/logger.production';
import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  CreditCard, Shield, CheckCircle, ArrowLeft
} from 'lucide-react';
import { clearCart } from '../store/slices/cartSlice';
import { getImageUrl, handleImageError, generatePlaceholder } from '../utils/imageUtils';
import { toast } from 'react-toastify';
import { logger } from '../utils/logger';
import { walletService } from '../services/walletService';
import { blockchainService } from '../services/blockchain';
import { ethers } from 'ethers';

const Checkout = () => {
  // TESTING MODE: Set to false for production
  const TESTING_MODE = true;
  
  const [step, setStep] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [isConnectingWallet, setIsConnectingWallet] = useState(false);
  const [walletInfo, setWalletInfo] = useState(null);
  const [walletBalance, setWalletBalance] = useState(null);
  const [contractDetails, setContractDetails] = useState(null);
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

  useEffect(() => {
    const info = walletService.getWalletInfo();
    setWalletInfo(info);
    
    // Fetch wallet balance if connected
    if (info?.connected && window.ethereum) {
      fetchWalletBalance();
    }
  }, []);

  useEffect(() => {
    // Update balance when wallet connection changes
    if (walletInfo?.connected && window.ethereum) {
      fetchWalletBalance();
    } else {
      setWalletBalance(null);
    }
  }, [walletInfo?.connected]);

  const fetchWalletBalance = async () => {
    try {
      if (!window.ethereum) return;
      
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const balance = await provider.getBalance(signer.address);
      const balanceInETH = ethers.formatEther(balance);
      setWalletBalance(balanceInETH);
    } catch (error) {
      logger.error('Failed to fetch wallet balance:', error);
      setWalletBalance('Error');
    }
  };

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
    }
    // For crypto/escrow payments, validation is handled by wallet connection check in nextStep
    
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
    console.log('NextStep called - Current step:', step, 'Payment method:', paymentMethod);
    
    if (step === 1 && validateStep1()) {
      console.log('Moving from step 1 to step 2');
      setStep(2);
    } else if (step === 2 && validateStep2()) {
      console.log('Step 2 validation passed');
      
      // Additional validation for crypto/escrow payments ONLY
      if (paymentMethod === 'crypto' || paymentMethod === 'escrow') {
        const currentWalletInfo = walletService.getWalletInfo();
        console.log('Checking wallet connection for crypto/escrow:', currentWalletInfo);
        
        if (!currentWalletInfo?.connected) {
          console.log('Wallet not connected, showing error');
          toast.error('Please connect your wallet to proceed with crypto payment');
          return;
        }
      }
      
      // Proceed to review step
      console.log('Moving from step 2 to step 3');
      setStep(3);
    } else {
      console.log('Validation failed for step:', step);
      if (step === 1) {
        console.log('Step 1 validation failed');
      } else if (step === 2) {
        console.log('Step 2 validation failed');
      }
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
      // Validate cart items structure
      if (!cart.items || cart.items.length === 0) {
        throw new Error('No items in cart');
      }

      // Ensure all cart items have required fields
      const validatedItems = cart.items.map(item => {
        // Handle both productId and product_id fields
        const productId = item.productId || item.product_id || item.id;
        
        if (!productId) {
          logger.warn('Item missing product ID:', item);
          throw new Error(`Item "${item.name || 'Unknown'}" is missing product ID`);
        }

        if (!item.quantity || item.quantity <= 0) {
          throw new Error(`Invalid quantity for item "${item.name}"`);
        }

        if (!item.price || item.price <= 0) {
          throw new Error(`Invalid price for item "${item.name}"`);
        }

        return {
          product_id: productId,
          quantity: item.quantity,
          price: item.price
        };
      });

      // Create order object
      const orderData = {
        items: validatedItems,
        total: cart.total,
        subtotal: cart.subtotal,
        tax: cart.tax,
        shipping_cost: cart.shipping,
        discount: cart.discount,
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
        shippingAddress: {
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phone: formData.phone,
          street: formData.address,
          city: formData.city,
          state: formData.state,
          postalCode: formData.zipCode,
          country: formData.country
        }
      };

      logDebug('Processing order with data:', orderData);

      // Add debug logging to check structure before sending
      console.log('Order data being sent:', JSON.stringify(orderData, null, 2));
      console.log('Shipping address structure:', orderData.shippingAddress);

      let blockchainTx = null;
      let escrowId = null;

      // Handle crypto/escrow payments with smart contract
      if (paymentMethod === 'crypto' || paymentMethod === 'escrow') {
        try {
          // Check wallet connection
          const currentWalletInfo = walletService.getWalletInfo();
          if (!currentWalletInfo?.connected) {
            throw new Error('Please connect your wallet to complete crypto payment');
          }

          toast.info('🔍 Checking wallet balance...');

          // Check wallet balance before proceeding
          const provider = new ethers.BrowserProvider(window.ethereum);
          const signer = await provider.getSigner();
          const balance = await provider.getBalance(signer.address);
          
          // Calculate required amount (purchase + factory fee + gas estimate)
          const purchaseAmount = ethers.parseEther(orderData.total.toString());
          const factoryFee = ethers.parseEther('0.001'); // 0.001 ETH factory fee
          const estimatedGas = ethers.parseEther('0.01'); // Rough gas estimate
          const totalRequired = purchaseAmount + factoryFee + estimatedGas;
          
          logger.info('Balance check:', {
            balance: ethers.formatEther(balance),
            required: ethers.formatEther(totalRequired),
            purchase: ethers.formatEther(purchaseAmount),
            factoryFee: ethers.formatEther(factoryFee),
            estimatedGas: ethers.formatEther(estimatedGas)
          });

          // TESTING MODE: Bypass balance check for demonstration
          if (!TESTING_MODE && balance < totalRequired) {
            const shortfall = totalRequired - balance;
            throw new Error(
              `Insufficient ETH balance. You need ${ethers.formatEther(totalRequired)} ETH total ` +
              `(${ethers.formatEther(purchaseAmount)} for purchase + ${ethers.formatEther(factoryFee)} factory fee + ` +
              `≈${ethers.formatEther(estimatedGas)} gas). You have ${ethers.formatEther(balance)} ETH. ` +
              `Please add ${ethers.formatEther(shortfall)} ETH to your wallet.`
            );
          }

          if (TESTING_MODE && balance < totalRequired) {
            const shortfall = totalRequired - balance;
            toast.warning(`⚠️ TESTING MODE: Bypassing balance check. Need ${ethers.formatEther(shortfall)} more ETH in production.`);
            logger.warn('Testing mode: Proceeding with insufficient balance for demonstration purposes');
          }

          toast.info('🔐 Initiating smart contract escrow...');
          
          // Create escrow smart contract
          const escrowContract = await blockchainService.createEscrowContract({
            buyerAddress: currentWalletInfo.wallet?.address || currentWalletInfo.wallet?.account,
            sellerAddress: validatedItems[0].sellerAddress || '0x0000000000000000000000000000000000000000', // Get from product
            amount: orderData.total.toString(),
            productHash: generateProductHash(orderData),
            escrowDuration: 7 * 24 * 60 * 60, // 7 days in seconds
            testingMode: TESTING_MODE // Pass testing mode to blockchain service
          });

          escrowId = escrowContract.contractAddress;
          blockchainTx = escrowContract.transactionHash;

          // Store contract details for display
          setContractDetails({
            contractAddress: escrowContract.contractAddress,
            transactionHash: escrowContract.transactionHash,
            blockNumber: escrowContract.blockNumber,
            gasUsed: escrowContract.gasUsed,
            buyerAddress: currentWalletInfo.wallet?.address || currentWalletInfo.wallet?.account,
            sellerAddress: validatedItems[0].sellerAddress || '0x0000000000000000000000000000000000000000',
            amount: orderData.total.toString(),
            productHash: generateProductHash(orderData),
            escrowDuration: 7 * 24 * 60 * 60,
            createdAt: new Date().toISOString()
          });

          toast.success('🎉 Smart contract escrow created successfully!');
          logger.info('Contract created:', {
            address: escrowContract.contractAddress,
            txHash: escrowContract.transactionHash,
            blockNumber: escrowContract.blockNumber
          });
          
          // Add blockchain data to order
          orderData.blockchainTx = blockchainTx;
          orderData.escrowId = escrowId;
          orderData.payment_status = 'escrowed';

        } catch (blockchainError) {
          logger.error('Blockchain transaction failed:', blockchainError);
          
          // Provide specific error messages for different blockchain errors
          let errorMessage = 'Blockchain transaction failed. Please try again.';
          
          if (blockchainError.message.includes('Insufficient ETH balance')) {
            errorMessage = blockchainError.message;
          } else if (blockchainError.code === 'ACTION_REJECTED' || blockchainError.message.includes('rejected')) {
            errorMessage = 'Transaction was cancelled by user.';
          } else if (blockchainError.message.includes('insufficient funds')) {
            errorMessage = 'Insufficient funds for transaction. Please check your ETH balance and try again.';
          } else if (blockchainError.code === 'NETWORK_ERROR') {
            errorMessage = 'Network error. Please check your internet connection and try again.';
          } else if (blockchainError.message.includes('gas')) {
            errorMessage = 'Transaction failed due to gas issues. Please try again with a higher gas limit.';
          } else if (blockchainError.message) {
            errorMessage = `Smart contract error: ${blockchainError.message}`;
          }
          
          toast.error(errorMessage);
          throw blockchainError;
        }
      } else {
        // Simulate traditional payment processing
        toast.info('💳 Processing payment...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      // Submit order to backend
      const response = await fetch(getApiUrl('/orders'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(orderData)
      });

      const responseData = await response.json();

      if (!response.ok) {
        logger.error('Order creation failed:', responseData);
        throw new Error(responseData.error || responseData.message || 'Failed to create order');
      }

      const order = responseData.order || responseData.data;

      // Clear cart and show success
      dispatch(clearCart());
      setOrderComplete(true);
      
      if (paymentMethod === 'crypto' || paymentMethod === 'escrow') {
        toast.success('🎉 Order placed with smart contract escrow! Funds are secured until delivery.');
      } else {
        toast.success('🎉 Order placed successfully!');
      }
      
      // Log successful order creation
      logger.info('Order created successfully:', {
        orderId: order._id || order.id,
        total: orderData.total,
        paymentMethod: paymentMethod,
        blockchainTx,
        escrowId
      });
      
      // Redirect to order confirmation after a delay
      setTimeout(() => {
        navigate('/orders', { state: { newOrder: order } });
      }, 3000);
      
    } catch (error) {
      logger.error('Order creation failed:', error);
      
      // Provide specific error messages
      let errorMessage = 'Order processing failed. Please try again.';
      
      if (error.message.includes('product_id')) {
        errorMessage = 'Invalid product information. Please refresh your cart.';
      } else if (error.message.includes('wallet')) {
        errorMessage = 'Wallet connection issue. Please reconnect your wallet.';
      } else if (error.message.includes('smart contract')) {
        errorMessage = 'Blockchain transaction failed. Please try again.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  // Generate product hash for smart contract verification
  const generateProductHash = (orderData) => {
    const productData = {
      items: orderData.items.map(item => ({
        id: item.product_id,
        name: item.name,
        quantity: item.quantity,
        price: item.price
      })),
      total: orderData.total,
      timestamp: Math.floor(Date.now() / 1000)
    };
    
    // Create a simple hash (in production, use proper cryptographic hashing)
    return ethers.keccak256(ethers.toUtf8Bytes(JSON.stringify(productData)));
  };

  // Add wallet connection handler
  const handleConnectWallet = async () => {
    setIsConnectingWallet(true);
    try {
      const connectedWallet = await walletService.connectWallet('metamask');
      const info = walletService.getWalletInfo();
      setWalletInfo(info);
      
      // Fetch balance after successful connection
      if (info?.connected) {
        await fetchWalletBalance();
      }
      
      toast.success('Wallet connected successfully!');
    } catch (error) {
      logger.error('Failed to connect wallet:', error);
      toast.error(`Failed to connect wallet: ${error.message}`);
    } finally {
      setIsConnectingWallet(false);
    }
  };

  if (orderComplete) {
    return (
      <div className="checkout-container">
        <div className="order-success">
          <div className="success-icon">
            <CheckCircle size={64} />
          </div>
          <h1>Order Confirmed!</h1>
          <p>Thank you for your purchase. You will receive a confirmation email shortly.</p>
          
          {contractDetails && (
            <div className="contract-details">
              <h3>🔐 Smart Contract Details</h3>
              <div className="contract-info">
                <div className="detail-row">
                  <span>Contract Address:</span>
                  <code>{contractDetails.contractAddress}</code>
                </div>
                <div className="detail-row">
                  <span>Transaction Hash:</span>
                  <code>{contractDetails.transactionHash}</code>
                </div>
                <div className="detail-row">
                  <span>Block Number:</span>
                  <span>{contractDetails.blockNumber}</span>
                </div>
                <div className="detail-row">
                  <span>Buyer Address:</span>
                  <code>{contractDetails.buyerAddress}</code>
                </div>
                <div className="detail-row">
                  <span>Amount (ETH):</span>
                  <span>{contractDetails.amount} ETH</span>
                </div>
                <div className="detail-row">
                  <span>Escrow Duration:</span>
                  <span>{Math.floor(contractDetails.escrowDuration / (24 * 60 * 60))} days</span>
                </div>
                <div className="detail-row">
                  <span>Product Hash:</span>
                  <code>{contractDetails.productHash.slice(0, 20)}...</code>
                </div>
                <div className="detail-row">
                  <span>Created At:</span>
                  <span>{new Date(contractDetails.createdAt).toLocaleString()}</span>
                </div>
              </div>
              <div className="contract-actions">
                <a 
                  href={`https://etherscan.io/tx/${contractDetails.transactionHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="etherscan-link"
                >
                  View on Etherscan ↗
                </a>
                <button 
                  onClick={() => navigate(`/verify/${contractDetails.transactionHash}`)}
                  className="verify-blockchain-btn"
                >
                  🔍 Verify on Blocmerce
                </button>
              </div>
            </div>
          )}
          
          <div className="success-actions">
            <button 
              className="success-button primary"
              onClick={() => navigate('/orders')}
            >
              View Order Details
            </button>
            {contractDetails && (
              <button 
                className="success-button secondary"
                onClick={() => navigate(`/verify/${contractDetails.contractAddress}`)}
              >
                🔗 Verify Smart Contract
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="checkout-container">
      {/* Testing Mode Banner */}
      {(() => {
        return TESTING_MODE && (
          <div className="testing-mode-banner-main">
            <div className="testing-alert-main">
              🧪 <strong>TESTING MODE ACTIVE:</strong> Balance checks bypassed - Smart contracts will be mocked for demonstration purposes
            </div>
          </div>
        );
      })()}
      
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
                
                {/* Testing Mode Indicator */}
                {(() => {
                  return TESTING_MODE && (
                    <div className="testing-mode-banner">
                      <div className="testing-alert">
                        🧪 <strong>TESTING MODE:</strong> Balance checks are bypassed for demonstration. 
                        Smart contracts will be mocked regardless of wallet balance.
                      </div>
                    </div>
                  );
                })()}

                <div className="payment-methods">
                  <div 
                    className={`payment-option ${paymentMethod === 'card' ? 'selected' : ''}`}
                    onClick={() => setPaymentMethod('card')}
                  >
                    <CreditCard size={24} />
                    <div className="payment-details">
                      <span>Credit/Debit Card</span>
                      <small>Traditional payment with instant processing</small>
                    </div>
                  </div>
                  
                  <div 
                    className={`payment-option ${paymentMethod === 'crypto' ? 'selected' : ''}`}
                    onClick={() => setPaymentMethod('crypto')}
                  >
                    <CreditCard size={24} />
                    <div className="payment-details">
                      <span>Cryptocurrency</span>
                      <small>Pay with ETH directly from your wallet</small>
                    </div>
                  </div>

                  <div 
                    className={`payment-option ${paymentMethod === 'escrow' ? 'selected' : ''}`}
                    onClick={() => setPaymentMethod('escrow')}
                  >
                    <Shield size={24} />
                    <div className="payment-details">
                      <span>Smart Contract Escrow</span>
                      <small>Secure payment held until delivery confirmed</small>
                    </div>
                    <div className="payment-badge">
                      <span>🔒 Most Secure</span>
                    </div>
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

                {(paymentMethod === 'crypto' || paymentMethod === 'escrow') && (
                  <div className="crypto-form">
                    <div className="crypto-info">
                      <div className="info-box">
                        <Shield size={20} />
                        <div>
                          <h4>
                            {paymentMethod === 'escrow' ? 'Smart Contract Escrow Payment' : 'Cryptocurrency Payment'}
                          </h4>
                          <p>
                            {paymentMethod === 'escrow' 
                              ? 'Your payment will be held securely in a smart contract until you confirm delivery. Maximum protection for buyers.'
                              : 'Pay directly with Ethereum (ETH). Make sure you have enough ETH in your wallet plus gas fees.'
                            }
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Wallet Connection Status */}
                    <div className="wallet-status">
                      {walletInfo?.connected ? (
                        <div className="wallet-connected">
                          <CheckCircle size={20} className="text-green-500" />
                          <div>
                            <span>Wallet Connected</span>
                            <small>{walletService.formatAddress(walletInfo?.wallet?.address || walletInfo?.wallet?.account)}</small>
                          </div>
                        </div>
                      ) : (
                        <div className="wallet-disconnected">
                          <Shield size={20} className="text-orange-500" />
                          <div>
                            <span>Wallet Not Connected</span>
                            <button 
                              className="connect-wallet-btn"
                              onClick={handleConnectWallet}
                              disabled={isConnectingWallet}
                            >
                              {isConnectingWallet ? (
                                <>
                                  <div className="loading-spinner"></div>
                                  Connecting...
                                </>
                              ) : (
                                'Connect Wallet'
                              )}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {paymentMethod === 'escrow' && (
                      <div className="escrow-features">
                        <h4>🔐 Escrow Protection Features:</h4>
                        <ul>
                          <li>✅ Funds held securely in smart contract</li>
                          <li>✅ Payment released only after delivery confirmation</li>
                          <li>✅ Dispute resolution system available</li>
                          <li>✅ Automatic refund if seller doesn't deliver</li>
                          <li>✅ No third-party can access your funds</li>
                        </ul>
                      </div>
                    )}

                    <div className="payment-summary">
                      <div className="summary-row">
                        <span>Subtotal:</span>
                        <span>${cart.subtotal?.toFixed(2) || '0.00'}</span>
                      </div>
                      <div className="summary-row">
                        <span>Purchase Amount (ETH):</span>
                        <span>{(cart.total / 2000).toFixed(4)} ETH</span>
                      </div>
                      {paymentMethod === 'escrow' && (
                        <>
                          <div className="summary-row">
                            <span>Smart Contract Fee:</span>
                            <span>0.001 ETH</span>
                          </div>
                          <div className="summary-row">
                            <span>Estimated Gas:</span>
                            <span>≈ 0.01 ETH</span>
                          </div>
                          <div className="summary-row total-required">
                            <span>Total ETH Required:</span>
                            <span>{((cart.total / 2000) + 0.001 + 0.01).toFixed(4)} ETH</span>
                          </div>
                        </>
                      )}
                      {paymentMethod === 'crypto' && (
                        <>
                          <div className="summary-row">
                            <span>Estimated Gas:</span>
                            <span>≈ 0.005 ETH</span>
                          </div>
                          <div className="summary-row total-required">
                            <span>Total ETH Required:</span>
                            <span>{((cart.total / 2000) + 0.005).toFixed(4)} ETH</span>
                          </div>
                        </>
                      )}
                      
                      {walletInfo?.connected && (
                        <div className="wallet-balance">
                          <div className="balance-info">
                            <span>Your Wallet Balance:</span>
                            <span className={`balance-amount ${walletBalance === 'Error' ? 'error' : ''}`}>
                              {walletBalance === null ? 'Loading...' : 
                               walletBalance === 'Error' ? 'Error loading balance' :
                               `${parseFloat(walletBalance).toFixed(4)} ETH`}
                            </span>
                          </div>
                          <small>Make sure you have enough ETH for the transaction plus gas fees</small>
                          {walletBalance && walletBalance !== 'Error' && (
                            <div className="balance-warning">
                              {((cart.total / 2000) + (paymentMethod === 'escrow' ? 0.011 : 0.005)) > parseFloat(walletBalance) && (
                                <span className="insufficient-funds">
                                  ⚠️ Insufficient funds. You need more ETH for this transaction.
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      )}
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
                    src={getImageUrl(item.image || item.imageUrl) || generatePlaceholder(80, 80, 'No Image')}
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