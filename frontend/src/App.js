import './styles/App.css';
import './styles/accessibility.css';
import './styles/micro-interactions.css';
import 'react-toastify/dist/ReactToastify.css';
import About from './pages/About';
import AdminAnalytics from './pages/AdminAnalytics';
import AdminDashboard from './pages/AdminDashboard';
import AdminDisputeResolution from './pages/AdminDisputeResolution';
import AdminUserManagement from './pages/AdminUserManagement';
import Checkout from './pages/Checkout';
import Contact from './pages/Contact';
import CreateNFT from './pages/CreateNFT';
import Dashboard from './pages/Dashboard';
import EmailVerification from './pages/EmailVerification';
import EnhancedUserNavigation from './components/EnhancedUserNavigation';
import ErrorBoundary from './components/ErrorBoundary';
import Footer from './components/Footer';
import ForgotPassword from './pages/ForgotPassword';
import Help from './pages/Help';
import HomePage from './pages/HomePage';
import LoadingSpinner from './components/LoadingSpinner';
import Login from './pages/Login';
import NFTCatalog from './pages/NFTCatalog';
import NFTDetail from './pages/NFTDetail';
import NotFound from './pages/NotFound';
import Notifications from './pages/Notifications';
import OrderDetail from './pages/OrderDetail';
import OrderHistory from './pages/OrderHistory';
import Privacy from './pages/Privacy';
import ProductCatalog from './pages/ProductCatalog';
import ProductDetail from './pages/ProductDetail';
import ProfileSettings from './pages/ProfileSettings';
import ProtectedRoute from './components/ProtectedRoute';
import React, { useEffect, Suspense } from 'react';
import Register from './pages/Register';
import ResetPassword from './pages/ResetPassword';
import ReviewsPage from './pages/ReviewsPage';
import SearchResults from './pages/SearchResults';
import Security from './pages/Security';
import SecurityAuditTrail from './pages/SecurityAuditTrail';
import SellerDashboard from './pages/SellerDashboard';
import ShoppingCart from './pages/ShoppingCart';
import Technology from './pages/Technology';
import Terms from './pages/Terms';
import TrackingPage from './pages/TrackingPage';
import TwoFactorSetup from './pages/TwoFactorSetup';
import UserProfile from './pages/UserProfile';
import Wishlist from './pages/Wishlist';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { FeedbackContainer } from './components/SmartFeedback';
import { Provider, useDispatch } from 'react-redux';
import { ToastContainer } from 'react-toastify';
import { applyUserPreferences } from './utils/personalization';
import { ariaUtils } from './utils/accessibility';
import { loadUser } from './store/slices/authSlice';
import { store } from './store/store';

// Global loading fallback component
const GlobalLoadingFallback = () => (
  <div className="min-h-screen flex items-center justify-center">
    <LoadingSpinner 
      size="large" 
      color="primary" 
      text="Loading application..."
      ariaLabel="Loading Blocmerce application"
    />
  </div>
);

function AppContent() {
  const dispatch = useDispatch();

  useEffect(() => {
    // Initialize accessibility features
    initializeAccessibility();
    
    // Apply user preferences
    applyUserPreferences();
    
    // Try to load user data if token exists
    const token = localStorage.getItem('token');
    if (token) {
      dispatch(loadUser());
    }
    
    // Performance monitoring
    if (process.env.NODE_ENV === 'production') {
      measureInitialLoad();
    }
  }, [dispatch]);

  const initializeAccessibility = () => {
    // Create ARIA live regions for announcements
    ariaUtils.createLiveRegion('aria-live-announcements', 'polite');
    ariaUtils.createLiveRegion('aria-live-alerts', 'assertive');
    
    // Add skip link to main content
    const skipLink = document.createElement('a');
    skipLink.href = '#main-content';
    skipLink.className = 'skip-link sr-only-focusable';
    skipLink.textContent = 'Skip to main content';
    document.body.insertBefore(skipLink, document.body.firstChild);
    
    // Add focus-visible polyfill class
    document.documentElement.classList.add('js-focus-visible');
  };

  const measureInitialLoad = () => {
    // Measure app initialization performance
    if (window.performance && window.performance.mark) {
      window.performance.mark('app-init-complete');
      
      // Measure navigation timing
      window.addEventListener('load', () => {
        setTimeout(() => {
          const navigation = performance.getEntriesByType('navigation')[0];
          if (navigation) {
            const loadTime = navigation.loadEventEnd - navigation.fetchStart;
            console.log(`App load time: ${loadTime}ms`);
            
            // Report to analytics if needed
            if (loadTime > 3000) {
              console.warn('App load time is slower than expected');
            }
          }
        }, 0);
      });
    }
  };

  return (
    <ErrorBoundary>
      <Router>
        <div className="App" role="application">
          {/* Skip navigation for accessibility */}
          <a href="#main-content" className="skip-link">
            Skip to main content
          </a>
          
          <EnhancedUserNavigation />
          
          <main 
            id="main-content" 
            className="main-content" 
            role="main"
            tabIndex={-1}
          >
            <Suspense fallback={<GlobalLoadingFallback />}>
              <Routes>
                {/* Public Routes */}
                <Route path="/" element={<HomePage />} />
                <Route path="/catalog" element={<NFTCatalog />} />
                <Route path="/products" element={<ProductCatalog />} />
                <Route path="/search" element={<SearchResults />} />
                <Route path="/nft/:id" element={<NFTDetail />} />
                <Route path="/product/:id" element={<ProductDetail />} />
                <Route path="/technology" element={<Technology />} />
                <Route path="/about" element={<About />} />
                <Route path="/help" element={<Help />} />
                <Route path="/support" element={<Help />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/privacy" element={<Privacy />} />
                <Route path="/terms" element={<Terms />} />

                {/* Authentication Routes */}
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/verify-email" element={<EmailVerification />} />

                {/* Common Protected Routes (All authenticated users) */}
                <Route path="/profile" element={
                  <ProtectedRoute>
                    <UserProfile />
                  </ProtectedRoute>
                } />
                <Route path="/profile-settings" element={
                  <ProtectedRoute>
                    <ProfileSettings />
                  </ProtectedRoute>
                } />
                <Route path="/dashboard" element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                } />
                <Route path="/security" element={
                  <ProtectedRoute>
                    <Security />
                  </ProtectedRoute>
                } />
                <Route path="/setup-2fa" element={
                  <ProtectedRoute>
                    <TwoFactorSetup />
                  </ProtectedRoute>
                } />
                <Route path="/notifications" element={
                  <ProtectedRoute>
                    <Notifications />
                  </ProtectedRoute>
                } />

                {/* Buyer Routes (Available to buyers and sellers) */}
                <Route path="/wishlist" element={
                  <ProtectedRoute>
                    <Wishlist />
                  </ProtectedRoute>
                } />
                <Route path="/cart" element={<ShoppingCart />} />
                <Route path="/checkout" element={
                  <ProtectedRoute>
                    <Checkout />
                  </ProtectedRoute>
                } />
                <Route path="/orders" element={
                  <ProtectedRoute>
                    <OrderHistory />
                  </ProtectedRoute>
                } />
                <Route path="/orders/:orderId" element={
                  <ProtectedRoute>
                    <OrderDetail />
                  </ProtectedRoute>
                } />
                <Route path="/reviews" element={
                  <ProtectedRoute>
                    <ReviewsPage />
                  </ProtectedRoute>
                } />
                <Route path="/tracking" element={
                  <ProtectedRoute>
                    <TrackingPage />
                  </ProtectedRoute>
                } />

                {/* Seller Routes */}
                <Route path="/seller-dashboard" element={
                  <ProtectedRoute requireSeller={true}>
                    <SellerDashboard />
                  </ProtectedRoute>
                } />
                <Route path="/create-nft" element={
                  <ProtectedRoute requireSeller={true}>
                    <CreateNFT />
                  </ProtectedRoute>
                } />
                <Route path="/seller/listings" element={
                  <ProtectedRoute requireSeller={true}>
                    <SellerDashboard />
                  </ProtectedRoute>
                } />
                <Route path="/seller/analytics" element={
                  <ProtectedRoute requireSeller={true}>
                    <SellerDashboard />
                  </ProtectedRoute>
                } />
                <Route path="/seller/orders" element={
                  <ProtectedRoute requireSeller={true}>
                    <OrderHistory />
                  </ProtectedRoute>
                } />
                <Route path="/seller/revenue" element={
                  <ProtectedRoute requireSeller={true}>
                    <SellerDashboard />
                  </ProtectedRoute>
                } />
                <Route path="/seller/reviews" element={
                  <ProtectedRoute requireSeller={true}>
                    <ReviewsPage />
                  </ProtectedRoute>
                } />
                <Route path="/seller/verification" element={
                  <ProtectedRoute requireSeller={true}>
                    <ProfileSettings />
                  </ProtectedRoute>
                } />

                {/* Admin Routes */}
                <Route path="/admin/dashboard" element={
                  <ProtectedRoute requireAdmin={true}>
                    <AdminDashboard />
                  </ProtectedRoute>
                } />
                <Route path="/admin/users" element={
                  <ProtectedRoute requireAdmin={true}>
                    <AdminUserManagement />
                  </ProtectedRoute>
                } />
                <Route path="/admin/moderation" element={
                  <ProtectedRoute requireAdmin={true}>
                    <AdminDashboard />
                  </ProtectedRoute>
                } />
                <Route path="/admin/transactions" element={
                  <ProtectedRoute requireAdmin={true}>
                    <AdminAnalytics />
                  </ProtectedRoute>
                } />
                <Route path="/admin/disputes" element={
                  <ProtectedRoute requireAdmin={true}>
                    <AdminDisputeResolution />
                  </ProtectedRoute>
                } />
                <Route path="/admin/analytics" element={
                  <ProtectedRoute requireAdmin={true}>
                    <AdminAnalytics />
                  </ProtectedRoute>
                } />
                <Route path="/admin/security" element={
                  <ProtectedRoute requireAdmin={true}>
                    <SecurityAuditTrail />
                  </ProtectedRoute>
                } />
                <Route path="/admin/settings" element={
                  <ProtectedRoute requireAdmin={true}>
                    <AdminDashboard />
                  </ProtectedRoute>
                } />
                <Route path="/admin/revenue" element={
                  <ProtectedRoute requireAdmin={true}>
                    <AdminAnalytics />
                  </ProtectedRoute>
                } />
                <Route path="/admin/health" element={
                  <ProtectedRoute requireAdmin={true}>
                    <AdminAnalytics />
                  </ProtectedRoute>
                } />
                
                {/* Catch all route */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </main>
          
          <Footer />
          
          {/* Smart Feedback System */}
          <FeedbackContainer />
          
          {/* Toast notifications with accessibility */}
          <ToastContainer
            position="top-right"
            autoClose={5000}
            hideProgressBar={false}
            newestOnTop={false}
            closeOnClick
            rtl={false}
            pauseOnFocusLoss
            draggable
            pauseOnHover
            theme="light"
            role="alert"
            ariaLabel="Notifications"
            toastClassName="toast-accessible"
          />
          
          {/* ARIA live regions for dynamic content announcements */}
          <div 
            id="aria-live-announcements"
            aria-live="polite" 
            aria-atomic="true"
            className="sr-only"
          />
          <div 
            id="aria-live-alerts"
            aria-live="assertive" 
            aria-atomic="true"
            className="sr-only"
          />
        </div>
      </Router>
    </ErrorBoundary>
  );
}

function App() {
  useEffect(() => {
    // App-level initialization
    
    // Check for updates if service worker is supported
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        // Could show a notification to user about updates
      });
    }
  }, []);

  return (
    <Provider store={store}>
      <AppContent />
    </Provider>
  );
}

export default App; 