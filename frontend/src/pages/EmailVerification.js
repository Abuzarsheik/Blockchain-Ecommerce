import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, XCircle, Loader, Mail, RefreshCw } from 'lucide-react';
import { toast } from 'react-toastify';
import api from '../services/api';
import '../styles/Auth.css';

const EmailVerification = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('verifying'); // 'verifying', 'success', 'error', 'expired'
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const token = searchParams.get('token');
    
    if (!token) {
      setStatus('error');
      return;
    }

    verifyEmail(token);
  }, [searchParams]);

  const verifyEmail = async (token) => {
    try {
      setLoading(true);
      const response = await api.post('/auth/verify-email', { token });
      
      setStatus('success');
      toast.success('Email verified successfully!');
      
      // Get user info if logged in
      try {
        const userResponse = await api.get('/auth/me');
        setUser(userResponse.data.user);
      } catch (error) {
        // User not logged in, that's okay
      }
      
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Email verification failed';
      
      if (errorMessage.includes('expired')) {
        setStatus('expired');
      } else {
        setStatus('error');
      }
      
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

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
    switch (status) {
      case 'verifying':
        return (
          <div className="verification-container">
            <div className="verification-icon">
              <Loader className="spinning" size={64} color="#007bff" />
            </div>
            <h1>Verifying Your Email</h1>
            <p>Please wait while we verify your email address...</p>
          </div>
        );

      case 'success':
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

      case 'expired':
        return (
          <div className="verification-container">
            <div className="verification-icon">
              <XCircle size={64} color="#dc3545" />
            </div>
            <h1>Verification Link Expired</h1>
            <p>
              This verification link has expired. Would you like us to send you a new one?
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
                    <RefreshCw size={16} />
                    Resend Verification
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

      case 'error':
      default:
        return (
          <div className="verification-container">
            <div className="verification-icon">
              <XCircle size={64} color="#dc3545" />
            </div>
            <h1>Verification Failed</h1>
            <p>
              We couldn't verify your email address. The link may be invalid or expired.
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