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
      const response = await api.post('/auth/forgot-password', { email });
      
      if (response.data) {
        setStep('sent');
        toast.success('Password reset email sent successfully!');
      }
    } catch (error) {
      const errorMessage = error.response?.data?.error || 
                          error.response?.data?.message || 
                          'Failed to send reset email. Please try again.';
      setError(errorMessage);
      toast.error(errorMessage);
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
      <div className="forgot-password-header enhanced-success">
        <div className="header-icon success animated-check">
          <CheckCircle size={40} />
        </div>
        <h1 className="success-title">Check Your Email! 📧</h1>
        <p className="success-subtitle">
          We've sent password reset instructions to<br />
          <span className="email-highlight">{email}</span>
        </p>
      </div>

      <div className="confirmation-content enhanced">
        <div className="email-animation">
          <div className="email-icon">
            <Mail size={32} />
          </div>
          <div className="pulse-ring"></div>
          <div className="pulse-ring delay-1"></div>
          <div className="pulse-ring delay-2"></div>
        </div>

        <div className="instructions enhanced-instructions">
          <h3>What's next?</h3>
          <div className="steps-container">
            <div className="step-item">
              <div className="step-number">1</div>
              <div className="step-content">
                <strong>Check your email inbox</strong>
                <span>(and spam folder too!)</span>
              </div>
            </div>
            <div className="step-item">
              <div className="step-number">2</div>
              <div className="step-content">
                <strong>Click the reset link</strong>
                <span>Look for the blue "Reset Password" button</span>
              </div>
            </div>
            <div className="step-item">
              <div className="step-number">3</div>
              <div className="step-content">
                <strong>Create a new secure password</strong>
                <span>Make it strong and memorable</span>
              </div>
            </div>
            <div className="step-item">
              <div className="step-number">4</div>
              <div className="step-content">
                <strong>Sign in with your new password</strong>
                <span>You'll be back in your account!</span>
              </div>
            </div>
          </div>
        </div>

        <div className="help-section enhanced-help">
          <div className="help-box">
            <h4>🕐 Didn't receive the email?</h4>
            <p>It may take a few minutes to arrive. Check your spam folder first!</p>
            <div className="help-actions enhanced-actions">
              <button
                type="button"
                className="resend-button enhanced-resend"
                onClick={handleResendEmail}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader className="spinning" size={16} />
                    Resending...
                  </>
                ) : (
                  <>
                    <Mail size={16} />
                    Resend Email
                  </>
                )}
              </button>
              <button
                type="button"
                className="change-email-button enhanced-change"
                onClick={() => {
                  setStep('request');
                  setEmail('');
                  setError('');
                  setTouched(false);
                }}
              >
                <ArrowLeft size={16} />
                Use Different Email
              </button>
            </div>
          </div>
        </div>

        <div className="email-tips">
          <h4>💡 Email Tips</h4>
          <ul>
            <li>The link expires in 1 hour for security</li>
            <li>If you don't see it, try searching for "Blocmerce"</li>
            <li>Add us to your contacts: noreply@blocmerce.com</li>
          </ul>
        </div>
      </div>

      <div className="form-footer enhanced-footer">
        <Link to="/login" className="back-link enhanced-back">
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