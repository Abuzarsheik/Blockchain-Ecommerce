import '../styles/Security.css';
import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { logger } from '../utils/logger';

import { 
  Shield, 
  Lock, 
  Key, 
  Bell, 
  Smartphone, 
  Settings, 
  AlertTriangle,
  CheckCircle,
  Clock,
  Monitor,
  MapPin,
  Eye,
  EyeOff,
  RefreshCw,
  LogOut,
  Download
} from 'lucide-react';

const Security = () => {
  const { user, isAuthenticated } = useSelector(state => state.auth);
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [loginSessions, setLoginSessions] = useState([]);
  const [securitySettings, setSecuritySettings] = useState({
    loginNotifications: true,
    emailAlerts: true,
    suspiciousActivityAlerts: true,
    sessionTimeout: 7
  });

  const fetchSecurityData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch user's actual security settings
      const response = await api.get('/auth/security-settings');
      if (response.data.securitySettings) {
        const settings = response.data.securitySettings;
        setTwoFactorEnabled(settings.twoFactorEnabled || false);
        setSecuritySettings({
          loginNotifications: settings.loginNotifications,
          emailAlerts: settings.emailAlerts,
          suspiciousActivityAlerts: settings.suspiciousActivityAlerts,
          sessionTimeout: settings.sessionTimeout
        });
      }
      
      // Mock login sessions data for demonstration
      setLoginSessions([
        {
          id: '1',
          device: 'Windows PC',
          browser: 'Chrome 91.0',
          location: 'New York, US',
          ipAddress: '192.168.1.100',
          timestamp: new Date(),
          isCurrent: true
        },
        {
          id: '2',
          device: 'iPhone 12',
          browser: 'Safari 14.0',
          location: 'New York, US',
          ipAddress: '192.168.1.101',
          timestamp: new Date(Date.now() - 3600000),
          isCurrent: false
        }
      ]);
      
    } catch (error) {
      logger.error('Error fetching security data:', error);
      toast.error('Failed to load security information');
      // Set defaults if fetch fails
      setSecuritySettings({
        loginNotifications: true,
        emailAlerts: true,
        suspiciousActivityAlerts: true,
        sessionTimeout: 7
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    
    fetchSecurityData();
  }, [isAuthenticated, navigate, fetchSecurityData]);

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 8) {
      toast.error('Password must be at least 8 characters long');
      return;
    }

    try {
      setLoading(true);
      
      const response = await api.put('/auth/change-password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });

      if (response.data.success) {
        toast.success('Password changed successfully');
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
      }
      
    } catch (error) {
      logger.error('Password change error:', error);
      toast.error(error.response?.data?.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle2FA = async () => {
    try {
      setLoading(true);
      
      if (twoFactorEnabled) {
        // Disable 2FA
        const response = await api.post('/auth/disable-2fa');
        if (response.data.success) {
          setTwoFactorEnabled(false);
          toast.success('Two-factor authentication disabled');
        }
      } else {
        // Redirect to 2FA setup
        navigate('/setup-2fa');
      }
      
    } catch (error) {
      logger.error('2FA toggle error:', error);
      toast.error('Failed to update two-factor authentication');
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeSession = async (sessionId) => {
    try {
      setLoading(true);
      
      // Mock session revocation
      setLoginSessions(prev => prev.filter(session => session.id !== sessionId));
      toast.success('Session revoked successfully');
      
    } catch (error) {
      logger.error('Session revoke error:', error);
      toast.error('Failed to revoke session');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSecuritySettings = async (settings) => {
    try {
      setLoading(true);
      
      const response = await api.put('/auth/security-settings', settings);
      if (response.data.message) {
        setSecuritySettings(settings);
        toast.success('Security settings updated successfully');
      }
      
    } catch (error) {
      logger.error('Settings update error:', error);
      toast.error(error.response?.data?.error || 'Failed to update security settings');
    } finally {
      setLoading(false);
    }
  };

  const downloadSecurityReport = async () => {
    try {
      toast.info('Generating security report...');
      
      // Mock report generation
      const report = {
        user: user?.email,
        generatedAt: new Date().toISOString(),
        twoFactorEnabled,
        activeSessions: loginSessions.length,
        recentLogins: loginSessions.slice(0, 5)
      };
      
      const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `security-report-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      
      toast.success('Security report downloaded');
      
    } catch (error) {
      logger.error('Report download error:', error);
      toast.error('Failed to download security report');
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="security-page">
      <div className="security-container">
        <div className="security-header">
          <div className="header-content">
            <div className="header-icon">
              <Shield size={32} />
            </div>
            <div className="header-text">
              <h1>Security Settings</h1>
              <p>Manage your account security and privacy preferences</p>
            </div>
          </div>
          
          <button 
            className="download-report-btn"
            onClick={downloadSecurityReport}
            disabled={loading}
          >
            <Download size={16} />
            Download Report
          </button>
        </div>

        <div className="security-tabs">
          <button 
            className={`tab-button ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            <Shield size={16} />
            Overview
          </button>
          
          <button 
            className={`tab-button ${activeTab === 'password' ? 'active' : ''}`}
            onClick={() => setActiveTab('password')}
          >
            <Lock size={16} />
            Password
          </button>
          
          <button 
            className={`tab-button ${activeTab === '2fa' ? 'active' : ''}`}
            onClick={() => setActiveTab('2fa')}
          >
            <Smartphone size={16} />
            Two-Factor Auth
          </button>
          
          <button 
            className={`tab-button ${activeTab === 'sessions' ? 'active' : ''}`}
            onClick={() => setActiveTab('sessions')}
          >
            <Monitor size={16} />
            Active Sessions
          </button>
          
          <button 
            className={`tab-button ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            <Settings size={16} />
            Preferences
          </button>
        </div>

        <div className="security-content">
          {activeTab === 'overview' && (
            <div className="overview-tab">
              <h2>Security Overview</h2>
              
              <div className="security-status-grid">
                <div className="status-card">
                  <div className="status-icon">
                    <Lock className={twoFactorEnabled ? 'enabled' : 'disabled'} />
                  </div>
                  <div className="status-content">
                    <h3>Two-Factor Authentication</h3>
                    <p className={twoFactorEnabled ? 'enabled' : 'disabled'}>
                      {twoFactorEnabled ? 'Enabled' : 'Disabled'}
                    </p>
                  </div>
                </div>
                
                <div className="status-card">
                  <div className="status-icon">
                    <Key className="enabled" />
                  </div>
                  <div className="status-content">
                    <h3>Strong Password</h3>
                    <p className="enabled">Active</p>
                  </div>
                </div>
                
                <div className="status-card">
                  <div className="status-icon">
                    <Monitor className="enabled" />
                  </div>
                  <div className="status-content">
                    <h3>Active Sessions</h3>
                    <p className="enabled">{loginSessions.length} device(s)</p>
                  </div>
                </div>
                
                <div className="status-card">
                  <div className="status-icon">
                    <Bell className={securitySettings.emailAlerts ? 'enabled' : 'disabled'} />
                  </div>
                  <div className="status-content">
                    <h3>Security Alerts</h3>
                    <p className={securitySettings.emailAlerts ? 'enabled' : 'disabled'}>
                      {securitySettings.emailAlerts ? 'Enabled' : 'Disabled'}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="security-recommendations">
                <h3>Security Recommendations</h3>
                <div className="recommendations-list">
                  {!twoFactorEnabled && (
                    <div className="recommendation-item warning">
                      <AlertTriangle size={20} />
                      <div>
                        <h4>Enable Two-Factor Authentication</h4>
                        <p>Add an extra layer of security to your account</p>
                      </div>
                      <button onClick={() => setActiveTab('2fa')} className="btn-secondary">
                        Setup Now
                      </button>
                    </div>
                  )}
                  
                  <div className="recommendation-item success">
                    <CheckCircle size={20} />
                    <div>
                      <h4>Regular Password Updates</h4>
                      <p>Your password was last changed recently</p>
                    </div>
                  </div>
                  
                  <div className="recommendation-item info">
                    <Monitor size={20} />
                    <div>
                      <h4>Review Active Sessions</h4>
                      <p>Check for any unrecognized login sessions</p>
                    </div>
                    <button onClick={() => setActiveTab('sessions')} className="btn-secondary">
                      Review
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'password' && (
            <div className="password-tab">
              <h2>Change Password</h2>
              
              <form onSubmit={handlePasswordChange} className="password-form">
                <div className="form-group">
                  <label>Current Password</label>
                  <div className="password-input-group">
                    <input
                      type={showPasswords.current ? 'text' : 'password'}
                      value={passwordData.currentPassword}
                      onChange={(e) => setPasswordData({
                        ...passwordData,
                        currentPassword: e.target.value
                      })}
                      required
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() => setShowPasswords({
                        ...showPasswords,
                        current: !showPasswords.current
                      })}
                    >
                      {showPasswords.current ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                
                <div className="form-group">
                  <label>New Password</label>
                  <div className="password-input-group">
                    <input
                      type={showPasswords.new ? 'text' : 'password'}
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData({
                        ...passwordData,
                        newPassword: e.target.value
                      })}
                      required
                      minLength={8}
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() => setShowPasswords({
                        ...showPasswords,
                        new: !showPasswords.new
                      })}
                    >
                      {showPasswords.new ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                
                <div className="form-group">
                  <label>Confirm New Password</label>
                  <div className="password-input-group">
                    <input
                      type={showPasswords.confirm ? 'text' : 'password'}
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData({
                        ...passwordData,
                        confirmPassword: e.target.value
                      })}
                      required
                      minLength={8}
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() => setShowPasswords({
                        ...showPasswords,
                        confirm: !showPasswords.confirm
                      })}
                    >
                      {showPasswords.confirm ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                
                <div className="password-requirements">
                  <h4>Password Requirements:</h4>
                  <ul>
                    <li className={passwordData.newPassword.length >= 8 ? 'valid' : ''}>
                      At least 8 characters long
                    </li>
                    <li className={/[A-Z]/.test(passwordData.newPassword) ? 'valid' : ''}>
                      Contains uppercase letter
                    </li>
                    <li className={/[a-z]/.test(passwordData.newPassword) ? 'valid' : ''}>
                      Contains lowercase letter
                    </li>
                    <li className={/\d/.test(passwordData.newPassword) ? 'valid' : ''}>
                      Contains number
                    </li>
                    <li className={/[!@#$%^&*(),.?":{}|<>]/.test(passwordData.newPassword) ? 'valid' : ''}>
                      Contains special character
                    </li>
                  </ul>
                </div>
                
                <button 
                  type="submit" 
                  className="btn-primary"
                  disabled={loading || !passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword}
                >
                  {loading ? 'Updating...' : 'Update Password'}
                </button>
              </form>
            </div>
          )}

          {activeTab === '2fa' && (
            <div className="two-factor-tab">
              <h2>Two-Factor Authentication</h2>
              
              <div className="two-factor-status">
                <div className="status-indicator">
                  <div className={`status-icon ${twoFactorEnabled ? 'enabled' : 'disabled'}`}>
                    <Smartphone size={24} />
                  </div>
                  <div className="status-text">
                    <h3>Two-Factor Authentication</h3>
                    <p className={twoFactorEnabled ? 'enabled' : 'disabled'}>
                      {twoFactorEnabled ? 'Enabled' : 'Disabled'}
                    </p>
                  </div>
                </div>
                
                <button 
                  className={`btn-${twoFactorEnabled ? 'danger' : 'primary'}`}
                  onClick={handleToggle2FA}
                  disabled={loading}
                >
                  {loading ? 'Processing...' : (twoFactorEnabled ? 'Disable 2FA' : 'Enable 2FA')}
                </button>
              </div>
              
              {twoFactorEnabled ? (
                <div className="two-factor-info">
                  <div className="info-card success">
                    <CheckCircle size={20} />
                    <div>
                      <h4>Two-Factor Authentication is Active</h4>
                      <p>Your account is protected with an additional security layer</p>
                    </div>
                  </div>
                  
                  <div className="backup-codes-section">
                    <h4>Backup Codes</h4>
                    <p>Save these backup codes in a safe place. You can use them to access your account if you lose your authentication device.</p>
                    <button className="btn-secondary">
                      <Download size={16} />
                      Download Backup Codes
                    </button>
                  </div>
                </div>
              ) : (
                <div className="two-factor-setup">
                  <div className="info-card warning">
                    <AlertTriangle size={20} />
                    <div>
                      <h4>Two-Factor Authentication Disabled</h4>
                      <p>Your account is vulnerable. Enable 2FA to add an extra layer of security.</p>
                    </div>
                  </div>
                  
                  <div className="setup-steps">
                    <h4>How to Setup:</h4>
                    <ol>
                      <li>Download an authenticator app (Google Authenticator, Authy, etc.)</li>
                      <li>Click "Enable 2FA" to get your QR code</li>
                      <li>Scan the QR code with your authenticator app</li>
                      <li>Enter the verification code to complete setup</li>
                    </ol>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'sessions' && (
            <div className="sessions-tab">
              <h2>Active Login Sessions</h2>
              
              <div className="sessions-list">
                {loginSessions.map((session) => (
                  <div key={session.id} className={`session-card ${session.isCurrent ? 'current' : ''}`}>
                    <div className="session-info">
                      <div className="session-device">
                        <Monitor size={20} />
                        <div>
                          <h4>{session.device}</h4>
                          <p>{session.browser}</p>
                        </div>
                      </div>
                      
                      <div className="session-details">
                        <div className="detail-item">
                          <MapPin size={14} />
                          <span>{session.location}</span>
                        </div>
                        <div className="detail-item">
                          <Clock size={14} />
                          <span>{session.timestamp.toLocaleString()}</span>
                        </div>
                        <div className="detail-item">
                          <span className="ip-address">{session.ipAddress}</span>
                        </div>
                      </div>
                    </div>
                    
                    {session.isCurrent ? (
                      <div className="current-session-badge">
                        <CheckCircle size={16} />
                        Current Session
                      </div>
                    ) : (
                      <button 
                        className="btn-danger-outline"
                        onClick={() => handleRevokeSession(session.id)}
                        disabled={loading}
                      >
                        <LogOut size={16} />
                        Revoke
                      </button>
                    )}
                  </div>
                ))}
              </div>
              
              <div className="sessions-actions">
                <button className="btn-secondary">
                  <RefreshCw size={16} />
                  Refresh Sessions
                </button>
                <button className="btn-danger">
                  <LogOut size={16} />
                  Sign Out All Other Sessions
                </button>
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="settings-tab">
              <h2>Security Preferences</h2>
              
              <div className="settings-form">
                <div className="setting-group">
                  <h3>Notifications</h3>
                  
                  <div className="setting-item">
                    <div className="setting-info">
                      <h4>Login Notifications</h4>
                      <p>Get notified when someone signs into your account</p>
                    </div>
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={securitySettings.loginNotifications}
                        onChange={(e) => setSecuritySettings({
                          ...securitySettings,
                          loginNotifications: e.target.checked
                        })}
                      />
                      <span className="slider"></span>
                    </label>
                  </div>
                  
                  <div className="setting-item">
                    <div className="setting-info">
                      <h4>Email Security Alerts</h4>
                      <p>Receive email alerts for security-related activities</p>
                    </div>
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={securitySettings.emailAlerts}
                        onChange={(e) => setSecuritySettings({
                          ...securitySettings,
                          emailAlerts: e.target.checked
                        })}
                      />
                      <span className="slider"></span>
                    </label>
                  </div>
                  
                  <div className="setting-item">
                    <div className="setting-info">
                      <h4>Suspicious Activity Alerts</h4>
                      <p>Get notified about suspicious login attempts</p>
                    </div>
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={securitySettings.suspiciousActivityAlerts}
                        onChange={(e) => setSecuritySettings({
                          ...securitySettings,
                          suspiciousActivityAlerts: e.target.checked
                        })}
                      />
                      <span className="slider"></span>
                    </label>
                  </div>
                </div>
                
                <div className="setting-group">
                  <h3>Session Management</h3>
                  
                  <div className="setting-item">
                    <div className="setting-info">
                      <h4>Session Timeout</h4>
                      <p>Automatically log out after period of inactivity</p>
                    </div>
                    <select
                      value={securitySettings.sessionTimeout}
                      onChange={(e) => setSecuritySettings({
                        ...securitySettings,
                        sessionTimeout: parseInt(e.target.value)
                      })}
                      className="setting-select"
                    >
                      <option value={1}>1 day</option>
                      <option value={7}>7 days</option>
                      <option value={30}>30 days</option>
                      <option value={0}>Never</option>
                    </select>
                  </div>
                </div>
                
                <button 
                  className="btn-primary"
                  onClick={() => handleUpdateSecuritySettings(securitySettings)}
                  disabled={loading}
                >
                  {loading ? 'Saving...' : 'Save Preferences'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Security; 
