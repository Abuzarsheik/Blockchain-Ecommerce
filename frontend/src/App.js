import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Provider, useDispatch } from 'react-redux';
import { ToastContainer } from 'react-toastify';
import { store } from './store/store';
import { loadUser } from './store/slices/authSlice';
import Header from './components/Header';
import Footer from './components/Footer';
import HomePage from './pages/HomePage';
import NFTCatalog from './pages/NFTCatalog';
import ProductCatalog from './pages/ProductCatalog';
import NFTDetail from './pages/NFTDetail';
import ProductDetail from './pages/ProductDetail';
import ShoppingCart from './pages/ShoppingCart';
import Checkout from './pages/Checkout';
import OrderHistory from './pages/OrderHistory';
import OrderDetail from './pages/OrderDetail';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import EmailVerification from './pages/EmailVerification';
import TwoFactorSetup from './pages/TwoFactorSetup';
import Dashboard from './pages/Dashboard';
import Technology from './pages/Technology';
import About from './pages/About';
import CreateNFT from './pages/CreateNFT';
import UserProfile from './pages/UserProfile';
import Help from './pages/Help';
import Contact from './pages/Contact';
import Privacy from './pages/Privacy';
import Terms from './pages/Terms';
import NotFound from './pages/NotFound';
import ProtectedRoute from './components/ProtectedRoute';
import 'react-toastify/dist/ReactToastify.css';
import './styles/App.css';
import ProfileSettings from './pages/ProfileSettings';
import SellerDashboard from './pages/SellerDashboard';
import AdminDashboard from './pages/AdminDashboard';
import AdminUserManagement from './pages/AdminUserManagement';
import AdminDisputeResolution from './pages/AdminDisputeResolution';
import AdminAnalytics from './pages/AdminAnalytics';
import SecurityAuditTrail from './pages/SecurityAuditTrail';
import Security from './pages/Security';

function AppContent() {
  const dispatch = useDispatch();

  useEffect(() => {
    // Try to load user data if token exists
    const token = localStorage.getItem('token');
    if (token) {
      dispatch(loadUser());
    }
  }, [dispatch]);

  return (
    <Router>
      <div className="App">
        <Header />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/catalog" element={<NFTCatalog />} />
            <Route path="/products" element={<ProductCatalog />} />
            <Route path="/nft/:id" element={<NFTDetail />} />
            <Route path="/product/:id" element={<ProductDetail />} />
            <Route path="/cart" element={<ShoppingCart />} />
            
            {/* Authentication Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/verify-email" element={<EmailVerification />} />
            <Route path="/setup-2fa" element={
              <ProtectedRoute>
                <TwoFactorSetup />
              </ProtectedRoute>
            } />
            
            {/* Public Routes */}
            <Route path="/technology" element={<Technology />} />
            <Route path="/about" element={<About />} />
            <Route path="/profile" element={<UserProfile />} />
            <Route path="/help" element={<Help />} />
            <Route path="/support" element={<Help />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
            
            {/* Protected Routes */}
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
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
            <Route path="/create-nft" element={
              <ProtectedRoute requireSeller={true}>
                <CreateNFT />
              </ProtectedRoute>
            } />
            <Route path="/profile-settings" element={
              <ProtectedRoute>
                <ProfileSettings />
              </ProtectedRoute>
            } />
            <Route path="/seller-dashboard" element={
              <ProtectedRoute>
                <SellerDashboard />
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
            
            {/* Security Routes */}
            <Route path="/security" element={
              <ProtectedRoute>
                <Security />
              </ProtectedRoute>
            } />
            
            {/* Catch all route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
        <Footer />
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
        />
      </div>
    </Router>
  );
}

function App() {
  return (
    <Provider store={store}>
      <AppContent />
    </Provider>
  );
}

export default App; 