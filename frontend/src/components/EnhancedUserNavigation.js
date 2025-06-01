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
  ChevronDown,
  Plus,
  BarChart3,
  Users,
  Shield,
  Package,
  CreditCard,
  Truck,
  Star,
  Bell,
  HelpCircle,
  DollarSign,
  Eye,
  Edit,
  FileText,
  Gavel,
  Archive,
  TrendingUp,
  Activity,
  Database,
  Lock,
  UserCheck,
  AlertTriangle,
  CheckCircle,
  Clock,
  Filter,
  Download,
  MoreHorizontal
} from 'lucide-react';
import { logout } from '../store/slices/authSlice';
import IntelligentSearch from './IntelligentSearch';
import WishlistSystem from './WishlistSystem';
import RealTimeNotifications from './RealTimeNotifications';
import './EnhancedNavigation.css';

const EnhancedUserNavigation = memo(() => {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user, isAuthenticated } = useSelector(state => state.auth);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [wishlistOpen, setWishlistOpen] = useState(false);

  // Determine user role
  const userRole = user?.role || user?.userType || 'buyer';
  const isAdmin = userRole === 'admin' || user?.isAdmin;
  const isSeller = userRole === 'seller' || user?.isSeller;
  const isBuyer = userRole === 'buyer' || (!isAdmin && !isSeller);

  // Base navigation items for all users
  const baseNavItems = useMemo(() => [
    { label: 'Home', path: '/', icon: Home },
    { label: 'NFT Marketplace', path: '/catalog', icon: ShoppingBag },
    { label: 'Products', path: '/products', icon: Package },
    { label: 'About', path: '/about', icon: User },
  ], []);

  // Buyer-specific navigation items
  const buyerNavItems = useMemo(() => [
    { label: 'Search', path: '/search', icon: Search, category: 'Discovery' },
    { label: 'Wishlist', path: '/wishlist', icon: Heart, category: 'Collections' },
    { label: 'Shopping Cart', path: '/cart', icon: ShoppingBag, category: 'Shopping' },
    { label: 'Order History', path: '/orders', icon: Truck, category: 'Orders' },
    { label: 'Reviews', path: '/reviews', icon: Star, category: 'Feedback' },
  ], []);

  // Seller-specific navigation items
  const sellerNavItems = useMemo(() => [
    { label: 'Seller Dashboard', path: '/seller-dashboard', icon: BarChart3, category: 'Management' },
    { label: 'Create NFT', path: '/create-nft', icon: Plus, category: 'Creation' },
    { label: 'My Listings', path: '/seller/listings', icon: Package, category: 'Inventory' },
    { label: 'Sales Analytics', path: '/seller/analytics', icon: TrendingUp, category: 'Analytics' },
    { label: 'Customer Orders', path: '/seller/orders', icon: Truck, category: 'Orders' },
    { label: 'Revenue Tracking', path: '/seller/revenue', icon: DollarSign, category: 'Finance' },
    { label: 'Customer Reviews', path: '/seller/reviews', icon: Star, category: 'Feedback' },
    { label: 'Profile Verification', path: '/seller/verification', icon: UserCheck, category: 'Verification' },
  ], []);

  // Admin-specific navigation items
  const adminNavItems = useMemo(() => [
    { label: 'Admin Dashboard', path: '/admin/dashboard', icon: BarChart3, category: 'Overview' },
    { label: 'User Management', path: '/admin/users', icon: Users, category: 'Users' },
    { label: 'Content Moderation', path: '/admin/moderation', icon: Eye, category: 'Content' },
    { label: 'Transaction Monitor', path: '/admin/transactions', icon: CreditCard, category: 'Finance' },
    { label: 'Dispute Resolution', path: '/admin/disputes', icon: Gavel, category: 'Support' },
    { label: 'System Analytics', path: '/admin/analytics', icon: Activity, category: 'Analytics' },
    { label: 'Security Audit', path: '/admin/security', icon: Shield, category: 'Security' },
    { label: 'Platform Settings', path: '/admin/settings', icon: Settings, category: 'Configuration' },
    { label: 'Revenue Reports', path: '/admin/revenue', icon: DollarSign, category: 'Finance' },
    { label: 'System Health', path: '/admin/health', icon: Activity, category: 'Monitoring' },
  ], []);

  // Common user menu items
  const commonUserMenuItems = useMemo(() => [
    { label: 'My Profile', path: '/profile', icon: User, category: 'Account' },
    { label: 'Account Settings', path: '/profile-settings', icon: Settings, category: 'Account' },
    { label: 'Security Settings', path: '/security', icon: Lock, category: 'Security' },
    { label: 'Notifications', path: '/notifications', icon: Bell, category: 'Preferences' },
    { label: 'Help & Support', path: '/help', icon: HelpCircle, category: 'Support' },
  ], []);

  // Get role-specific navigation items
  const roleSpecificItems = useMemo(() => {
    if (isAdmin) return adminNavItems;
    if (isSeller) return [...buyerNavItems, ...sellerNavItems];
    return buyerNavItems;
  }, [isAdmin, isSeller, adminNavItems, buyerNavItems, sellerNavItems]);

  // Combined user menu items based on role
  const userMenuItems = useMemo(() => {
    const items = [...commonUserMenuItems];
    
    if (isAuthenticated) {
      items.unshift({ label: 'Dashboard', path: '/dashboard', icon: BarChart3, category: 'Quick Access' });
      
      if (isSeller) {
        items.splice(1, 0, { label: 'Seller Dashboard', path: '/seller-dashboard', icon: TrendingUp, category: 'Quick Access' });
      }
      
      if (isAdmin) {
        items.splice(1, 0, { label: 'Admin Panel', path: '/admin/dashboard', icon: Shield, category: 'Quick Access' });
      }
    }
    
    return items;
  }, [commonUserMenuItems, isAuthenticated, isSeller, isAdmin]);

  // Quick action items based on role
  const quickActions = useMemo(() => {
    const actions = [];
    
    if (isAuthenticated) {
      if (isSeller) {
        actions.push(
          { label: 'Create NFT', path: '/create-nft', icon: Plus, color: 'primary' },
          { label: 'View Sales', path: '/seller/analytics', icon: BarChart3, color: 'success' }
        );
      }
      
      if (isAdmin) {
        actions.push(
          { label: 'User Management', path: '/admin/users', icon: Users, color: 'warning' },
          { label: 'System Monitor', path: '/admin/analytics', icon: Activity, color: 'info' }
        );
      }
      
      // Common actions for all authenticated users
      actions.push(
        { label: 'Orders', path: '/orders', icon: Truck, color: 'secondary' },
        { label: 'Support', path: '/help', icon: HelpCircle, color: 'muted' }
      );
    }
    
    return actions;
  }, [isAuthenticated, isSeller, isAdmin]);

  const handleLogout = useCallback(() => {
    dispatch(logout());
    setUserMenuOpen(false);
    navigate('/');
  }, [dispatch, navigate]);

  const toggleMobileMenu = useCallback(() => {
    setMobileMenuOpen(prev => !prev);
  }, []);

  const toggleUserMenu = useCallback(() => {
    setUserMenuOpen(prev => !prev);
  }, []);

  const toggleWishlist = useCallback(() => {
    setWishlistOpen(prev => !prev);
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

  // Group menu items by category
  const groupedMenuItems = useMemo(() => {
    const groups = {};
    userMenuItems.forEach(item => {
      const category = item.category || 'Other';
      if (!groups[category]) groups[category] = [];
      groups[category].push(item);
    });
    return groups;
  }, [userMenuItems]);

  const userInfo = useMemo(() => ({
    initial: user?.name?.charAt(0)?.toUpperCase() || user?.firstName?.charAt(0)?.toUpperCase() || 'U',
    name: user?.name || `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'User',
    email: user?.email,
    role: userRole.charAt(0).toUpperCase() + userRole.slice(1),
    verified: user?.isVerified || false
  }), [user, userRole]);

  return (
    <nav className="enhanced-navigation" role="navigation" aria-label="Main navigation">
      <div className="nav-container">
        {/* Logo */}
        <Link to="/" className="nav-logo" aria-label="Blocmerce Home">
          <div className="logo-icon">💎</div>
          <span className="logo-text">Blocmerce</span>
          {isAdmin && <span className="role-badge admin">Admin</span>}
          {isSeller && <span className="role-badge seller">Seller</span>}
        </Link>

        {/* Desktop Navigation */}
        <div className="nav-links-desktop">
          {baseNavItems.map((item) => {
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

          {/* Role-specific quick links */}
          {isAuthenticated && isSeller && (
            <Link
              to="/create-nft"
              className={`nav-link create-nft-link ${location.pathname === '/create-nft' ? 'active' : ''}`}
              aria-label="Create new NFT"
            >
              <Plus size={18} aria-hidden="true" />
              <span>Create NFT</span>
            </Link>
          )}

          {isAuthenticated && isAdmin && (
            <Link
              to="/admin/dashboard"
              className={`nav-link admin-link ${location.pathname.startsWith('/admin') ? 'active' : ''}`}
              aria-label="Admin dashboard"
            >
              <Shield size={18} aria-hidden="true" />
              <span>Admin Panel</span>
            </Link>
          )}
        </div>

        {/* Right Side Actions */}
        <div className="nav-actions">
          {/* Enhanced Search */}
          <div className="search-container">
            <IntelligentSearch
              onSearch={handleSearch}
              onFilterChange={handleFilterChange}
              placeholder={`Search ${isSeller ? 'marketplace & your items' : 'NFTs, creators'}...`}
              aiEnabled={true}
              showTrending={true}
              showRecent={true}
              className="nav-search"
            />
          </div>

          {/* Quick Actions */}
          {isAuthenticated && quickActions.length > 0 && (
            <div className="quick-actions">
              {quickActions.slice(0, 2).map((action, index) => {
                const Icon = action.icon;
                return (
                  <Link
                    key={action.path}
                    to={action.path}
                    className={`quick-action-btn ${action.color}`}
                    aria-label={action.label}
                    title={action.label}
                  >
                    <Icon size={16} aria-hidden="true" />
                  </Link>
                );
              })}
            </div>
          )}

          {/* Real-time Notifications */}
          {isAuthenticated && <RealTimeNotifications />}

          {/* Wishlist (for buyers and sellers) */}
          {isAuthenticated && !isAdmin && (
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

          {/* Cart (for buyers) */}
          {isAuthenticated && !isAdmin && (
            <Link to="/cart" className="cart-link" aria-label="Shopping cart">
              <ShoppingBag size={18} aria-hidden="true" />
            </Link>
          )}

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
                <div className={`user-avatar ${userRole}`}>
                  {userInfo.initial}
                  {userInfo.verified && <CheckCircle size={12} className="verified-badge" />}
                </div>
                <ChevronDown size={16} className={`chevron ${userMenuOpen ? 'rotated' : ''}`} />
              </button>
              
              {userMenuOpen && (
                <div className="user-dropdown enhanced" role="menu">
                  {/* User Info Header */}
                  <div className="user-info">
                    <div className="user-avatar-large">
                      {userInfo.initial}
                      {userInfo.verified && <CheckCircle size={16} className="verified-badge" />}
                    </div>
                    <div className="user-details">
                      <div className="user-name">{userInfo.name}</div>
                      <div className="user-email">{userInfo.email}</div>
                      <div className={`user-role-badge ${userRole}`}>
                        {userInfo.role}
                        {userInfo.verified && <span className="verified-text">• Verified</span>}
                      </div>
                    </div>
                  </div>

                  <div className="dropdown-divider" />

                  {/* Grouped Menu Items */}
                  {Object.entries(groupedMenuItems).map(([category, items]) => (
                    <div key={category} className="menu-group">
                      <div className="menu-group-title">{category}</div>
                      {items.map((item) => {
                        const Icon = item.icon;
                        return (
                          <Link
                            key={item.path}
                            to={item.path}
                            className="dropdown-item"
                            onClick={() => setUserMenuOpen(false)}
                            role="menuitem"
                          >
                            <Icon size={16} aria-hidden="true" />
                            <span>{item.label}</span>
                          </Link>
                        );
                      })}
                    </div>
                  ))}

                  {/* Role-specific quick links */}
                  {roleSpecificItems.length > 0 && (
                    <>
                      <div className="dropdown-divider" />
                      <div className="menu-group">
                        <div className="menu-group-title">
                          {isAdmin ? 'Admin Tools' : isSeller ? 'Seller Tools' : 'My Activities'}
                        </div>
                        {roleSpecificItems.slice(0, 4).map((item) => {
                          const Icon = item.icon;
                          return (
                            <Link
                              key={item.path}
                              to={item.path}
                              className="dropdown-item"
                              onClick={() => setUserMenuOpen(false)}
                              role="menuitem"
                            >
                              <Icon size={16} aria-hidden="true" />
                              <span>{item.label}</span>
                            </Link>
                          );
                        })}
                        {roleSpecificItems.length > 4 && (
                          <Link
                            to={isAdmin ? '/admin/dashboard' : isSeller ? '/seller-dashboard' : '/dashboard'}
                            className="dropdown-item view-all"
                            onClick={() => setUserMenuOpen(false)}
                            role="menuitem"
                          >
                            <MoreHorizontal size={16} aria-hidden="true" />
                            <span>View All</span>
                          </Link>
                        )}
                      </div>
                    </>
                  )}

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
            <div className="auth-buttons">
              <Link to="/login" className="login-button">
                Login
              </Link>
              <Link to="/register" className="register-button">
                Sign Up
              </Link>
            </div>
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
          <div className="mobile-menu enhanced" role="menu">
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

            {/* User Info in Mobile */}
            {isAuthenticated && (
              <div className="mobile-user-info">
                <div className={`user-avatar ${userRole}`}>
                  {userInfo.initial}
                </div>
                <div className="user-details">
                  <div className="user-name">{userInfo.name}</div>
                  <div className={`user-role ${userRole}`}>{userInfo.role}</div>
                </div>
              </div>
            )}

            {/* Base Navigation */}
            {baseNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`mobile-nav-link ${isActive ? 'active' : ''}`}
                  onClick={() => setMobileMenuOpen(false)}
                  role="menuitem"
                  aria-current={isActive ? 'page' : undefined}
                >
                  <Icon size={20} aria-hidden="true" />
                  <span>{item.label}</span>
                </Link>
              );
            })}

            {/* Role-specific mobile navigation */}
            {isAuthenticated && roleSpecificItems.length > 0 && (
              <>
                <div className="mobile-menu-divider" />
                <div className="mobile-menu-section-title">
                  {isAdmin ? 'Admin Panel' : isSeller ? 'Seller Tools' : 'My Account'}
                </div>
                {roleSpecificItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className="mobile-nav-link"
                      onClick={() => setMobileMenuOpen(false)}
                      role="menuitem"
                    >
                      <Icon size={20} aria-hidden="true" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </>
            )}

            {/* Common user options */}
            {isAuthenticated && (
              <>
                <div className="mobile-menu-divider" />
                {commonUserMenuItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className="mobile-nav-link"
                      onClick={() => setMobileMenuOpen(false)}
                      role="menuitem"
                    >
                      <Icon size={20} aria-hidden="true" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
                <button 
                  onClick={() => { handleLogout(); setMobileMenuOpen(false); }}
                  className="mobile-nav-link logout-item"
                  role="menuitem"
                >
                  <LogOut size={20} aria-hidden="true" />
                  <span>Logout</span>
                </button>
              </>
            )}

            {/* Auth buttons for non-authenticated users */}
            {!isAuthenticated && (
              <>
                <div className="mobile-menu-divider" />
                <Link
                  to="/login"
                  className="mobile-nav-link auth-link"
                  onClick={() => setMobileMenuOpen(false)}
                  role="menuitem"
                >
                  <User size={20} aria-hidden="true" />
                  <span>Login</span>
                </Link>
                <Link
                  to="/register"
                  className="mobile-nav-link auth-link register"
                  onClick={() => setMobileMenuOpen(false)}
                  role="menuitem"
                >
                  <Plus size={20} aria-hidden="true" />
                  <span>Sign Up</span>
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
});

EnhancedUserNavigation.displayName = 'EnhancedUserNavigation';

export default EnhancedUserNavigation; 