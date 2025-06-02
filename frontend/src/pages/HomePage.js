import '../styles/HomePage.css';
import React from 'react';
import { ArrowRight, Verified, TrendingUp, Users, ShoppingBag, User, HelpCircle, Settings } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';

const HomePage = () => {
  const { user, isAuthenticated } = useSelector(state => state.auth);

  return (
    <div className="home-page">
      <section className="hero">
        <div className="hero-content">
          <h1>The Future of Commerce is Decentralized</h1>
          <p>Discover, buy, and sell verified products on the blockchain</p>
          <div className="hero-actions">
            <Link to="/catalog" className="cta-button primary">
              Explore Marketplace
              <ArrowRight size={20} />
            </Link>
            {(isAuthenticated && (user?.userType === 'seller' || user?.role === 'admin')) && (
              <Link to="/create-product" className="cta-button secondary">
                List Product
              </Link>
            )}
          </div>
        </div>
      </section>

      <section className="stats">
        <div className="stats-container">
          <div className="stat-item">
            <TrendingUp size={24} />
            <span className="stat-number">$2.5M+</span>
            <span className="stat-label">Trading Volume</span>
          </div>
          <div className="stat-item">
            <Users size={24} />
            <span className="stat-number">15K+</span>
            <span className="stat-label">Active Users</span>
          </div>
          <div className="stat-item">
            <Verified size={24} />
            <span className="stat-number">50K+</span>
            <span className="stat-label">Products Listed</span>
          </div>
        </div>
      </section>

      <section className="features">
        <div className="features-container">
          <h2>Why Choose Blocmerce?</h2>
          <div className="features-grid">
            <div className="feature-card">
              <Verified size={32} />
              <h3>Blockchain Verified</h3>
              <p>Every product is verified on the blockchain for authenticity</p>
              <Link to="/technology" className="feature-link">
                Learn More <ArrowRight size={16} />
              </Link>
            </div>
            <div className="feature-card">
              <ShoppingBag size={32} />
              <h3>Secure Payments</h3>
              <p>Traditional and crypto payment options with full security</p>
              <Link to="/cart" className="feature-link">
                View Cart <ArrowRight size={16} />
              </Link>
            </div>
            <div className="feature-card">
              <Users size={32} />
              <h3>Global Marketplace</h3>
              <p>Connect with sellers and buyers worldwide</p>
              <Link to="/about" className="feature-link">
                About Us <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="user-features">
        <div className="user-features-container">
          <h2>Your Blocmerce Experience</h2>
          <div className="user-features-grid">
            <div className="user-feature-card">
              <User size={48} />
              <h3>Manage Your Profile</h3>
              <p>Track your product purchases, view transaction history, and customize your account settings</p>
              <Link to="/profile" className="user-feature-link">
                View Profile <ArrowRight size={16} />
              </Link>
            </div>
            <div className="user-feature-card">
              <HelpCircle size={48} />
              <h3>Get Help & Support</h3>
              <p>Find answers to common questions, contact support, and join our community</p>
              <Link to="/help" className="user-feature-link">
                Help Center <ArrowRight size={16} />
              </Link>
            </div>
            <div className="user-feature-card">
              <Settings size={48} />
              <h3>Account Dashboard</h3>
              <p>Access your orders, manage your listings, and control your marketplace activity</p>
              <Link to="/dashboard" className="user-feature-link">
                Dashboard <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage; 