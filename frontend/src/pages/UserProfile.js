import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { User, Mail, Phone, MapPin, Edit3, Camera, Wallet, Award, TrendingUp } from 'lucide-react';
import { toast } from 'react-toastify';
import '../styles/UserProfile.css';

const UserProfile = () => {
  const { user, isAuthenticated } = useSelector(state => state.auth);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    username: user?.username || '',
    email: user?.email || '',
    phone: user?.phone || '',
    location: user?.location || '',
    bio: user?.bio || 'Blockchain enthusiast and NFT collector',
    walletAddress: user?.walletAddress || ''
  });

  // Mock user stats for FYP demonstration
  const userStats = {
    nftsOwned: 24,
    totalSpent: 12.5,
    totalEarned: 8.2,
    joinDate: '2024-01-15'
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSave = () => {
    // Simulate saving profile
    setIsEditing(false);
    toast.success('Profile updated successfully!');
  };

  const handleCancel = () => {
    setIsEditing(false);
    // Reset form data
    setFormData({
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      username: user?.username || '',
      email: user?.email || '',
      phone: user?.phone || '',
      location: user?.location || '',
      bio: user?.bio || 'Blockchain enthusiast and NFT collector',
      walletAddress: user?.walletAddress || ''
    });
  };

  if (!isAuthenticated) {
    return (
      <div className="profile-unauthorized">
        <h2>Please Login</h2>
        <p>You need to be logged in to view your profile.</p>
      </div>
    );
  }

  return (
    <div className="user-profile">
      <div className="profile-container">
        {/* Profile Header */}
        <div className="profile-header">
          <div className="profile-avatar-section">
            <div className="profile-avatar">
              <img 
                src={user?.avatar || '/api/placeholder/120/120'} 
                alt="Profile"
              />
              <button className="avatar-edit-btn">
                <Camera size={16} />
              </button>
            </div>
            <div className="profile-basic-info">
              <h1>{formData.firstName} {formData.lastName}</h1>
              <p className="profile-email">{formData.email}</p>
              <div className="wallet-info">
                <Wallet size={16} />
                <span>{formData.walletAddress}</span>
              </div>
            </div>
          </div>
          
          <button 
            className="edit-profile-btn"
            onClick={() => setIsEditing(!isEditing)}
          >
            <Edit3 size={16} />
            {isEditing ? 'Cancel' : 'Edit Profile'}
          </button>
        </div>

        {/* Stats Section */}
        <div className="profile-stats">
          <div className="stat-card">
            <Award size={24} />
            <span className="stat-number">{userStats.nftsOwned}</span>
            <span className="stat-label">NFTs Owned</span>
          </div>
          <div className="stat-card">
            <TrendingUp size={24} />
            <span className="stat-number">{userStats.totalSpent} ETH</span>
            <span className="stat-label">Total Spent</span>
          </div>
          <div className="stat-card">
            <Wallet size={24} />
            <span className="stat-number">{userStats.totalEarned} ETH</span>
            <span className="stat-label">Total Earned</span>
          </div>
          <div className="stat-card">
            <User size={24} />
            <span className="stat-number">
              {new Date(userStats.joinDate).toLocaleDateString('en-US', { 
                month: 'short', 
                year: 'numeric' 
              })}
            </span>
            <span className="stat-label">Member Since</span>
          </div>
        </div>

        {/* Profile Details */}
        <div className="profile-details">
          <h2>Profile Information</h2>
          
          {isEditing ? (
            <div className="profile-form">
              <div className="form-group">
                <label>
                  <User size={16} />
                  First Name
                </label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                />
              </div>

              <div className="form-group">
                <label>
                  <User size={16} />
                  Last Name
                </label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                />
              </div>

              <div className="form-group">
                <label>
                  <User size={16} />
                  Username
                </label>
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                />
              </div>

              <div className="form-group">
                <label>
                  <Mail size={16} />
                  Email Address
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                />
              </div>

              <div className="form-group">
                <label>
                  <Phone size={16} />
                  Phone Number
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                />
              </div>

              <div className="form-group">
                <label>
                  <MapPin size={16} />
                  Location
                </label>
                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleInputChange}
                />
              </div>

              <div className="form-group">
                <label>
                  <Edit3 size={16} />
                  Bio
                </label>
                <textarea
                  name="bio"
                  value={formData.bio}
                  onChange={handleInputChange}
                  rows={3}
                />
              </div>

              <div className="form-group">
                <label>
                  <Wallet size={16} />
                  Wallet Address
                </label>
                <input
                  type="text"
                  name="walletAddress"
                  value={formData.walletAddress}
                  onChange={handleInputChange}
                  disabled
                />
                <small>Wallet address cannot be changed</small>
              </div>

              <div className="form-actions">
                <button className="btn-primary" onClick={handleSave}>
                  Save Changes
                </button>
                <button className="btn-secondary" onClick={handleCancel}>
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="profile-display">
              <div className="info-item">
                <User size={16} />
                <span className="label">First Name:</span>
                <span className="value">{formData.firstName}</span>
              </div>

              <div className="info-item">
                <User size={16} />
                <span className="label">Last Name:</span>
                <span className="value">{formData.lastName}</span>
              </div>

              <div className="info-item">
                <User size={16} />
                <span className="label">Username:</span>
                <span className="value">{formData.username}</span>
              </div>

              <div className="info-item">
                <Mail size={16} />
                <span className="label">Email:</span>
                <span className="value">{formData.email}</span>
              </div>

              <div className="info-item">
                <Phone size={16} />
                <span className="label">Phone:</span>
                <span className="value">{formData.phone}</span>
              </div>

              <div className="info-item">
                <MapPin size={16} />
                <span className="label">Location:</span>
                <span className="value">{formData.location}</span>
              </div>

              <div className="info-item bio">
                <Edit3 size={16} />
                <span className="label">Bio:</span>
                <span className="value">{formData.bio}</span>
              </div>

              <div className="info-item">
                <Wallet size={16} />
                <span className="label">Wallet:</span>
                <span className="value wallet-address">{formData.walletAddress}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserProfile; 