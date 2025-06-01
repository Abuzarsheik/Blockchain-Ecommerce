import React, { useState, useMemo } from 'react';
import InteractiveNFTCard from '../components/InteractiveNFTCard';
import RealTimeNotifications from '../components/RealTimeNotifications';
import InteractiveDashboard from '../components/InteractiveDashboard';
import { Star, Zap, Crown, BarChart3, Users, TrendingUp, Award } from 'lucide-react';
import '../components/InteractiveNFTCard.css';

const TestShowcase = () => {
  const [selectedDemo, setSelectedDemo] = useState('cards');

  // Mock NFT data for testing
  const mockNFTs = [
    {
      id: 1,
      name: 'Cosmic Journey #1',
      creator: 'DigitalArtist',
      price: 2.5,
      priceChange: 15.3,
      likes: 128,
      image: 'https://via.placeholder.com/400x400/667eea/ffffff?text=Cosmic+Journey',
      rarity: 'Legendary',
      isNew: true,
      description: 'A mesmerizing journey through cosmic landscapes, featuring vibrant colors and ethereal beauty.',
      tokenId: '12345',
      blockchain: 'Ethereum',
      category: 'Digital Art',
      createdAt: '2024-01-15'
    },
    {
      id: 2,
      name: 'Digital Dreams #42',
      creator: 'CryptoCreator',
      price: 1.8,
      priceChange: -5.2,
      likes: 89,
      image: 'https://via.placeholder.com/400x400/764ba2/ffffff?text=Digital+Dreams',
      rarity: 'Epic',
      isNew: false,
      description: 'Explore the realm of digital consciousness through abstract visual metaphors.',
      tokenId: '67890',
      blockchain: 'Ethereum',
      category: 'Abstract',
      createdAt: '2024-01-10'
    },
    {
      id: 3,
      name: 'Future Vision #23',
      creator: 'FutureArt',
      price: 3.2,
      priceChange: 22.7,
      likes: 156,
      image: 'https://via.placeholder.com/400x400/f093fb/ffffff?text=Future+Vision',
      rarity: 'Rare',
      isNew: true,
      description: 'A glimpse into the future of digital art and human creativity.',
      tokenId: '11111',
      blockchain: 'Polygon',
      category: 'Futuristic',
      createdAt: '2024-01-20'
    }
  ];

  const handleNFTAction = (action, nft) => {
    console.log(`${action} action for NFT:`, nft.name);
    // Add toast notification or actual functionality here
  };

  const DemoSection = ({ id, title, description, icon: Icon, children }) => (
    <div className={`demo-section ${selectedDemo === id ? 'active' : ''}`}>
      <div className="demo-header">
        <div className="demo-icon">
          <Icon size={24} />
        </div>
        <div className="demo-info">
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
      </div>
      <div className="demo-content">
        {children}
      </div>
    </div>
  );

  return (
    <div className="test-showcase">
      <div className="showcase-header">
        <h1>🚀 Premium Features Showcase</h1>
        <p>Experience the next generation of NFT marketplace interactions</p>
        
        <div className="demo-selector">
          {[
            { id: 'cards', label: 'Interactive Cards', icon: Star },
            { id: 'dashboard', label: 'Analytics Dashboard', icon: Zap },
            { id: 'all', label: 'All Features', icon: Crown }
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={`demo-btn ${selectedDemo === id ? 'active' : ''}`}
              onClick={() => setSelectedDemo(id)}
            >
              <Icon size={18} />
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="showcase-content">
        {(selectedDemo === 'cards' || selectedDemo === 'all') && (
          <DemoSection
            id="cards"
            title="Interactive NFT Cards"
            description="3D hover effects, flip animations, real-time interactions, and premium micro-animations"
            icon={Star}
          >
            <div className="cards-showcase">
              <div className="cards-grid">
                {mockNFTs.map(nft => (
                  <InteractiveNFTCard
                    key={nft.id}
                    nft={nft}
                    onAddToWishlist={(nft) => handleNFTAction('Add to Wishlist', nft)}
                    onAddToCart={(nft) => handleNFTAction('Add to Cart', nft)}
                    onCompare={(nft) => handleNFTAction('Compare', nft)}
                    onShare={(nft) => handleNFTAction('Share', nft)}
                    onQuickView={(nft) => handleNFTAction('Quick View', nft)}
                    isInWishlist={nft.id === 2}
                    isInComparison={nft.id === 3}
                  />
                ))}
              </div>
              
              <div className="feature-highlights">
                <div className="highlight-item">
                  <Star className="highlight-icon" />
                  <h3>3D Hover Effects</h3>
                  <p>Cards respond to mouse movement with realistic 3D transformations</p>
                </div>
                <div className="highlight-item">
                  <Zap className="highlight-icon" />
                  <h3>Flip Animations</h3>
                  <p>Smooth card flipping reveals additional NFT details and metadata</p>
                </div>
                <div className="highlight-item">
                  <Star className="highlight-icon" />
                  <h3>Particle Effects</h3>
                  <p>Dynamic particle animations on hover create engaging interactions</p>
                </div>
              </div>
            </div>
          </DemoSection>
        )}

        {(selectedDemo === 'dashboard' || selectedDemo === 'all') && (
          <DemoSection
            id="dashboard"
            title="Analytics Dashboard"
            description="Real-time data visualization with animated charts, metrics, and interactive controls"
            icon={Zap}
          >
            <InteractiveDashboard />
          </DemoSection>
        )}
      </div>

      <div className="showcase-footer">
        <div className="performance-metrics">
          <h3>Performance Features</h3>
          <div className="metrics-list">
            <div className="metric-item">
              <strong>✅ React.memo()</strong> - Component memoization
            </div>
            <div className="metric-item">
              <strong>⚡ useCallback()</strong> - Stable function references
            </div>
            <div className="metric-item">
              <strong>🎯 useMemo()</strong> - Expensive calculations caching
            </div>
            <div className="metric-item">
              <strong>📱 Responsive Design</strong> - Mobile-first approach
            </div>
            <div className="metric-item">
              <strong>♿ Accessibility</strong> - ARIA labels & keyboard navigation
            </div>
            <div className="metric-item">
              <strong>🎨 CSS Animations</strong> - Hardware-accelerated transitions
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .test-showcase {
          min-height: 100vh;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 2rem;
        }

        .showcase-header {
          text-align: center;
          margin-bottom: 3rem;
        }

        .showcase-header h1 {
          font-size: 3rem;
          margin-bottom: 1rem;
          background: linear-gradient(45deg, #ffd700, #ffed4e);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .showcase-header p {
          font-size: 1.25rem;
          opacity: 0.9;
          margin-bottom: 2rem;
        }

        .demo-selector {
          display: flex;
          gap: 1rem;
          justify-content: center;
          flex-wrap: wrap;
        }

        .demo-btn {
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          color: white;
          padding: 0.75rem 1.5rem;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          backdrop-filter: blur(10px);
        }

        .demo-btn:hover,
        .demo-btn.active {
          background: rgba(255, 255, 255, 0.2);
          transform: translateY(-2px);
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
        }

        .demo-section {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 20px;
          padding: 2rem;
          margin-bottom: 2rem;
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .demo-header {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 2rem;
        }

        .demo-icon {
          width: 50px;
          height: 50px;
          background: linear-gradient(45deg, #ffd700, #ffed4e);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #333;
        }

        .demo-info h2 {
          margin: 0 0 0.5rem 0;
          font-size: 1.8rem;
        }

        .demo-info p {
          margin: 0;
          opacity: 0.8;
        }

        .cards-grid {
          display: flex;
          gap: 2rem;
          justify-content: center;
          flex-wrap: wrap;
          margin-bottom: 3rem;
        }

        .feature-highlights {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 2rem;
          margin-top: 3rem;
        }

        .highlight-item {
          background: rgba(255, 255, 255, 0.1);
          padding: 1.5rem;
          border-radius: 12px;
          text-align: center;
        }

        .highlight-icon {
          color: #ffd700;
          margin-bottom: 1rem;
        }

        .highlight-item h3 {
          margin: 0 0 0.5rem 0;
          font-size: 1.2rem;
        }

        .highlight-item p {
          margin: 0;
          opacity: 0.8;
          font-size: 0.9rem;
        }

        .showcase-footer {
          margin-top: 3rem;
          padding-top: 2rem;
          border-top: 1px solid rgba(255, 255, 255, 0.2);
        }

        .performance-metrics h3 {
          text-align: center;
          margin-bottom: 2rem;
          font-size: 1.5rem;
        }

        .metrics-list {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1rem;
        }

        .metric-item {
          background: rgba(255, 255, 255, 0.1);
          padding: 1rem;
          border-radius: 8px;
          font-size: 0.9rem;
        }

        @media (max-width: 768px) {
          .test-showcase {
            padding: 1rem;
          }

          .showcase-header h1 {
            font-size: 2rem;
          }

          .cards-grid {
            gap: 1rem;
          }

          .demo-section {
            padding: 1rem;
          }
        }
      `}</style>
    </div>
  );
};

export default TestShowcase; 