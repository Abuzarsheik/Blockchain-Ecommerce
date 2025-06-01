import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Smartphone, Copy, CheckCircle, AlertCircle, Loader, Download, Eye, EyeOff } from 'lucide-react';
import { toast } from 'react-toastify';
import api from '../services/api';
import '../styles/Auth.css';

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
      setError('Please enter a valid 6-digit code');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await api.post('/auth/verify-2fa', { code: verificationCode });
      setStep('backup');
      toast.success('2FA verified successfully!');
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
    setTimeout(() => navigate('/dashboard'), 2000);
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
    const content = `Two-Factor Authentication Backup Codes\n\nGenerated: ${new Date().toLocaleString()}\n\nBackup Codes:\n${backupCodes.map((code, index) => `${index + 1}. ${code}`).join('\n')}\n\nIMPORTANT:\n- Keep these codes safe and secure\n- Each code can only be used once\n- Use these codes if you lose access to your authenticator app\n- Do not share these codes with anyone`;
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'backup-codes.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success('Backup codes downloaded');
  };

  const renderIntro = () => (
    <div className="setup-step">
      <div className="step-header">
        <div className="step-icon">
          <Shield size={48} />
        </div>
        <h1>Enable Two-Factor Authentication</h1>
        <p>
          Add an extra layer of security to your account by enabling two-factor authentication (2FA).
        </p>
      </div>

      <div className="benefits-list">
        <h3>Benefits of 2FA:</h3>
        <ul>
          <li>
            <CheckCircle size={16} />
            Protects your account even if your password is compromised
          </li>
          <li>
            <CheckCircle size={16} />
            Prevents unauthorized access to your NFTs and wallet
          </li>
          <li>
            <CheckCircle size={16} />
            Provides peace of mind with enterprise-level security
          </li>
          <li>
            <CheckCircle size={16} />
            Required for high-value transactions
          </li>
        </ul>
      </div>

      <div className="requirements">
        <h3>You'll need:</h3>
        <div className="requirement-item">
          <Smartphone size={20} />
          <span>A smartphone with an authenticator app installed</span>
        </div>
        <p className="requirement-note">
          We recommend: Google Authenticator, Microsoft Authenticator, or Authy
        </p>
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
          'Get Started'
        )}
      </button>
    </div>
  );

  const renderSetup = () => (
    <div className="setup-step">
      <div className="step-header">
        <div className="step-icon">
          <Smartphone size={48} />
        </div>
        <h1>Scan QR Code</h1>
        <p>
          Open your authenticator app and scan the QR code below, or enter the secret key manually.
        </p>
      </div>

      <div className="qr-section">
        <div className="qr-code-container">
          <img src={qrCode} alt="2FA QR Code" className="qr-code" />
        </div>
        
        <div className="manual-setup">
          <h3>Can't scan the QR code?</h3>
          <p>Enter this secret key manually in your authenticator app:</p>
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
            >
              {showSecret ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
            <button
              type="button"
              className="copy-button"
              onClick={() => copyToClipboard(secret, 'Secret key')}
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
          Back
        </button>
        <button
          className="primary-button"
          onClick={() => setStep('verify')}
        >
          Next: Verify Setup
        </button>
      </div>
    </div>
  );

  const renderVerify = () => (
    <div className="setup-step">
      <div className="step-header">
        <div className="step-icon">
          <Shield size={48} />
        </div>
        <h1>Verify Your Setup</h1>
        <p>
          Enter the 6-digit verification code from your authenticator app to confirm everything is working.
        </p>
      </div>

      <form onSubmit={handleVerify} className="verification-form">
        <div className="form-group">
          <label htmlFor="verificationCode" className="form-label">
            Verification Code
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
              <AlertCircle size={14} />
              {error}
            </span>
          )}
        </div>

        <div className="step-actions">
          <button
            type="button"
            className="secondary-button"
            onClick={() => setStep('setup')}
          >
            Back
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
              'Verify & Continue'
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
          <li>You'll be asked for a 2FA code when signing in</li>
          <li>Your backup codes are saved securely</li>
          <li>You can manage 2FA settings in your security preferences</li>
        </ul>
      </div>

      <div className="loading-indicator">
        <Loader className="spinning" size={24} />
        <span>Redirecting to dashboard...</span>
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