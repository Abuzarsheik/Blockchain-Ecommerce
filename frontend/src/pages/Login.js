import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff, Loader } from 'lucide-react';
import { toast } from 'react-toastify';
import { loginUser, clearError } from '../store/slices/authSlice';
import '../styles/Login.css';

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  
  const { isAuthenticated, loading, error } = useSelector(state => state.auth);
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      const from = location.state?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, location]);

  // Handle auth errors
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
        if (value.length < 6) return 'Password must be at least 6 characters long';
        return '';
      default:
        return '';
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const fieldValue = type === 'checkbox' ? checked : value;
    
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
    
    // Validate all fields
    const newErrors = {};
    Object.keys(formData).forEach(key => {
      if (key !== 'rememberMe') {
        const error = validateField(key, formData[key]);
        if (error) newErrors[key] = error;
      }
    });

    setErrors(newErrors);
    setTouched({ email: true, password: true });

    if (Object.keys(newErrors).length === 0) {
      try {
        const result = await dispatch(loginUser({
          email: formData.email,
          password: formData.password
        }));
        
        if (loginUser.fulfilled.match(result)) {
          toast.success('Welcome back! Login successful.');
          // Navigation will be handled by the useEffect when isAuthenticated changes
        }
      } catch (err) {
        console.error('Login error:', err);
        
        // If it's a demo login, provide fallback authentication
        if (formData.email === 'demo@blocmerce.com' && formData.password === 'demo123') {
          // Mock successful login for demo
          localStorage.setItem('token', 'demo-token-123');
          
          // Manually set auth state for demo
          const demoUser = {
            id: 'demo-user-123',
            firstName: 'Demo',
            lastName: 'User',
            username: 'demo_user',
            email: 'demo@blocmerce.com',
            userType: 'buyer'
          };
          
          // Create a custom fulfilled action for demo
          dispatch({
            type: 'auth/loginUser/fulfilled',
            payload: {
              user: demoUser,
              token: 'demo-token-123'
            }
          });
          
          toast.success('Welcome to the demo! Login successful.');
        } else {
          toast.error('Login failed. Please check your credentials and try again.');
        }
      }
    } else {
      toast.error('Please correct the errors in the form');
    }
  };

  const handleDemoLogin = () => {
    setFormData({
      email: 'demo@blocmerce.com',
      password: 'demo123',
      rememberMe: false
    });
    // Clear any existing errors
    setErrors({});
    setTouched({});
    toast.info('Demo credentials filled in. Click "Sign In" to continue.');
  };

  const handleSocialLogin = (provider) => {
    toast.info(`${provider} login integration coming soon! Stay tuned for updates.`);
  };

  return (
    <div className="login-container">
      <div className="login-background">
        <div className="login-card">
          <div className="login-header">
            <h1>Welcome Back</h1>
            <p>Sign in to your Blocmerce account and continue your NFT journey</p>
          </div>

          <form onSubmit={handleSubmit} className="login-form" noValidate>
            {/* Email Field */}
            <div className="form-group">
              <label htmlFor="email" className="form-label">
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
                  {errors.email}
                </span>
              )}
            </div>

            {/* Password Field */}
            <div className="form-group">
              <label htmlFor="password" className="form-label">
                Password
              </label>
              <div className="input-wrapper">
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
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && touched.password && (
                <span className="error-message" id="password-error" role="alert">
                  {errors.password}
                </span>
              )}
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="form-options">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="rememberMe"
                  checked={formData.rememberMe}
                  onChange={handleChange}
                  className="checkbox-input"
                />
                <span className="checkbox-custom"></span>
                Keep me signed in
              </label>
              <Link to="/forgot-password" className="forgot-link">
                Forgot your password?
              </Link>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="login-button"
              aria-describedby="submit-help"
            >
              {loading ? (
                <>
                  <Loader className="spinner" size={16} />
                  Signing you in...
                </>
              ) : (
                'Sign In'
              )}
            </button>
            <div id="submit-help" className="sr-only">
              Click to sign in to your account
            </div>

            {/* Demo Login */}
            <button
              type="button"
              onClick={handleDemoLogin}
              className="demo-button"
              aria-label="Fill in demo account credentials"
            >
              Try Demo Account
            </button>
          </form>

          {/* Divider */}
          <div className="divider">
            <span>or continue with</span>
          </div>

          {/* Social Login */}
          <div className="social-login">
            <button
              onClick={() => handleSocialLogin('Google')}
              className="social-button google"
              aria-label="Sign in with Google"
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
              onClick={() => handleSocialLogin('GitHub')}
              className="social-button github"
              aria-label="Sign in with GitHub"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
              GitHub
            </button>
            <button
              onClick={() => handleSocialLogin('MetaMask')}
              className="social-button metamask"
              aria-label="Sign in with MetaMask"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M22.05 8.54l-3.24-9.64a.85.85 0 00-.81-.6H5.99a.85.85 0 00-.81.6L1.94 8.54a.85.85 0 00.16.96l8.04 6.73a.85.85 0 001.01 0l8.04-6.73a.85.85 0 00.16-.96z" fill="#E2761B"/>
              </svg>
              MetaMask
            </button>
          </div>

          {/* Register Link */}
          <div className="register-link">
            <p>
              New to Blocmerce?{' '}
              <Link to="/register" className="link">
                Create your account
              </Link>
            </p>
          </div>

          {/* Security Notice */}
          <div className="security-notice">
            <span>Your connection is secured with end-to-end encryption</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login; 