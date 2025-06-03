import React, { useState, useEffect, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Heart, ShoppingCart, Trash2, Grid, List } from 'lucide-react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { addToCart } from '../store/slices/cartSlice';
import { logger } from '../utils/logger';

const Wishlist = () => {
  const [wishlistItems, setWishlistItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('grid');
  const [sortBy, setSortBy] = useState('date_added');
  const [filterCategory, setFilterCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const user = useSelector(state => state.auth.user);
  const dispatch = useDispatch();

  // Load wishlist items
  const loadWishlist = useCallback(async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const response = await api.get('/wishlist');
      setWishlistItems(response.data.items || []);
    } catch (error) {
      logger.error('Failed to load wishlist:', error);
      toast.error('Failed to load wishlist items');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadWishlist();
  }, [loadWishlist]);

  // Add to cart
  const handleAddToCart = useCallback(async (item) => {
    try {
      dispatch(addToCart({
        productId: item._id,
        name: item.name,
        price: item.price,
        image: item.image,
        category: item.category,
        quantity: 1
      }));
      toast.success(`${item.name} added to cart`);
    } catch (error) {
      logger.error('Failed to add to cart:', error);
      toast.error('Failed to add item to cart');
    }
  }, [dispatch]);

  // Remove from wishlist
  const handleRemoveFromWishlist = useCallback(async (itemId) => {
    try {
      await api.delete(`/wishlist/${itemId}`);
      setWishlistItems(prev => prev.filter(item => item._id !== itemId));
      toast.success('Item removed from wishlist');
    } catch (error) {
      logger.error('Failed to remove from wishlist:', error);
      toast.error('Failed to remove item from wishlist');
    }
  }, []);

  // Filter and sort items
  const filteredAndSortedItems = wishlistItems
    .filter(item => {
      if (filterCategory !== 'all' && item.category !== filterCategory) return false;
      if (searchQuery && !item.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'price_low':
          return a.price - b.price;
        case 'price_high':
          return b.price - a.price;
        case 'date_added':
        default:
          return new Date(b.dateAdded) - new Date(a.dateAdded);
      }
    });

  if (!user) {
    return (
      <div className="wishlist-page">
        <div className="container mx-auto px-4 py-8 text-center">
          <h1 className="text-3xl font-bold mb-6">My Wishlist</h1>
          <p className="text-gray-600">Please log in to view your wishlist</p>
        </div>
      </div>
    );
  }

  return (
    <div className="wishlist-page">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">My Wishlist</h1>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded ${viewMode === 'grid' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
              >
                <Grid size={16} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded ${viewMode === 'list' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
              >
                <List size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="flex flex-wrap gap-4 mb-6">
          <input
            type="text"
            placeholder="Search wishlist..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="px-4 py-2 border rounded-lg"
          />
          
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-4 py-2 border rounded-lg"
          >
            <option value="all">All Categories</option>
            <option value="electronics">Electronics</option>
            <option value="clothing">Clothing</option>
            <option value="home">Home & Garden</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-4 py-2 border rounded-lg"
          >
            <option value="date_added">Date Added</option>
            <option value="name">Name</option>
            <option value="price_low">Price: Low to High</option>
            <option value="price_high">Price: High to Low</option>
          </select>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="spinner-border" role="status">
              <span className="sr-only">Loading...</span>
            </div>
          </div>
        ) : filteredAndSortedItems.length === 0 ? (
          <div className="text-center py-8">
            <Heart size={64} className="mx-auto text-gray-300 mb-4" />
            <h3 className="text-xl font-semibold text-gray-600 mb-2">Your wishlist is empty</h3>
            <p className="text-gray-500">Add items you love to your wishlist</p>
          </div>
        ) : (
          <div className={`wishlist-grid ${viewMode === 'list' ? 'list-view' : 'grid-view'}`}>
            {filteredAndSortedItems.map((item) => (
              <div key={item._id} className="wishlist-item">
                <div className="item-image">
                  <img
                    src={item.image || '/placeholder-image.jpg'}
                    alt={item.name}
                    onError={(e) => {
                      e.target.src = '/placeholder-image.jpg';
                    }}
                  />
                </div>
                
                <div className="item-details">
                  <h3 className="item-name">{item.name}</h3>
                  <p className="item-price">${item.price}</p>
                  <p className="item-category">{item.category}</p>
                  
                  <div className="item-actions">
                    <button
                      onClick={() => handleAddToCart(item)}
                      className="btn btn-primary"
                    >
                      <ShoppingCart size={16} />
                      Add to Cart
                    </button>
                    
                    <button
                      onClick={() => handleRemoveFromWishlist(item._id)}
                      className="btn btn-secondary"
                    >
                      <Trash2 size={16} />
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <style jsx>{`
        .wishlist-grid.grid-view {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 1.5rem;
        }
        
        .wishlist-grid.list-view {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        
        .wishlist-item {
          border: 1px solid #e5e7eb;
          border-radius: 0.5rem;
          padding: 1rem;
          transition: transform 0.2s;
        }
        
        .wishlist-item:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        
        .item-image img {
          width: 100%;
          height: 200px;
          object-fit: cover;
          border-radius: 0.5rem;
          margin-bottom: 1rem;
        }
        
        .list-view .wishlist-item {
          display: flex;
          align-items: center;
          gap: 1rem;
        }
        
        .list-view .item-image {
          width: 120px;
          flex-shrink: 0;
        }
        
        .list-view .item-image img {
          height: 120px;
          margin-bottom: 0;
        }
        
        .item-details {
          flex: 1;
        }
        
        .item-name {
          font-size: 1.125rem;
          font-weight: 600;
          margin-bottom: 0.5rem;
        }
        
        .item-price {
          font-size: 1.25rem;
          font-weight: 700;
          color: #059669;
          margin-bottom: 0.25rem;
        }
        
        .item-category {
          color: #6b7280;
          font-size: 0.875rem;
          margin-bottom: 1rem;
        }
        
        .item-actions {
          display: flex;
          gap: 0.5rem;
        }
        
        .btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          border-radius: 0.375rem;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: background-color 0.2s;
        }
        
        .btn-primary {
          background-color: #3b82f6;
          color: white;
          border: none;
        }
        
        .btn-primary:hover {
          background-color: #2563eb;
        }
        
        .btn-secondary {
          background-color: #ef4444;
          color: white;
          border: none;
        }
        
        .btn-secondary:hover {
          background-color: #dc2626;
        }
      `}</style>
    </div>
  );
};

export default Wishlist; 