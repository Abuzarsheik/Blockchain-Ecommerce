import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { ShoppingCart, User, ChevronDown, Settings, HelpCircle, LogOut } from 'lucide-react';
import { logout } from '../store/slices/authSlice';
import '../styles/Header.css';

const Header = () => {
  const { itemCount } = useSelector(state => state.cart);
  const { isAuthenticated, user } = useSelector(state => state.auth);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleLogout = () => {
    dispatch(logout());
    setShowUserMenu(false);
    navigate('/');
  };

  // Check if user is a seller (sellers shouldn't see cart)
  const isSeller = user?.userType === 'seller' && user?.role !== 'admin';

  return (
    <header className="header">
      <div className="header-container">
        <Link to="/" className="logo">
          <h1>Blocmerce</h1>
        </Link>

        <nav className="nav">
          <Link to="/catalog" className="nav-link">Marketplace</Link>
          <Link to="/technology" className="nav-link">Technology</Link>
          <Link to="/about" className="nav-link">About</Link>
          <Link to="/help" className="nav-link">Help</Link>
        </nav>

        <div className="header-actions">
          {/* Only show cart for buyers and admins, not for pure sellers */}
          {isAuthenticated && !isSeller && (
            <Link to="/cart" className="cart-link">
              <ShoppingCart size={20} />
              {itemCount > 0 && <span className="cart-count">{itemCount}</span>}
            </Link>
          )}

          {isAuthenticated ? (
            <div className="user-menu">
              <button 
                className="user-toggle"
                onClick={() => setShowUserMenu(!showUserMenu)}
              >
                <User size={20} />
                <span>{user?.firstName || user?.name || 'Account'}</span>
                <ChevronDown size={16} />
              </button>
              
              {showUserMenu && (
                <div className="user-dropdown">
                  <Link to="/profile" className="dropdown-item" onClick={() => setShowUserMenu(false)}>
                    <Settings size={16} />
                    Profile
                  </Link>
                  <Link to="/dashboard" className="dropdown-item" onClick={() => setShowUserMenu(false)}>
                    <User size={16} />
                    Dashboard
                  </Link>
                  <Link to="/help" className="dropdown-item" onClick={() => setShowUserMenu(false)}>
                    <HelpCircle size={16} />
                    Help Center
                  </Link>
                  <div className="dropdown-divider"></div>
                  <button className="dropdown-item logout-btn" onClick={handleLogout}>
                    <LogOut size={16} />
                    Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link to="/login" className="login-link">
              Login
            </Link>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header; 