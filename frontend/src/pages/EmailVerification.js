import '../styles/Auth.css';
import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { CheckCircle, XCircle, Loader, Mail } from 'lucide-react';
import { toast } from 'react-toastify';
import { useNavigate, useSearchParams } from 'react-router-dom';

const EmailVerification = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [user, setUser] = useState(null);

  const verifyEmail = useCallback(async (token) => {
    try {
      const response = await api.post('/auth/verify-email', { token });
      
      if (response.ok) {
        setSuccess(true);
        toast.success('Email verified successfully!');
        
        // Get user info if logged in
        try {
          const userResponse = await api.get('/auth/me');
          setUser(userResponse.data.user);
        } catch (error) {
          // User not logged in, that's okay
        }
        
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      } else {
        const data = await response.json();
        setError(data.error || 'Verification failed');
      }
    } catch (error) {
      setError('Network error occurred');
    } finally {
      setVerifying(false);
    }
  }, [navigate]);

  useEffect(() => {
    const token = searchParams.get('token');
    
    if (!token) {
      setError('Invalid verification link');
      return;
    }

    setVerifying(true);
    verifyEmail(token);
  }, [searchParams, navigate, verifyEmail]);

  const handleResendVerification = async () => {
    try {
      setResendLoading(true);
      
      // This would need to be implemented in the backend
      await api.post('/auth/resend-verification');
      
      toast.success('Verification email sent! Please check your inbox.');
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Failed to resend verification email';
      toast.error(errorMessage);
    } finally {
      setResendLoading(false);
    }
  };

  const handleContinue = () => {
    if (user) {
      navigate('/dashboard');
    } else {
      navigate('/login');
    }
  };

  const renderContent = () => {
    if (verifying) {
      return (
        <div className="verification-container">
          <div className="verification-icon">
            <Loader className="spinning" size={64} color="#007bff" />
          </div>
          <h1>Verifying Your Email</h1>
          <p>Please wait while we verify your email address...</p>
        </div>
      );
    } else if (success) {
      return (
        <div className="verification-container">
          <div className="verification-icon">
            <CheckCircle size={64} color="#28a745" />
          </div>
          <h1>Email Verified!</h1>
          <p>
            Your email address has been successfully verified. 
            You can now access all features of your account.
          </p>
          <button 
            className="continue-button"
            onClick={handleContinue}
          >
            {user ? 'Go to Dashboard' : 'Continue to Login'}
          </button>
        </div>
      );
    } else if (error) {
      return (
        <div className="verification-container">
          <div className="verification-icon">
            <XCircle size={64} color="#dc3545" />
          </div>
          <h1>Verification Failed</h1>
          <p>
            {error}
          </p>
          <div className="action-buttons">
            <button 
              className="resend-button"
              onClick={handleResendVerification}
              disabled={resendLoading}
            >
              {resendLoading ? (
                <>
                  <Loader className="spinning" size={16} />
                  Sending...
                </>
              ) : (
                <>
                  <Mail size={16} />
                  Send New Link
                </>
              )}
            </button>
            <button 
              className="login-button"
              onClick={() => navigate('/login')}
            >
              Back to Login
            </button>
          </div>
        </div>
      );
    }
  };

  return (
    <div className="email-verification-page">
      <div className="verification-card">
        {renderContent()}
      </div>
    </div>
  );
};

export default EmailVerification; 