import React from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Home, Search } from 'lucide-react';
import '../styles/NotFound.css';

const NotFound = () => {
  const { user, isAuthenticated } = useSelector(state => state.auth);

  return (
    <div className="not-found-page">
      <div className="not-found-container">
        <div className="error-animation">
          <h1 className="error-code">404</h1>
          <div className="blockchain-pattern"></div>
        </div>
        
        <div className="error-content">
          <h2>Page Not Found</h2>
          <p>The page you're looking for doesn't exist on our blockchain marketplace.</p>
          
          <div className="error-actions">
            <Link to="/" className="btn-primary">
              <Home size={20} />
              Go Home
            </Link>
            <Link to="/catalog" className="btn-secondary">
              <Search size={20} />
              Browse Marketplace
            </Link>
          </div>
          
          <div className="help-links">
            <p>Need help? Try these popular sections:</p>
            <div className="quick-links">
              <Link to="/technology">Technology</Link>
              <Link to="/about">About Us</Link>
              {(isAuthenticated && (user?.userType === 'seller' || user?.role === 'admin')) && (
                <Link to="/create-nft">Create NFT</Link>
              )}
              <Link to="/dashboard">Dashboard</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFound; 