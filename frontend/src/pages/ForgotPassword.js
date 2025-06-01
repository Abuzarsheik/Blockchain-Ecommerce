import '../styles/Auth.css';
import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Link, useLocation } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle, Loader, AlertCircle } from 'lucide-react';
import { toast } from 'react-toastify';

const ForgotPassword = () => {
  const location = useLocation();
  const [step, setStep] = useState('request'); // 'request', 'sent'
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    // Pre-fill email if passed from login page
    if (location.state?.email) {
      setEmail(location.state.email);
    }
  }, [location.state]);

  const validateEmail = (email) => {
    if (!email) return 'Email address is required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Please enter a valid email address';
    return '';
  };

  const handleChange = (e) => {
    const value = e.target.value;
    setEmail(value);
    
    if (touched) {
      setError(validateEmail(value));
    }
  };

  const handleBlur = () => {
    setTouched(true);
    setError(validateEmail(email));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!email) {
      setError('Please enter your email address');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setStep('sent');
      } else {
        setError(data.error || 'Failed to send reset email');
      }
    } catch (error) {
      setError('Network error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendEmail = async () => {
    setIsLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      toast.success('Reset email sent again');
    } catch (error) {
      if (error.response?.status === 429) {
        toast.error('Please wait before requesting another email');
      } else {
        toast.success('Reset email sent');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const renderRequestForm = () => (
    <>
      <div className="forgot-password-header">
        <div className="header-icon">
          <Mail size={32} />
        </div>
        <h1>Forgot Your Password?</h1>
        <p>
          No worries! Enter your email address and we'll send you a link to reset your password.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="forgot-password-form" noValidate>
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
              value={email}
              onChange={handleChange}
              onBlur={handleBlur}
              className={`form-input ${error && touched ? 'error' : ''}`}
              placeholder="Enter your email address"
              autoComplete="email"
              autoFocus
              aria-describedby={error && touched ? 'email-error' : undefined}
            />
          </div>
          {error && touched && (
            <span className="error-message" id="email-error" role="alert">
              <AlertCircle size={14} />
              {error}
            </span>
          )}
        </div>

        <button
          type="submit"
          className="submit-button"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader className="spinning" size={18} />
              Sending Reset Link...
            </>
          ) : (
            <>
              <Mail size={18} />
              Send Reset Link
            </>
          )}
        </button>
      </form>

      <div className="form-footer">
        <Link to="/login" className="back-link">
          <ArrowLeft size={16} />
          Back to Login
        </Link>
      </div>
    </>
  );

  const renderSentConfirmation = () => (
    <>
      <div className="forgot-password-header">
        <div className="header-icon success">
          <CheckCircle size={32} />
        </div>
        <h1>Check Your Email</h1>
        <p>
          We've sent password reset instructions to <strong>{email}</strong>
        </p>
      </div>

      <div className="confirmation-content">
        <div className="instructions">
          <h3>What's next?</h3>
          <ol>
            <li>Check your email inbox (and spam folder)</li>
            <li>Click the reset link in the email</li>
            <li>Create a new secure password</li>
            <li>Sign in with your new password</li>
          </ol>
        </div>

        <div className="help-section">
          <p>Didn't receive the email?</p>
          <div className="help-actions">
            <button
              type="button"
              className="resend-button"
              onClick={handleResendEmail}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader className="spinning" size={16} />
                  Resending...
                </>
              ) : (
                'Resend Email'
              )}
            </button>
            <button
              type="button"
              className="change-email-button"
              onClick={() => {
                setStep('request');
                setEmail('');
                setError('');
                setTouched(false);
              }}
            >
              Use Different Email
            </button>
          </div>
        </div>
      </div>

      <div className="form-footer">
        <Link to="/login" className="back-link">
          <ArrowLeft size={16} />
          Back to Login
        </Link>
      </div>
    </>
  );

  return (
    <div className="forgot-password-container">
      <div className="forgot-password-background">
        <div className="forgot-password-card">
          {step === 'request' && renderRequestForm()}
          {step === 'sent' && renderSentConfirmation()}
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword; 