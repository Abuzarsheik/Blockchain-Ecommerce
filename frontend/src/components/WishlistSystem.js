import React, { useState, useEffect } from 'react';
import { Heart, X, ShoppingCart, Eye, Trash2 } from 'lucide-react';

const WishlistSystem = ({ isDropdown = false, onClose }) => {
  const [wishlistItems, setWishlistItems] = useState([]);
  const [loading, setLoading] = useState(false);

  // Mock wishlist data
  useEffect(() => {
    const mockWishlist = [
      {
        id: 1,
        title: 'Digital Sunset #123',
        price: '2.5 ETH',
        image: '/placeholder-nft-1.jpg',
        creator: 'ArtistName',
        dateAdded: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2) // 2 days ago
      },
      {
        id: 2,
        title: 'Abstract Dreams Collection',
        price: '1.8 ETH',
        image: '/placeholder-nft-2.jpg',
        creator: 'DigitalCreator',
        dateAdded: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5) // 5 days ago
      },
      {
        id: 3,
        title: 'Cyber Punk Portrait',
        price: '3.2 ETH',
        image: '/placeholder-nft-3.jpg',
        creator: 'FutureArt',
        dateAdded: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7) // 1 week ago
      }
    ];

    setTimeout(() => {
      setWishlistItems(mockWishlist);
      setLoading(false);
    }, 1000);
  }, []);

  const removeFromWishlist = (itemId) => {
    setWishlistItems(prev => prev.filter(item => item.id !== itemId));
  };

  const addToCart = (item) => {
    // Mock add to cart functionality
    // You would typically dispatch an action here
  };

  const formatDate = (date) => {
    const now = new Date();
    const diff = now - date;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
    return `${Math.floor(days / 30)} months ago`;
  };

  if (loading) {
    return (
      <div className={`wishlist-system ${isDropdown ? 'dropdown' : ''}`}>
        <div className="wishlist-loading">
          <div className="loading-spinner"></div>
          <p>Loading wishlist...</p>
        </div>

        <style jsx>{`
          .wishlist-system {
            ${isDropdown ? `
              position: absolute;
              top: 100%;
              right: 0;
              width: 400px;
              max-height: 500px;
              background: white;
              border: 1px solid #e9ecef;
              border-radius: 12px;
              box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
              z-index: 1000;
              overflow: hidden;
            ` : `
              max-width: 800px;
              margin: 0 auto;
              padding: 2rem;
            `}
          }

          .wishlist-loading {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 3rem 2rem;
            color: #7f8c8d;
          }

          .loading-spinner {
            width: 32px;
            height: 32px;
            border: 3px solid #f3f3f3;
            border-top: 3px solid #667eea;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin-bottom: 1rem;
          }

          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className={`wishlist-system ${isDropdown ? 'dropdown' : ''}`}>
      {/* Header */}
      <div className="wishlist-header">
        <div className="header-left">
          <Heart size={20} />
          <h3>My Wishlist</h3>
          <span className="item-count">({wishlistItems.length} items)</span>
        </div>
        {isDropdown && onClose && (
          <button onClick={onClose} className="close-button">
            <X size={18} />
          </button>
        )}
      </div>

      {/* Wishlist Items */}
      <div className="wishlist-content">
        {wishlistItems.length === 0 ? (
          <div className="empty-wishlist">
            <Heart size={48} />
            <h4>Your wishlist is empty</h4>
            <p>Start browsing and add items you love!</p>
          </div>
        ) : (
          <div className="wishlist-items">
            {wishlistItems.map((item) => (
              <div key={item.id} className="wishlist-item">
                <div className="item-image">
                  <img src={item.image} alt={item.title} />
                  <div className="item-overlay">
                    <button 
                      className="overlay-button view"
                      title="View Details"
                    >
                      <Eye size={16} />
                    </button>
                    <button 
                      className="overlay-button cart"
                      onClick={() => addToCart(item)}
                      title="Add to Cart"
                    >
                      <ShoppingCart size={16} />
                    </button>
                  </div>
                </div>
                
                <div className="item-details">
                  <h4 className="item-title">{item.title}</h4>
                  <p className="item-creator">by {item.creator}</p>
                  <div className="item-meta">
                    <span className="item-price">{item.price}</span>
                    <span className="item-date">{formatDate(item.dateAdded)}</span>
                  </div>
                </div>

                <button 
                  onClick={() => removeFromWishlist(item.id)}
                  className="remove-button"
                  title="Remove from wishlist"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Footer Actions */}
        {wishlistItems.length > 0 && !isDropdown && (
          <div className="wishlist-footer">
            <button className="clear-all-button">
              Clear All
            </button>
            <button className="view-all-button">
              Browse More NFTs
            </button>
          </div>
        )}

        {wishlistItems.length > 0 && isDropdown && (
          <div className="dropdown-footer">
            <button className="view-all-link">
              View All Wishlist Items
            </button>
          </div>
        )}
      </div>

      <style jsx>{`
        .wishlist-system {
          ${isDropdown ? `
            position: absolute;
            top: 100%;
            right: 0;
            width: 400px;
            max-height: 500px;
            background: white;
            border: 1px solid #e9ecef;
            border-radius: 12px;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
            z-index: 1000;
            overflow: hidden;
          ` : `
            max-width: 800px;
            margin: 0 auto;
            padding: 2rem;
            background: white;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
          `}
        }

        .wishlist-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.5rem;
          border-bottom: 1px solid #f1f3f4;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .header-left h3 {
          margin: 0;
          font-size: 1.1rem;
          font-weight: 600;
        }

        .item-count {
          background: rgba(255, 255, 255, 0.2);
          padding: 0.25rem 0.5rem;
          border-radius: 12px;
          font-size: 0.8rem;
          font-weight: 500;
        }

        .close-button {
          background: none;
          border: none;
          color: white;
          cursor: pointer;
          padding: 0.5rem;
          border-radius: 6px;
          transition: background 0.2s ease;
        }

        .close-button:hover {
          background: rgba(255, 255, 255, 0.1);
        }

        .wishlist-content {
          ${isDropdown ? `
            max-height: 400px;
            overflow-y: auto;
          ` : ''}
        }

        .empty-wishlist {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 3rem 2rem;
          color: #7f8c8d;
          text-align: center;
        }

        .empty-wishlist h4 {
          margin: 1rem 0 0.5rem;
          color: #495057;
        }

        .empty-wishlist p {
          margin: 0;
          opacity: 0.8;
        }

        .wishlist-items {
          padding: 1rem;
        }

        .wishlist-item {
          display: flex;
          gap: 1rem;
          padding: 1rem;
          border-radius: 8px;
          transition: all 0.2s ease;
          position: relative;
        }

        .wishlist-item:hover {
          background: #f8f9fa;
        }

        .item-image {
          position: relative;
          width: 80px;
          height: 80px;
          border-radius: 8px;
          overflow: hidden;
          flex-shrink: 0;
        }

        .item-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
        }

        .item-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          opacity: 0;
          transition: opacity 0.2s ease;
        }

        .wishlist-item:hover .item-overlay {
          opacity: 1;
        }

        .overlay-button {
          background: white;
          border: none;
          border-radius: 50%;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .overlay-button.view {
          color: #667eea;
        }

        .overlay-button.cart {
          color: #10ac84;
        }

        .overlay-button:hover {
          transform: scale(1.1);
        }

        .item-details {
          flex: 1;
          min-width: 0;
        }

        .item-title {
          margin: 0 0 0.25rem;
          font-size: 0.95rem;
          font-weight: 600;
          color: #2c3e50;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .item-creator {
          margin: 0 0 0.5rem;
          font-size: 0.8rem;
          color: #7f8c8d;
        }

        .item-meta {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 0.8rem;
        }

        .item-price {
          font-weight: 600;
          color: #667eea;
        }

        .item-date {
          color: #95a5a6;
        }

        .remove-button {
          position: absolute;
          top: 0.5rem;
          right: 0.5rem;
          background: #fee;
          border: none;
          border-radius: 50%;
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #e74c3c;
          cursor: pointer;
          opacity: 0;
          transition: all 0.2s ease;
        }

        .wishlist-item:hover .remove-button {
          opacity: 1;
        }

        .remove-button:hover {
          background: #e74c3c;
          color: white;
          transform: scale(1.1);
        }

        .wishlist-footer {
          display: flex;
          gap: 1rem;
          padding: 1.5rem;
          border-top: 1px solid #f1f3f4;
        }

        .clear-all-button {
          background: #fee;
          border: 1px solid #e74c3c;
          color: #e74c3c;
          padding: 0.75rem 1.5rem;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
          font-weight: 500;
        }

        .clear-all-button:hover {
          background: #e74c3c;
          color: white;
        }

        .view-all-button {
          flex: 1;
          background: linear-gradient(135deg, #667eea, #764ba2);
          border: none;
          color: white;
          padding: 0.75rem 1.5rem;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
          font-weight: 500;
        }

        .view-all-button:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
        }

        .dropdown-footer {
          padding: 1rem 1.5rem;
          border-top: 1px solid #f1f3f4;
          background: #f8f9fa;
        }

        .view-all-link {
          width: 100%;
          background: none;
          border: none;
          color: #667eea;
          padding: 0.75rem;
          text-align: center;
          cursor: pointer;
          font-weight: 600;
          transition: color 0.2s ease;
        }

        .view-all-link:hover {
          color: #5a67d8;
        }

        @media (max-width: 768px) {
          .wishlist-system.dropdown {
            position: fixed;
            top: 70px;
            left: 1rem;
            right: 1rem;
            width: auto;
            max-height: 70vh;
          }

          .item-image {
            width: 60px;
            height: 60px;
          }

          .overlay-button {
            width: 28px;
            height: 28px;
          }
        }
      `}</style>
    </div>
  );
};

export default WishlistSystem; 