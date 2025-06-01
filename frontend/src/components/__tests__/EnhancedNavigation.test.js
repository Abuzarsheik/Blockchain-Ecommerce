import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';
import '@testing-library/jest-dom';

import EnhancedNavigation from '../EnhancedNavigation';
import authSlice from '../../store/slices/authSlice';
import cartSlice from '../../store/slices/cartSlice';

// Mock store setup
const createMockStore = (initialState = {}) => {
  return configureStore({
    reducer: {
      auth: authSlice,
      cart: cartSlice,
    },
    preloadedState: initialState,
  });
};

// Mock components wrapper
const renderWithProviders = (component, { initialState = {} } = {}) => {
  const store = createMockStore(initialState);
  
  return render(
    <Provider store={store}>
      <BrowserRouter>
        {component}
      </BrowserRouter>
    </Provider>
  );
};

describe('EnhancedNavigation', () => {
  describe('Unauthenticated state', () => {
    it('should render login and register links', () => {
      renderWithProviders(<EnhancedNavigation />, {
        initialState: {
          auth: { isAuthenticated: false, user: null },
          cart: { items: [], totalQuantity: 0 }
        }
      });

      expect(screen.getByText('Login')).toBeInTheDocument();
      expect(screen.getByText('Register')).toBeInTheDocument();
    });

    it('should not show user menu when not authenticated', () => {
      renderWithProviders(<EnhancedNavigation />, {
        initialState: {
          auth: { isAuthenticated: false, user: null },
          cart: { items: [], totalQuantity: 0 }
        }
      });

      expect(screen.queryByText('Dashboard')).not.toBeInTheDocument();
      expect(screen.queryByText('Profile')).not.toBeInTheDocument();
    });
  });

  describe('Authenticated state', () => {
    const mockUser = {
      id: '1',
      name: 'John Doe',
      email: 'john@example.com',
      role: 'buyer'
    };

    it('should render user menu when authenticated', () => {
      renderWithProviders(<EnhancedNavigation />, {
        initialState: {
          auth: { isAuthenticated: true, user: mockUser },
          cart: { items: [], totalQuantity: 0 }
        }
      });

      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.queryByText('Login')).not.toBeInTheDocument();
      expect(screen.queryByText('Register')).not.toBeInTheDocument();
    });

    it('should show dropdown menu on user click', async () => {
      renderWithProviders(<EnhancedNavigation />, {
        initialState: {
          auth: { isAuthenticated: true, user: mockUser },
          cart: { items: [], totalQuantity: 0 }
        }
      });

      const userButton = screen.getByText('John Doe');
      fireEvent.click(userButton);

      await waitFor(() => {
        expect(screen.getByText('Dashboard')).toBeInTheDocument();
        expect(screen.getByText('Profile')).toBeInTheDocument();
        expect(screen.getByText('Logout')).toBeInTheDocument();
      });
    });

    it('should show admin menu for admin users', () => {
      const adminUser = { ...mockUser, role: 'admin' };
      
      renderWithProviders(<EnhancedNavigation />, {
        initialState: {
          auth: { isAuthenticated: true, user: adminUser },
          cart: { items: [], totalQuantity: 0 }
        }
      });

      const userButton = screen.getByText('John Doe');
      fireEvent.click(userButton);

      expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
    });
  });

  describe('Cart functionality', () => {
    it('should display cart item count', () => {
      renderWithProviders(<EnhancedNavigation />, {
        initialState: {
          auth: { isAuthenticated: false, user: null },
          cart: { items: [{ id: 1 }, { id: 2 }], totalQuantity: 2 }
        }
      });

      expect(screen.getByText('2')).toBeInTheDocument();
    });

    it('should not display cart count when empty', () => {
      renderWithProviders(<EnhancedNavigation />, {
        initialState: {
          auth: { isAuthenticated: false, user: null },
          cart: { items: [], totalQuantity: 0 }
        }
      });

      expect(screen.queryByText('0')).not.toBeInTheDocument();
    });
  });

  describe('Search functionality', () => {
    it('should render search input', () => {
      renderWithProviders(<EnhancedNavigation />);
      
      expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument();
    });

    it('should handle search input changes', () => {
      renderWithProviders(<EnhancedNavigation />);
      
      const searchInput = screen.getByPlaceholderText(/search/i);
      fireEvent.change(searchInput, { target: { value: 'test search' } });
      
      expect(searchInput.value).toBe('test search');
    });
  });

  describe('Mobile responsiveness', () => {
    it('should show mobile menu toggle on small screens', () => {
      // Mock window.innerWidth
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 640,
      });

      renderWithProviders(<EnhancedNavigation />);
      
      expect(screen.getByLabelText(/toggle menu/i)).toBeInTheDocument();
    });
  });

  describe('Theme toggle', () => {
    it('should render theme toggle button', () => {
      renderWithProviders(<EnhancedNavigation />);
      
      expect(screen.getByLabelText(/toggle theme/i)).toBeInTheDocument();
    });

    it('should toggle theme on click', () => {
      renderWithProviders(<EnhancedNavigation />);
      
      const themeButton = screen.getByLabelText(/toggle theme/i);
      fireEvent.click(themeButton);
      
      // Add assertions based on your theme implementation
    });
  });
}); 