import '../styles/Technology.css';
import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, Zap, Globe, TrendingUp, ArrowRight } from 'lucide-react';

const Technology = () => {
  return (
    <div className="technology-page">
      <section className="tech-hero">
        <div className="tech-hero-content">
          <h1>Powered by Blockchain Technology</h1>
          <p>Built on cutting-edge blockchain infrastructure for security, transparency, and decentralization</p>
        </div>
      </section>

      <section className="blockchain-features">
        <div className="container">
          <h2>Blockchain Benefits</h2>
          <div className="features-grid">
            <div className="feature-card">
              <Shield size={48} />
              <h3>Security First</h3>
              <p>Immutable blockchain records ensure product authenticity and prevent fraud</p>
            </div>
            <div className="feature-card">
              <Zap size={48} />
              <h3>Fast Transactions</h3>
              <p>Lightning-fast blockchain transactions with low fees</p>
            </div>
            <div className="feature-card">
              <Globe size={48} />
              <h3>Global Access</h3>
              <p>Decentralized platform accessible worldwide without restrictions</p>
            </div>
            <div className="feature-card">
              <TrendingUp size={48} />
              <h3>Smart Contracts</h3>
              <p>Automated smart contracts for seamless and trustless transactions</p>
            </div>
          </div>
        </div>
      </section>

      <section className="tech-stack">
        <div className="container">
          <h2>Our Technology Stack</h2>
          <div className="tech-items">
            <div className="tech-item">
              <h3>Ethereum & Polygon</h3>
              <p>Multi-chain support for scalability and lower fees</p>
            </div>
            <div className="tech-item">
              <h3>Web3 Integration</h3>
              <p>Seamless wallet connection and blockchain interaction</p>
            </div>
            <div className="tech-item">
              <h3>IPFS Storage</h3>
              <p>Decentralized storage for product data and metadata</p>
            </div>
            <div className="tech-item">
              <h3>React Frontend</h3>
              <p>Modern, responsive user interface built with React</p>
            </div>
          </div>
        </div>
      </section>

      <section className="cta-section">
        <div className="container">
          <h2>Ready to Experience the Future?</h2>
          <p>Join thousands of users already using our blockchain-powered marketplace</p>
          <div className="cta-buttons">
            <Link to="/catalog" className="btn-primary">
              Explore Marketplace <ArrowRight size={20} />
            </Link>
            <Link to="/register" className="btn-secondary">
              Get Started
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Technology; 