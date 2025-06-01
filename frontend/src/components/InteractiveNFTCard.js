import './InteractiveNFTCard.css';
import React, { useState, useRef, useEffect } from 'react';
import { useInView } from 'react-intersection-observer';
import { 
  Heart, 
  Share2, 
  MoreVertical, 
  Eye, 
  TrendingUp, 
  TrendingDown, 
  Star, 
  Award, 
  Zap, 
  Crown,
  GitCompare,
  ShoppingCart,
  ExternalLink
} from 'lucide-react';

const InteractiveNFTCard = ({ 
  nft, 
  onAddToWishlist, 
  onAddToCart, 
  onCompare, 
  onShare,
  onQuickView,
  isInWishlist = false,
  isInComparison = false 
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [showPulse, setShowPulse] = useState(false);
  
  const cardRef = useRef(null);
  const { ref: inViewRef, inView } = useInView({
    threshold: 0.1,
    triggerOnce: true
  });

  // Mouse tracking for 3D effect
  const handleMouseMove = (e) => {
    if (!cardRef.current) return;
    
    const rect = cardRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    const mouseX = e.clientX - centerX;
    const mouseY = e.clientY - centerY;
    
    setMousePosition({ x: mouseX, y: mouseY });
  };

  // 3D transform calculation
  const getTransform = () => {
    if (!isHovered) return 'perspective(1000px) rotateY(0deg) rotateX(0deg) scale(1)';
    
    const rotateY = (mousePosition.x / 10);
    const rotateX = -(mousePosition.y / 10);
    
    return `perspective(1000px) rotateY(${rotateY}deg) rotateX(${rotateX}deg) scale(1.05)`;
  };

  // Pulse effect for new items
  useEffect(() => {
    if (nft.isNew) {
      setShowPulse(true);
      const timer = setTimeout(() => setShowPulse(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [nft.isNew]);

  // Price change animation
  const [priceAnimation, setPriceAnimation] = useState('');
  useEffect(() => {
    if (nft.priceChange) {
      setPriceAnimation(nft.priceChange > 0 ? 'price-up' : 'price-down');
      const timer = setTimeout(() => setPriceAnimation(''), 1000);
      return () => clearTimeout(timer);
    }
  }, [nft.priceChange]);

  const handleActionClick = (action, e) => {
    e.stopPropagation();
    
    // Add ripple effect
    const button = e.currentTarget;
    const ripple = document.createElement('span');
    const rect = button.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top - size / 2;
    
    ripple.style.width = ripple.style.height = size + 'px';
    ripple.style.left = x + 'px';
    ripple.style.top = y + 'px';
    ripple.classList.add('ripple');
    
    button.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);

    // Execute action
    if (action) {
      action();
    }
  };

  return (
    <div 
      ref={(el) => {
        cardRef.current = el;
        inViewRef(el);
      }}
      className={`interactive-nft-card ${inView ? 'in-view' : ''} ${showPulse ? 'pulse' : ''}`}
      style={{ transform: getTransform() }}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setMousePosition({ x: 0, y: 0 });
      }}
      onClick={() => onQuickView?.(nft)}
    >
      {/* Glow effect */}
      <div className="card-glow" />
      
      {/* Main card content */}
      <div className={`card-inner ${isFlipped ? 'flipped' : ''}`}>
        
        {/* Front side */}
        <div className="card-front">
          {/* Badge overlay */}
          {nft.isNew && (
            <div className="badge-new">
              <Zap size={12} />
              NEW
            </div>
          )}
          
          {nft.rarity && (
            <div className={`badge-rarity rarity-${nft.rarity.toLowerCase()}`}>
              {nft.rarity}
            </div>
          )}

          {/* Image container with loading effect */}
          <div className="image-container">
            <div className={`image-loader ${isImageLoaded ? 'loaded' : ''}`}>
              <div className="skeleton-loader" />
            </div>
            
            <img 
              src={nft.image} 
              alt={nft.name}
              onLoad={() => setIsImageLoaded(true)}
              className="nft-image"
            />
            
            {/* Hover overlay */}
            <div className="image-overlay">
              <div className="quick-actions">
                <button 
                  className="quick-action-btn"
                  onClick={(e) => handleActionClick(() => onQuickView?.(nft), e)}
                  title="Quick View"
                >
                  <Eye size={18} />
                </button>
                <button 
                  className="quick-action-btn"
                  onClick={(e) => handleActionClick(() => onShare?.(nft), e)}
                  title="Share"
                >
                  <Share2 size={18} />
                </button>
                <button 
                  className="quick-action-btn"
                  onClick={(e) => handleActionClick(() => setIsFlipped(!isFlipped), e)}
                  title="More Info"
                >
                  <GitCompare size={18} />
                </button>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="card-content">
            <div className="nft-header">
              <h3 className="nft-name">{nft.name}</h3>
              <p className="nft-creator">by {nft.creator}</p>
            </div>

            <div className="nft-stats">
              <div className="stat">
                <span className="stat-label">Price</span>
                <span className={`stat-value price ${priceAnimation}`}>
                  {nft.price} ETH
                  {nft.priceChange && (
                    <span className={`price-change ${nft.priceChange > 0 ? 'positive' : 'negative'}`}>
                      {nft.priceChange > 0 ? '+' : ''}{nft.priceChange}%
                    </span>
                  )}
                </span>
              </div>
              
              <div className="stat">
                <span className="stat-label">Likes</span>
                <span className="stat-value">{nft.likes || 0}</span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="card-actions">
              <button 
                className={`action-btn wishlist ${isInWishlist ? 'active' : ''}`}
                onClick={(e) => handleActionClick(() => onAddToWishlist?.(nft), e)}
                title={isInWishlist ? 'Remove from Wishlist' : 'Add to Wishlist'}
              >
                <Heart size={16} fill={isInWishlist ? 'currentColor' : 'none'} />
              </button>
              
              <button 
                className="action-btn primary"
                onClick={(e) => handleActionClick(() => onAddToCart?.(nft), e)}
              >
                <ShoppingCart size={16} />
                Add to Cart
              </button>
              
              <button 
                className={`action-btn compare ${isInComparison ? 'active' : ''}`}
                onClick={(e) => handleActionClick(() => onCompare?.(nft), e)}
                title={isInComparison ? 'Remove from Comparison' : 'Add to Comparison'}
              >
                <GitCompare size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Back side - Additional info */}
        <div className="card-back">
          <div className="back-content">
            <h4>NFT Details</h4>
            <div className="detail-grid">
              <div className="detail-item">
                <span className="detail-label">Token ID</span>
                <span className="detail-value">#{nft.tokenId || 'N/A'}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Blockchain</span>
                <span className="detail-value">{nft.blockchain || 'Ethereum'}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Category</span>
                <span className="detail-value">{nft.category || 'Art'}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Created</span>
                <span className="detail-value">{nft.createdAt || 'Unknown'}</span>
              </div>
            </div>
            
            <p className="nft-description">
              {nft.description || 'No description available.'}
            </p>

            <button 
              className="flip-back-btn"
              onClick={(e) => handleActionClick(() => setIsFlipped(false), e)}
            >
              Back to Front
            </button>
          </div>
        </div>
      </div>

      {/* Interactive particles effect */}
      {isHovered && (
        <div className="particle-container">
          {[...Array(6)].map((_, i) => (
            <div 
              key={i} 
              className="particle" 
              style={{
                '--delay': `${i * 0.1}s`,
                '--angle': `${i * 60}deg`
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default InteractiveNFTCard; 