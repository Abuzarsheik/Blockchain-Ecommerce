import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Lock, Eye, EyeOff, CheckCircle, AlertCircle, Loader, ArrowLeft } from 'lucide-react';
import { toast } from 'react-toastify';
import api from '../services/api';
import '../styles/Auth.css';

const ResetPassword = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState('reset'); // 'reset', 'success'
  const [token, setToken] = useState('');
  const [formData, setFormData] = useState({
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    newPassword: false,
    confirmPassword: false
  });
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const resetToken = searchParams.get('token');
    if (!resetToken) {
      toast.error('Invalid reset link. Please request a new password reset.');
      navigate('/forgot-password');
      return;
    }
    setToken(resetToken);
  }, [searchParams, navigate]);

  const validateField = (name, value) => {
    switch (name) {
      case 'newPassword':
        if (!value) return 'New password is required';
        if (value.length < 8) return 'Password must be at least 8 characters long';
        if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/.test(value)) {
          return 'Password must contain uppercase, lowercase, number and special character';
        }
        return '';
      case 'confirmPassword':
        if (!value) return 'Please confirm your password';
        if (value !== formData.newPassword) return 'Passwords do not match';
        return '';
      default:
        return '';
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear error when user starts typing
    if (errors[name] && touched[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: validateField(name, value)
      }));
    }

    // Also validate confirm password when new password changes
    if (name === 'newPassword' && touched.confirmPassword) {
      setErrors(prev => ({
        ...prev,
        confirmPassword: validateField('confirmPassword', formData.confirmPassword)
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

  const togglePasswordVisibility = (field) => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate all fields
    const newErrors = {};
    Object.keys(formData).forEach(key => {
      const error = validateField(key, formData[key]);
      if (error) newErrors[key] = error;
    });

    setErrors(newErrors);
    setTouched({ newPassword: true, confirmPassword: true });

    if (Object.keys(newErrors).length === 0) {
      setLoading(true);
      try {
        await api.post('/auth/reset-password', {
          token,
          newPassword: formData.newPassword
        });

        setStep('success');
        toast.success('Password reset successful!');
      } catch (error) {
        const errorMessage = error.response?.data?.error || 'Password reset failed';
        
        if (errorMessage.includes('expired') || errorMessage.includes('invalid')) {
          toast.error('Reset link has expired. Please request a new one.');
          setTimeout(() => navigate('/forgot-password'), 2000);
        } else {
          toast.error(errorMessage);
        }
      } finally {
        setLoading(false);
      }
    }
  };

  const getPasswordStrength = (password) => {
    if (!password) return { strength: 0, text: '' };
    
    let score = 0;
    let feedback = [];

    // Length check
    if (password.length >= 8) score += 1;
    else feedback.push('at least 8 characters');

    // Uppercase check
    if (/[A-Z]/.test(password)) score += 1;
    else feedback.push('uppercase letter');

    // Lowercase check
    if (/[a-z]/.test(password)) score += 1;
    else feedback.push('lowercase letter');

    // Number check
    if (/\d/.test(password)) score += 1;
    else feedback.push('number');

    // Special character check
    if (/[@$!%*?&]/.test(password)) score += 1;
    else feedback.push('special character');

    const strengthLevels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'];
    const strengthColors = ['#dc3545', '#fd7e14', '#ffc107', '#20c997', '#28a745'];

    return {
      strength: score,
      text: strengthLevels[score] || 'Very Weak',
      color: strengthColors[score] || '#dc3545',
      feedback: feedback.length > 0 ? `Missing: ${feedback.join(', ')}` : 'Strong password!'
    };
  };

  const passwordStrength = getPasswordStrength(formData.newPassword);

  const renderResetForm = () => (
    <>
      <div className="reset-password-header">
        <div className="header-icon">
          <Lock size={32} />
        </div>
        <h1>Reset Your Password</h1>
        <p>Enter your new password below. Make sure it's strong and secure.</p>
      </div>

      <form onSubmit={handleSubmit} className="reset-password-form" noValidate>
        {/* New Password Field */}
        <div className="form-group">
          <label htmlFor="newPassword" className="form-label">
            <Lock size={16} />
            New Password
          </label>
          <div className="input-wrapper password-wrapper">
            <input
              type={showPasswords.newPassword ? 'text' : 'password'}
              id="newPassword"
              name="newPassword"
              value={formData.newPassword}
              onChange={handleChange}
              onBlur={handleBlur}
              className={`form-input ${errors.newPassword && touched.newPassword ? 'error' : ''}`}
              placeholder="Enter your new password"
              autoComplete="new-password"
              aria-describedby={errors.newPassword && touched.newPassword ? 'new-password-error' : undefined}
            />
            <button
              type="button"
              className="password-toggle"
              onClick={() => togglePasswordVisibility('newPassword')}
              aria-label={showPasswords.newPassword ? 'Hide password' : 'Show password'}
            >
              {showPasswords.newPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          
          {/* Password Strength Indicator */}
          {formData.newPassword && (
            <div className="password-strength">
              <div className="strength-bar">
                <div 
                  className="strength-fill" 
                  style={{ 
                    width: `${(passwordStrength.strength / 5) * 100}%`,
                    backgroundColor: passwordStrength.color
                  }}
                ></div>
              </div>
              <span className="strength-text" style={{ color: passwordStrength.color }}>
                {passwordStrength.text}
              </span>
              <p className="strength-feedback">{passwordStrength.feedback}</p>
            </div>
          )}

          {errors.newPassword && touched.newPassword && (
            <span className="error-message" id="new-password-error" role="alert">
              <AlertCircle size={14} />
              {errors.newPassword}
            </span>
          )}
        </div>

        {/* Confirm Password Field */}
        <div className="form-group">
          <label htmlFor="confirmPassword" className="form-label">
            <Lock size={16} />
            Confirm New Password
          </label>
          <div className="input-wrapper password-wrapper">
            <input
              type={showPasswords.confirmPassword ? 'text' : 'password'}
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              onBlur={handleBlur}
              className={`form-input ${errors.confirmPassword && touched.confirmPassword ? 'error' : ''}`}
              placeholder="Confirm your new password"
              autoComplete="new-password"
              aria-describedby={errors.confirmPassword && touched.confirmPassword ? 'confirm-password-error' : undefined}
            />
            <button
              type="button"
              className="password-toggle"
              onClick={() => togglePasswordVisibility('confirmPassword')}
              aria-label={showPasswords.confirmPassword ? 'Hide password' : 'Show password'}
            >
              {showPasswords.confirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {errors.confirmPassword && touched.confirmPassword && (
            <span className="error-message" id="confirm-password-error" role="alert">
              <AlertCircle size={14} />
              {errors.confirmPassword}
            </span>
          )}
        </div>

        {/* Password Requirements */}
        <div className="password-requirements">
          <h4>Password Requirements:</h4>
          <ul>
            <li className={formData.newPassword.length >= 8 ? 'met' : ''}>
              At least 8 characters long
            </li>
            <li className={/[A-Z]/.test(formData.newPassword) ? 'met' : ''}>
              Contains uppercase letter
            </li>
            <li className={/[a-z]/.test(formData.newPassword) ? 'met' : ''}>
              Contains lowercase letter
            </li>
            <li className={/\d/.test(formData.newPassword) ? 'met' : ''}>
              Contains number
            </li>
            <li className={/[@$!%*?&]/.test(formData.newPassword) ? 'met' : ''}>
              Contains special character (@$!%*?&)
            </li>
          </ul>
        </div>

        <button
          type="submit"
          className="submit-button"
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader className="spinning" size={18} />
              Resetting Password...
            </>
          ) : (
            <>
              <Lock size={18} />
              Reset Password
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

  const renderSuccessForm = () => (
    <>
      <div className="success-header">
        <div className="success-icon">
          <CheckCircle size={64} color="#28a745" />
        </div>
        <h1>Password Reset Successfully!</h1>
        <p>Your password has been updated. You can now sign in with your new password.</p>
      </div>

      <div className="success-actions">
        <button
          className="success-button"
          onClick={() => navigate('/login')}
        >
          Sign In Now
        </button>
      </div>

      <div className="security-tips">
        <h4>Security Tips:</h4>
        <ul>
          <li>Don't share your password with anyone</li>
          <li>Use a unique password for this account</li>
          <li>Consider enabling two-factor authentication</li>
          <li>Update your password regularly</li>
        </ul>
      </div>
    </>
  );

  return (
    <div className="reset-password-container">
      <div className="reset-password-background">
        <div className="reset-password-card">
          {step === 'reset' && renderResetForm()}
          {step === 'success' && renderSuccessForm()}
        </div>
      </div>
    </div>
  );
};

export default ResetPassword; 