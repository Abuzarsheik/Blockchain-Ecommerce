import '../styles/theme.css';
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Play, 
  Stars, 
  TrendingUp, 
  Users, 
  ShoppingBag, 
  ArrowRight,
  ChevronRight,
  Zap,
  Shield,
  Wallet,
  Star
} from 'lucide-react';

const HeroSection = () => {
  const [currentNFTIndex, setCurrentNFTIndex] = useState(0);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);

  // Featured NFTs carousel data
  const featuredNFTs = [
    {
      id: 1,
      title: "Cosmic Dreams #001",
      creator: "ArtisticVision",
      price: "2.5 ETH",
      image: "/api/placeholder/400/400",
      category: "Digital Art"
    },
    {
      id: 2,
      title: "Neon Cityscape",
      creator: "CyberArtist",
      price: "1.8 ETH",
      image: "/api/placeholder/400/400",
      category: "Photography"
    },
    {
      id: 3,
      title: "Abstract Emotions",
      creator: "ModernCreator",
      price: "3.2 ETH",
      image: "/api/placeholder/400/400",
      category: "Abstract"
    }
  ];

  const stats = [
    { label: "NFTs Sold", value: "12.5K+", icon: <ShoppingBag size={20} /> },
    { label: "Active Users", value: "8.2K+", icon: <Users size={20} /> },
    { label: "Total Volume", value: "$2.4M+", icon: <TrendingUp size={20} /> },
    { label: "Verified Creators", value: "500+", icon: <Star size={20} /> }
  ];

  const features = [
    {
      icon: <Zap className="feature-icon" />,
      title: "Instant Trading",
      description: "Buy and sell NFTs instantly with our optimized smart contracts"
    },
    {
      icon: <Shield className="feature-icon" />,
      title: "Secure & Verified",
      description: "All NFTs are verified and transactions are secured by blockchain"
    },
    {
      icon: <Wallet className="feature-icon" />,
      title: "Multi-Wallet Support",
      description: "Connect with MetaMask, WalletConnect, and other popular wallets"
    }
  ];

  // Auto-rotate featured NFTs
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentNFTIndex((prev) => (prev + 1) % featuredNFTs.length);
    }, 4000);

    return () => clearInterval(interval);
  }, [featuredNFTs.length]);

  const currentNFT = featuredNFTs[currentNFTIndex];

  return (
    <section className="hero-section">
      <div className="hero-container">
        {/* Main Hero Content */}
        <div className="hero-content">
          <div className="hero-text">
            <div className="hero-badge">
              <Star size={16} />
              <span>Welcome to the Future of Digital Art</span>
            </div>

            <h1 className="hero-title">
              Discover, Collect & Trade
              <span className="gradient-text"> Extraordinary NFTs</span>
            </h1>

            <p className="hero-description">
              Join the largest NFT marketplace where creators and collectors come together. 
              Discover unique digital assets, support your favorite artists, and be part of 
              the digital art revolution.
            </p>

            <div className="hero-actions">
              <Link to="/catalog" className="btn btn-primary hero-cta">
                <span>Explore Marketplace</span>
                <ArrowRight size={18} />
              </Link>

              <button
                onClick={() => setIsVideoPlaying(true)}
                className="btn btn-outline hero-video-btn"
              >
                <Play size={18} />
                <span>Watch Demo</span>
              </button>
            </div>

            <div className="hero-features">
              {features.map((feature, index) => (
                <div key={index} className="feature-item">
                  <div className="feature-icon-container">
                    {feature.icon}
                  </div>
                  <div className="feature-text">
                    <h4>{feature.title}</h4>
                    <p>{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="hero-visual">
            {/* Featured NFT Showcase */}
            <div className="nft-showcase">
              <div className="nft-card-large nft-glow">
                <div className="nft-image-container">
                  <img 
                    src={currentNFT.image} 
                    alt={currentNFT.title}
                    className="nft-image"
                  />
                  <div className="nft-overlay">
                    <div className="nft-category">{currentNFT.category}</div>
                    <button className="quick-view-btn">
                      <Star size={16} />
                    </button>
                  </div>
                </div>
                
                <div className="nft-info">
                  <h3 className="nft-title">{currentNFT.title}</h3>
                  <p className="nft-creator">by {currentNFT.creator}</p>
                  <div className="nft-price">
                    <span className="price-label">Current Price</span>
                    <span className="price-value">{currentNFT.price}</span>
                  </div>
                </div>
              </div>

              {/* NFT Indicators */}
              <div className="nft-indicators">
                {featuredNFTs.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentNFTIndex(index)}
                    className={`indicator ${index === currentNFTIndex ? 'active' : ''}`}
                  />
                ))}
              </div>

              {/* Floating NFT Cards */}
              <div className="floating-nfts">
                <div className="floating-nft floating-nft-1">
                  <img src="/api/placeholder/120/120" alt="NFT" />
                </div>
                <div className="floating-nft floating-nft-2">
                  <img src="/api/placeholder/120/120" alt="NFT" />
                </div>
                <div className="floating-nft floating-nft-3">
                  <img src="/api/placeholder/120/120" alt="NFT" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Section */}
        <div className="hero-stats">
          <div className="stats-container">
            {stats.map((stat, index) => (
              <div key={index} className="stat-item">
                <div className="stat-icon">
                  {stat.icon}
                </div>
                <div className="stat-content">
                  <div className="stat-value">{stat.value}</div>
                  <div className="stat-label">{stat.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Navigation */}
        <div className="quick-nav">
          <Link to="/trending" className="quick-nav-item">
            <TrendingUp size={20} />
            <span>Trending</span>
            <ChevronRight size={16} />
          </Link>
          <Link to="/creators" className="quick-nav-item">
            <Users size={20} />
            <span>Top Creators</span>
            <ChevronRight size={16} />
          </Link>
          <Link to="/collections" className="quick-nav-item">
            <Star size={20} />
            <span>Collections</span>
            <ChevronRight size={16} />
          </Link>
        </div>
      </div>

      {/* Video Modal */}
      {isVideoPlaying && (
        <div className="video-modal" onClick={() => setIsVideoPlaying(false)}>
          <div className="video-container" onClick={(e) => e.stopPropagation()}>
            <button 
              onClick={() => setIsVideoPlaying(false)}
              className="close-video-btn"
            >
              ×
            </button>
            <iframe
              src="https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1"
              title="Blocmerce Demo Video"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>
      )}

      <style jsx>{`
        .hero-section {
          min-height: 100vh;
          background: linear-gradient(135deg, var(--gray-50) 0%, var(--primary-50) 100%);
          position: relative;
          overflow: hidden;
          padding: var(--space-16) 0 var(--space-8);
        }

        .hero-section::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: radial-gradient(circle at 20% 80%, var(--primary-100) 0%, transparent 50%),
                      radial-gradient(circle at 80% 20%, rgba(139, 92, 246, 0.2) 0%, transparent 50%);
          pointer-events: none;
        }

        .hero-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 var(--space-4);
          position: relative;
          z-index: 1;
        }

        .hero-content {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: var(--space-16);
          align-items: center;
          margin-bottom: var(--space-16);
        }

        .hero-text {
          max-width: 600px;
        }

        .hero-badge {
          display: inline-flex;
          align-items: center;
          gap: var(--space-2);
          background: var(--primary-100);
          color: var(--primary-700);
          padding: var(--space-2) var(--space-4);
          border-radius: var(--border-radius-full);
          font-size: 0.875rem;
          font-weight: 500;
          margin-bottom: var(--space-6);
          border: 1px solid var(--primary-200);
        }

        .hero-title {
          font-family: var(--font-display);
          font-size: 3.5rem;
          font-weight: 800;
          line-height: 1.1;
          margin-bottom: var(--space-6);
          color: var(--gray-900);
        }

        .hero-description {
          font-size: 1.125rem;
          line-height: 1.7;
          color: var(--gray-600);
          margin-bottom: var(--space-8);
        }

        .hero-actions {
          display: flex;
          gap: var(--space-4);
          margin-bottom: var(--space-12);
        }

        .hero-cta {
          font-size: 1.1rem;
          padding: var(--space-4) var(--space-8);
          box-shadow: var(--shadow-lg);
        }

        .hero-video-btn {
          font-size: 1.1rem;
          padding: var(--space-4) var(--space-6);
        }

        .hero-features {
          display: flex;
          flex-direction: column;
          gap: var(--space-6);
        }

        .feature-item {
          display: flex;
          gap: var(--space-4);
          align-items: flex-start;
        }

        .feature-icon-container {
          padding: var(--space-3);
          background: var(--primary-100);
          border-radius: var(--border-radius-lg);
          color: var(--primary-600);
          flex-shrink: 0;
        }

        .feature-text h4 {
          font-weight: 600;
          margin-bottom: var(--space-1);
          color: var(--gray-900);
        }

        .feature-text p {
          color: var(--gray-600);
          font-size: 0.9rem;
          line-height: 1.5;
        }

        .hero-visual {
          position: relative;
          display: flex;
          justify-content: center;
          align-items: center;
        }

        .nft-showcase {
          position: relative;
        }

        .nft-card-large {
          width: 380px;
          background: white;
          border-radius: var(--border-radius-2xl);
          overflow: hidden;
          box-shadow: var(--shadow-xl);
          transition: all var(--transition-slow);
        }

        .nft-image-container {
          position: relative;
          aspect-ratio: 1;
          overflow: hidden;
        }

        .nft-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform var(--transition-slow);
        }

        .nft-card-large:hover .nft-image {
          transform: scale(1.1);
        }

        .nft-overlay {
          position: absolute;
          top: var(--space-4);
          left: var(--space-4);
          right: var(--space-4);
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }

        .nft-category {
          background: rgba(0, 0, 0, 0.8);
          color: white;
          padding: var(--space-2) var(--space-3);
          border-radius: var(--border-radius-lg);
          font-size: 0.875rem;
          font-weight: 500;
        }

        .quick-view-btn {
          background: rgba(255, 255, 255, 0.9);
          border: none;
          padding: var(--space-2);
          border-radius: var(--border-radius-lg);
          color: var(--primary-600);
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .quick-view-btn:hover {
          background: white;
          transform: scale(1.1);
        }

        .nft-info {
          padding: var(--space-6);
        }

        .nft-title {
          font-size: 1.25rem;
          font-weight: 600;
          margin-bottom: var(--space-1);
          color: var(--gray-900);
        }

        .nft-creator {
          color: var(--gray-600);
          margin-bottom: var(--space-4);
        }

        .nft-price {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .price-label {
          color: var(--gray-500);
          font-size: 0.875rem;
        }

        .price-value {
          font-weight: 700;
          font-size: 1.125rem;
          color: var(--primary-600);
        }

        .nft-indicators {
          display: flex;
          justify-content: center;
          gap: var(--space-2);
          margin-top: var(--space-4);
        }

        .indicator {
          width: 8px;
          height: 8px;
          border-radius: var(--border-radius-full);
          border: none;
          background: var(--gray-300);
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .indicator.active {
          background: var(--primary-500);
          transform: scale(1.5);
        }

        .floating-nfts {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          pointer-events: none;
        }

        .floating-nft {
          position: absolute;
          width: 80px;
          height: 80px;
          border-radius: var(--border-radius-lg);
          overflow: hidden;
          box-shadow: var(--shadow-lg);
          animation: float 6s ease-in-out infinite;
        }

        .floating-nft img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .floating-nft-1 {
          top: 10%;
          right: -10%;
          animation-delay: 0s;
        }

        .floating-nft-2 {
          bottom: 20%;
          left: -15%;
          animation-delay: 2s;
        }

        .floating-nft-3 {
          top: 60%;
          right: -20%;
          animation-delay: 4s;
        }

        .hero-stats {
          background: rgba(255, 255, 255, 0.8);
          backdrop-filter: blur(20px);
          border: 1px solid var(--gray-200);
          border-radius: var(--border-radius-2xl);
          padding: var(--space-8);
          margin-bottom: var(--space-12);
        }

        .stats-container {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: var(--space-8);
        }

        .stat-item {
          display: flex;
          align-items: center;
          gap: var(--space-4);
          text-align: left;
        }

        .stat-icon {
          padding: var(--space-3);
          background: var(--primary-100);
          border-radius: var(--border-radius-lg);
          color: var(--primary-600);
        }

        .stat-value {
          font-size: 2rem;
          font-weight: 800;
          color: var(--gray-900);
          line-height: 1;
        }

        .stat-label {
          color: var(--gray-600);
          font-size: 0.875rem;
          margin-top: var(--space-1);
        }

        .quick-nav {
          display: flex;
          justify-content: center;
          gap: var(--space-4);
        }

        .quick-nav-item {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          padding: var(--space-4) var(--space-6);
          background: white;
          border: 1px solid var(--gray-200);
          border-radius: var(--border-radius-xl);
          text-decoration: none;
          color: var(--gray-700);
          font-weight: 500;
          transition: all var(--transition-fast);
          box-shadow: var(--shadow-sm);
        }

        .quick-nav-item:hover {
          background: var(--primary-50);
          color: var(--primary-600);
          border-color: var(--primary-200);
          transform: translateY(-2px);
          box-shadow: var(--shadow-md);
        }

        .video-modal {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: var(--z-modal);
          padding: var(--space-4);
        }

        .video-container {
          position: relative;
          width: 100%;
          max-width: 800px;
          aspect-ratio: 16/9;
          background: black;
          border-radius: var(--border-radius-xl);
          overflow: hidden;
        }

        .video-container iframe {
          width: 100%;
          height: 100%;
        }

        .close-video-btn {
          position: absolute;
          top: var(--space-4);
          right: var(--space-4);
          background: rgba(0, 0, 0, 0.8);
          color: white;
          border: none;
          width: 40px;
          height: 40px;
          border-radius: var(--border-radius-full);
          font-size: 1.5rem;
          cursor: pointer;
          z-index: 1;
        }

        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          33% { transform: translateY(-10px) rotate(1deg); }
          66% { transform: translateY(5px) rotate(-1deg); }
        }

        @media (max-width: 768px) {
          .hero-content {
            grid-template-columns: 1fr;
            gap: var(--space-8);
            text-align: center;
          }

          .hero-title {
            font-size: 2.5rem;
          }

          .hero-actions {
            justify-content: center;
          }

          .hero-features {
            max-width: 400px;
            margin: 0 auto;
          }

          .feature-item {
            text-align: left;
          }

          .nft-card-large {
            width: 300px;
          }

          .stats-container {
            grid-template-columns: repeat(2, 1fr);
            gap: var(--space-4);
          }

          .stat-item {
            flex-direction: column;
            text-align: center;
            gap: var(--space-2);
          }

          .quick-nav {
            flex-direction: column;
            align-items: center;
          }

          .floating-nfts {
            display: none;
          }
        }
      `}</style>
    </section>
  );
};

export default HeroSection; 