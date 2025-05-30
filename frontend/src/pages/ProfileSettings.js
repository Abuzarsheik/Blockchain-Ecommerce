import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    User, 
    Mail, 
    Phone, 
    MapPin, 
    Edit3, 
    Camera, 
    Wallet, 
    Shield, 
    Bell, 
    Lock, 
    Eye,
    EyeOff,
    Save,
    Upload,
    Check,
    X,
    AlertCircle,
    FileText,
    CreditCard,
    CheckCircle
} from 'lucide-react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import '../styles/ProfileSettings.css';

const ProfileSettings = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('profile');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    
    // Profile state
    const [profile, setProfile] = useState({
        firstName: '',
        lastName: '',
        username: '',
        email: '',
        profile: {
            bio: '',
            location: '',
            website: '',
            avatar: null,
            social: {
                twitter: '',
                instagram: '',
                discord: ''
            },
            notifications: {
                email: {
                    marketing: true,
                    security: true,
                    transactions: true,
                    updates: true
                },
                push: {
                    enabled: false,
                    marketing: false,
                    security: true,
                    transactions: true
                }
            },
            privacy: {
                profileVisibility: 'public',
                showTransactionHistory: false,
                showWalletAddress: false
            }
        },
        wallet_address: '',
        isVerified: false,
        emailVerified: false
    });

    // KYC state
    const [kyc, setKyc] = useState({
        status: 'pending',
        level: 'basic',
        completionPercentage: 0,
        isApproved: false,
        personalInfo: {
            dateOfBirth: '',
            nationality: '',
            countryOfResidence: '',
            phoneNumber: '',
            address: {
                street: '',
                city: '',
                state: '',
                postalCode: '',
                country: ''
            },
            occupation: '',
            sourceOfFunds: ''
        },
        documents: {
            identity: {
                type: '',
                verified: false,
                hasFiles: false
            },
            proofOfAddress: {
                type: '',
                verified: false,
                hasFiles: false
            },
            selfie: {
                verified: false,
                hasFiles: false
            }
        },
        transactionLimits: {
            daily: 1000,
            monthly: 10000,
            yearly: 100000
        }
    });

    const [kycStep, setKycStep] = useState('personal');
    const [uploadingFiles, setUploadingFiles] = useState(false);

    useEffect(() => {
        loadUserProfile();
    }, []);

    const loadUserProfile = async () => {
        try {
            setLoading(true);
            const [profileRes, kycRes] = await Promise.all([
                api.get('/profile'),
                api.get('/profile/kyc')
            ]);

            setProfile(profileRes.data.user);
            setKyc(kycRes.data.kyc);
        } catch (error) {
            console.error('Error loading profile:', error);
            toast.error('Failed to load profile information');
        } finally {
            setLoading(false);
        }
    };

    const handleProfileUpdate = async (e) => {
        e.preventDefault();
        try {
            setSaving(true);
            await api.put('/profile', profile);
            toast.success('Profile updated successfully!');
        } catch (error) {
            console.error('Error updating profile:', error);
            toast.error(error.response?.data?.error || 'Failed to update profile');
        } finally {
            setSaving(false);
        }
    };

    const handleAvatarUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            toast.error('File size must be less than 5MB');
            return;
        }

        try {
            const formData = new FormData();
            formData.append('avatar', file);

            const response = await api.post('/profile/avatar', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            setProfile(prev => ({
                ...prev,
                profile: {
                    ...prev.profile,
                    avatar: response.data.avatar
                }
            }));

            toast.success('Avatar updated successfully!');
        } catch (error) {
            console.error('Error uploading avatar:', error);
            toast.error('Failed to upload avatar');
        }
    };

    const handleKycPersonalInfo = async (e) => {
        e.preventDefault();
        try {
            setSaving(true);
            await api.post('/profile/kyc/personal-info', kyc.personalInfo);
            toast.success('Personal information saved successfully!');
            setKycStep('documents');
        } catch (error) {
            console.error('Error saving personal info:', error);
            toast.error(error.response?.data?.error || 'Failed to save personal information');
        } finally {
            setSaving(false);
        }
    };

    const handleDocumentUpload = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);

        try {
            setUploadingFiles(true);
            const response = await api.post('/profile/kyc/documents', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            toast.success('Documents uploaded successfully!');
            setKyc(prev => ({
                ...prev,
                completionPercentage: response.data.completionPercentage
            }));
            setKycStep('review');
        } catch (error) {
            console.error('Error uploading documents:', error);
            toast.error(error.response?.data?.error || 'Failed to upload documents');
        } finally {
            setUploadingFiles(false);
        }
    };

    const submitKycApplication = async () => {
        try {
            setSaving(true);
            await api.post('/profile/kyc/submit');
            toast.success('KYC application submitted for review!');
            loadUserProfile(); // Reload to get updated status
        } catch (error) {
            console.error('Error submitting KYC:', error);
            toast.error(error.response?.data?.error || 'Failed to submit KYC application');
        } finally {
            setSaving(false);
        }
    };

    const getKycStatusBadge = (status) => {
        const badges = {
            pending: { color: 'orange', text: 'Pending', icon: AlertCircle },
            in_review: { color: 'blue', text: 'In Review', icon: FileText },
            approved: { color: 'green', text: 'Approved', icon: CheckCircle },
            rejected: { color: 'red', text: 'Rejected', icon: X }
        };
        
        const badge = badges[status] || badges.pending;
        const Icon = badge.icon;
        
        return (
            <span className={`kyc-status-badge ${badge.color}`}>
                <Icon size={14} />
                {badge.text}
            </span>
        );
    };

    if (loading) {
        return (
            <div className="profile-settings loading">
                <div className="loading-spinner">Loading...</div>
            </div>
        );
    }

    return (
        <div className="profile-settings">
            <div className="settings-container">
                <h1>Account Settings</h1>
                
                {/* Tab Navigation */}
                <div className="settings-tabs">
                    <button 
                        className={`tab ${activeTab === 'profile' ? 'active' : ''}`}
                        onClick={() => setActiveTab('profile')}
                    >
                        <User size={16} />
                        Profile
                    </button>
                    <button 
                        className={`tab ${activeTab === 'kyc' ? 'active' : ''}`}
                        onClick={() => setActiveTab('kyc')}
                    >
                        <Shield size={16} />
                        Identity Verification
                        {kyc.status !== 'approved' && (
                            <span className="kyc-indicator">!</span>
                        )}
                    </button>
                    <button 
                        className={`tab ${activeTab === 'security' ? 'active' : ''}`}
                        onClick={() => setActiveTab('security')}
                    >
                        <Lock size={16} />
                        Security
                    </button>
                    <button 
                        className={`tab ${activeTab === 'notifications' ? 'active' : ''}`}
                        onClick={() => setActiveTab('notifications')}
                    >
                        <Bell size={16} />
                        Notifications
                    </button>
                </div>

                {/* Tab Content */}
                <div className="tab-content">
                    {/* Profile Tab */}
                    {activeTab === 'profile' && (
                        <div className="profile-tab">
                            <div className="profile-header">
                                <div className="avatar-section">
                                    <div className="avatar-container">
                                        <img 
                                            src={profile.profile?.avatar || '/api/placeholder/120/120'} 
                                            alt="Profile Avatar"
                                            className="profile-avatar"
                                        />
                                        <label className="avatar-upload-btn">
                                            <Camera size={16} />
                                            <input 
                                                type="file" 
                                                accept="image/*" 
                                                onChange={handleAvatarUpload}
                                                hidden 
                                            />
                                        </label>
                                    </div>
                                    <div className="verification-badges">
                                        {profile.emailVerified && (
                                            <span className="badge verified">
                                                <CheckCircle size={14} />
                                                Email Verified
                                            </span>
                                        )}
                                        {profile.isVerified && (
                                            <span className="badge verified">
                                                <Shield size={14} />
                                                KYC Verified
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <form onSubmit={handleProfileUpdate} className="profile-form">
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>
                                            <User size={16} />
                                            First Name
                                        </label>
                                        <input
                                            type="text"
                                            value={profile.firstName}
                                            onChange={(e) => setProfile({...profile, firstName: e.target.value})}
                                            required
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>
                                            <User size={16} />
                                            Last Name
                                        </label>
                                        <input
                                            type="text"
                                            value={profile.lastName}
                                            onChange={(e) => setProfile({...profile, lastName: e.target.value})}
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label>
                                        <User size={16} />
                                        Username
                                    </label>
                                    <input
                                        type="text"
                                        value={profile.username}
                                        onChange={(e) => setProfile({...profile, username: e.target.value})}
                                        required
                                    />
                                </div>

                                <div className="form-group">
                                    <label>
                                        <Mail size={16} />
                                        Email Address
                                    </label>
                                    <input
                                        type="email"
                                        value={profile.email}
                                        disabled
                                        className="disabled"
                                    />
                                    <small>Email address cannot be changed</small>
                                </div>

                                <div className="form-group">
                                    <label>
                                        <Edit3 size={16} />
                                        Bio
                                    </label>
                                    <textarea
                                        value={profile.profile?.bio || ''}
                                        onChange={(e) => setProfile({
                                            ...profile,
                                            profile: { ...profile.profile, bio: e.target.value }
                                        })}
                                        placeholder="Tell us about yourself..."
                                        rows={3}
                                    />
                                </div>

                                <div className="form-row">
                                    <div className="form-group">
                                        <label>
                                            <MapPin size={16} />
                                            Location
                                        </label>
                                        <input
                                            type="text"
                                            value={profile.profile?.location || ''}
                                            onChange={(e) => setProfile({
                                                ...profile,
                                                profile: { ...profile.profile, location: e.target.value }
                                            })}
                                            placeholder="City, Country"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>
                                            <Wallet size={16} />
                                            Wallet Address
                                        </label>
                                        <input
                                            type="text"
                                            value={profile.wallet_address || ''}
                                            disabled
                                            className="disabled"
                                        />
                                        <small>Wallet address is automatically linked</small>
                                    </div>
                                </div>

                                <button type="submit" className="save-btn" disabled={saving}>
                                    <Save size={16} />
                                    {saving ? 'Saving...' : 'Save Changes'}
                                </button>
                            </form>
                        </div>
                    )}

                    {/* KYC Tab */}
                    {activeTab === 'kyc' && (
                        <div className="kyc-tab">
                            <div className="kyc-header">
                                <h2>Identity Verification (KYC)</h2>
                                <div className="kyc-status">
                                    {getKycStatusBadge(kyc.status)}
                                    <div className="completion-bar">
                                        <div 
                                            className="completion-fill"
                                            style={{ width: `${kyc.completionPercentage}%` }}
                                        ></div>
                                    </div>
                                    <span className="completion-text">
                                        {kyc.completionPercentage}% Complete
                                    </span>
                                </div>
                            </div>

                            {kyc.status === 'approved' ? (
                                <div className="kyc-approved">
                                    <CheckCircle size={64} className="success-icon" />
                                    <h3>Identity Verified!</h3>
                                    <p>Your identity has been successfully verified. You now have full access to all platform features.</p>
                                    <div className="limits-info">
                                        <h4>Your Transaction Limits:</h4>
                                        <div className="limits-grid">
                                            <div className="limit-item">
                                                <span className="limit-label">Daily</span>
                                                <span className="limit-value">${kyc.transactionLimits?.daily?.toLocaleString()}</span>
                                            </div>
                                            <div className="limit-item">
                                                <span className="limit-label">Monthly</span>
                                                <span className="limit-value">${kyc.transactionLimits?.monthly?.toLocaleString()}</span>
                                            </div>
                                            <div className="limit-item">
                                                <span className="limit-label">Yearly</span>
                                                <span className="limit-value">${kyc.transactionLimits?.yearly?.toLocaleString()}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="kyc-form">
                                    {/* KYC Steps Navigation */}
                                    <div className="kyc-steps">
                                        <div className={`step ${kycStep === 'personal' ? 'active' : kyc.personalInfo.dateOfBirth ? 'completed' : ''}`}>
                                            <span className="step-number">1</span>
                                            <span className="step-title">Personal Information</span>
                                        </div>
                                        <div className={`step ${kycStep === 'documents' ? 'active' : kyc.documents.identity.hasFiles ? 'completed' : ''}`}>
                                            <span className="step-number">2</span>
                                            <span className="step-title">Document Upload</span>
                                        </div>
                                        <div className={`step ${kycStep === 'review' ? 'active' : ''}`}>
                                            <span className="step-number">3</span>
                                            <span className="step-title">Review & Submit</span>
                                        </div>
                                    </div>

                                    {/* Step Content */}
                                    {kycStep === 'personal' && (
                                        <form onSubmit={handleKycPersonalInfo} className="kyc-personal-form">
                                            <h3>Personal Information</h3>
                                            
                                            <div className="form-row">
                                                <div className="form-group">
                                                    <label>Date of Birth</label>
                                                    <input
                                                        type="date"
                                                        value={kyc.personalInfo.dateOfBirth}
                                                        onChange={(e) => setKyc({
                                                            ...kyc,
                                                            personalInfo: { ...kyc.personalInfo, dateOfBirth: e.target.value }
                                                        })}
                                                        required
                                                    />
                                                </div>
                                                <div className="form-group">
                                                    <label>Nationality</label>
                                                    <select
                                                        value={kyc.personalInfo.nationality}
                                                        onChange={(e) => setKyc({
                                                            ...kyc,
                                                            personalInfo: { ...kyc.personalInfo, nationality: e.target.value }
                                                        })}
                                                        required
                                                    >
                                                        <option value="">Select Nationality</option>
                                                        <option value="US">United States</option>
                                                        <option value="CA">Canada</option>
                                                        <option value="GB">United Kingdom</option>
                                                        <option value="DE">Germany</option>
                                                        <option value="FR">France</option>
                                                        {/* Add more countries as needed */}
                                                    </select>
                                                </div>
                                            </div>

                                            <div className="form-group">
                                                <label>Phone Number</label>
                                                <input
                                                    type="tel"
                                                    value={kyc.personalInfo.phoneNumber}
                                                    onChange={(e) => setKyc({
                                                        ...kyc,
                                                        personalInfo: { ...kyc.personalInfo, phoneNumber: e.target.value }
                                                    })}
                                                    placeholder="+1 (555) 123-4567"
                                                    required
                                                />
                                            </div>

                                            <div className="form-group">
                                                <label>Street Address</label>
                                                <input
                                                    type="text"
                                                    value={kyc.personalInfo.address.street}
                                                    onChange={(e) => setKyc({
                                                        ...kyc,
                                                        personalInfo: { 
                                                            ...kyc.personalInfo, 
                                                            address: { ...kyc.personalInfo.address, street: e.target.value }
                                                        }
                                                    })}
                                                    required
                                                />
                                            </div>

                                            <div className="form-row">
                                                <div className="form-group">
                                                    <label>City</label>
                                                    <input
                                                        type="text"
                                                        value={kyc.personalInfo.address.city}
                                                        onChange={(e) => setKyc({
                                                            ...kyc,
                                                            personalInfo: { 
                                                                ...kyc.personalInfo, 
                                                                address: { ...kyc.personalInfo.address, city: e.target.value }
                                                            }
                                                        })}
                                                        required
                                                    />
                                                </div>
                                                <div className="form-group">
                                                    <label>State/Province</label>
                                                    <input
                                                        type="text"
                                                        value={kyc.personalInfo.address.state}
                                                        onChange={(e) => setKyc({
                                                            ...kyc,
                                                            personalInfo: { 
                                                                ...kyc.personalInfo, 
                                                                address: { ...kyc.personalInfo.address, state: e.target.value }
                                                            }
                                                        })}
                                                    />
                                                </div>
                                                <div className="form-group">
                                                    <label>Postal Code</label>
                                                    <input
                                                        type="text"
                                                        value={kyc.personalInfo.address.postalCode}
                                                        onChange={(e) => setKyc({
                                                            ...kyc,
                                                            personalInfo: { 
                                                                ...kyc.personalInfo, 
                                                                address: { ...kyc.personalInfo.address, postalCode: e.target.value }
                                                            }
                                                        })}
                                                        required
                                                    />
                                                </div>
                                            </div>

                                            <div className="form-row">
                                                <div className="form-group">
                                                    <label>Occupation</label>
                                                    <input
                                                        type="text"
                                                        value={kyc.personalInfo.occupation}
                                                        onChange={(e) => setKyc({
                                                            ...kyc,
                                                            personalInfo: { ...kyc.personalInfo, occupation: e.target.value }
                                                        })}
                                                        required
                                                    />
                                                </div>
                                                <div className="form-group">
                                                    <label>Source of Funds</label>
                                                    <select
                                                        value={kyc.personalInfo.sourceOfFunds}
                                                        onChange={(e) => setKyc({
                                                            ...kyc,
                                                            personalInfo: { ...kyc.personalInfo, sourceOfFunds: e.target.value }
                                                        })}
                                                        required
                                                    >
                                                        <option value="">Select Source</option>
                                                        <option value="employment">Employment</option>
                                                        <option value="business">Business</option>
                                                        <option value="investments">Investments</option>
                                                        <option value="inheritance">Inheritance</option>
                                                        <option value="other">Other</option>
                                                    </select>
                                                </div>
                                            </div>

                                            <button type="submit" className="next-btn" disabled={saving}>
                                                {saving ? 'Saving...' : 'Continue to Documents'}
                                            </button>
                                        </form>
                                    )}

                                    {kycStep === 'documents' && (
                                        <form onSubmit={handleDocumentUpload} className="kyc-documents-form">
                                            <h3>Document Upload</h3>
                                            <p>Please upload the following documents for verification:</p>

                                            <div className="document-upload-section">
                                                <h4>1. Identity Document</h4>
                                                <div className="form-row">
                                                    <div className="form-group">
                                                        <label>Document Type</label>
                                                        <select name="identityType" required>
                                                            <option value="">Select Type</option>
                                                            <option value="passport">Passport</option>
                                                            <option value="national_id">National ID</option>
                                                            <option value="drivers_license">Driver's License</option>
                                                        </select>
                                                    </div>
                                                    <div className="form-group">
                                                        <label>Document Number</label>
                                                        <input type="text" name="identityNumber" required />
                                                    </div>
                                                </div>
                                                
                                                <div className="file-upload-row">
                                                    <div className="file-upload-group">
                                                        <label>Front Side</label>
                                                        <input type="file" name="identityFront" accept="image/*,application/pdf" required />
                                                    </div>
                                                    <div className="file-upload-group">
                                                        <label>Back Side</label>
                                                        <input type="file" name="identityBack" accept="image/*,application/pdf" />
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="document-upload-section">
                                                <h4>2. Proof of Address</h4>
                                                <div className="form-group">
                                                    <label>Document Type</label>
                                                    <select name="proofOfAddressType" required>
                                                        <option value="">Select Type</option>
                                                        <option value="utility_bill">Utility Bill</option>
                                                        <option value="bank_statement">Bank Statement</option>
                                                        <option value="rental_agreement">Rental Agreement</option>
                                                        <option value="government_letter">Government Letter</option>
                                                    </select>
                                                </div>
                                                <div className="file-upload-group">
                                                    <label>Upload Document</label>
                                                    <input type="file" name="proofOfAddress" accept="image/*,application/pdf" required />
                                                </div>
                                            </div>

                                            <div className="document-upload-section">
                                                <h4>3. Selfie</h4>
                                                <p>Take a clear selfie holding your identity document</p>
                                                <div className="file-upload-group">
                                                    <label>Upload Selfie</label>
                                                    <input type="file" name="selfie" accept="image/*" required />
                                                </div>
                                            </div>

                                            <button type="submit" className="upload-btn" disabled={uploadingFiles}>
                                                <Upload size={16} />
                                                {uploadingFiles ? 'Uploading...' : 'Upload Documents'}
                                            </button>
                                        </form>
                                    )}

                                    {kycStep === 'review' && (
                                        <div className="kyc-review">
                                            <h3>Review & Submit</h3>
                                            <p>Please review your information before submitting your KYC application.</p>

                                            <div className="review-summary">
                                                <div className="review-section">
                                                    <h4>Personal Information</h4>
                                                    <div className="review-item">
                                                        <span>Date of Birth:</span>
                                                        <span>{kyc.personalInfo.dateOfBirth}</span>
                                                    </div>
                                                    <div className="review-item">
                                                        <span>Nationality:</span>
                                                        <span>{kyc.personalInfo.nationality}</span>
                                                    </div>
                                                    <div className="review-item">
                                                        <span>Phone:</span>
                                                        <span>{kyc.personalInfo.phoneNumber}</span>
                                                    </div>
                                                </div>

                                                <div className="review-section">
                                                    <h4>Documents</h4>
                                                    <div className="review-item">
                                                        <span>Identity Document:</span>
                                                        <span className={kyc.documents.identity.hasFiles ? 'uploaded' : 'pending'}>
                                                            {kyc.documents.identity.hasFiles ? 'Uploaded' : 'Pending'}
                                                        </span>
                                                    </div>
                                                    <div className="review-item">
                                                        <span>Proof of Address:</span>
                                                        <span className={kyc.documents.proofOfAddress.hasFiles ? 'uploaded' : 'pending'}>
                                                            {kyc.documents.proofOfAddress.hasFiles ? 'Uploaded' : 'Pending'}
                                                        </span>
                                                    </div>
                                                    <div className="review-item">
                                                        <span>Selfie:</span>
                                                        <span className={kyc.documents.selfie.hasFiles ? 'uploaded' : 'pending'}>
                                                            {kyc.documents.selfie.hasFiles ? 'Uploaded' : 'Pending'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="submission-warning">
                                                <AlertCircle size={20} />
                                                <p>
                                                    By submitting this application, you confirm that all information provided is accurate and complete. 
                                                    False information may result in account suspension.
                                                </p>
                                            </div>

                                            <button 
                                                onClick={submitKycApplication} 
                                                className="submit-btn"
                                                disabled={saving || kyc.completionPercentage < 80}
                                            >
                                                <FileText size={16} />
                                                {saving ? 'Submitting...' : 'Submit for Review'}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Security Tab */}
                    {activeTab === 'security' && (
                        <div className="security-tab">
                            <h2>Security Settings</h2>
                            <div className="security-options">
                                <div className="security-item">
                                    <Shield size={20} />
                                    <div className="security-info">
                                        <h4>Two-Factor Authentication</h4>
                                        <p>Add an extra layer of security to your account</p>
                                    </div>
                                    <button 
                                        className="security-btn"
                                        onClick={() => navigate('/setup-2fa')}
                                    >
                                        Setup 2FA
                                    </button>
                                </div>
                                
                                <div className="security-item">
                                    <Lock size={20} />
                                    <div className="security-info">
                                        <h4>Change Password</h4>
                                        <p>Update your account password</p>
                                    </div>
                                    <button 
                                        className="security-btn"
                                        onClick={() => navigate('/forgot-password')}
                                    >
                                        Change Password
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Notifications Tab */}
                    {activeTab === 'notifications' && (
                        <div className="notifications-tab">
                            <h2>Notification Preferences</h2>
                            <form onSubmit={handleProfileUpdate} className="notifications-form">
                                <div className="notification-section">
                                    <h3>Email Notifications</h3>
                                    <div className="notification-options">
                                        <label className="notification-item">
                                            <input
                                                type="checkbox"
                                                checked={profile.profile?.notifications?.email?.security || false}
                                                onChange={(e) => setProfile({
                                                    ...profile,
                                                    profile: {
                                                        ...profile.profile,
                                                        notifications: {
                                                            ...profile.profile.notifications,
                                                            email: {
                                                                ...profile.profile.notifications.email,
                                                                security: e.target.checked
                                                            }
                                                        }
                                                    }
                                                })}
                                            />
                                            <span className="checkmark"></span>
                                            <div className="notification-info">
                                                <h4>Security Alerts</h4>
                                                <p>Login notifications and security updates</p>
                                            </div>
                                        </label>

                                        <label className="notification-item">
                                            <input
                                                type="checkbox"
                                                checked={profile.profile?.notifications?.email?.transactions || false}
                                                onChange={(e) => setProfile({
                                                    ...profile,
                                                    profile: {
                                                        ...profile.profile,
                                                        notifications: {
                                                            ...profile.profile.notifications,
                                                            email: {
                                                                ...profile.profile.notifications.email,
                                                                transactions: e.target.checked
                                                            }
                                                        }
                                                    }
                                                })}
                                            />
                                            <span className="checkmark"></span>
                                            <div className="notification-info">
                                                <h4>Transaction Updates</h4>
                                                <p>Order confirmations and payment receipts</p>
                                            </div>
                                        </label>
                                    </div>
                                </div>

                                <button type="submit" className="save-btn" disabled={saving}>
                                    <Save size={16} />
                                    {saving ? 'Saving...' : 'Save Preferences'}
                                </button>
                            </form>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ProfileSettings; 