import '../styles/Auth.css';
import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Loader, Shield, Mail, Lock, AlertCircle, CheckCircle } from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { loginUser, verify2FA, clearError } from '../store/slices/authSlice';
import { toast } from 'react-toastify';
import { useDispatch, useSelector } from 'react-redux';
import { logger } from '../utils/logger';

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const { loading, error, isAuthenticated, user } = useSelector(state => state.auth);
  
  const [step, setStep] = useState('login'); // 'login', '2fa', 'success'
  const [tempToken, setTempToken] = useState('');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    twoFactorCode: '',
    rememberMe: false
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  // Check if already authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      const from = location.state?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, user, navigate, location]);

  // Handle Redux auth errors
  useEffect(() => {
    if (error) {
      toast.error(error);
      dispatch(clearError());
    }
  }, [error, dispatch]);

  // Enhanced form validation
  const validateField = (name, value) => {
    switch (name) {
      case 'email':
        if (!value) return 'Email address is required';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Please enter a valid email address';
        return '';
      case 'password':
        if (!value) return 'Password is required';
        if (value.length < 8) return 'Password must be at least 8 characters long';
        return '';
      case 'twoFactorCode':
        if (!value) return '2FA code is required';
        if (!/^\d{6}$/.test(value)) return '2FA code must be 6 digits';
        return '';
      default:
        return '';
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    let fieldValue = type === 'checkbox' ? checked : value;
    
    // Format 2FA code input
    if (name === 'twoFactorCode') {
      fieldValue = value.replace(/\D/g, '').slice(0, 6);
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: fieldValue
    }));

    // Clear error when user starts typing
    if (errors[name] && touched[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: validateField(name, fieldValue)
      }));
    }
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    setTouched(prev => ({ ...prev, [name]: true }));
    setErrors(prev => ({
      ...prev,
      [name]: validateField(name, value)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (step === 'login') {
      // Validate login fields
      const newErrors = {};
      ['email', 'password'].forEach(key => {
        const error = validateField(key, formData[key]);
        if (error) newErrors[key] = error;
      });

      setErrors(newErrors);
      setTouched({ email: true, password: true });

      if (Object.keys(newErrors).length === 0) {
        try {
          const result = await dispatch(loginUser({
            email: formData.email,
            password: formData.password
          })).unwrap();

          if (result.requires2FA) {
            setStep('2fa');
            setTempToken(result.tempToken);
            toast.info('Please enter your 2FA code to complete login');
          } else {
            // Login successful
            setStep('success');
            toast.success('Welcome back! Login successful.');
            
            setTimeout(() => {
              const from = location.state?.from?.pathname || '/dashboard';
              navigate(from, { replace: true });
            }, 1500);
          }
        } catch (error) {
          // Additional specific error handling beyond Redux
          logger.error('Login error:', error);
          
          // Handle specific error cases that might not be caught by Redux
          if (typeof error === 'string') {
            toast.error(error);
          } else if (error?.message) {
            toast.error(error.message);
          } else {
            toast.error('Login failed. Please check your credentials and try again.');
          }
        }
      }
    } else if (step === '2fa') {
      // Validate 2FA code
      const newErrors = {};
      const codeError = validateField('twoFactorCode', formData.twoFactorCode);
      if (codeError) newErrors.twoFactorCode = codeError;

      setErrors(newErrors);
      setTouched({ twoFactorCode: true });

      if (Object.keys(newErrors).length === 0) {
        try {
          await dispatch(verify2FA({
            tempToken: tempToken,
            twoFactorCode: formData.twoFactorCode
          })).unwrap();

          setStep('success');
          toast.success('Two-factor authentication successful!');
          
          setTimeout(() => {
            const from = location.state?.from?.pathname || '/dashboard';
            navigate(from, { replace: true });
          }, 1500);
        } catch (error) {
          logger.error('2FA verification error:', error);
          // Error is already handled by Redux and the useEffect
        }
      }
    }
  };

  const handleDemoLogin = () => {
    setFormData({
      email: 'demo@blocmerce.com',
      password: 'Demo123!@#',
      twoFactorCode: '',
      rememberMe: false
    });
    setErrors({});
    setTouched({});
    toast.info('Demo credentials filled in. Click "Sign In" to continue.');
  };

  const handleBack = () => {
    setStep('login');
    setFormData(prev => ({ ...prev, twoFactorCode: '' }));
    setErrors({});
    setTouched({});
  };

  const handleForgotPassword = () => {
    if (formData.email) {
      navigate('/forgot-password', { state: { email: formData.email } });
    } else {
      navigate('/forgot-password');
    }
  };

  const renderLoginForm = () => (
    <>
      <div className="auth-header">
        <div className="header-icon">
          <Lock size={32} />
        </div>
        <h1>Welcome Back</h1>
        <p>Sign in to your account and continue your journey</p>
      </div>

      <form onSubmit={handleSubmit} className="auth-form" noValidate>
        {/* Email Field */}
        <div className="form-group">
          <label htmlFor="email" className="form-label">
            <Mail size={16} />
            Email Address
          </label>
          <div className="input-wrapper">
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              onBlur={handleBlur}
              className={`form-input ${errors.email && touched.email ? 'error' : ''}`}
              placeholder="Enter your email address"
              autoComplete="email"
              aria-describedby={errors.email && touched.email ? 'email-error' : undefined}
            />
          </div>
          {errors.email && touched.email && (
            <span className="error-message" id="email-error" role="alert">
              <AlertCircle size={14} />
              {errors.email}
            </span>
          )}
        </div>

        {/* Password Field */}
        <div className="form-group">
          <label htmlFor="password" className="form-label">
            <Lock size={16} />
            Password
          </label>
          <div className="input-wrapper password-wrapper">
            <input
              type={showPassword ? 'text' : 'password'}
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              onBlur={handleBlur}
              className={`form-input ${errors.password && touched.password ? 'error' : ''}`}
              placeholder="Enter your password"
              autoComplete="current-password"
              aria-describedby={errors.password && touched.password ? 'password-error' : undefined}
            />
            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {errors.password && touched.password && (
            <span className="error-message" id="password-error" role="alert">
              <AlertCircle size={14} />
              {errors.password}
            </span>
          )}
        </div>

        {/* Remember Me and Forgot Password */}
        <div className="form-options">
          <label className="checkbox-label">
            <input
              type="checkbox"
              name="rememberMe"
              checked={formData.rememberMe}
              onChange={handleChange}
            />
            <span className="checkmark"></span>
            Remember me for 30 days
          </label>
          <button
            type="button"
            className="forgot-password-link"
            onClick={handleForgotPassword}
          >
            Forgot password?
          </button>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          className="submit-button"
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader className="spinning" size={18} />
              Signing In...
            </>
          ) : (
            'Sign In'
          )}
        </button>

        {/* Demo Login */}
        <button
          type="button"
          className="demo-button"
          onClick={handleDemoLogin}
          disabled={loading}
        >
          Try Demo Login
        </button>
      </form>

      <div className="auth-footer">
        <p>
          Don't have an account?{' '}
          <Link to="/register" className="register-link">
            Create one here
          </Link>
        </p>
      </div>
    </>
  );

  const render2FAForm = () => (
    <>
      <div className="auth-header">
        <div className="header-icon">
          <Shield size={32} />
        </div>
        <h1>Two-Factor Authentication</h1>
        <p>Enter the 6-digit code from your authenticator app</p>
      </div>

      <form onSubmit={handleSubmit} className="auth-form" noValidate>
        <div className="form-group">
          <label htmlFor="twoFactorCode" className="form-label">
            <Shield size={16} />
            Authentication Code
          </label>
          <div className="input-wrapper">
            <input
              type="text"
              id="twoFactorCode"
              name="twoFactorCode"
              value={formData.twoFactorCode}
              onChange={handleChange}
              onBlur={handleBlur}
              className={`form-input code-input ${errors.twoFactorCode && touched.twoFactorCode ? 'error' : ''}`}
              placeholder="000000"
              maxLength="6"
              autoComplete="one-time-code"
              aria-describedby={errors.twoFactorCode && touched.twoFactorCode ? 'code-error' : undefined}
            />
          </div>
          {errors.twoFactorCode && touched.twoFactorCode && (
            <span className="error-message" id="code-error" role="alert">
              <AlertCircle size={14} />
              {errors.twoFactorCode}
            </span>
          )}
        </div>

        <div className="form-buttons">
          <button
            type="button"
            className="back-button"
            onClick={handleBack}
            disabled={loading}
          >
            Back
          </button>
          <button
            type="submit"
            className="submit-button"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader className="spinning" size={18} />
                Verifying...
              </>
            ) : (
              'Verify & Sign In'
            )}
          </button>
        </div>
      </form>

      <div className="help-text">
        <p>Can't access your authenticator app?</p>
        <button
          type="button"
          className="help-link"
          onClick={() => toast.info('Contact support for assistance with backup codes')}
        >
          Use backup code
        </button>
      </div>
    </>
  );

  const renderSuccessForm = () => (
    <div className="success-container">
      <div className="success-icon">
        <CheckCircle size={64} color="#28a745" />
      </div>
      <h1>Login Successful!</h1>
      <p>Welcome back, {user?.firstName}! Redirecting you now...</p>
      <div className="loading-indicator">
        <Loader className="spinning" size={24} />
      </div>
    </div>
  );

  return (
    <div className="auth-container">
      <div className="auth-card">
        {step === 'login' && renderLoginForm()}
        {step === '2fa' && render2FAForm()}
        {step === 'success' && renderSuccessForm()}
      </div>
    </div>
  );
};

export default Login; 