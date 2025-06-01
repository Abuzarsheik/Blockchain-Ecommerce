import './VirtualizedNFTGrid.css';
import ProductCard from './ProductCard';
import React, { useCallback } from 'react';
import { FixedSizeGrid as Grid } from 'react-window';
import { SkeletonGrid } from './ui/SkeletonCard';
import { useInView } from 'react-intersection-observer';

const VirtualizedNFTGrid = ({ 
  nfts = [], 
  loading = false, 
  onLoadMore, 
  hasNextPage = false,
  viewMode = 'grid',
  containerHeight = 600,
  cardWidth = 320,
  cardHeight = 420,
  gap = 24
}) => {
  const { ref, inView } = useInView({
    threshold: 0.1,
    triggerOnce: false,
  });

  // Calculate grid dimensions
  const containerWidth = typeof window !== 'undefined' ? window.innerWidth - 80 : 1200;
  const columnsCount = Math.floor((containerWidth + gap) / (cardWidth + gap));
  const rowsCount = Math.ceil(nfts.length / columnsCount);

  // Load more when scrolled to bottom
  React.useEffect(() => {
    if (inView && hasNextPage && !loading && onLoadMore) {
      onLoadMore();
    }
  }, [inView, hasNextPage, loading, onLoadMore]);

  // Grid item renderer
  const GridItem = useCallback(({ columnIndex, rowIndex, style }) => {
    const itemIndex = rowIndex * columnsCount + columnIndex;
    const nft = nfts[itemIndex];

    if (!nft) {
      return <div style={style} />;
    }

    return (
      <div 
        style={{
          ...style,
          padding: gap / 2,
        }}
      >
        <ProductCard 
          product={nft} 
          viewMode={viewMode}
          className="virtualized-card"
        />
      </div>
    );
  }, [nfts, columnsCount, viewMode, gap]);

  // Show skeleton loading for initial load
  if (loading && nfts.length === 0) {
    return <SkeletonGrid count={12} />;
  }

  // Show message for empty state
  if (!loading && nfts.length === 0) {
    return (
      <div className="empty-nft-grid">
        <div className="empty-icon">🎨</div>
        <h3>No NFTs Found</h3>
        <p>Try adjusting your search criteria or filters</p>
      </div>
    );
  }

  return (
    <div className="virtualized-nft-container">
      <Grid
        columnCount={columnsCount}
        columnWidth={cardWidth + gap}
        height={containerHeight}
        rowCount={rowsCount}
        rowHeight={cardHeight + gap}
        width={containerWidth}
        className="virtualized-grid"
        itemData={{
          nfts,
          columnsCount,
          viewMode,
          gap
        }}
      >
        {GridItem}
      </Grid>
      
      {/* Loading indicator for pagination */}
      {hasNextPage && (
        <div ref={ref} className="load-more-trigger">
          {loading && (
            <div className="loading-more">
              <div className="loading-spinner"></div>
              <span>Loading more NFTs...</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default VirtualizedNFTGrid; 