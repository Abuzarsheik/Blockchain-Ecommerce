import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';

const ProtectedRoute = ({ children, requireAdmin = false, requireSeller = false }) => {
  const { isAuthenticated, user } = useSelector(state => state.auth);
  const location = useLocation();

  if (!isAuthenticated) {
    // Redirect to login page with return url
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requireAdmin && (!user || user.role !== 'admin')) {
    // Redirect to dashboard if user is not admin
    return <Navigate to="/dashboard" replace />;
  }

  if (requireSeller && (!user || (user.userType !== 'seller' && user.role !== 'admin'))) {
    // Redirect to dashboard if user is not a seller or admin
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export default ProtectedRoute; 