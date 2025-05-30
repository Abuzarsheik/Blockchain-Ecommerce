import React from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Twitter, Github, MessageCircle, Mail } from 'lucide-react';
import '../styles/Footer.css';

const Footer = () => {
  const { user, isAuthenticated } = useSelector(state => state.auth);

  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-brand">
          <h3>Blocmerce</h3>
          <p>The future of decentralized commerce on the blockchain</p>
          <div className="social-links">
            <a href="https://twitter.com" aria-label="Follow us on Twitter" target="_blank" rel="noopener noreferrer">
              <Twitter size={20} />
            </a>
            <a href="https://github.com" aria-label="View our GitHub" target="_blank" rel="noopener noreferrer">
              <Github size={20} />
            </a>
            <a href="https://discord.com" aria-label="Join our Discord" target="_blank" rel="noopener noreferrer">
              <MessageCircle size={20} />
            </a>
            <a href="mailto:contact@blocmerce.com" aria-label="Email us">
              <Mail size={20} />
            </a>
          </div>
        </div>
        
        <div className="footer-links">
          <div className="link-column">
            <h4>Marketplace</h4>
            <Link to="/catalog">Browse NFTs</Link>
            {(isAuthenticated && (user?.userType === 'seller' || user?.role === 'admin')) && (
              <Link to="/create-nft">Create NFT</Link>
            )}
            <Link to="/technology">Technology</Link>
            <Link to="/about">About Us</Link>
          </div>
          
          <div className="link-column">
            <h4>Account</h4>
            <Link to="/login">Login</Link>
            <Link to="/register">Sign Up</Link>
            <Link to="/profile">My Profile</Link>
            <Link to="/dashboard">Dashboard</Link>
          </div>
          
          <div className="link-column">
            <h4>Support</h4>
            <Link to="/help">Help Center</Link>
            <Link to="/contact">Contact Us</Link>
            <Link to="/privacy">Privacy Policy</Link>
            <Link to="/terms">Terms of Service</Link>
          </div>
        </div>
      </div>
      
      <div className="footer-bottom">
        <p>&copy; 2024 Blocmerce. All rights reserved.</p>
      </div>
    </footer>
  );
};

export default Footer; 