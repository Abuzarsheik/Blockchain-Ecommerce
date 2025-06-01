import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { 
  ArrowLeft, 
  Heart, 
  Share2, 
  Eye,
  ShoppingCart,
  User,
  Clock,
  Tag,
  Zap,
  Trash2,
  Edit,
  AlertTriangle
} from 'lucide-react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { addToCart } from '../store/slices/cartSlice';
import LoadingSpinner from '../components/LoadingSpinner';
import { getNFTImageUrl } from '../utils/imageUtils';
import '../styles/NFTDetail.css';

const NFTDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  
  const { isAuthenticated, user } = useSelector(state => state.auth);
  const [nft, setNft] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchNFT = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get(`/nfts/${id}`);
      setNft(response.data.nft);
      setIsLiked(response.data.isLiked || false);
      setLikesCount(response.data.likesCount || 0);
      setError(null);
    } catch (error) {
      console.error('Failed to fetch NFT:', error);
      setError('Failed to load NFT details');
      toast.error('Failed to load NFT details');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      fetchNFT();
    }
  }, [id, fetchNFT]);

  const handleLike = async () => {
    if (!isAuthenticated) {
      toast.error('Please log in to like NFTs');
      navigate('/login');
      return;
    }

    try {
      await api.post(`/nfts/${id}/like`);
      setIsLiked(!isLiked);
      setLikesCount(prev => isLiked ? prev - 1 : prev + 1);
      toast.success(isLiked ? 'NFT unliked!' : 'NFT liked!');
    } catch (error) {
      console.error('Like error:', error);
      toast.error('Failed to like NFT');
    }
  };

  const handleAddToCart = () => {
    if (!isAuthenticated) {
      toast.error('Please log in to add items to cart');
      navigate('/login');
      return;
    }
    
    dispatch(addToCart({
      productId: nft._id,
      quantity: 1,
      price: nft.price,
      name: nft.name,
      image: nft.image_url,
      type: 'nft'
    }));
    
    toast.success(`${nft.name} added to cart!`);
  };

  const handleDelete = async () => {
    if (!isAuthenticated || !user) {
      toast.error('Please log in to delete NFTs');
      return;
    }

    // Check if user is the creator
    const creatorId = nft.creator_id._id?.toString() || nft.creator_id.toString();
    const currentUserId = user.userId?.toString() || user.id?.toString();
    
    if (creatorId !== currentUserId) {
      toast.error('You can only delete NFTs you created');
      return;
    }

    try {
      setIsDeleting(true);
      
      await api.delete(`/nfts/${id}`);
      
      toast.success('NFT deleted successfully!');
      navigate('/catalog');
    } catch (error) {
      console.error('Delete error:', error);
      
      if (error.response?.status === 401) {
        toast.error('Authentication failed. Please log in again.');
      } else if (error.response?.status === 403) {
        toast.error('You are not authorized to delete this NFT.');
      } else if (error.response?.status === 404) {
        toast.error('NFT not found.');
      } else {
        const errorMessage = error.response?.data?.message || 'Failed to delete NFT';
        toast.error(errorMessage);
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: nft.name,
          text: nft.description,
          url: window.location.href,
        });
      } catch (error) {
        console.log('Error sharing:', error);
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied to clipboard!');
    }
  };

  const formatPrice = (price) => {
    return parseFloat(price).toFixed(3);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Check if current user is the creator
  const isCreator = user && nft && (
    nft.creator_id._id?.toString() === user.userId?.toString() ||
    nft.creator_id._id?.toString() === user.id?.toString() ||
    nft.creator_id._id?.toString() === user._id?.toString() ||
    nft.creator_id.toString() === user.userId?.toString() ||
    nft.creator_id.toString() === user.id?.toString() ||
    nft.creator_id.toString() === user._id?.toString()
  );

  const handlePurchase = async () => {
    try {
      await api.post(`/nfts/${id}/purchase`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      // Handle successful purchase
      navigate('/profile/collection');
    } catch (error) {
      toast.error('Purchase failed');
    }
  };

  if (loading) {
    return (
      <div className="nft-detail-loading">
        <LoadingSpinner />
        <p>Loading NFT details...</p>
      </div>
    );
  }

  if (error || !nft) {
    return (
      <div className="nft-detail-error">
        <h2>NFT Not Found</h2>
        <p>{error || 'The NFT you are looking for does not exist.'}</p>
        <button onClick={() => navigate('/catalog')} className="btn-primary">
          Back to Catalog
        </button>
      </div>
    );
  }

  return (
    <div className="nft-detail">
      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="modal-overlay">
          <div className="delete-confirmation-modal">
            <div className="modal-header">
              <AlertTriangle className="warning-icon" size={24} />
              <h3>Delete NFT</h3>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to delete <strong>"{nft.name}"</strong>?</p>
              <p className="warning-text">This action cannot be undone. The NFT will be permanently removed from the marketplace.</p>
            </div>
            <div className="modal-actions">
              <button 
                onClick={() => setShowDeleteConfirm(false)}
                className="btn-secondary"
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button 
                onClick={handleDelete}
                className="btn-danger"
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Delete NFT'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Breadcrumb */}
      <div className="breadcrumb">
        <button onClick={() => navigate('/catalog')} className="breadcrumb-link">
          <ArrowLeft size={16} />
          Back to Catalog
        </button>
        <span className="breadcrumb-separator">/</span>
        <span className="breadcrumb-current">{nft.name}</span>
      </div>

      <div className="nft-detail-content">
        {/* Image Section */}
        <div className="nft-image-section">
          <div className="nft-image-container">
            <img 
              src={getNFTImageUrl(nft.image_url)} 
              alt={nft.name}
              className="nft-image"
              onError={(e) => {
                e.target.src = 'https://via.placeholder.com/500x500?text=NFT+Image+Not+Found';
              }}
            />
            
            {/* Image Actions */}
            <div className="image-actions">
              <button 
                className={`action-btn ${isLiked ? 'liked' : ''}`}
                onClick={handleLike}
                title="Like NFT"
              >
                <Heart size={20} fill={isLiked ? 'currentColor' : 'none'} />
              </button>
              <button className="action-btn" onClick={handleShare} title="Share NFT">
                <Share2 size={20} />
              </button>
              {isCreator && (
                <>
                  <button 
                    className="action-btn edit-btn" 
                    title="Edit NFT"
                    onClick={() => navigate(`/nft/${id}/edit`)}
                  >
                    <Edit size={20} />
                  </button>
                  <button 
                    className="action-btn delete-btn" 
                    title="Delete NFT"
                    onClick={() => setShowDeleteConfirm(true)}
                  >
                    <Trash2 size={20} />
                  </button>
                </>
              )}
            </div>

            {/* Creator Badge */}
            {isCreator && (
              <div className="creator-badge">
                <User size={14} />
                <span>Your NFT</span>
              </div>
            )}
          </div>

          {/* NFT Stats */}
          <div className="nft-stats">
            <div className="stat-item">
              <Eye size={16} />
              <span>{nft.view_count || 0} views</span>
            </div>
            <div className="stat-item">
              <Heart size={16} />
              <span>{likesCount} likes</span>
            </div>
          </div>
        </div>

        {/* Details Section */}
        <div className="nft-details-section">
          <div className="nft-header">
            <div className="category-badge">{nft.category}</div>
            <h1 className="nft-title">{nft.name}</h1>
            
            {/* Creator Actions for Mobile */}
            {isCreator && (
              <div className="creator-actions-mobile">
                <button 
                  className="btn-outline"
                  onClick={() => navigate(`/nft/${id}/edit`)}
                >
                  <Edit size={16} />
                  Edit
                </button>
                <button 
                  className="btn-danger-outline"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  <Trash2 size={16} />
                  Delete
                </button>
              </div>
            )}

            {/* Creator Info */}
            <div className="creator-info">
              <User size={20} />
              <div>
                <span className="label">Created by</span>
                <span className="creator-name">
                  {nft.creator_id?.firstName} {nft.creator_id?.lastName}
                </span>
              </div>
            </div>
          </div>

          {/* Price Section */}
          <div className="price-section">
            <div className="current-price">
              <span className="label">Current Price</span>
              <div className="price-display">
                <span className="price-eth">{formatPrice(nft.price)} ETH</span>
                <span className="price-usd">≈ ${(nft.price * 2000).toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="action-buttons">
            {!isCreator && (
              <>
                <button 
                  className="btn-primary buy-now"
                  onClick={handleAddToCart}
                >
                  <ShoppingCart size={20} />
                  Add to Cart
                </button>
                <button className="btn-primary buy-now" onClick={handlePurchase}>
                  <Zap size={20} />
                  Buy Now
                </button>
              </>
            )}
            {isCreator && (
              <div className="creator-actions-desktop">
                <button 
                  className="btn-outline"
                  onClick={() => navigate(`/nft/${id}/edit`)}
                >
                  <Edit size={16} />
                  Edit NFT
                </button>
                <button 
                  className="btn-danger-outline"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  <Trash2 size={16} />
                  Delete NFT
                </button>
              </div>
            )}
          </div>

          {/* NFT Properties */}
          <div className="nft-properties">
            <h3>Properties</h3>
            <div className="properties-grid">
              <div className="property-item">
                <Tag size={16} />
                <div>
                  <span className="property-label">Category</span>
                  <span className="property-value">{nft.category}</span>
                </div>
              </div>
              <div className="property-item">
                <Clock size={16} />
                <div>
                  <span className="property-label">Created</span>
                  <span className="property-value">{formatDate(nft.created_at)}</span>
                </div>
              </div>
              <div className="property-item">
                <User size={16} />
                <div>
                  <span className="property-label">Blockchain</span>
                  <span className="property-value">{nft.blockchain || 'Ethereum'}</span>
                </div>
              </div>
              <div className="property-item">
                <Zap size={16} />
                <div>
                  <span className="property-label">Token ID</span>
                  <span className="property-value">{nft.token_id}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="nft-description">
            <h3>Description</h3>
            <p>{nft.description}</p>
          </div>

          {/* Additional Info */}
          <div className="additional-info">
            <div className="info-item">
              <span className="info-label">Royalty</span>
              <span className="info-value">{nft.royalty_percentage || 5}%</span>
            </div>
            <div className="info-item">
              <span className="info-label">Status</span>
              <span className="info-value">{nft.is_listed ? 'Listed' : 'Unlisted'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NFTDetail; 