import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'react-toastify';
import '../styles/Login.css';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const validateEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!email) {
      setError('Email is required');
      return;
    }
    
    if (!validateEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setIsSubmitted(true);
      toast.success('Password reset email sent successfully!');
    } catch (err) {
      setError('Failed to send reset email. Please try again.');
      toast.error('Failed to send reset email');
    } finally {
      setIsLoading(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="login-container">
        <div className="login-background">
          <div className="login-card">
            <div className="success-content">
              <div className="success-icon">
                <CheckCircle size={64} />
              </div>
              <h1>Check Your Email</h1>
              <p>
                We've sent a password reset link to <strong>{email}</strong>
              </p>
              <div className="success-instructions">
                <p>
                  If you don't see the email in your inbox, please check your spam folder.
                  The link will expire in 24 hours.
                </p>
              </div>
              <div className="success-actions">
                <Link to="/login" className="login-button">
                  Back to Login
                </Link>
                <button 
                  onClick={() => {
                    setIsSubmitted(false);
                    setEmail('');
                  }}
                  className="demo-button"
                >
                  Send Another Email
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="login-container">
      <div className="login-background">
        <div className="login-card">
          <div className="login-header">
            <Link to="/login" className="back-link">
              <ArrowLeft size={20} />
              Back to Login
            </Link>
            <h1>Forgot Password?</h1>
            <p>Enter your email address and we'll send you a link to reset your password</p>
          </div>

          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label htmlFor="email" className="form-label">
                Email Address
              </label>
              <div className="input-wrapper">
                <Mail className="input-icon" size={20} />
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (error) setError('');
                  }}
                  className={`form-input ${error ? 'error' : ''}`}
                  placeholder="Enter your email address"
                  autoComplete="email"
                  disabled={isLoading}
                />
                {error && (
                  <AlertCircle className="error-icon" size={16} />
                )}
              </div>
              {error && (
                <span className="error-message">{error}</span>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="login-button"
            >
              {isLoading ? 'Sending...' : 'Send Reset Link'}
            </button>
          </form>

          <div className="register-link">
            <p>
              Remember your password?{' '}
              <Link to="/login" className="link">
                Sign in
              </Link>
            </p>
          </div>

          <div className="security-notice">
            <CheckCircle size={16} />
            <span>Your data is protected with enterprise-grade security</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword; 