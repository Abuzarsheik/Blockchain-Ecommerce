import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { FixedSizeGrid as Grid } from 'react-window';
import { Heart, ShoppingCart, Eye, Star, Zap } from 'lucide-react';
import '../styles/theme.css';

const OptimizedNFTGrid = ({ 
  nfts = [], 
  loading = false, 
  onLoadMore, 
  hasNextPage = false,
  onNFTClick,
  onLike,
  onAddToCart,
  viewMode = 'grid' // 'grid' or 'list'
}) => {
  const [containerSize, setContainerSize] = useState({ width: 0, height: 600 });
  const [imageLoadStates, setImageLoadStates] = useState({});

  // Grid configuration
  const GRID_CARD_WIDTH = 280;
  const GRID_CARD_HEIGHT = 380;
  const LIST_CARD_HEIGHT = 120;
  const GRID_GAP = 20;

  // Calculate grid dimensions
  const columnsCount = Math.floor((containerSize.width - GRID_GAP) / (GRID_CARD_WIDTH + GRID_GAP)) || 1;
  const rowsCount = Math.ceil(nfts.length / columnsCount);

  // Memoized grid items
  const gridItems = useMemo(() => {
    const items = [];
    for (let rowIndex = 0; rowIndex < rowsCount; rowIndex++) {
      for (let colIndex = 0; colIndex < columnsCount; colIndex++) {
        const index = rowIndex * columnsCount + colIndex;
        if (index < nfts.length) {
          items.push({
            ...nfts[index],
            gridIndex: index,
            rowIndex,
            colIndex
          });
        }
      }
    }
    return items;
  }, [nfts, rowsCount, columnsCount]);

  // Handle container resize
  useEffect(() => {
    const updateSize = () => {
      const container = document.querySelector('.nft-grid-container');
      if (container) {
        setContainerSize({
          width: container.offsetWidth,
          height: Math.min(window.innerHeight - 200, 800)
        });
      }
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Handle image loading states
  const handleImageLoad = useCallback((nftId) => {
    setImageLoadStates(prev => ({ ...prev, [nftId]: 'loaded' }));
  }, []);

  const handleImageError = useCallback((nftId) => {
    setImageLoadStates(prev => ({ ...prev, [nftId]: 'error' }));
  }, []);

  // Grid cell renderer
  const GridCell = ({ columnIndex, rowIndex, style }) => {
    const index = rowIndex * columnsCount + columnIndex;
    const nft = nfts[index];

    if (!nft) return <div style={style} />;

    const imageState = imageLoadStates[nft.id] || 'loading';

    return (
      <div style={{
        ...style,
        padding: GRID_GAP / 2,
        boxSizing: 'border-box'
      }}>
        <NFTCard
          nft={nft}
          imageState={imageState}
          onImageLoad={() => handleImageLoad(nft.id)}
          onImageError={() => handleImageError(nft.id)}
          onNFTClick={onNFTClick}
          onLike={onLike}
          onAddToCart={onAddToCart}
          viewMode={viewMode}
        />
      </div>
    );
  };

  // List row renderer
  const ListRow = ({ index, style }) => {
    const nft = nfts[index];
    if (!nft) return <div style={style} />;

    const imageState = imageLoadStates[nft.id] || 'loading';

    return (
      <div style={{
        ...style,
        padding: `${GRID_GAP / 2}px 0`,
        boxSizing: 'border-box'
      }}>
        <NFTCard
          nft={nft}
          imageState={imageState}
          onImageLoad={() => handleImageLoad(nft.id)}
          onImageError={() => handleImageError(nft.id)}
          onNFTClick={onNFTClick}
          onLike={onLike}
          onAddToCart={onAddToCart}
          viewMode="list"
        />
      </div>
    );
  };

  if (loading && nfts.length === 0) {
    return <LoadingSkeleton viewMode={viewMode} />;
  }

  return (
    <div className="nft-grid-container">
      {viewMode === 'grid' ? (
        <Grid
          columnCount={columnsCount}
          rowCount={rowsCount}
          columnWidth={GRID_CARD_WIDTH + GRID_GAP}
          rowHeight={GRID_CARD_HEIGHT + GRID_GAP}
          height={containerSize.height}
          width={containerSize.width}
          overscanRowCount={2}
          overscanColumnCount={1}
        >
          {GridCell}
        </Grid>
      ) : (
        <Grid
          columnCount={1}
          rowCount={nfts.length}
          columnWidth={containerSize.width}
          rowHeight={LIST_CARD_HEIGHT + GRID_GAP}
          height={containerSize.height}
          width={containerSize.width}
          overscanRowCount={5}
        >
          {ListRow}
        </Grid>
      )}

      {/* Load more trigger */}
      {hasNextPage && (
        <div className="load-more-container">
          <button 
            onClick={onLoadMore}
            className="btn btn-outline load-more-btn"
            disabled={loading}
          >
            {loading ? (
              <>
                <div className="loading-spinner" />
                Loading...
              </>
            ) : (
              'Load More NFTs'
            )}
          </button>
        </div>
      )}

      <style jsx>{`
        .nft-grid-container {
          width: 100%;
          position: relative;
        }

        .load-more-container {
          display: flex;
          justify-content: center;
          padding: var(--space-8) 0;
        }

        .load-more-btn {
          padding: var(--space-4) var(--space-8);
          gap: var(--space-2);
        }

        .loading-spinner {
          width: 16px;
          height: 16px;
          border: 2px solid var(--gray-300);
          border-top: 2px solid var(--primary-500);
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

// Individual NFT Card Component
const NFTCard = ({
  nft,
  imageState,
  onImageLoad,
  onImageError,
  onNFTClick,
  onLike,
  onAddToCart,
  viewMode
}) => {
  const isGridMode = viewMode === 'grid';

  return (
    <div 
      className={`nft-card ${isGridMode ? 'nft-card-grid' : 'nft-card-list'} nft-glow`}
      onClick={() => onNFTClick?.(nft.id)}
    >
      {isGridMode ? (
        // Grid Layout
        <>
          <div className="nft-image-container">
            {imageState === 'loading' && (
              <div className="image-skeleton loading-skeleton" />
            )}
            {imageState === 'error' ? (
              <div className="image-placeholder">
                <Star size={32} />
                <span>Image not available</span>
              </div>
            ) : (
              <img
                src={nft.image || nft.image_url}
                alt={nft.name || nft.title}
                className={`nft-image ${imageState === 'loaded' ? 'loaded' : ''}`}
                onLoad={onImageLoad}
                onError={onImageError}
                loading="lazy"
              />
            )}
            
            <div className="nft-overlay">
              <div className="nft-badges">
                {nft.verified && (
                  <span className="verified-badge">
                    <Star size={12} />
                    Verified
                  </span>
                )}
                {nft.featured && (
                  <span className="featured-badge">
                    <Star size={12} />
                    Featured
                  </span>
                )}
              </div>
              
              <div className="nft-actions">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onLike?.(nft.id, e);
                  }}
                  className={`action-btn ${nft.isLiked ? 'liked' : ''}`}
                >
                  <Heart size={16} fill={nft.isLiked ? 'currentColor' : 'none'} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddToCart?.(nft, e);
                  }}
                  className="action-btn"
                >
                  <ShoppingCart size={16} />
                </button>
              </div>
            </div>
          </div>

          <div className="nft-content">
            <div className="nft-header">
              <h3 className="nft-title">{nft.name || nft.title}</h3>
              <div className="nft-creator">
                by {nft.creator || nft.creator_id?.firstName || 'Unknown'}
              </div>
            </div>

            <div className="nft-meta">
              <div className="nft-stats">
                <span className="stat">
                  <Eye size={12} />
                  {nft.views || nft.view_count || 0}
                </span>
                <span className="stat">
                  <Heart size={12} />
                  {nft.likes || nft.like_count || 0}
                </span>
              </div>
              
              <div className="nft-price">
                <span className="price-label">Price</span>
                <span className="price-value">
                  {nft.price ? `${nft.price} ETH` : 'Not for sale'}
                </span>
              </div>
            </div>
          </div>
        </>
      ) : (
        // List Layout
        <div className="nft-list-layout">
          <div className="nft-image-small">
            {imageState === 'loading' && (
              <div className="image-skeleton loading-skeleton" />
            )}
            {imageState === 'error' ? (
              <div className="image-placeholder-small">
                <Star size={20} />
              </div>
            ) : (
              <img
                src={nft.image || nft.image_url}
                alt={nft.name || nft.title}
                className={`nft-image ${imageState === 'loaded' ? 'loaded' : ''}`}
                onLoad={onImageLoad}
                onError={onImageError}
                loading="lazy"
              />
            )}
          </div>

          <div className="nft-content-list">
            <div className="nft-info">
              <h3 className="nft-title">{nft.name || nft.title}</h3>
              <div className="nft-creator">
                by {nft.creator || nft.creator_id?.firstName || 'Unknown'}
              </div>
              <div className="nft-category">{nft.category}</div>
            </div>

            <div className="nft-stats-list">
              <span className="stat">
                <Eye size={14} />
                {nft.views || nft.view_count || 0}
              </span>
              <span className="stat">
                <Heart size={14} />
                {nft.likes || nft.like_count || 0}
              </span>
            </div>

            <div className="nft-price-list">
              <span className="price-value">
                {nft.price ? `${nft.price} ETH` : 'Not for sale'}
              </span>
            </div>

            <div className="nft-actions-list">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onLike?.(nft.id, e);
                }}
                className={`action-btn ${nft.isLiked ? 'liked' : ''}`}
              >
                <Heart size={16} fill={nft.isLiked ? 'currentColor' : 'none'} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onAddToCart?.(nft, e);
                }}
                className="action-btn"
              >
                <ShoppingCart size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .nft-card {
          cursor: pointer;
          border-radius: var(--border-radius-xl);
          overflow: hidden;
          background: white;
          border: 1px solid var(--gray-200);
          transition: all var(--transition-normal);
        }

        .nft-card:hover {
          transform: translateY(-4px);
        }

        .nft-card-grid {
          height: 360px;
          display: flex;
          flex-direction: column;
        }

        .nft-card-list {
          height: 100px;
        }

        .nft-image-container {
          position: relative;
          flex: 1;
          overflow: hidden;
        }

        .nft-image, .image-skeleton {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform var(--transition-normal);
        }

        .nft-image.loaded {
          opacity: 1;
        }

        .nft-card:hover .nft-image {
          transform: scale(1.05);
        }

        .image-placeholder {
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: var(--gray-100);
          color: var(--gray-400);
          gap: var(--space-2);
        }

        .nft-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(transparent, rgba(0,0,0,0.1));
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding: var(--space-3);
          opacity: 0;
          transition: opacity var(--transition-fast);
        }

        .nft-card:hover .nft-overlay {
          opacity: 1;
        }

        .nft-badges {
          display: flex;
          flex-direction: column;
          gap: var(--space-1);
        }

        .verified-badge, .featured-badge {
          display: flex;
          align-items: center;
          gap: var(--space-1);
          padding: var(--space-1) var(--space-2);
          border-radius: var(--border-radius-lg);
          font-size: 0.75rem;
          font-weight: 500;
        }

        .verified-badge {
          background: var(--success-500);
          color: white;
        }

        .featured-badge {
          background: var(--nft-purple);
          color: white;
        }

        .nft-actions {
          display: flex;
          gap: var(--space-1);
        }

        .action-btn {
          padding: var(--space-2);
          background: rgba(255, 255, 255, 0.9);
          border: none;
          border-radius: var(--border-radius-lg);
          color: var(--gray-600);
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .action-btn:hover {
          background: white;
          color: var(--primary-600);
          transform: scale(1.1);
        }

        .action-btn.liked {
          color: var(--danger-500);
        }

        .nft-content {
          padding: var(--space-4);
        }

        .nft-title {
          font-size: 1rem;
          font-weight: 600;
          margin-bottom: var(--space-1);
          color: var(--gray-900);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .nft-creator {
          font-size: 0.875rem;
          color: var(--gray-600);
          margin-bottom: var(--space-3);
        }

        .nft-meta {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
        }

        .nft-stats {
          display: flex;
          gap: var(--space-3);
        }

        .stat {
          display: flex;
          align-items: center;
          gap: var(--space-1);
          font-size: 0.75rem;
          color: var(--gray-500);
        }

        .nft-price {
          text-align: right;
        }

        .price-label {
          font-size: 0.75rem;
          color: var(--gray-500);
          display: block;
        }

        .price-value {
          font-weight: 600;
          color: var(--primary-600);
          font-size: 0.875rem;
        }

        /* List Layout Styles */
        .nft-list-layout {
          display: flex;
          align-items: center;
          padding: var(--space-3);
          gap: var(--space-4);
          height: 100%;
        }

        .nft-image-small {
          width: 80px;
          height: 80px;
          border-radius: var(--border-radius-lg);
          overflow: hidden;
          flex-shrink: 0;
        }

        .image-placeholder-small {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--gray-100);
          color: var(--gray-400);
        }

        .nft-content-list {
          display: flex;
          align-items: center;
          gap: var(--space-6);
          flex: 1;
        }

        .nft-info {
          flex: 1;
        }

        .nft-category {
          font-size: 0.75rem;
          color: var(--gray-500);
        }

        .nft-stats-list {
          display: flex;
          gap: var(--space-3);
        }

        .nft-price-list {
          min-width: 100px;
          text-align: right;
        }

        .nft-actions-list {
          display: flex;
          gap: var(--space-1);
        }
      `}</style>
    </div>
  );
};

// Loading skeleton component
const LoadingSkeleton = ({ viewMode }) => {
  const skeletonCount = viewMode === 'grid' ? 12 : 8;
  
  return (
    <div className={`skeleton-container ${viewMode}`}>
      {Array.from({ length: skeletonCount }).map((_, index) => (
        <div key={index} className="skeleton-card">
          <div className="skeleton-image loading-skeleton" />
          <div className="skeleton-content">
            <div className="skeleton-title loading-skeleton" />
            <div className="skeleton-creator loading-skeleton" />
            <div className="skeleton-price loading-skeleton" />
          </div>
        </div>
      ))}

      <style jsx>{`
        .skeleton-container {
          display: grid;
          gap: var(--space-4);
          padding: var(--space-4);
        }

        .skeleton-container.grid {
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
        }

        .skeleton-container.list {
          grid-template-columns: 1fr;
        }

        .skeleton-card {
          background: white;
          border-radius: var(--border-radius-xl);
          overflow: hidden;
          border: 1px solid var(--gray-200);
        }

        .skeleton-image {
          width: 100%;
          height: 200px;
        }

        .skeleton-container.list .skeleton-image {
          height: 80px;
        }

        .skeleton-content {
          padding: var(--space-4);
        }

        .skeleton-title {
          height: 20px;
          margin-bottom: var(--space-2);
          border-radius: var(--border-radius-sm);
        }

        .skeleton-creator {
          height: 16px;
          width: 70%;
          margin-bottom: var(--space-3);
          border-radius: var(--border-radius-sm);
        }

        .skeleton-price {
          height: 16px;
          width: 40%;
          border-radius: var(--border-radius-sm);
        }
      `}</style>
    </div>
  );
};

export default OptimizedNFTGrid; 