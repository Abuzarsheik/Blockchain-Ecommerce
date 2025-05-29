import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { Eye, EyeOff, Loader, ShoppingBag, Store } from 'lucide-react';
import { toast } from 'react-toastify';
import { registerUser } from '../store/slices/authSlice';
import '../styles/Register.css';

const Register = () => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    userType: 'buyer', // Default to buyer
    agreeToTerms: false,
    agreeToMarketing: false
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState({ score: 0, feedback: [] });

  const dispatch = useDispatch();
  const navigate = useNavigate();

  // Enhanced validation functions
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePassword = (password) => {
    // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
    return passwordRegex.test(password);
  };

  const validateUsername = (username) => {
    // 3-20 characters, alphanumeric and underscores only
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
    return usernameRegex.test(username);
  };

  const validateName = (name) => {
    // At least 2 characters, letters only
    const nameRegex = /^[a-zA-Z\s]{2,30}$/;
    return nameRegex.test(name);
  };

  // Calculate password strength
  const calculatePasswordStrength = (password) => {
    let score = 0;
    const feedback = [];

    if (password.length >= 8) {
      score += 1;
      feedback.push({ text: '8+ characters', met: true });
    } else {
      feedback.push({ text: '8+ characters', met: false });
    }

    if (/[A-Z]/.test(password)) {
      score += 1;
      feedback.push({ text: 'Uppercase letter', met: true });
    } else {
      feedback.push({ text: 'Uppercase letter', met: false });
    }

    if (/[a-z]/.test(password)) {
      score += 1;
      feedback.push({ text: 'Lowercase letter', met: true });
    } else {
      feedback.push({ text: 'Lowercase letter', met: false });
    }

    if (/\d/.test(password)) {
      score += 1;
      feedback.push({ text: 'Number', met: true });
    } else {
      feedback.push({ text: 'Number', met: false });
    }

    return { score, feedback };
  };

  const validateForm = () => {
    const newErrors = {};

    // First Name validation
    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    } else if (!validateName(formData.firstName)) {
      newErrors.firstName = 'First name must be 2-30 characters, letters only';
    }

    // Last Name validation
    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    } else if (!validateName(formData.lastName)) {
      newErrors.lastName = 'Last name must be 2-30 characters, letters only';
    }

    // Username validation
    if (!formData.username.trim()) {
      newErrors.username = 'Username is required';
    } else if (!validateUsername(formData.username)) {
      newErrors.username = 'Username must be 3-20 characters, letters, numbers, and underscores only';
    }

    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = 'Email address is required';
    } else if (!validateEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (!validatePassword(formData.password)) {
      newErrors.password = 'Password must meet all requirements shown below';
    }

    // Confirm Password validation
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    // User Type validation
    if (!formData.userType || !['buyer', 'seller'].includes(formData.userType)) {
      newErrors.userType = 'Please select whether you want to buy or sell';
    }

    // Terms agreement validation
    if (!formData.agreeToTerms) {
      newErrors.agreeToTerms = 'You must agree to the Terms of Service to continue';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const fieldValue = type === 'checkbox' ? checked : value;
    
    setFormData(prev => ({
      ...prev,
      [name]: fieldValue
    }));

    // Update password strength for password field
    if (name === 'password') {
      setPasswordStrength(calculatePasswordStrength(value));
    }

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleUserTypeChange = (type) => {
    setFormData(prev => ({
      ...prev,
      userType: type
    }));
    
    // Clear error when user selects a type
    if (errors.userType) {
      setErrors(prev => ({
        ...prev,
        userType: ''
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Please fix the errors in the form');
      return;
    }

    setIsLoading(true);

    try {
      const result = await dispatch(registerUser({
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        username: formData.username.trim(),
        email: formData.email.trim(),
        password: formData.password,
        userType: formData.userType
      }));

      if (registerUser.fulfilled.match(result)) {
        toast.success('Account created successfully! Welcome to Blocmerce.');
        navigate('/dashboard');
      } else {
        // Handle registration errors
        const errorMessage = result.payload || 'Registration failed';
        
        if (errorMessage.includes('email already exists')) {
          setErrors({ email: 'An account with this email already exists' });
          toast.error('An account with this email already exists. Please try signing in instead.');
        } else if (errorMessage.includes('username already exists')) {
          setErrors({ username: 'This username is already taken. Please choose another one.' });
          toast.error('This username is already taken. Please choose another one.');
        } else {
          toast.error(errorMessage);
        }
      }
    } catch (error) {
      console.error('Registration error:', error);
      toast.error('Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const fillDemoData = () => {
    setFormData({
      firstName: 'John',
      lastName: 'Doe',
      username: 'johndoe_nft',
      email: 'john.doe@example.com',
      password: 'SecurePass123',
      confirmPassword: 'SecurePass123',
      userType: 'buyer',
      agreeToTerms: true,
      agreeToMarketing: false
    });
    setPasswordStrength(calculatePasswordStrength('SecurePass123'));
    setErrors({});
    toast.info('Demo data filled in. Review and submit to create account.');
  };

  const handleSocialRegister = (provider) => {
    toast.info(`${provider} registration integration coming soon! Stay tuned for updates.`);
  };

  const getStrengthClass = () => {
    if (passwordStrength.score <= 1) return 'weak';
    if (passwordStrength.score <= 2) return 'fair';
    if (passwordStrength.score <= 3) return 'good';
    return 'strong';
  };

  const getStrengthText = () => {
    if (passwordStrength.score <= 1) return 'Weak';
    if (passwordStrength.score <= 2) return 'Fair';
    if (passwordStrength.score <= 3) return 'Good';
    return 'Strong';
  };

  return (
    <div className="register-container">
      <div className="register-card">
        <div className="register-header">
          <h1>Join Blocmerce</h1>
          <p>Create your account and start your NFT trading journey today</p>
        </div>

        <form onSubmit={handleSubmit} className="register-form" noValidate>
          {/* Name Fields */}
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="firstName">First Name</label>
              <div className="input-container">
                <input
                  type="text"
                  id="firstName"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  className={errors.firstName ? 'error' : ''}
                  placeholder="Enter your first name"
                  aria-describedby={errors.firstName ? 'firstName-error' : undefined}
                />
              </div>
              {errors.firstName && (
                <span className="error-message" id="firstName-error" role="alert">
                  {errors.firstName}
                </span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="lastName">Last Name</label>
              <div className="input-container">
                <input
                  type="text"
                  id="lastName"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  className={errors.lastName ? 'error' : ''}
                  placeholder="Enter your last name"
                  aria-describedby={errors.lastName ? 'lastName-error' : undefined}
                />
              </div>
              {errors.lastName && (
                <span className="error-message" id="lastName-error" role="alert">
                  {errors.lastName}
                </span>
              )}
            </div>
          </div>

          {/* Username Field */}
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <div className="input-container">
              <input
                type="text"
                id="username"
                name="username"
                value={formData.username}
                onChange={handleChange}
                className={errors.username ? 'error' : ''}
                placeholder="Choose a unique username"
                aria-describedby={errors.username ? 'username-error' : 'username-help'}
              />
            </div>
            <div id="username-help" className="form-help">
              3-20 characters, letters, numbers, and underscores only
            </div>
            {errors.username && (
              <span className="error-message" id="username-error" role="alert">
                {errors.username}
              </span>
            )}
          </div>

          {/* Email Field */}
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <div className="input-container">
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className={errors.email ? 'error' : ''}
                placeholder="Enter your email address"
                autoComplete="email"
                aria-describedby={errors.email ? 'email-error' : undefined}
              />
            </div>
            {errors.email && (
              <span className="error-message" id="email-error" role="alert">
                {errors.email}
              </span>
            )}
          </div>

          {/* User Type Selection */}
          <div className="form-group">
            <label className="form-label">I want to</label>
            <div className="user-type-selection">
              <div 
                className={`user-type-option ${formData.userType === 'buyer' ? 'selected' : ''}`}
                onClick={() => handleUserTypeChange('buyer')}
              >
                <ShoppingBag className="user-type-icon" size={24} />
                <div className="user-type-content">
                  <h3>Buy NFTs</h3>
                  <p>Discover and purchase unique digital assets</p>
                </div>
              </div>
              
              <div 
                className={`user-type-option ${formData.userType === 'seller' ? 'selected' : ''}`}
                onClick={() => handleUserTypeChange('seller')}
              >
                <Store className="user-type-icon" size={24} />
                <div className="user-type-content">
                  <h3>Sell NFTs</h3>
                  <p>Create and sell your digital artwork</p>
                </div>
              </div>
            </div>
            {errors.userType && (
              <span className="error-message" role="alert">
                {errors.userType}
              </span>
            )}
          </div>

          {/* Password Field */}
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <div className="input-container password-container">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className={errors.password ? 'error' : ''}
                placeholder="Create a strong password"
                autoComplete="new-password"
                aria-describedby="password-strength"
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            
            {/* Password Strength Indicator */}
            {formData.password && (
              <div className="password-strength" id="password-strength">
                <div className="strength-label">
                  Password Strength: <span className={getStrengthClass()}>{getStrengthText()}</span>
                </div>
                <div className={`strength-bar ${getStrengthClass()}`}>
                  <div className="strength-fill"></div>
                </div>
                <div className="strength-requirements">
                  {passwordStrength.feedback.map((req, index) => (
                    <div key={index} className={`requirement ${req.met ? 'met' : ''}`}>
                      <div className="icon"></div>
                      <span>{req.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {errors.password && (
              <span className="error-message" role="alert">
                {errors.password}
              </span>
            )}
          </div>

          {/* Confirm Password Field */}
          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <div className="input-container password-container">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                className={errors.confirmPassword ? 'error' : ''}
                placeholder="Confirm your password"
                autoComplete="new-password"
                aria-describedby={errors.confirmPassword ? 'confirmPassword-error' : undefined}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
              >
                {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.confirmPassword && (
              <span className="error-message" id="confirmPassword-error" role="alert">
                {errors.confirmPassword}
              </span>
            )}
          </div>

          {/* Checkbox Fields */}
          <div className="checkbox-group">
            <div 
              className={`checkbox-container ${errors.agreeToTerms ? 'error' : ''}`}
              onClick={() => {
                setFormData(prev => ({
                  ...prev,
                  agreeToTerms: !prev.agreeToTerms
                }));
                // Clear error when user clicks
                if (errors.agreeToTerms) {
                  setErrors(prev => ({
                    ...prev,
                    agreeToTerms: ''
                  }));
                }
              }}
              style={{ cursor: 'pointer' }}
            >
              <input
                type="checkbox"
                id="agreeToTerms"
                name="agreeToTerms"
                checked={formData.agreeToTerms}
                onChange={handleChange}
                className="checkbox-input"
                aria-describedby={errors.agreeToTerms ? 'terms-error' : undefined}
              />
              <div className="checkbox-custom"></div>
              <div className="checkbox-label">
                <span className="label-text">
                  I agree to the{' '}
                  <Link 
                    to="/terms" 
                    className="link" 
                    target="_blank"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Terms of Service
                  </Link>{' '}
                  and{' '}
                  <Link 
                    to="/privacy" 
                    className="link" 
                    target="_blank"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Privacy Policy
                  </Link>
                </span>
              </div>
            </div>
            {errors.agreeToTerms && (
              <span className="error-message" id="terms-error" role="alert">
                {errors.agreeToTerms}
              </span>
            )}

            <div 
              className="checkbox-container"
              onClick={() => {
                setFormData(prev => ({
                  ...prev,
                  agreeToMarketing: !prev.agreeToMarketing
                }));
              }}
              style={{ cursor: 'pointer' }}
            >
              <input
                type="checkbox"
                id="agreeToMarketing"
                name="agreeToMarketing"
                checked={formData.agreeToMarketing}
                onChange={handleChange}
                className="checkbox-input"
              />
              <div className="checkbox-custom"></div>
              <div className="checkbox-label">
                <span className="label-text">
                  I'd like to receive updates about new features and NFT market insights
                </span>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="submit-button"
            aria-describedby="submit-help"
          >
            {isLoading ? (
              <>
                <Loader className="loading-spinner" size={20} />
                Creating your account...
              </>
            ) : (
              'Create Account'
            )}
          </button>
          <div id="submit-help" className="sr-only">
            Click to create your Blocmerce account
          </div>

          {/* Demo Button */}
          <button
            type="button"
            onClick={fillDemoData}
            className="demo-button"
            aria-label="Fill in demo registration data"
          >
            Fill Demo Data
          </button>
        </form>

        {/* Divider */}
        <div className="divider">
          <span>or sign up with</span>
        </div>

        {/* Social Registration */}
        <div className="social-register">
          <button
            onClick={() => handleSocialRegister('Google')}
            className="social-button google"
            aria-label="Sign up with Google"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Google
          </button>
          <button
            onClick={() => handleSocialRegister('GitHub')}
            className="social-button github"
            aria-label="Sign up with GitHub"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
            GitHub
          </button>
          <button
            onClick={() => handleSocialRegister('MetaMask')}
            className="social-button metamask"
            aria-label="Sign up with MetaMask"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M22.05 8.54l-3.24-9.64a.85.85 0 00-.81-.6H5.99a.85.85 0 00-.81.6L1.94 8.54a.85.85 0 00.16.96l8.04 6.73a.85.85 0 001.01 0l8.04-6.73a.85.85 0 00.16-.96z" fill="#E2761B"/>
            </svg>
            MetaMask
          </button>
        </div>

        {/* Login Link */}
        <div className="login-link">
          <p>
            Already have an account?{' '}
            <Link to="/login" className="link">
              Sign in here
            </Link>
          </p>
        </div>

        {/* Security Notice */}
        <div className="security-notice">
          <span>Your data is protected with enterprise-grade security</span>
        </div>
      </div>
    </div>
  );
};

export default Register; 