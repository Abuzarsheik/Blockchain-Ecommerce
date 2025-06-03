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
  Star,
  Globe
} from 'lucide-react';
import { generatePlaceholder } from '../utils/imageUtils';

const HeroSection = () => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [currentProductIndex, setCurrentProductIndex] = useState(0);

  // Featured products carousel data
  const featuredProducts = [
    {
      id: 1,
      name: "Digital Art Collection",
      price: 0.5,
      image: generatePlaceholder(400, 300, 'Art'),
      category: "Art"
    },
    {
      id: 2,
      name: "Gaming Asset Pack",
      price: 1.2,
      image: generatePlaceholder(400, 300, 'Gaming'),
      category: "Gaming"
    },
    {
      id: 3,
      name: "Music NFT Album",
      price: 0.8,
      image: generatePlaceholder(400, 300, 'Music'),
      category: "Music"
    }
  ];

  const stats = [
    { label: "Active Users", value: "50K+", icon: <Users size={20} /> },
    { label: "Products Sold", value: "12.5K+", icon: <ShoppingBag size={20} /> },
    { label: "Trading Volume", value: "$2.5M+", icon: <TrendingUp size={20} /> },
    { label: "Satisfaction Rate", value: "98%", icon: <Star size={20} /> }
  ];

  const features = [
    {
      icon: <Zap size={24} />,
      title: "Instant Transactions",
      description: "Buy and sell products instantly with our optimized payment system"
    },
    {
      icon: <Shield size={24} />,
      title: "Secure & Verified",
      description: "All products are verified and transactions are secured by blockchain"
    },
    {
      icon: <Globe size={24} />,
      title: "Global Reach",
      description: "Connect with buyers and sellers from around the world"
    }
  ];

  // Auto-rotate featured products
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentProductIndex((prev) => (prev + 1) % featuredProducts.length);
    }, 4000);
    
    return () => clearInterval(interval);
  }, [featuredProducts.length]);

  const currentProduct = featuredProducts[currentProductIndex];

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  return (
    <div className={`hero-section ${isLoaded ? 'loaded' : ''}`}>
      <div className="hero-container">
        <div className="hero-content">
          <div className="hero-text">
            <div className="hero-badge">
              <Shield size={16} />
              <span>Blockchain Verified Marketplace</span>
            </div>
            
            <h1 className="hero-title">
              Discover
              <span className="gradient-text"> Premium Products</span>
            </h1>
            
            <p className="hero-description">
              Join the largest product marketplace where quality meets innovation.
              Buy and sell with confidence using blockchain verification.
            </p>

            <div className="hero-actions">
              <Link to="/catalog" className="cta-primary">
                <span>Explore Marketplace</span>
                <ArrowRight size={20} />
              </Link>
              <Link to="/about" className="cta-secondary">
                <span>Learn More</span>
              </Link>
            </div>

            <div className="hero-stats">
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

            <div className="hero-features">
              {features.map((feature, index) => (
                <div key={index} className="feature-item">
                  <div className="feature-icon">
                    {feature.icon}
                  </div>
                  <div className="feature-content">
                    <h3>{feature.title}</h3>
                    <p>{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="product-showcase">
            <div className="product-card-large product-glow">
              <div className="product-image-container">
                <img
                  src={currentProduct.image}
                  alt={currentProduct.name}
                  className="product-image"
                />
                <div className="product-overlay">
                  <div className="product-category">{currentProduct.category}</div>
                  <div className="product-rating">
                    <Star size={16} fill="currentColor" />
                    <span>4.8</span>
                  </div>
                </div>
              </div>
              
              <div className="product-info">
                <h3 className="product-title">{currentProduct.name}</h3>
                <p className="product-creator">Price: ${currentProduct.price}</p>
                <div className="product-price">
                  <span className="price-label">Price</span>
                  <span className="price-value">${currentProduct.price}</span>
                </div>
              </div>
            </div>

            <div className="product-indicators">
              {featuredProducts.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentProductIndex(index)}
                  className={`indicator ${index === currentProductIndex ? 'active' : ''}`}
                  aria-label={`View product ${index + 1}`}
                />
              ))}
            </div>

            <div className="floating-products">
              <div className="floating-product floating-product-1">
                <img src={generatePlaceholder(120, 120, 'Product')} alt="Product" />
              </div>
              <div className="floating-product floating-product-2">
                <img src={generatePlaceholder(120, 120, 'Product')} alt="Product" />
              </div>
              <div className="floating-product floating-product-3">
                <img src={generatePlaceholder(120, 120, 'Product')} alt="Product" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="hero-bg">
        <div className="gradient-orb orb-1"></div>
        <div className="gradient-orb orb-2"></div>
        <div className="gradient-orb orb-3"></div>
      </div>
    </div>
  );
};

// CSS-in-JS styles remain the same but with updated class names
const styles = `
.hero-section {
  position: relative;
  min-height: 100vh;
  background: linear-gradient(135deg, #0f0f23 0%, #1a1a2e 50%, #16213e 100%);
  color: white;
  overflow: hidden;
  display: flex;
  align-items: center;
  opacity: 0;
  transform: translateY(20px);
  transition: all 0.8s ease;
}

.hero-section.loaded {
  opacity: 1;
  transform: translateY(0);
}

.hero-container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 2rem;
  width: 100%;
  position: relative;
  z-index: 2;
}

.hero-content {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4rem;
  align-items: center;
}

.hero-text {
  max-width: 600px;
}

.hero-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  padding: 0.5rem 1rem;
  border-radius: 50px;
  font-size: 0.9rem;
  margin-bottom: 2rem;
  animation: glow 2s ease-in-out infinite alternate;
}

@keyframes glow {
  from { box-shadow: 0 0 20px rgba(139, 92, 246, 0.3); }
  to { box-shadow: 0 0 30px rgba(139, 92, 246, 0.6); }
}

.hero-title {
  font-size: 4rem;
  font-weight: 800;
  line-height: 1.1;
  margin-bottom: 1.5rem;
  background: linear-gradient(135deg, #ffffff 0%, #e2e8f0 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.gradient-text {
  background: linear-gradient(135deg, #8b5cf6 0%, #06b6d4 50%, #10b981 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  animation: gradient-shift 3s ease-in-out infinite;
}

@keyframes gradient-shift {
  0%, 100% { filter: hue-rotate(0deg); }
  50% { filter: hue-rotate(20deg); }
}

.hero-description {
  font-size: 1.25rem;
  line-height: 1.7;
  color: #cbd5e1;
  margin-bottom: 2.5rem;
}

.hero-actions {
  display: flex;
  gap: 1rem;
  margin-bottom: 3rem;
}

.cta-primary {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  background: linear-gradient(135deg, #8b5cf6 0%, #06b6d4 100%);
  color: white;
  padding: 1rem 2rem;
  border-radius: 12px;
  text-decoration: none;
  font-weight: 600;
  font-size: 1.1rem;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(139, 92, 246, 0.4);
}

.cta-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(139, 92, 246, 0.6);
}

.cta-secondary {
  display: inline-flex;
  align-items: center;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: white;
  padding: 1rem 2rem;
  border-radius: 12px;
  text-decoration: none;
  font-weight: 600;
  font-size: 1.1rem;
  transition: all 0.3s ease;
}

.cta-secondary:hover {
  background: rgba(255, 255, 255, 0.2);
  border-color: rgba(255, 255, 255, 0.4);
}

.hero-stats {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1.5rem;
  margin-bottom: 3rem;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 1rem;
  border-radius: 12px;
  transition: all 0.3s ease;
}

.stat-item:hover {
  background: rgba(255, 255, 255, 0.1);
  transform: translateY(-2px);
}

.stat-icon {
  color: #8b5cf6;
}

.stat-value {
  font-size: 1.25rem;
  font-weight: 700;
  color: white;
}

.stat-label {
  font-size: 0.9rem;
  color: #94a3b8;
}

.hero-features {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.feature-item {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
}

.feature-icon {
  color: #06b6d4;
  margin-top: 0.25rem;
}

.feature-content h3 {
  font-size: 1.1rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: white;
}

.feature-content p {
  color: #94a3b8;
  line-height: 1.6;
}

.product-showcase {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.product-card-large {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 20px;
  padding: 1.5rem;
  transition: all 0.3s ease;
  max-width: 400px;
  width: 100%;
}

.product-image-container {
  position: relative;
  border-radius: 16px;
  overflow: hidden;
  margin-bottom: 1.5rem;
}

.product-image {
  width: 100%;
  height: 300px;
  object-fit: cover;
  transition: transform 0.3s ease;
}

.product-card-large:hover .product-image {
  transform: scale(1.05);
}

.product-overlay {
  position: absolute;
  top: 1rem;
  left: 1rem;
  right: 1rem;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.product-category {
  background: rgba(139, 92, 246, 0.9);
  backdrop-filter: blur(10px);
  color: white;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  font-size: 0.8rem;
  font-weight: 600;
}

.product-rating {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(10px);
  color: #fbbf24;
  padding: 0.5rem;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 600;
}

.product-info {
  text-align: center;
}

.product-title {
  font-size: 1.5rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
  color: white;
}

.product-creator {
  color: #94a3b8;
  margin-bottom: 1rem;
}

.product-price {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(255, 255, 255, 0.1);
  padding: 1rem;
  border-radius: 12px;
}

.price-label {
  color: #94a3b8;
  font-size: 0.9rem;
}

.price-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: #10b981;
}

.product-indicators {
  display: flex;
  gap: 0.5rem;
  margin-top: 1.5rem;
}

.indicator {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: none;
  background: rgba(255, 255, 255, 0.3);
  cursor: pointer;
  transition: all 0.3s ease;
}

.indicator.active {
  background: #8b5cf6;
  transform: scale(1.2);
}

.floating-products {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.floating-product {
  position: absolute;
  width: 80px;
  height: 80px;
  border-radius: 12px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  animation: float 6s ease-in-out infinite;
}

.floating-product img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.floating-product-1 {
  top: 10%;
  right: -10%;
  animation-delay: 0s;
}

.floating-product-2 {
  bottom: 20%;
  right: -20%;
  animation-delay: 2s;
}

.floating-product-3 {
  top: 60%;
  right: -15%;
  animation-delay: 4s;
}

@keyframes float {
  0%, 100% {
    transform: translateY(0px) rotate(0deg);
  }
  50% {
    transform: translateY(-20px) rotate(5deg);
  }
}

.hero-bg {
  position: absolute;
  inset: 0;
  overflow: hidden;
  z-index: 1;
}

.gradient-orb {
  position: absolute;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(139, 92, 246, 0.3) 0%, transparent 70%);
  animation: pulse 4s ease-in-out infinite;
}

.orb-1 {
  width: 300px;
  height: 300px;
  top: 20%;
  left: 10%;
  animation-delay: 0s;
}

.orb-2 {
  width: 200px;
  height: 200px;
  bottom: 20%;
  right: 20%;
  background: radial-gradient(circle, rgba(6, 182, 212, 0.3) 0%, transparent 70%);
  animation-delay: 2s;
}

.orb-3 {
  width: 150px;
  height: 150px;
  top: 60%;
  left: 70%;
  background: radial-gradient(circle, rgba(16, 185, 129, 0.3) 0%, transparent 70%);
  animation-delay: 4s;
}

@keyframes pulse {
  0%, 100% {
    transform: scale(1) rotate(0deg);
    opacity: 0.5;
  }
  50% {
    transform: scale(1.1) rotate(180deg);
    opacity: 0.8;
  }
}

@media (max-width: 1024px) {
  .hero-content {
    grid-template-columns: 1fr;
    gap: 3rem;
    text-align: center;
  }
  
  .hero-title {
    font-size: 3rem;
  }
  
  .hero-stats {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .hero-title {
    font-size: 2.5rem;
  }
  
  .hero-actions {
    flex-direction: column;
    align-items: center;
  }
  
  .cta-primary,
  .cta-secondary {
    width: 100%;
    max-width: 300px;
    justify-content: center;
  }
  
  .hero-stats {
    grid-template-columns: 1fr;
  }
  
  .floating-products {
    display: none;
  }
}
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement("style");
  styleSheet.innerText = styles;
  document.head.appendChild(styleSheet);
}

export default HeroSection; 