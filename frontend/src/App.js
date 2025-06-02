import React, { useEffect, Suspense } from 'react';

import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Provider, useDispatch } from 'react-redux';

import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import './styles/App.css';
import './styles/accessibility.css';
import './styles/micro-interactions.css';

import { store } from './store/store';
import { loadUser } from './store/slices/authSlice';
import { applyUserPreferences } from './utils/personalization';
import { ariaUtils } from './utils/accessibility';

import EnhancedUserNavigation from './components/EnhancedUserNavigation';
import ErrorBoundary from './components/ErrorBoundary';
import Footer from './components/Footer';
import LoadingSpinner from './components/LoadingSpinner';
import ProtectedRoute from './components/ProtectedRoute';
import { FeedbackContainer } from './components/SmartFeedback';

import About from './pages/About';
import AdminAnalytics from './pages/AdminAnalytics';
import AdminDashboard from './pages/AdminDashboard';
import AdminDisputeResolution from './pages/AdminDisputeResolution';
import AdminUserManagement from './pages/AdminUserManagement';
import Checkout from './pages/Checkout';
import Contact from './pages/Contact';
import CreateProduct from './pages/CreateProduct';
import Dashboard from './pages/Dashboard';
import EmailVerification from './pages/EmailVerification';
import ForgotPassword from './pages/ForgotPassword';
import Help from './pages/Help';
import HomePage from './pages/HomePage';
import Login from './pages/Login';
import NotFound from './pages/NotFound';
import Notifications from './pages/Notifications';
import OrderDetail from './pages/OrderDetail';
import OrderHistory from './pages/OrderHistory';
import Privacy from './pages/Privacy';
import ProductCatalog from './pages/ProductCatalog';
import ProductDetail from './pages/ProductDetail';
import ProfileSettings from './pages/ProfileSettings';
import Register from './pages/Register';
import ResetPassword from './pages/ResetPassword';
import ReviewsPage from './pages/ReviewsPage';
import SearchResults from './pages/SearchResults';
import Security from './pages/Security';
import SecurityAuditTrail from './pages/SecurityAuditTrail';
import SellerDashboard from './pages/SellerDashboard';
import SellerAnalytics from './pages/SellerAnalytics';
import ShoppingCart from './pages/ShoppingCart';
import Technology from './pages/Technology';
import Terms from './pages/Terms';
import TrackingPage from './pages/TrackingPage';
import TwoFactorSetup from './pages/TwoFactorSetup';
import UserProfile from './pages/UserProfile';
import Wishlist from './pages/Wishlist';

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
    initializeAccessibility();
    
    applyUserPreferences();
    
    const token = localStorage.getItem('token');
    if (token) {
      dispatch(loadUser());
    }
    
    if (process.env.NODE_ENV === 'production') {
      measureInitialLoad();
    }
  }, [dispatch]);

  const initializeAccessibility = () => {
    ariaUtils.createLiveRegion('aria-live-announcements', 'polite');
    ariaUtils.createLiveRegion('aria-live-alerts', 'assertive');
    
    const skipLink = document.createElement('a');
    skipLink.href = '#main-content';
    skipLink.className = 'skip-link sr-only-focusable';
    skipLink.textContent = 'Skip to main content';
    document.body.insertBefore(skipLink, document.body.firstChild);
    
    document.documentElement.classList.add('js-focus-visible');
  };

  const measureInitialLoad = () => {
    if (window.performance && window.performance.mark) {
      window.performance.mark('app-init-complete');
      
      window.addEventListener('load', () => {
        setTimeout(() => {
          const navigation = performance.getEntriesByType('navigation')[0];
          if (navigation) {
            const loadTime = navigation.loadEventEnd - navigation.fetchStart;
            console.log(`App load time: ${loadTime}ms`);
            
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
      <Router
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true
        }}
      >
        <div className="App" role="application">
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
                <Route path="/" element={<HomePage />} />
                <Route path="/catalog" element={<ProductCatalog />} />
                <Route path="/products" element={<ProductCatalog />} />
                <Route path="/search" element={<SearchResults />} />
                <Route path="/product/:id" element={<ProductDetail />} />
                <Route path="/technology" element={<Technology />} />
                <Route path="/about" element={<About />} />
                <Route path="/help" element={<Help />} />
                <Route path="/support" element={<Help />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/privacy" element={<Privacy />} />
                <Route path="/terms" element={<Terms />} />

                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/verify-email" element={<EmailVerification />} />

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

                <Route path="/seller-dashboard" element={
                  <ProtectedRoute requireSeller={true}>
                    <SellerDashboard />
                  </ProtectedRoute>
                } />
                <Route path="/create-product" element={
                  <ProtectedRoute requireSeller={true}>
                    <CreateProduct />
                  </ProtectedRoute>
                } />
                <Route path="/seller/listings" element={
                  <ProtectedRoute requireSeller={true}>
                    <SellerDashboard />
                  </ProtectedRoute>
                } />
                <Route path="/seller/inventory" element={
                  <ProtectedRoute requireSeller={true}>
                    <SellerDashboard />
                  </ProtectedRoute>
                } />
                <Route path="/seller/analytics" element={
                  <ProtectedRoute requireSeller={true}>
                    <SellerAnalytics />
                  </ProtectedRoute>
                } />
                <Route path="/seller/orders" element={
                  <ProtectedRoute requireSeller={true}>
                    <OrderHistory />
                  </ProtectedRoute>
                } />
                <Route path="/seller/revenue" element={
                  <ProtectedRoute requireSeller={true}>
                    <SellerAnalytics />
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
                
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </main>
          
          <Footer />
          
          <FeedbackContainer />
          
          <ToastContainer
            position="top-right"
            autoClose={5000}
            hideProgressBar={false}
            newestOnTop={false}
            closeOnClick={true}
            rtl={false}
            pauseOnFocusLoss={true}
            draggable={true}
            pauseOnHover={true}
            theme="light"
            role="alert"
            ariaLabel="Notifications"
            toastClassName="toast-accessible"
            progressClassName="toast-progress"
            bodyClassName="toast-body"
            closeButton={true}
            enableMultiContainer={false}
            containerId="default"
            style={{ zIndex: 9999 }}
          />
          
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