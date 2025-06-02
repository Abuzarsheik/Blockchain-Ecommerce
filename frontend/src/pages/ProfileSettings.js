import React, { useState, useEffect, useCallback } from 'react';
import { 
    User, 
    Mail, 
    MapPin, 
    Shield, 
    Bell, 
    Save, 
    Edit3,
    Wallet, 
    Lock, 
    Upload,
    X,
    AlertCircle,
    FileText,
    CheckCircle,
    RefreshCw,
    Wifi,
    WifiOff
} from 'lucide-react';
import '../styles/ProfileSettings.css';
import { api } from '../services/api';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import { logger } from '../utils/logger';

const ProfileSettings = () => {
    // Profile Settings Component - Updated
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('profile');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [retryCount, setRetryCount] = useState(0);
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [formErrors, setFormErrors] = useState({});
    const [connectionError, setConnectionError] = useState(false);
    
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

    // Security state
    const [security, setSecurity] = useState({
        twoFactorEnabled: false,
        lastPasswordChange: null,
        loginSessions: [],
        securityScore: 0
    });

    // Input validation functions
    const validatePhoneNumber = (phone) => {
        const phoneRegex = /^[+]?[1-9][\d]{0,15}$/;
        return phoneRegex.test(phone.replace(/[\s\-()]/g, ''));
    };

    const validateAge = (dateOfBirth) => {
        const today = new Date();
        const birthDate = new Date(dateOfBirth);
        const age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            return age - 1;
        }
        return age;
    };

    const validateKYCForm = () => {
        const errors = {};
        const personalInfo = kyc.personalInfo;

        // Date of birth validation
        if (!personalInfo?.dateOfBirth) {
            errors.dateOfBirth = 'Date of birth is required';
        } else {
            const age = validateAge(personalInfo.dateOfBirth);
            if (age < 18) {
                errors.dateOfBirth = 'You must be at least 18 years old';
            }
        }

        // Phone number validation
        if (!personalInfo?.phoneNumber) {
            errors.phoneNumber = 'Phone number is required';
        } else if (!validatePhoneNumber(personalInfo.phoneNumber)) {
            errors.phoneNumber = 'Please enter a valid phone number';
        }

        // Address validation
        if (!personalInfo?.address?.street) {
            errors.street = 'Street address is required';
        }
        if (!personalInfo?.address?.city) {
            errors.city = 'City is required';
        }
        if (!personalInfo?.address?.country) {
            errors.country = 'Country is required';
        }
        if (!personalInfo?.address?.postalCode) {
            errors.postalCode = 'Postal code is required';
        }

        // Other required fields
        if (!personalInfo?.nationality) {
            errors.nationality = 'Nationality is required';
        }
        if (!personalInfo?.countryOfResidence) {
            errors.countryOfResidence = 'Country of residence is required';
        }
        if (!personalInfo?.occupation) {
            errors.occupation = 'Occupation is required';
        }
        if (!personalInfo?.sourceOfFunds) {
            errors.sourceOfFunds = 'Source of funds is required';
        }

        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    // Enhanced error handling for API calls
    const handleApiError = useCallback((error, context = '') => {
        logger.error(`${context} error:`, error);
        
        if (!isOnline) {
            setConnectionError(true);
            return 'You are offline. Please check your internet connection.';
        }

        if (error.code === 'NETWORK_ERROR' || error.message === 'Network Error') {
            setConnectionError(true);
            return 'Network connection failed. Please try again.';
        }

        if (error.response) {
            const status = error.response.status;
            const data = error.response.data;

            switch (status) {
                case 400:
                    if (data.errors && Array.isArray(data.errors)) {
                        return data.errors.map(err => err.msg).join(', ');
                    }
                    return data.message || data.error || 'Invalid request data';
                
                case 401:
                    toast.error('Session expired. Please login again.');
                    navigate('/login');
                    return 'Authentication required';
                
                case 403:
                    return 'Access denied. You do not have permission for this action.';
                
                case 404:
                    return 'Resource not found. Please refresh the page.';
                
                case 429:
                    return 'Too many requests. Please wait a moment and try again.';
                
                case 500:
                    return 'Server error. Our team has been notified.';
                
                default:
                    return data.message || data.error || `Server error (${status})`;
            }
        }

        return error.message || 'An unexpected error occurred';
    }, [isOnline, navigate]);

    // Function to refresh security data specifically
    const refreshSecurityData = useCallback(async () => {
        try {
            const securityRes = await api.get('/auth/security-settings');
            const securityData = securityRes.data.securitySettings || {};
            
            // Also refresh the main profile to get updated emailVerified status
            const profileRes = await api.get('/profile');
            
            if (profileRes?.data?.user) {
                setProfile(prev => ({
                    ...prev,
                    emailVerified: profileRes.data.user.emailVerified
                }));
            }
            
            setSecurity(prev => ({
                ...prev,
                twoFactorEnabled: securityData.twoFactorEnabled || false,
                lastPasswordChange: securityData.lastPasswordChange || prev.lastPasswordChange,
                loginSessions: securityData.loginSessions || prev.loginSessions
            }));
            
            toast.success('Security status updated!');
        } catch (error) {
            logger.error('Error refreshing security data:', error);
        }
    }, []);

    // Function to handle returning from 2FA setup
    const handle2FAReturn = useCallback(() => {
        // Check if we're returning from 2FA setup
        const urlParams = new URLSearchParams(window.location.search);
        const from2FA = urlParams.get('from') === '2fa-setup';
        const success = urlParams.get('success') === 'true';
        
        if (from2FA) {
            // Clear URL parameters
            window.history.replaceState({}, document.title, window.location.pathname);
            
            if (success) {
                // Refresh security data after successful 2FA setup
                setTimeout(() => {
                    refreshSecurityData();
                }, 1000);
            }
        }
    }, [refreshSecurityData]);

    // Function to handle email verification
    const handleEmailVerification = useCallback(async () => {
        if (profile?.emailVerified) {
            toast.info('Your email is already verified!');
            return;
        }

        try {
            setSaving(true);
            await api.post('/auth/resend-verification');
            toast.success('Verification email sent! Please check your inbox and spam folder.');
            
            // Optionally refresh profile data after a delay to check if verification completed
            setTimeout(() => {
                refreshSecurityData();
            }, 2000);
            
        } catch (error) {
            logger.error('Error sending verification email:', error);
            const errorMessage = error.response?.data?.error?.message || 
                               error.response?.data?.message || 
                               'Failed to send verification email. Please try again.';
            toast.error(errorMessage);
        } finally {
            setSaving(false);
        }
    }, [profile?.emailVerified, refreshSecurityData]);

    const loadUserProfile = useCallback(async (isRetry = false) => {
        try {
            setLoading(true);
            setConnectionError(false);
            
            if (!isOnline && !isRetry) {
                throw new Error('No internet connection');
            }

            // Add timeout to API calls
            const timeout = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Request timeout')), 10000)
            );

            const [profileRes, kycRes, securityRes] = await Promise.race([
                Promise.all([
                    api.get('/profile'),
                    api.get('/profile/kyc'),
                    api.get('/auth/security-settings').catch(() => ({ data: { securitySettings: {} } })) // Updated endpoint
                ]),
                timeout
            ]);

            if (!profileRes?.data?.user) {
                throw new Error('Invalid profile data received');
            }

            setProfile(profileRes.data.user);
            
            // Set security data with defaults and calculate score
            const securityData = securityRes.data.securitySettings || {};
            const newSecurity = {
                twoFactorEnabled: securityData.twoFactorEnabled || false,
                lastPasswordChange: securityData.lastPasswordChange || null,
                loginSessions: securityData.loginSessions || [],
                securityScore: 0 // Will be calculated below
            };
            
            // Calculate security score based on current data
            let score = 0;
            if (profileRes.data.user.emailVerified) score += 20;
            if (newSecurity.twoFactorEnabled) score += 30;
            if (kycRes.data.kyc?.status === 'approved') score += 25;
            if (newSecurity.lastPasswordChange) {
                const daysSinceChange = Math.floor((Date.now() - new Date(newSecurity.lastPasswordChange)) / (1000 * 60 * 60 * 24));
                if (daysSinceChange <= 90) score += 15;
            }
            score += 10; // Base score
            newSecurity.securityScore = Math.min(score, 100);
            
            setSecurity(newSecurity);
            
            // Ensure KYC data has proper structure with defaults
            const kycData = kycRes.data.kyc || {};
            setKyc({
                status: kycData.status || 'pending',
                level: kycData.level || 'basic',
                completionPercentage: kycData.completionPercentage || 0,
                isApproved: kycData.isApproved || false,
                personalInfo: {
                    dateOfBirth: kycData.personalInfo?.dateOfBirth || '',
                    nationality: kycData.personalInfo?.nationality || '',
                    countryOfResidence: kycData.personalInfo?.countryOfResidence || '',
                    phoneNumber: kycData.personalInfo?.phoneNumber || '',
                    address: {
                        street: kycData.personalInfo?.address?.street || '',
                        city: kycData.personalInfo?.address?.city || '',
                        state: kycData.personalInfo?.address?.state || '',
                        postalCode: kycData.personalInfo?.address?.postalCode || '',
                        country: kycData.personalInfo?.address?.country || ''
                    },
                    occupation: kycData.personalInfo?.occupation || '',
                    sourceOfFunds: kycData.personalInfo?.sourceOfFunds || ''
                },
                documents: {
                    identity: {
                        type: kycData.documents?.identity?.type || '',
                        verified: kycData.documents?.identity?.verified || false,
                        hasFiles: kycData.documents?.identity?.hasFiles || false
                    },
                    proofOfAddress: {
                        type: kycData.documents?.proofOfAddress?.type || '',
                        verified: kycData.documents?.proofOfAddress?.verified || false,
                        hasFiles: kycData.documents?.proofOfAddress?.hasFiles || false
                    },
                    selfie: {
                        verified: kycData.documents?.selfie?.verified || false,
                        hasFiles: kycData.documents?.selfie?.hasFiles || false
                    }
                },
                transactionLimits: {
                    daily: kycData.transactionLimits?.daily || 1000,
                    monthly: kycData.transactionLimits?.monthly || 10000,
                    yearly: kycData.transactionLimits?.yearly || 100000
                }
            });

            // Reset retry count on success
            setRetryCount(0);
            
            if (isRetry) {
                toast.success('Profile data refreshed successfully!');
            }

        } catch (error) {
            const errorMessage = handleApiError(error, 'Loading profile');
            
            if (retryCount < 3 && isOnline) {
                setRetryCount(prev => prev + 1);
                toast.error(`${errorMessage} Retrying... (${retryCount + 1}/3)`);
                
                // Exponential backoff retry
                setTimeout(() => {
                    loadUserProfile(true);
                }, Math.pow(2, retryCount) * 1000);
            } else {
                toast.error(errorMessage);
                setConnectionError(true);
            }
        } finally {
            setLoading(false);
        }
    }, [isOnline, retryCount, handleApiError]);

    // Network status monitoring
    useEffect(() => {
        const handleOnline = () => {
            setIsOnline(true);
            setConnectionError(false);
            if (retryCount > 0) {
                toast.success('Connection restored!');
                loadUserProfile();
            }
        };
        
        const handleOffline = () => {
            setIsOnline(false);
            setConnectionError(true);
            toast.error('Connection lost. Check your internet connection.');
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, [retryCount, loadUserProfile]);

    useEffect(() => {
        loadUserProfile();
    }, [loadUserProfile]);

    // Handle returning from 2FA setup
    useEffect(() => {
        handle2FAReturn();
        
        // Handle hash navigation to specific tabs
        const hash = window.location.hash.substring(1);
        if (hash === 'security') {
            setActiveTab('security');
        }
    }, [handle2FAReturn]);

    // Listen for focus events to refresh data when user returns to tab
    useEffect(() => {
        const handleFocus = () => {
            // Refresh security data when user returns to the tab
            if (document.visibilityState === 'visible') {
                refreshSecurityData();
            }
        };

        document.addEventListener('visibilitychange', handleFocus);
        window.addEventListener('focus', handleFocus);

        return () => {
            document.removeEventListener('visibilitychange', handleFocus);
            window.removeEventListener('focus', handleFocus);
        };
    }, [refreshSecurityData]);

    const handleProfileUpdate = async (e) => {
        e.preventDefault();
        try {
            setSaving(true);
            
            // Filter and structure the data for the API
            const updateData = {
                firstName: profile.firstName,
                lastName: profile.lastName,
                username: profile.username,
                profile: {
                    bio: profile.profile?.bio || '',
                    location: profile.profile?.location || '',
                    social: {
                        twitter: profile.profile?.social?.twitter || '',
                        instagram: profile.profile?.social?.instagram || '',
                        discord: profile.profile?.social?.discord || ''
                    },
                    notifications: profile.profile?.notifications || {
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
                    privacy: profile.profile?.privacy || {
                        profileVisibility: 'public',
                        showTransactionHistory: false,
                        showWalletAddress: false
                    }
                }
            };
            
            // Only include website if it's not empty to avoid validation errors
            if (profile.profile?.website && profile.profile.website.trim()) {
                updateData.profile.website = profile.profile.website.trim();
            }
            
            await api.put('/profile', updateData);
            toast.success('Profile updated successfully!');
        } catch (error) {
            logger.error('Error updating profile:', error);
            // Show more specific error message if available
            const errorMessage = error.response?.data?.errors?.[0]?.msg || 
                               error.response?.data?.error || 
                               error.response?.data?.message || 
                               'Failed to update profile';
            toast.error(errorMessage);
        } finally {
            setSaving(false);
        }
    };

    // Helper function to get avatar URL - always use generated avatar
    const getAvatarUrl = () => {
        return `https://ui-avatars.com/api/?name=${encodeURIComponent(profile?.firstName || 'U')}+${encodeURIComponent(profile?.lastName || 'ser')}&background=667eea&color=fff&size=120`;
    };

    const handleKycPersonalInfo = async (e) => {
        e.preventDefault();
        
        // Clear previous errors
        setFormErrors({});
        
        // Validate form before submission
        if (!validateKYCForm()) {
            toast.error('Please fix the form errors before continuing');
            return;
        }

        if (!isOnline) {
            toast.error('You are offline. Please check your internet connection.');
            return;
        }

        try {
            setSaving(true);
            
            // Log the data being sent for debugging
            console.log('Sending KYC personal info:', kyc.personalInfo);
            
            // Add timeout to the request
            const timeout = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Request timeout')), 15000)
            );

            await Promise.race([
                api.post('/profile/kyc/personal-info', kyc.personalInfo),
                timeout
            ]);

            toast.success('Personal information saved successfully!');
            setKycStep('documents');
            
        } catch (error) {
            const errorMessage = handleApiError(error, 'Saving KYC personal info');
            
            // Log detailed error information for debugging
            console.error('KYC Error Details:', {
                status: error.response?.status,
                statusText: error.response?.statusText,
                data: error.response?.data,
                message: error.message,
                formData: kyc.personalInfo
            });
            
            // Handle specific validation errors
            if (error.response?.status === 400 && error.response?.data?.errors) {
                const validationErrors = {};
                error.response.data.errors.forEach(err => {
                    if (err.param) {
                        validationErrors[err.param] = err.msg;
                    }
                });
                setFormErrors(validationErrors);
            }
            
            toast.error(errorMessage);
        } finally {
            setSaving(false);
        }
    };

    const handleDocumentUpload = async (e) => {
        e.preventDefault();
        
        if (!isOnline) {
            toast.error('You are offline. Please check your internet connection.');
            return;
        }

        const formData = new FormData(e.target);
        
        // Validate uploaded files
        const validateFiles = () => {
            const errors = [];
            const maxFileSize = 10 * 1024 * 1024; // 10MB
            const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
            
            for (let [key, file] of formData.entries()) {
                if (file instanceof File) {
                    // Check file size
                    if (file.size > maxFileSize) {
                        errors.push(`${key}: File size must be less than 10MB`);
                    }
                    
                    // Check file type
                    if (!allowedTypes.includes(file.type)) {
                        errors.push(`${key}: Only JPEG, PNG, and PDF files are allowed`);
                    }
                    
                    // Check if file is not empty
                    if (file.size === 0) {
                        errors.push(`${key}: File is empty or corrupted`);
                    }
                }
            }
            
            return errors;
        };

        const fileErrors = validateFiles();
        if (fileErrors.length > 0) {
            toast.error(`File validation failed: ${fileErrors.join(', ')}`);
            return;
        }

        try {
            setUploadingFiles(true);
            
            // Add timeout for file uploads (longer timeout for large files)
            const timeout = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Upload timeout - files may be too large')), 30000)
            );

            const response = await Promise.race([
                api.post('/profile/kyc/documents', formData, {
                    headers: { 
                        'Content-Type': 'multipart/form-data'
                    },
                    onUploadProgress: (progressEvent) => {
                        const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                        console.log(`Upload progress: ${progress}%`);
                    }
                }),
                timeout
            ]);

            if (!response?.data) {
                throw new Error('Invalid response from server');
            }

            // Enhanced success messaging with detailed information
            const uploadData = response.data;
            console.log('Upload successful:', uploadData);
            
            if (uploadData.details && uploadData.details.savedFiles) {
                // Display detailed confirmation for each uploaded file
                const filesInfo = uploadData.details.savedFiles
                    .map(file => `${file.type} (${file.size})`)
                    .join(', ');
                
                toast.success(
                    `🎉 Documents Successfully Saved!\n${uploadData.details.totalDocuments} file(s): ${filesInfo}`,
                    { 
                        duration: 6000,
                        style: {
                            background: '#10B981',
                            color: 'white',
                            fontWeight: 'bold'
                        }
                    }
                );
                
                console.log('📁 Document Upload Confirmation:', {
                    message: uploadData.message,
                    totalDocuments: uploadData.details.totalDocuments,
                    savedFiles: uploadData.details.savedFiles,
                    uploadedAt: uploadData.details.uploadedAt,
                    nextSteps: uploadData.details.nextSteps
                });
            } else {
                toast.success('✅ Documents uploaded and saved successfully!');
            }

            setKyc(prev => ({
                ...prev,
                completionPercentage: response.data.completionPercentage || prev.completionPercentage
            }));
            setKycStep('review');
            
        } catch (error) {
            const errorMessage = handleApiError(error, 'Uploading documents');
            
            console.error('Document upload error:', {
                status: error.response?.status,
                data: error.response?.data,
                message: error.message
            });
            
            toast.error(errorMessage);
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
            logger.error('Error submitting KYC:', error);
            toast.error(error.response?.data?.error || 'Failed to submit KYC application');
        } finally {
            setSaving(false);
        }
    };

    const getKycStatusBadge = (status) => {
        const badges = {
            pending: { color: 'orange', text: 'Pending', icon: AlertCircle },
            under_review: { color: 'blue', text: 'Under Review', icon: FileText },
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

    // Helper function to get country name from code
    const getCountryName = (countryCode) => {
        const countries = {
            'PK': 'Pakistan',
            'US': 'United States',
            'CA': 'Canada',
            'GB': 'United Kingdom',
            'DE': 'Germany',
            'FR': 'France',
            'AU': 'Australia',
            'JP': 'Japan',
            'IN': 'India'
        };
        return countries[countryCode] || countryCode;
    };

    // Helper function to get source of funds display name
    const getSourceOfFundsName = (source) => {
        const sources = {
            'employment': 'Employment Income',
            'business': 'Business Income',
            'investments': 'Investment Returns',
            'inheritance': 'Inheritance',
            'other': 'Other Sources'
        };
        return sources[source] || source;
    };

    // Helper function to get document type display name
    const getDocumentTypeName = (docType) => {
        const types = {
            'passport': 'Passport',
            'national_id': 'National ID Card',
            'drivers_license': 'Driver\'s License',
            'utility_bill': 'Utility Bill',
            'bank_statement': 'Bank Statement',
            'rental_agreement': 'Rental Agreement',
            'government_letter': 'Government Letter'
        };
        return types[docType] || docType;
    };

    // Calculate security score
    const calculateSecurityScore = useCallback(() => {
        let score = 0;
        
        // Email verification
        if (profile?.emailVerified) score += 20;
        
        // 2FA enabled
        if (security?.twoFactorEnabled) score += 30;
        
        // KYC verification
        if (kyc?.status === 'approved') score += 25;
        
        // Recent password change (within last 90 days)
        if (security?.lastPasswordChange) {
            const daysSinceChange = Math.floor((Date.now() - new Date(security.lastPasswordChange)) / (1000 * 60 * 60 * 24));
            if (daysSinceChange <= 90) score += 15;
        }
        
        // Strong password (assuming backend validates)
        score += 10; // Base score for having a password
        
        return Math.min(score, 100);
    }, [profile?.emailVerified, security?.twoFactorEnabled, security?.lastPasswordChange, kyc?.status]);

    const getSecurityLevel = useCallback((score) => {
        if (score >= 80) return { level: 'High', color: 'green', icon: '🛡️' };
        if (score >= 60) return { level: 'Medium', color: 'orange', icon: '⚠️' };
        return { level: 'Low', color: 'red', icon: '🚨' };
    }, []);

    if (loading) {
        return (
            <div className="profile-settings loading">
                <div className="loading-content">
                    <div className="loading-spinner">
                        <RefreshCw size={24} className={retryCount > 0 ? 'spinning' : ''} />
                    </div>
                    <p>
                        {retryCount > 0 
                            ? `Retrying... (${retryCount}/3)` 
                            : 'Loading profile information...'
                        }
                    </p>
                    {!isOnline && (
                        <div className="offline-indicator">
                            <WifiOff size={16} />
                            <span>You are offline</span>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // Connection error state
    if (connectionError && !loading) {
        return (
            <div className="profile-settings error">
                <div className="error-content">
                    <AlertCircle size={48} className="error-icon" />
                    <h2>Connection Error</h2>
                    <p>
                        {!isOnline 
                            ? 'You are offline. Please check your internet connection.'
                            : 'Unable to load your profile. Please try again.'
                        }
                    </p>
                    <div className="error-actions">
                        <button 
                            onClick={() => loadUserProfile()} 
                            className="retry-btn"
                            disabled={!isOnline}
                        >
                            <RefreshCw size={16} />
                            Try Again
                        </button>
                        {!isOnline && (
                            <div className="offline-indicator">
                                <WifiOff size={16} />
                                <span>Offline</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="profile-settings">
            <div className="settings-container">
                <div className="settings-header">
                    <h1>Account Settings</h1>
                    {!isOnline && (
                        <div className="connection-status offline">
                            <WifiOff size={16} />
                            <span>Offline</span>
                        </div>
                    )}
                    {isOnline && connectionError && (
                        <div className="connection-status warning">
                            <Wifi size={16} />
                            <span>Connection issues detected</span>
                        </div>
                    )}
                </div>
                
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
                        className={`tab ${activeTab === 'kyc' ? 'active' : ''} kyc-tab-special`}
                        onClick={() => setActiveTab('kyc')}
                    >
                        <Shield size={16} />
                        Identity Verification
                        {(kyc?.status !== 'approved') && (
                            <span className="kyc-indicator">!</span>
                        )}
                        {(kyc?.status === 'approved') && (
                            <span className="kyc-verified">✓</span>
                        )}
                    </button>
                    <button 
                        className={`tab ${activeTab === 'security' ? 'active' : ''} security-tab-special`}
                        onClick={() => setActiveTab('security')}
                    >
                        <Lock size={16} />
                        Security
                        {!security?.twoFactorEnabled && (
                            <span className="security-warning">!</span>
                        )}
                        {security?.twoFactorEnabled && (
                            <span className="security-verified">🛡️</span>
                        )}
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
                                            src={getAvatarUrl()} 
                                            alt="Profile Avatar"
                                            className="profile-avatar"
                                        />
                                    </div>
                                    <div className="avatar-info">
                                        <h3>{profile?.firstName || ''} {profile?.lastName || ''}</h3>
                                        <p className="username">@{profile?.username || ''}</p>
                                    </div>
                                    <div className="verification-badges">
                                        {profile?.emailVerified && (
                                            <span className="badge verified">
                                                <CheckCircle size={14} />
                                                Email Verified
                                            </span>
                                        )}
                                        {profile?.isVerified && (
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
                                            value={profile?.firstName || ''}
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
                                            value={profile?.lastName || ''}
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
                                        value={profile?.username || ''}
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
                                        value={profile?.email || ''}
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
                                            <Edit3 size={16} />
                                            Website
                                        </label>
                                        <input
                                            type="url"
                                            value={profile.profile?.website || ''}
                                            onChange={(e) => setProfile({
                                                ...profile,
                                                profile: { ...profile.profile, website: e.target.value }
                                            })}
                                            placeholder="https://yourwebsite.com"
                                        />
                                    </div>
                                </div>

                                <div className="form-row">
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
                                    {getKycStatusBadge(kyc?.status || 'pending')}
                                    <div className="completion-bar">
                                        <div 
                                            className="completion-fill"
                                            style={{ width: `${kyc?.completionPercentage || 0}%` }}
                                        ></div>
                                    </div>
                                    <span className="completion-text">
                                        {kyc?.completionPercentage || 0}% Complete
                                    </span>
                                </div>
                            </div>

                            {(kyc?.status === 'approved') ? (
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
                                        <div className={`step ${kycStep === 'personal' ? 'active' : kyc.personalInfo?.dateOfBirth ? 'completed' : ''}`}>
                                            <span className="step-number">1</span>
                                            <span className="step-title">Personal Information</span>
                                        </div>
                                        <div className={`step ${kycStep === 'documents' ? 'active' : kyc.documents?.identity?.hasFiles ? 'completed' : ''}`}>
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
                                                        value={kyc.personalInfo?.dateOfBirth || ''}
                                                        onChange={(e) => setKyc({
                                                            ...kyc,
                                                            personalInfo: { ...kyc.personalInfo, dateOfBirth: e.target.value }
                                                        })}
                                                        className={formErrors.dateOfBirth ? 'error' : ''}
                                                        required
                                                    />
                                                    {formErrors.dateOfBirth && (
                                                        <span className="error-message">
                                                            <AlertCircle size={14} />
                                                            {formErrors.dateOfBirth}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="form-group">
                                                    <label>Nationality</label>
                                                    <select
                                                        value={kyc.personalInfo?.nationality || ''}
                                                        onChange={(e) => setKyc({
                                                            ...kyc,
                                                            personalInfo: { ...kyc.personalInfo, nationality: e.target.value }
                                                        })}
                                                        className={formErrors.nationality ? 'error' : ''}
                                                        required
                                                    >
                                                        <option value="">Select Nationality</option>
                                                        <option value="PK">Pakistan</option>
                                                        <option value="US">United States</option>
                                                        <option value="CA">Canada</option>
                                                        <option value="GB">United Kingdom</option>
                                                        <option value="DE">Germany</option>
                                                        <option value="FR">France</option>
                                                        <option value="AU">Australia</option>
                                                        <option value="JP">Japan</option>
                                                        <option value="IN">India</option>
                                                        {/* Add more countries as needed */}
                                                    </select>
                                                    {formErrors.nationality && (
                                                        <span className="error-message">
                                                            <AlertCircle size={14} />
                                                            {formErrors.nationality}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="form-group">
                                                <label>Country of Residence</label>
                                                <select
                                                    value={kyc.personalInfo?.countryOfResidence || ''}
                                                    onChange={(e) => setKyc({
                                                        ...kyc,
                                                        personalInfo: { ...kyc.personalInfo, countryOfResidence: e.target.value }
                                                    })}
                                                    required
                                                >
                                                    <option value="">Select Country</option>
                                                    <option value="PK">Pakistan</option>
                                                    <option value="US">United States</option>
                                                    <option value="CA">Canada</option>
                                                    <option value="GB">United Kingdom</option>
                                                    <option value="DE">Germany</option>
                                                    <option value="FR">France</option>
                                                    <option value="AU">Australia</option>
                                                    <option value="JP">Japan</option>
                                                    <option value="IN">India</option>
                                                    {/* Add more countries as needed */}
                                                </select>
                                            </div>

                                            <div className="form-group">
                                                <label>Phone Number</label>
                                                <input
                                                    type="tel"
                                                    value={kyc.personalInfo?.phoneNumber || ''}
                                                    onChange={(e) => setKyc({
                                                        ...kyc,
                                                        personalInfo: { ...kyc.personalInfo, phoneNumber: e.target.value }
                                                    })}
                                                    className={formErrors.phoneNumber ? 'error' : ''}
                                                    placeholder="+1 (555) 123-4567"
                                                    required
                                                />
                                                {formErrors.phoneNumber && (
                                                    <span className="error-message">
                                                        <AlertCircle size={14} />
                                                        {formErrors.phoneNumber}
                                                    </span>
                                                )}
                                            </div>

                                            <div className="form-group">
                                                <label>Street Address</label>
                                                <input
                                                    type="text"
                                                    value={kyc.personalInfo?.address?.street || ''}
                                                    onChange={(e) => setKyc({
                                                        ...kyc,
                                                        personalInfo: { 
                                                            ...kyc.personalInfo, 
                                                            address: { ...kyc.personalInfo?.address, street: e.target.value }
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
                                                        value={kyc.personalInfo?.address?.city || ''}
                                                        onChange={(e) => setKyc({
                                                            ...kyc,
                                                            personalInfo: { 
                                                                ...kyc.personalInfo, 
                                                                address: { ...kyc.personalInfo?.address, city: e.target.value }
                                                            }
                                                        })}
                                                        required
                                                    />
                                                </div>
                                                <div className="form-group">
                                                    <label>State/Province</label>
                                                    <input
                                                        type="text"
                                                        value={kyc.personalInfo?.address?.state || ''}
                                                        onChange={(e) => setKyc({
                                                            ...kyc,
                                                            personalInfo: { 
                                                                ...kyc.personalInfo, 
                                                                address: { ...kyc.personalInfo?.address, state: e.target.value }
                                                            }
                                                        })}
                                                    />
                                                </div>
                                                <div className="form-group">
                                                    <label>Postal Code</label>
                                                    <input
                                                        type="text"
                                                        value={kyc.personalInfo?.address?.postalCode || ''}
                                                        onChange={(e) => setKyc({
                                                            ...kyc,
                                                            personalInfo: { 
                                                                ...kyc.personalInfo, 
                                                                address: { ...kyc.personalInfo?.address, postalCode: e.target.value }
                                                            }
                                                        })}
                                                        required
                                                    />
                                                </div>
                                            </div>

                                            <div className="form-group">
                                                <label>Country</label>
                                                <select
                                                    value={kyc.personalInfo?.address?.country || ''}
                                                    onChange={(e) => setKyc({
                                                        ...kyc,
                                                        personalInfo: { 
                                                            ...kyc.personalInfo, 
                                                            address: { ...kyc.personalInfo?.address, country: e.target.value }
                                                        }
                                                    })}
                                                    required
                                                >
                                                    <option value="">Select Country</option>
                                                    <option value="PK">Pakistan</option>
                                                    <option value="US">United States</option>
                                                    <option value="CA">Canada</option>
                                                    <option value="GB">United Kingdom</option>
                                                    <option value="DE">Germany</option>
                                                    <option value="FR">France</option>
                                                    <option value="AU">Australia</option>
                                                    <option value="JP">Japan</option>
                                                    <option value="IN">India</option>
                                                    {/* Add more countries as needed */}
                                                </select>
                                            </div>

                                            <div className="form-row">
                                                <div className="form-group">
                                                    <label>Occupation</label>
                                                    <input
                                                        type="text"
                                                        value={kyc.personalInfo?.occupation || ''}
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
                                                        value={kyc.personalInfo?.sourceOfFunds || ''}
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
                                                    <h4>📋 Personal Information</h4>
                                                    <div className="review-grid">
                                                        <div className="review-item">
                                                            <span className="review-label">Date of Birth:</span>
                                                            <span className="review-value">{kyc.personalInfo.dateOfBirth || 'Not provided'}</span>
                                                        </div>
                                                        <div className="review-item">
                                                            <span className="review-label">Nationality:</span>
                                                            <span className="review-value">{getCountryName(kyc.personalInfo.nationality) || 'Not provided'}</span>
                                                        </div>
                                                        <div className="review-item">
                                                            <span className="review-label">Country of Residence:</span>
                                                            <span className="review-value">{getCountryName(kyc.personalInfo.countryOfResidence) || 'Not provided'}</span>
                                                        </div>
                                                        <div className="review-item">
                                                            <span className="review-label">Phone Number:</span>
                                                            <span className="review-value">{kyc.personalInfo.phoneNumber || 'Not provided'}</span>
                                                        </div>
                                                        <div className="review-item">
                                                            <span className="review-label">Occupation:</span>
                                                            <span className="review-value">{kyc.personalInfo.occupation || 'Not provided'}</span>
                                                        </div>
                                                        <div className="review-item">
                                                            <span className="review-label">Source of Funds:</span>
                                                            <span className="review-value">{getSourceOfFundsName(kyc.personalInfo.sourceOfFunds) || 'Not provided'}</span>
                                                        </div>
                                                    </div>

                                                    <div className="address-review">
                                                        <h5>📍 Address Information</h5>
                                                        <div className="address-display">
                                                            {kyc.personalInfo.address?.street && (
                                                                <div>{kyc.personalInfo.address.street}</div>
                                                            )}
                                                            <div>
                                                                {kyc.personalInfo.address?.city && `${kyc.personalInfo.address.city}, `}
                                                                {kyc.personalInfo.address?.state && `${kyc.personalInfo.address.state} `}
                                                                {kyc.personalInfo.address?.postalCode}
                                                            </div>
                                                            {kyc.personalInfo.address?.country && (
                                                                <div>{getCountryName(kyc.personalInfo.address.country)}</div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="review-section">
                                                    <h4>📄 Documents Uploaded</h4>
                                                    <div className="documents-review">
                                                        <div className="document-review-item">
                                                            <div className="document-icon">🆔</div>
                                                            <div className="document-info">
                                                                <span className="document-title">Identity Document</span>
                                                                <span className="document-type">
                                                                    {kyc.documents.identity.type ? getDocumentTypeName(kyc.documents.identity.type) : 'Type not specified'}
                                                                </span>
                                                            </div>
                                                            <div className={`document-status ${kyc.documents.identity.hasFiles ? 'uploaded' : 'pending'}`}>
                                                                {kyc.documents.identity.hasFiles ? (
                                                                    <>
                                                                        <CheckCircle size={16} />
                                                                        Uploaded
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <AlertCircle size={16} />
                                                                        Pending
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>

                                                        <div className="document-review-item">
                                                            <div className="document-icon">🏠</div>
                                                            <div className="document-info">
                                                                <span className="document-title">Proof of Address</span>
                                                                <span className="document-type">
                                                                    {kyc.documents.proofOfAddress.type ? getDocumentTypeName(kyc.documents.proofOfAddress.type) : 'Type not specified'}
                                                                </span>
                                                            </div>
                                                            <div className={`document-status ${kyc.documents.proofOfAddress.hasFiles ? 'uploaded' : 'pending'}`}>
                                                                {kyc.documents.proofOfAddress.hasFiles ? (
                                                                    <>
                                                                        <CheckCircle size={16} />
                                                                        Uploaded
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <AlertCircle size={16} />
                                                                        Pending
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>

                                                        <div className="document-review-item">
                                                            <div className="document-icon">🤳</div>
                                                            <div className="document-info">
                                                                <span className="document-title">Selfie with ID</span>
                                                                <span className="document-type">Identity verification photo</span>
                                                            </div>
                                                            <div className={`document-status ${kyc.documents.selfie.hasFiles ? 'uploaded' : 'pending'}`}>
                                                                {kyc.documents.selfie.hasFiles ? (
                                                                    <>
                                                                        <CheckCircle size={16} />
                                                                        Uploaded
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <AlertCircle size={16} />
                                                                        Pending
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="submission-warning">
                                                <div className="warning-header">
                                                    <AlertCircle size={24} />
                                                    <h4>Important Notice</h4>
                                                </div>
                                                <div className="warning-content">
                                                    <p>
                                                        By submitting this application, you confirm that all information provided is 
                                                        accurate and complete. False information may result in account suspension or 
                                                        permanent closure.
                                                    </p>
                                                    <ul>
                                                        <li>All documents must be clear and readable</li>
                                                        <li>Information must match across all documents</li>
                                                        <li>Review process typically takes 1-3 business days</li>
                                                        <li>You will be notified via email once review is complete</li>
                                                    </ul>
                                                </div>
                                            </div>

                                            <div className="review-actions">
                                                <button 
                                                    onClick={() => setKycStep('personal')} 
                                                    className="edit-btn"
                                                >
                                                    <Edit3 size={16} />
                                                    Edit Information
                                                </button>
                                                <button 
                                                    onClick={submitKycApplication} 
                                                    className="submit-btn"
                                                    disabled={saving || kyc.completionPercentage < 80}
                                                >
                                                    <FileText size={16} />
                                                    {saving ? 'Submitting...' : 'Submit for Review'}
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Security Tab */}
                    {activeTab === 'security' && (
                        <div className="security-tab">
                            {/* Low Security Warning Banner */}
                            {calculateSecurityScore() < 60 && (
                                <div className="low-security-banner">
                                    <h3>🚨 URGENT: Your Account is at Risk!</h3>
                                    <p>Your security score is dangerously low. Take immediate action to protect your account.</p>
                                </div>
                            )}

                            <div className="security-header">
                                <h2>Security Center</h2>
                                <button 
                                    className="refresh-security-btn"
                                    onClick={refreshSecurityData}
                                    title="Refresh Security Status"
                                >
                                    <RefreshCw size={16} />
                                    Refresh
                                </button>
                                <div className="security-overview">
                                    <div className="security-score">
                                        <div className="score-circle">
                                            <span className="score-number">{calculateSecurityScore()}</span>
                                            <span className="score-label">Security Score</span>
                                        </div>
                                        <div className="security-level">
                                            <span className={`level-badge ${getSecurityLevel(calculateSecurityScore()).color}`}>
                                                {getSecurityLevel(calculateSecurityScore()).icon}
                                                {getSecurityLevel(calculateSecurityScore()).level} Security
                                            </span>
                                        </div>
                                    </div>
                                    <div className="security-summary">
                                        <h4>Account Protection Status</h4>
                                        <div className="protection-items">
                                            <div className={`protection-item ${profile?.emailVerified ? 'enabled' : 'disabled'}`}>
                                                {profile?.emailVerified ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
                                                <span>Email Verified</span>
                                                {!profile?.emailVerified && <span className="urgent-tag">URGENT</span>}
                                            </div>
                                            <div className={`protection-item ${security?.twoFactorEnabled ? 'enabled' : 'disabled'}`}>
                                                {security?.twoFactorEnabled ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
                                                <span>Two-Factor Authentication</span>
                                                {!security?.twoFactorEnabled && <span className="urgent-tag">CRITICAL</span>}
                                                {security?.twoFactorEnabled && <span className="success-tag">ACTIVE</span>}
                                            </div>
                                            <div className={`protection-item ${kyc?.status === 'approved' ? 'enabled' : 'disabled'}`}>
                                                {kyc?.status === 'approved' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
                                                <span>Identity Verified</span>
                                                {kyc?.status !== 'approved' && <span className="urgent-tag">RECOMMENDED</span>}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="security-sections">
                                {/* 2FA Section - Enhanced */}
                                <div className={`security-section priority ${security?.twoFactorEnabled ? 'secured' : 'vulnerable'}`}>
                                    <div className="section-header">
                                        <div className="section-icon">
                                            {security?.twoFactorEnabled ? '🛡️' : '🚨'}
                                        </div>
                                        <div className="section-info">
                                            <h3>Two-Factor Authentication (2FA)</h3>
                                            <p>
                                                {security?.twoFactorEnabled 
                                                    ? 'Your account is protected with 2FA. Excellent security!' 
                                                    : 'Your account is vulnerable! Enable 2FA to secure your account.'
                                                }
                                            </p>
                                            {security?.twoFactorEnabled && (
                                                <div className="security-benefits">
                                                    <small>✅ Protection against unauthorized access</small>
                                                    <small>✅ +30 points to security score</small>
                                                    <small>✅ Enhanced account recovery options</small>
                                                </div>
                                            )}
                                        </div>
                                        <div className="section-status">
                                            <span className={`status-badge ${security?.twoFactorEnabled ? 'enabled' : 'disabled'}`}>
                                                {security?.twoFactorEnabled ? 'Enabled' : 'Disabled'}
                                            </span>
                                        </div>
                                    </div>
                                    {!security?.twoFactorEnabled && (
                                        <div className="security-warning-box">
                                            <AlertCircle size={20} />
                                            <div>
                                                <strong>Security Risk Detected!</strong>
                                                <p>Your account is at risk without 2FA. Enable it now to protect against unauthorized access.</p>
                                            </div>
                                        </div>
                                    )}
                                    <div className="section-actions">
                                        <button 
                                            className={`security-btn primary ${security?.twoFactorEnabled ? 'secondary' : 'danger'}`}
                                            onClick={() => {
                                                if (security?.twoFactorEnabled) {
                                                    navigate('/setup-2fa?action=manage');
                                                } else {
                                                    navigate('/setup-2fa');
                                                }
                                            }}
                                        >
                                            <Shield size={16} />
                                            {security?.twoFactorEnabled ? 'Manage 2FA' : 'Enable 2FA Now'}
                                        </button>
                                        {security?.twoFactorEnabled && (
                                            <button 
                                                className="security-btn secondary"
                                                onClick={() => {
                                                    if (window.confirm('Are you sure you want to disable 2FA? This will reduce your account security.')) {
                                                        // Handle 2FA disable
                                                        toast.info('2FA disable functionality coming soon');
                                                    }
                                                }}
                                            >
                                                <X size={16} />
                                                Disable 2FA
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Email Verification Section */}
                                <div className={`security-section priority ${profile?.emailVerified ? 'secured' : 'vulnerable'}`}>
                                    <div className="section-header">
                                        <div className="section-icon">
                                            {profile?.emailVerified ? '✅' : '📧'}
                                        </div>
                                        <div className="section-info">
                                            <h3>Email Verification</h3>
                                            <p>
                                                {profile?.emailVerified 
                                                    ? 'Your email address has been verified. Great job!' 
                                                    : 'Your email address needs verification to secure your account.'
                                                }
                                            </p>
                                            {profile?.emailVerified && (
                                                <div className="security-benefits">
                                                    <small>✅ Account recovery via email enabled</small>
                                                    <small>✅ +20 points to security score</small>
                                                    <small>✅ Security notifications active</small>
                                                </div>
                                            )}
                                        </div>
                                        <div className="section-status">
                                            <span className={`status-badge ${profile?.emailVerified ? 'enabled' : 'disabled'}`}>
                                                {profile?.emailVerified ? 'Verified' : 'Not Verified'}
                                            </span>
                                        </div>
                                    </div>
                                    {!profile?.emailVerified && (
                                        <div className="security-warning-box">
                                            <AlertCircle size={20} />
                                            <div>
                                                <strong>Email Verification Required!</strong>
                                                <p>Verify your email address to enable account recovery and security notifications.</p>
                                                <small>Email: <strong>{profile?.email}</strong></small>
                                            </div>
                                        </div>
                                    )}
                                    <div className="section-actions">
                                        {!profile?.emailVerified ? (
                                            <button 
                                                className={`security-btn danger ${saving ? 'loading' : ''}`}
                                                onClick={handleEmailVerification}
                                                disabled={saving}
                                            >
                                                <Mail size={16} />
                                                {saving ? 'Sending...' : 'Send Verification Email'}
                                            </button>
                                        ) : (
                                            <button 
                                                className="security-btn primary secondary"
                                                disabled={true}
                                            >
                                                <CheckCircle size={16} />
                                                Email Verified
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Password Section */}
                                <div className="security-section">
                                    <div className="section-header">
                                        <div className="section-icon">🔐</div>
                                        <div className="section-info">
                                            <h3>Password Security</h3>
                                            <p>Keep your password strong and update it regularly</p>
                                            {security?.lastPasswordChange && (
                                                <small>
                                                    Last changed: {new Date(security.lastPasswordChange).toLocaleDateString()}
                                                </small>
                                            )}
                                        </div>
                                    </div>
                                    <div className="section-actions">
                                        <button 
                                            className="security-btn"
                                            onClick={() => navigate('/change-password')}
                                        >
                                            <Lock size={16} />
                                            Change Password
                                        </button>
                                    </div>
                                </div>

                                {/* Login Sessions */}
                                <div className="security-section">
                                    <div className="section-header">
                                        <div className="section-icon">💻</div>
                                        <div className="section-info">
                                            <h3>Active Sessions</h3>
                                            <p>Monitor and manage your active login sessions</p>
                                        </div>
                                    </div>
                                    <div className="sessions-list">
                                        <div className="session-item current">
                                            <div className="session-info">
                                                <strong>Current Session</strong>
                                                <span>Windows • Chrome • This device</span>
                                                <small>Last active: Now</small>
                                            </div>
                                            <span className="session-status current">Current</span>
                                        </div>
                                        {security?.loginSessions?.length > 0 ? (
                                            security.loginSessions.map((session, index) => (
                                                <div key={index} className="session-item">
                                                    <div className="session-info">
                                                        <strong>{session.device || 'Unknown Device'}</strong>
                                                        <span>{session.location || 'Unknown Location'}</span>
                                                        <small>Last active: {new Date(session.lastActive).toLocaleDateString()}</small>
                                                    </div>
                                                    <button className="session-revoke">Revoke</button>
                                                </div>
                                            ))
                                        ) : (
                                            <p className="no-sessions">No other active sessions</p>
                                        )}
                                    </div>
                                </div>

                                {/* Security Recommendations */}
                                <div className="security-section recommendations">
                                    <div className="section-header">
                                        <div className="section-icon">💡</div>
                                        <div className="section-info">
                                            <h3>Security Recommendations</h3>
                                            <p>Follow these steps to improve your account security</p>
                                        </div>
                                    </div>
                                    <div className="recommendations-list">
                                        {!security?.twoFactorEnabled && (
                                            <div className="recommendation urgent">
                                                <AlertCircle size={16} />
                                                <span>Enable Two-Factor Authentication immediately</span>
                                                <button onClick={() => navigate('/setup-2fa')}>Enable</button>
                                            </div>
                                        )}
                                        {!profile?.emailVerified && (
                                            <div className="recommendation high">
                                                <Mail size={16} />
                                                <span>Verify your email address</span>
                                                <button 
                                                    onClick={handleEmailVerification}
                                                    disabled={saving}
                                                    className={saving ? 'loading' : ''}
                                                >
                                                    {saving ? 'Sending...' : 'Verify'}
                                                </button>
                                            </div>
                                        )}
                                        {kyc?.status !== 'approved' && (
                                            <div className="recommendation medium">
                                                <Shield size={16} />
                                                <span>Complete identity verification</span>
                                                <button onClick={() => setActiveTab('kyc')}>Verify</button>
                                            </div>
                                        )}
                                        <div className="recommendation low">
                                            <RefreshCw size={16} />
                                            <span>Review login activity regularly</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Notifications Tab */}
                    {activeTab === 'notifications' && (
                        <div className="notifications-tab">
                            <div className="notifications-header">
                                <h2>🔔 Notification Preferences</h2>
                                <p className="notifications-subtitle">
                                    Stay informed about your account activities and important updates. 
                                    Customize how and when you receive notifications.
                                </p>
                            </div>

                            <form onSubmit={handleProfileUpdate} className="notifications-form">
                                {/* Email Notifications Section */}
                                <div className="notification-section enhanced">
                                    <div className="section-header-notifications">
                                        <div className="section-icon-large">📧</div>
                                        <div className="section-info-notifications">
                                            <h3>Email Notifications</h3>
                                            <p>Receive important updates directly to your email inbox</p>
                                            <small>Email: <strong>{profile?.email}</strong></small>
                                        </div>
                                        <div className="notification-status">
                                            <span className={`status-indicator ${profile?.emailVerified ? 'verified' : 'unverified'}`}>
                                                {profile?.emailVerified ? '✅ Verified' : '⚠️ Not Verified'}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="notification-options">
                                        <label className="notification-item enhanced">
                                            <div className="notification-toggle">
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
                                                <span className="toggle-slider"></span>
                                            </div>
                                            <div className="notification-content">
                                                <div className="notification-icon">🔒</div>
                                                <div className="notification-info-enhanced">
                                                    <h4>Security Alerts</h4>
                                                    <p>Login attempts, password changes, and security updates</p>
                                                    <div className="notification-examples">
                                                        <small>• New device logins</small>
                                                        <small>• Suspicious activity</small>
                                                        <small>• 2FA status changes</small>
                                                    </div>
                                                </div>
                                                <div className="priority-badge critical">Critical</div>
                                            </div>
                                        </label>

                                        <label className="notification-item enhanced">
                                            <div className="notification-toggle">
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
                                                <span className="toggle-slider"></span>
                                            </div>
                                            <div className="notification-content">
                                                <div className="notification-icon">💳</div>
                                                <div className="notification-info-enhanced">
                                                    <h4>Transaction Updates</h4>
                                                    <p>Order confirmations, payment receipts, and trading activity</p>
                                                    <div className="notification-examples">
                                                        <small>• Purchase confirmations</small>
                                                        <small>• Payment receipts</small>
                                                        <small>• Product transfers</small>
                                                    </div>
                                                </div>
                                                <div className="priority-badge important">Important</div>
                                            </div>
                                        </label>

                                        <label className="notification-item enhanced">
                                            <div className="notification-toggle">
                                                <input
                                                    type="checkbox"
                                                    checked={profile.profile?.notifications?.email?.marketing || false}
                                                    onChange={(e) => setProfile({
                                                        ...profile,
                                                        profile: {
                                                            ...profile.profile,
                                                            notifications: {
                                                                ...profile.profile.notifications,
                                                                email: {
                                                                    ...profile.profile.notifications.email,
                                                                    marketing: e.target.checked
                                                                }
                                                            }
                                                        }
                                                    })}
                                                />
                                                <span className="toggle-slider"></span>
                                            </div>
                                            <div className="notification-content">
                                                <div className="notification-icon">📈</div>
                                                <div className="notification-info-enhanced">
                                                    <h4>Platform Updates</h4>
                                                    <p>New features, promotions, and platform announcements</p>
                                                    <div className="notification-examples">
                                                        <small>• New feature releases</small>
                                                        <small>• Special promotions</small>
                                                        <small>• Platform updates</small>
                                                    </div>
                                                </div>
                                                <div className="priority-badge optional">Optional</div>
                                            </div>
                                        </label>

                                        <label className="notification-item enhanced">
                                            <div className="notification-toggle">
                                                <input
                                                    type="checkbox"
                                                    checked={profile.profile?.notifications?.email?.updates || false}
                                                    onChange={(e) => setProfile({
                                                        ...profile,
                                                        profile: {
                                                            ...profile.profile,
                                                            notifications: {
                                                                ...profile.profile.notifications,
                                                                email: {
                                                                    ...profile.profile.notifications.email,
                                                                    updates: e.target.checked
                                                                }
                                                            }
                                                        }
                                                    })}
                                                />
                                                <span className="toggle-slider"></span>
                                            </div>
                                            <div className="notification-content">
                                                <div className="notification-icon">📢</div>
                                                <div className="notification-info-enhanced">
                                                    <h4>Account Updates</h4>
                                                    <p>KYC status changes, verification updates, and account alerts</p>
                                                    <div className="notification-examples">
                                                        <small>• KYC approval status</small>
                                                        <small>• Account limit changes</small>
                                                        <small>• Verification updates</small>
                                                    </div>
                                                </div>
                                                <div className="priority-badge important">Important</div>
                                            </div>
                                        </label>
                                    </div>
                                </div>

                                {/* Push Notifications Section */}
                                <div className="notification-section enhanced">
                                    <div className="section-header-notifications">
                                        <div className="section-icon-large">🔔</div>
                                        <div className="section-info-notifications">
                                            <h3>Browser Notifications</h3>
                                            <p>Get instant alerts in your browser for real-time updates</p>
                                            <small>Status: <strong>Browser notifications require permission</strong></small>
                                        </div>
                                        <div className="notification-status">
                                            <span className="status-indicator neutral">
                                                🔕 Coming Soon
                                            </span>
                                        </div>
                                    </div>

                                    <div className="notification-options">
                                        <div className="notification-item enhanced disabled">
                                            <div className="notification-toggle">
                                                <input
                                                    type="checkbox"
                                                    disabled={true}
                                                    checked={false}
                                                />
                                                <span className="toggle-slider disabled"></span>
                                            </div>
                                            <div className="notification-content">
                                                <div className="notification-icon">⚡</div>
                                                <div className="notification-info-enhanced">
                                                    <h4>Real-time Alerts</h4>
                                                    <p>Instant notifications for urgent security and transaction events</p>
                                                    <div className="notification-examples">
                                                        <small>• Immediate security alerts</small>
                                                        <small>• High-value transactions</small>
                                                        <small>• Price alerts</small>
                                                    </div>
                                                </div>
                                                <div className="priority-badge coming-soon">Coming Soon</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Frequency Settings */}
                                <div className="notification-section enhanced">
                                    <div className="section-header-notifications">
                                        <div className="section-icon-large">⏰</div>
                                        <div className="section-info-notifications">
                                            <h3>Notification Frequency</h3>
                                            <p>Control how often you receive summary emails and digest notifications</p>
                                        </div>
                                    </div>

                                    <div className="frequency-options">
                                        <div className="frequency-item">
                                            <label>📊 Weekly Summary</label>
                                            <select 
                                                value={profile.profile?.notifications?.frequency?.weekly || 'enabled'}
                                                onChange={(e) => setProfile({
                                                    ...profile,
                                                    profile: {
                                                        ...profile.profile,
                                                        notifications: {
                                                            ...profile.profile.notifications,
                                                            frequency: {
                                                                ...profile.profile.notifications?.frequency,
                                                                weekly: e.target.value
                                                            }
                                                        }
                                                    }
                                                })}
                                                className="frequency-select"
                                            >
                                                <option value="enabled">Enabled</option>
                                                <option value="disabled">Disabled</option>
                                            </select>
                                        </div>

                                        <div className="frequency-item">
                                            <label>📈 Monthly Report</label>
                                            <select 
                                                value={profile.profile?.notifications?.frequency?.monthly || 'enabled'}
                                                onChange={(e) => setProfile({
                                                    ...profile,
                                                    profile: {
                                                        ...profile.profile,
                                                        notifications: {
                                                            ...profile.profile.notifications,
                                                            frequency: {
                                                                ...profile.profile.notifications?.frequency,
                                                                monthly: e.target.value
                                                            }
                                                        }
                                                    }
                                                })}
                                                className="frequency-select"
                                            >
                                                <option value="enabled">Enabled</option>
                                                <option value="disabled">Disabled</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                <div className="notifications-footer">
                                    <div className="save-section">
                                        <button type="submit" className="save-btn enhanced" disabled={saving}>
                                            <Save size={20} />
                                            {saving ? 'Saving Preferences...' : 'Save Notification Preferences'}
                                        </button>
                                        <p className="save-info">
                                            Changes will take effect immediately. You can modify these settings anytime.
                                        </p>
                                    </div>
                                </div>
                            </form>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ProfileSettings; 