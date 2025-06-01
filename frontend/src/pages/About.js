import '../styles/About.css';
import React from 'react';
import { Link } from 'react-router-dom';
import { Users, Target, Award, ArrowRight, User, ShoppingBag } from 'lucide-react';
import { useSelector } from 'react-redux';

const About = () => {
  const { isAuthenticated, user } = useSelector(state => state.auth);

  return (
    <div className="about-page">
      <section className="about-hero">
        <div className="about-hero-content">
          <h1>About Blocmerce</h1>
          <p>Revolutionizing e-commerce through blockchain technology and decentralized solutions</p>
        </div>
      </section>

      <section className="mission">
        <div className="container">
          <div className="mission-content">
            <h2>Our Mission</h2>
            <p>
              At Blocmerce, we believe the future of commerce lies in transparency, security, and 
              decentralization. Our platform empowers creators, collectors, and businesses to trade 
              with confidence, knowing every transaction is verified on the blockchain.
            </p>
          </div>
        </div>
      </section>

      <section className="values">
        <div className="container">
          <h2>Our Values</h2>
          <div className="values-grid">
            <div className="value-card">
              <Target size={48} />
              <h3>Transparency</h3>
              <p>Every transaction and product is publicly verifiable on the blockchain</p>
            </div>
            <div className="value-card">
              <Users size={48} />
              <h3>Community</h3>
              <p>Building a global community of creators, collectors, and innovators</p>
            </div>
            <div className="value-card">
              <Award size={48} />
              <h3>Quality</h3>
              <p>Curating only the highest quality digital and physical products</p>
            </div>
          </div>
        </div>
      </section>

      <section className="team">
        <div className="container">
          <h2>Our Team</h2>
          <p>
            Founded by blockchain enthusiasts and e-commerce veterans, Blocmerce combines 
            years of industry experience with cutting-edge technology to create the marketplace 
            of the future.
          </p>
          <div className="team-stats">
            <div className="stat">
              <span className="number">50+</span>
              <span className="label">Team Members</span>
            </div>
            <div className="stat">
              <span className="number">5+</span>
              <span className="label">Years Experience</span>
            </div>
            <div className="stat">
              <span className="number">15K+</span>
              <span className="label">Happy Customers</span>
            </div>
          </div>
        </div>
      </section>

      <section className="cta-section">
        <div className="container">
          {isAuthenticated ? (
            <>
              <h2>Welcome back, {user?.firstName || 'valued member'}!</h2>
              <p>Continue exploring our marketplace and discover amazing NFTs and products</p>
              <div className="cta-buttons">
                <Link to="/catalog" className="btn-primary">
                  Explore NFTs <ArrowRight size={20} />
                </Link>
                <Link to="/dashboard" className="btn-secondary">
                  <User size={20} />
                  My Dashboard
                </Link>
                {(user?.userType === 'seller' || user?.role === 'admin') && (
                  <Link to="/create-nft" className="btn-secondary">
                    <ShoppingBag size={20} />
                    Create NFT
                  </Link>
                )}
              </div>
            </>
          ) : (
            <>
              <h2>Join the Revolution</h2>
              <p>Be part of the future of commerce with Blocmerce</p>
              <div className="cta-buttons">
                <Link to="/catalog" className="btn-primary">
                  Start Shopping <ArrowRight size={20} />
                </Link>
                <Link to="/register" className="btn-secondary">
                  Create Account
                </Link>
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
};

export default About; 