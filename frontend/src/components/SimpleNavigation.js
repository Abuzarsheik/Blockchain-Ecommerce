import React, { useState, useEffect, useCallback, memo, useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { 
  Home, 
  ShoppingBag, 
  User, 
  Search, 
  Menu, 
  X,
  Heart,
  Settings,
  LogOut,
  ChevronDown
} from 'lucide-react';
import { logout } from '../store/slices/authSlice';
import IntelligentSearch from './IntelligentSearch';
import WishlistSystem from './WishlistSystem';
import RealTimeNotifications from './RealTimeNotifications';
import './SimpleNavigation.css';

// Custom hook for debounced search
const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

const SimpleNavigation = memo(() => {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user, isAuthenticated } = useSelector(state => state.auth);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [wishlistOpen, setWishlistOpen] = useState(false);

  // Memoize navigation items to prevent unnecessary re-renders
  const navItems = useMemo(() => [
    { label: 'Home', path: '/', icon: Home },
    { label: 'Marketplace', path: '/catalog', icon: ShoppingBag },
    { label: 'Products', path: '/products', icon: ShoppingBag },
    { label: 'About', path: '/about', icon: User },
    { label: 'Technology', path: '/technology', icon: Settings },
  ], []);

  const userMenuItems = useMemo(() => [
    { label: 'Profile', path: '/profile', icon: User },
    { label: 'Dashboard', path: '/dashboard', icon: Settings },
    { label: 'Orders', path: '/orders', icon: ShoppingBag },
    { label: 'Wishlist', path: '/wishlist', icon: Heart },
    { label: 'Settings', path: '/profile-settings', icon: Settings },
  ], []);

  const handleLogout = useCallback(() => {
    dispatch(logout());
    setUserMenuOpen(false);
  }, [dispatch]);

  const toggleMobileMenu = useCallback(() => {
    setMobileMenuOpen(prev => !prev);
  }, []);

  const toggleUserMenu = useCallback(() => {
    setUserMenuOpen(prev => !prev);
  }, []);

  const toggleWishlist = useCallback(() => {
    setWishlistOpen(prev => !prev);
  }, []);

  const closeMobileMenu = useCallback(() => {
    setMobileMenuOpen(false);
  }, []);

  const closeUserMenu = useCallback(() => {
    setUserMenuOpen(false);
  }, []);

  const handleSearch = useCallback((query, options = {}) => {
    const searchUrl = `/search?q=${encodeURIComponent(query)}`;
    if (options.intent) {
      navigate(`${searchUrl}&intent=${options.intent.type}`);
    } else {
      navigate(searchUrl);
    }
  }, [navigate]);

  const handleFilterChange = useCallback((filters) => {
    navigate('/catalog', { state: { filters } });
  }, [navigate]);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.user-menu-container')) {
        setUserMenuOpen(false);
      }
      if (!event.target.closest('.mobile-menu-container')) {
        setMobileMenuOpen(false);
      }
      if (!event.target.closest('.wishlist-container')) {
        setWishlistOpen(false);
      }
    };

    if (mobileMenuOpen || userMenuOpen || wishlistOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [mobileMenuOpen, userMenuOpen, wishlistOpen]);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // Memoize user info to prevent unnecessary re-renders
  const userInfo = useMemo(() => ({
    initial: user?.name?.charAt(0)?.toUpperCase() || 'U',
    name: user?.name || 'User',
    email: user?.email
  }), [user?.name, user?.email]);

  return (
    <nav className="simple-navigation" role="navigation" aria-label="Main navigation">
      <div className="nav-container">
        {/* Logo */}
        <Link to="/" className="nav-logo" aria-label="Blocmerce Home">
          <div className="logo-icon">💎</div>
          <span className="logo-text">Blocmerce</span>
        </Link>

        {/* Desktop Navigation */}
        <div className="nav-links-desktop">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`nav-link ${isActive ? 'active' : ''}`}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon size={18} aria-hidden="true" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>

        {/* Right Side Actions */}
        <div className="nav-actions">
          {/* Enhanced Search */}
          <div className="search-container">
            <IntelligentSearch
              onSearch={handleSearch}
              onFilterChange={handleFilterChange}
              placeholder="Search NFTs, creators..."
              aiEnabled={true}
              showTrending={true}
              showRecent={true}
              className="nav-search"
            />
          </div>

          {/* Real-time Notifications */}
          {isAuthenticated && <RealTimeNotifications />}

          {/* Wishlist */}
          {isAuthenticated && (
            <div className="wishlist-container">
              <button 
                onClick={toggleWishlist}
                className="wishlist-button"
                aria-label="View wishlist"
              >
                <Heart size={18} aria-hidden="true" />
              </button>
              
              {wishlistOpen && (
                <div className="wishlist-dropdown">
                  <WishlistSystem 
                    isDropdown={true}
                    onClose={() => setWishlistOpen(false)}
                  />
                </div>
              )}
            </div>
          )}

          {/* Cart */}
          <Link to="/cart" className="cart-link" aria-label="Shopping cart">
            <ShoppingBag size={18} aria-hidden="true" />
          </Link>

          {/* User Menu or Login */}
          {isAuthenticated ? (
            <div className="user-menu-container">
              <button 
                onClick={toggleUserMenu}
                className="user-menu-button"
                aria-expanded={userMenuOpen}
                aria-haspopup="true"
                aria-label="User menu"
              >
                <div className="user-avatar">
                  {userInfo.initial}
                </div>
                <ChevronDown size={16} className={`chevron ${userMenuOpen ? 'rotated' : ''}`} />
              </button>
              
              {userMenuOpen && (
                <div className="user-dropdown" role="menu">
                  <div className="user-info">
                    <div className="user-name">{userInfo.name}</div>
                    <div className="user-email">{userInfo.email}</div>
                  </div>
                  <div className="dropdown-divider" />
                  {userMenuItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        className="dropdown-item"
                        onClick={closeUserMenu}
                        role="menuitem"
                      >
                        <Icon size={16} aria-hidden="true" />
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                  <div className="dropdown-divider" />
                  <button 
                    onClick={handleLogout}
                    className="dropdown-item logout-item"
                    role="menuitem"
                  >
                    <LogOut size={16} aria-hidden="true" />
                    <span>Logout</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link to="/login" className="login-button">
              Login
            </Link>
          )}

          {/* Mobile Menu Button */}
          <button 
            onClick={toggleMobileMenu}
            className="mobile-menu-button"
            aria-expanded={mobileMenuOpen}
            aria-label="Mobile menu"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="mobile-menu-container">
          <div className="mobile-menu" role="menu">
            {/* Mobile Search */}
            <div className="mobile-search-container">
              <IntelligentSearch
                onSearch={handleSearch}
                onFilterChange={handleFilterChange}
                placeholder="Search NFTs..."
                aiEnabled={false}
                showTrending={false}
                showRecent={true}
                className="mobile-search"
              />
            </div>

            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`mobile-nav-link ${isActive ? 'active' : ''}`}
                  onClick={closeMobileMenu}
                  role="menuitem"
                  aria-current={isActive ? 'page' : undefined}
                >
                  <Icon size={20} aria-hidden="true" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
            
            {isAuthenticated && (
              <>
                <div className="mobile-menu-divider" />
                {userMenuItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className="mobile-nav-link"
                      onClick={closeMobileMenu}
                      role="menuitem"
                    >
                      <Icon size={20} aria-hidden="true" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
                <button 
                  onClick={() => { handleLogout(); closeMobileMenu(); }}
                  className="mobile-nav-link logout-item"
                  role="menuitem"
                >
                  <LogOut size={20} aria-hidden="true" />
                  <span>Logout</span>
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
});

SimpleNavigation.displayName = 'SimpleNavigation';

export default SimpleNavigation; 