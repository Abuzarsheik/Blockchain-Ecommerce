import '../styles/Auth.css';
import React, { useState } from 'react';
import api from '../services/api';
import { Shield, Smartphone, Copy, CheckCircle, AlertCircle, Loader, Download, Eye, EyeOff, ExternalLink } from 'lucide-react';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';

const TwoFactorSetup = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState('intro'); // 'intro', 'setup', 'verify', 'backup', 'complete'
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [backupCodes, setBackupCodes] = useState([]);
  const [verificationCode, setVerificationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  const [confirmedBackup, setConfirmedBackup] = useState(false);

  const handleStartSetup = async () => {
    setLoading(true);
    try {
      const response = await api.post('/auth/setup-2fa');
      setQrCode(response.data.qrCode);
      setSecret(response.data.secret);
      setBackupCodes(response.data.backupCodes);
      setStep('setup');
      toast.success('2FA setup ready! Please scan the QR code with Google Authenticator.');
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Failed to initialize 2FA setup';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    
    if (!/^\d{6}$/.test(verificationCode)) {
      setError('Please enter a valid 6-digit code from Google Authenticator');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await api.post('/auth/verify-2fa', { code: verificationCode });
      setStep('backup');
      toast.success('2FA verified successfully with Google Authenticator!');
    } catch (error) {
      const errorMessage = error.response?.data?.error || '2FA verification failed';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = () => {
    if (!confirmedBackup) {
      toast.error('Please confirm you have saved your backup codes');
      return;
    }
    setStep('complete');
    setTimeout(() => {
      navigate('/profile-settings?from=2fa-setup&success=true#security');
    }, 2000);
  };

  const copyToClipboard = async (text, type) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${type} copied to clipboard`);
    } catch (error) {
      toast.error('Failed to copy to clipboard');
    }
  };

  const downloadBackupCodes = () => {
    const content = `Blocmerce Platform - Two-Factor Authentication Backup Codes\n\nGenerated: ${new Date().toLocaleString()}\n\nBackup Codes:\n${backupCodes.map((code, index) => `${index + 1}. ${code}`).join('\n')}\n\nIMPORTANT SECURITY INSTRUCTIONS:\n- Keep these codes safe and secure\n- Each code can only be used once\n- Use these codes if you lose access to your Google Authenticator app\n- Do not share these codes with anyone\n- Store these codes in a secure location separate from your device\n\nContact support if you need assistance: support@blocmerce.com`;
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'blocmerce-backup-codes.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success('Backup codes downloaded successfully');
  };

  const renderIntro = () => (
    <div className="setup-step">
      <div className="step-header">
        <div className="step-icon">
          <Shield size={64} />
        </div>
        <h1>Enable Two-Factor Authentication</h1>
        <p>
          Secure your Blocmerce account with Google Authenticator for enterprise-level protection of your digital assets and transactions.
        </p>
      </div>

      <div className="benefits-list">
        <h3>🔒 Security Benefits:</h3>
        <ul>
          <li>
            <CheckCircle size={20} />
            Protects your account even if your password is compromised
          </li>
          <li>
            <CheckCircle size={20} />
            Prevents unauthorized access to your NFTs, wallet, and transactions
          </li>
          <li>
            <CheckCircle size={20} />
            Provides military-grade security for your digital assets
          </li>
          <li>
            <CheckCircle size={20} />
            Required for high-value transactions and withdrawals
          </li>
          <li>
            <CheckCircle size={20} />
            Works offline - no internet required after setup
          </li>
        </ul>
      </div>

      <div className="requirements">
        <h3>📱 You'll Need:</h3>
        <div className="requirement-item">
          <Smartphone size={24} />
          <div>
            <strong>Google Authenticator App</strong>
            <p>Download from your app store (recommended)</p>
          </div>
        </div>
        <div className="requirement-item">
          <Shield size={24} />
          <div>
            <strong>Alternative Apps</strong>
            <p>Microsoft Authenticator, Authy, or any TOTP app</p>
          </div>
        </div>
        <div className="app-links">
          <h4>📲 Download Google Authenticator:</h4>
          <div className="store-links">
            <a href="https://apps.apple.com/app/google-authenticator/id388497605" target="_blank" rel="noopener noreferrer" className="store-link">
              <ExternalLink size={16} />
              iOS App Store
            </a>
            <a href="https://play.google.com/store/apps/details?id=com.google.android.apps.authenticator2" target="_blank" rel="noopener noreferrer" className="store-link">
              <ExternalLink size={16} />
              Google Play Store
            </a>
          </div>
        </div>
      </div>

      <button
        className="primary-button"
        onClick={handleStartSetup}
        disabled={loading}
      >
        {loading ? (
          <>
            <Loader className="spinning" size={18} />
            Setting up...
          </>
        ) : (
          <>
            <Shield size={18} />
            Get Started - Enable 2FA
          </>
        )}
      </button>
    </div>
  );

  const renderSetup = () => (
    <div className="setup-step">
      <div className="step-header">
        <div className="step-icon">
          <Smartphone size={64} />
        </div>
        <h1>Scan QR Code</h1>
        <p>
          Open <strong>Google Authenticator</strong> on your phone and scan the QR code below. If you can't scan, enter the secret key manually.
        </p>
      </div>

      <div className="google-auth-instructions">
        <h3>📱 Google Authenticator Setup Steps:</h3>
        <div className="instruction-steps">
          <div className="instruction-step">
            <span className="step-number">1</span>
            <div className="step-content">
              <strong>Open Google Authenticator</strong>
              <p>Launch the Google Authenticator app on your smartphone</p>
            </div>
          </div>
          <div className="instruction-step">
            <span className="step-number">2</span>
            <div className="step-content">
              <strong>Tap the "+" button</strong>
              <p>Add a new account to your authenticator</p>
            </div>
          </div>
          <div className="instruction-step">
            <span className="step-number">3</span>
            <div className="step-content">
              <strong>Select "Scan a QR code"</strong>
              <p>Choose the QR code scanning option</p>
            </div>
          </div>
          <div className="instruction-step">
            <span className="step-number">4</span>
            <div className="step-content">
              <strong>Scan the code below</strong>
              <p>Point your camera at the QR code</p>
            </div>
          </div>
        </div>
      </div>

      <div className="qr-section">
        <div className="qr-code-container">
          <img src={qrCode} alt="2FA QR Code for Google Authenticator" className="qr-code" />
          <div className="qr-label">
            <Shield size={20} />
            <span>Scan with Google Authenticator</span>
          </div>
        </div>
        
        <div className="manual-setup">
          <h3>🔑 Can't scan the QR code?</h3>
          <p>Enter this secret key manually in Google Authenticator:</p>
          <div className="account-info">
            <div className="info-row">
              <label>Account:</label>
              <span>Blocmerce Platform</span>
            </div>
            <div className="info-row">
              <label>Your Email:</label>
              <span>{JSON.parse(localStorage.getItem('user'))?.email || 'Your Account'}</span>
            </div>
          </div>
          <div className="secret-key">
            <input
              type={showSecret ? 'text' : 'password'}
              value={secret}
              readOnly
              className="secret-input"
            />
            <button
              type="button"
              className="toggle-secret"
              onClick={() => setShowSecret(!showSecret)}
              title={showSecret ? 'Hide secret' : 'Show secret'}
            >
              {showSecret ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
            <button
              type="button"
              className="copy-button"
              onClick={() => copyToClipboard(secret, 'Secret key')}
              title="Copy secret key"
            >
              <Copy size={16} />
            </button>
          </div>
        </div>
      </div>

      <div className="step-actions">
        <button
          className="secondary-button"
          onClick={() => setStep('intro')}
        >
          ← Back
        </button>
        <button
          className="primary-button"
          onClick={() => setStep('verify')}
        >
          Next: Verify Setup →
        </button>
      </div>
    </div>
  );

  const renderVerify = () => (
    <div className="setup-step">
      <div className="step-header">
        <div className="step-icon">
          <Shield size={64} />
        </div>
        <h1>Verify Your Setup</h1>
        <p>
          Enter the <strong>6-digit verification code</strong> from your <strong>Google Authenticator app</strong> to confirm everything is working correctly.
        </p>
      </div>

      <div className="verification-instructions">
        <h3>📱 How to get the code:</h3>
        <div className="verify-steps">
          <div className="verify-step">
            <span className="step-number">1</span>
            <span>Open Google Authenticator</span>
          </div>
          <div className="verify-step">
            <span className="step-number">2</span>
            <span>Find "Blocmerce Platform"</span>
          </div>
          <div className="verify-step">
            <span className="step-number">3</span>
            <span>Enter the 6-digit code below</span>
          </div>
        </div>
      </div>

      <form onSubmit={handleVerify} className="verification-form">
        <div className="form-group">
          <label htmlFor="verificationCode" className="form-label">
            <Shield size={20} />
            Verification Code from Google Authenticator
          </label>
          <input
            type="text"
            id="verificationCode"
            value={verificationCode}
            onChange={(e) => {
              const value = e.target.value.replace(/\D/g, '').slice(0, 6);
              setVerificationCode(value);
              if (error) setError('');
            }}
            className={`verification-input ${error ? 'error' : ''}`}
            placeholder="000000"
            maxLength="6"
            autoComplete="one-time-code"
          />
          {error && (
            <span className="error-message">
              <AlertCircle size={16} />
              {error}
            </span>
          )}
          <small className="input-help">
            The code changes every 30 seconds. Make sure to use the current code.
          </small>
        </div>

        <div className="step-actions">
          <button
            type="button"
            className="secondary-button"
            onClick={() => setStep('setup')}
          >
            ← Back
          </button>
          <button
            type="submit"
            className="primary-button"
            disabled={loading || verificationCode.length !== 6}
          >
            {loading ? (
              <>
                <Loader className="spinning" size={18} />
                Verifying...
              </>
            ) : (
              <>
                <CheckCircle size={18} />
                Verify & Continue →
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );

  const renderBackup = () => (
    <div className="setup-step">
      <div className="step-header">
        <div className="step-icon">
          <Download size={48} />
        </div>
        <h1>Save Your Backup Codes</h1>
        <p>
          These backup codes will help you regain access to your account if you lose your phone.
          Each code can only be used once.
        </p>
      </div>

      <div className="backup-codes-section">
        <div className="backup-codes-header">
          <h3>Backup Codes</h3>
          <div className="backup-actions">
            <button
              type="button"
              className="action-button"
              onClick={() => setShowBackupCodes(!showBackupCodes)}
            >
              {showBackupCodes ? <EyeOff size={16} /> : <Eye size={16} />}
              {showBackupCodes ? 'Hide' : 'Show'}
            </button>
            <button
              type="button"
              className="action-button"
              onClick={() => copyToClipboard(backupCodes.join('\n'), 'Backup codes')}
            >
              <Copy size={16} />
              Copy
            </button>
            <button
              type="button"
              className="action-button"
              onClick={downloadBackupCodes}
            >
              <Download size={16} />
              Download
            </button>
          </div>
        </div>

        <div className={`backup-codes-grid ${showBackupCodes ? 'visible' : 'hidden'}`}>
          {backupCodes.map((code, index) => (
            <div key={index} className="backup-code">
              <span className="code-number">{index + 1}.</span>
              <span className="code-value">{showBackupCodes ? code : '••••••••'}</span>
            </div>
          ))}
        </div>

        <div className="backup-warning">
          <AlertCircle size={20} />
          <div>
            <strong>Important:</strong> Store these codes in a safe place. 
            If you lose access to your authenticator app, these codes are the only way to regain access to your account.
          </div>
        </div>

        <label className="confirmation-checkbox">
          <input
            type="checkbox"
            checked={confirmedBackup}
            onChange={(e) => setConfirmedBackup(e.target.checked)}
          />
          <span className="checkmark"></span>
          I have securely saved my backup codes
        </label>
      </div>

      <div className="step-actions">
        <button
          type="button"
          className="secondary-button"
          onClick={() => setStep('verify')}
        >
          Back
        </button>
        <button
          className="primary-button"
          onClick={handleComplete}
          disabled={!confirmedBackup}
        >
          Complete Setup
        </button>
      </div>
    </div>
  );

  const renderComplete = () => (
    <div className="setup-step">
      <div className="step-header">
        <div className="step-icon success">
          <CheckCircle size={48} />
        </div>
        <h1>2FA Enabled Successfully!</h1>
        <p>
          Your account is now protected with two-factor authentication. 
          You'll be prompted for a verification code each time you sign in.
        </p>
      </div>

      <div className="success-info">
        <h3>What happens next?</h3>
        <ul>
          <li>✅ Your security score has increased by +30 points</li>
          <li>✅ You'll be asked for a 2FA code when signing in</li>
          <li>✅ Your backup codes are saved securely</li>
          <li>✅ You can manage 2FA settings in your security preferences</li>
        </ul>
      </div>

      <div className="loading-indicator">
        <Loader className="spinning" size={24} />
        <span>Redirecting to security settings...</span>
      </div>
    </div>
  );

  return (
    <div className="two-factor-setup">
      <div className="setup-container">
        <div className="setup-card">
          <div className="progress-indicator">
            <div className={`progress-step ${step === 'intro' ? 'active' : step !== 'intro' ? 'completed' : ''}`}>1</div>
            <div className="progress-line"></div>
            <div className={`progress-step ${step === 'setup' ? 'active' : ['verify', 'backup', 'complete'].includes(step) ? 'completed' : ''}`}>2</div>
            <div className="progress-line"></div>
            <div className={`progress-step ${step === 'verify' ? 'active' : ['backup', 'complete'].includes(step) ? 'completed' : ''}`}>3</div>
            <div className="progress-line"></div>
            <div className={`progress-step ${step === 'backup' ? 'active' : step === 'complete' ? 'completed' : ''}`}>4</div>
          </div>

          {step === 'intro' && renderIntro()}
          {step === 'setup' && renderSetup()}
          {step === 'verify' && renderVerify()}
          {step === 'backup' && renderBackup()}
          {step === 'complete' && renderComplete()}
        </div>
      </div>
    </div>
  );
};

export default TwoFactorSetup; 