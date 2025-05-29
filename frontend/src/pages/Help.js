import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Search, MessageCircle, Mail, Phone } from 'lucide-react';
import '../styles/Help.css';

const Help = () => {
  const [openFaq, setOpenFaq] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const faqData = [
    {
      id: 1,
      category: 'Getting Started',
      question: 'How do I create an account on Blocmerce?',
      answer: 'To create an account, click the "Sign Up" button in the header, fill in your details, and connect your crypto wallet (MetaMask recommended). You\'ll receive a verification email to complete the process.'
    },
    {
      id: 2,
      category: 'Blockchain & NFTs',
      question: 'What is an NFT and how does blockchain verification work?',
      answer: 'NFTs (Non-Fungible Tokens) are unique digital assets stored on the blockchain. Our platform verifies each product\'s authenticity through smart contracts, ensuring ownership and preventing fraud.'
    },
    {
      id: 3,
      category: 'Transactions',
      question: 'What payment methods do you accept?',
      answer: 'We accept both traditional payments (credit cards, PayPal) and cryptocurrency (ETH, MATIC). All transactions are secured through blockchain technology.'
    },
    {
      id: 4,
      category: 'Creating NFTs',
      question: 'How do I create and sell my own NFT?',
      answer: 'Go to the "Create NFT" page, upload your digital artwork, add metadata, set your price, and mint it on the blockchain. You\'ll pay a small gas fee for the minting process.'
    },
    {
      id: 5,
      category: 'Wallet Connection',
      question: 'How do I connect my wallet to Blocmerce?',
      answer: 'Click on the wallet icon in the header and select your preferred wallet (MetaMask, WalletConnect, etc.). Follow the prompts to connect securely.'
    },
    {
      id: 6,
      category: 'Security',
      question: 'How secure are my transactions and data?',
      answer: 'All transactions are secured by blockchain technology. We use encryption for personal data and never store your private keys. Your wallet remains in your full control.'
    },
    {
      id: 7,
      category: 'Fees',
      question: 'What fees are involved in buying and selling?',
      answer: 'We charge a 2.5% platform fee on sales. Additionally, blockchain transactions require gas fees which vary based on network congestion.'
    },
    {
      id: 8,
      category: 'Support',
      question: 'How can I get help if I have issues?',
      answer: 'You can contact our support team through Discord, email, or the contact form below. We typically respond within 24 hours.'
    }
  ];

  const toggleFaq = (id) => {
    setOpenFaq(openFaq === id ? null : id);
  };

  const filteredFaqs = faqData.filter(
    faq => 
      faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      faq.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const categories = [...new Set(faqData.map(faq => faq.category))];

  return (
    <div className="help-page">
      <div className="help-container">
        <div className="help-header">
          <h1>Help Center</h1>
          <p>Find answers to common questions about Blocmerce</p>
          
          <div className="search-section">
            <div className="search-box">
              <Search size={20} />
              <input
                type="text"
                placeholder="Search for help..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="help-content">
          <div className="categories-sidebar">
            <h3>Categories</h3>
            <ul>
              <li className="category-item all">
                <button onClick={() => setSearchTerm('')}>
                  All Topics ({faqData.length})
                </button>
              </li>
              {categories.map(category => (
                <li key={category} className="category-item">
                  <button onClick={() => setSearchTerm(category)}>
                    {category} ({faqData.filter(faq => faq.category === category).length})
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="faq-section">
            <h2>Frequently Asked Questions</h2>
            {filteredFaqs.length > 0 ? (
              <div className="faq-list">
                {filteredFaqs.map(faq => (
                  <div key={faq.id} className="faq-item">
                    <button 
                      className="faq-question"
                      onClick={() => toggleFaq(faq.id)}
                    >
                      <span className="category-tag">{faq.category}</span>
                      <span className="question-text">{faq.question}</span>
                      {openFaq === faq.id ? 
                        <ChevronUp size={20} /> : 
                        <ChevronDown size={20} />
                      }
                    </button>
                    {openFaq === faq.id && (
                      <div className="faq-answer">
                        <p>{faq.answer}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="no-results">
                <p>No results found for "{searchTerm}"</p>
                <button onClick={() => setSearchTerm('')}>Clear search</button>
              </div>
            )}
          </div>
        </div>

        <div className="contact-support">
          <h2>Still need help?</h2>
          <p>Can't find what you're looking for? Get in touch with our support team.</p>
          
          <div className="contact-options">
            <div className="contact-card">
              <MessageCircle size={32} />
              <h3>Discord Community</h3>
              <p>Join our Discord for real-time help and community discussions</p>
              <a href="https://discord.gg/blocmerce" target="_blank" rel="noopener noreferrer" className="contact-btn">
                Join Discord
              </a>
            </div>
            
            <div className="contact-card">
              <Mail size={32} />
              <h3>Email Support</h3>
              <p>Send us an email and we'll get back to you within 24 hours</p>
              <a href="mailto:support@blocmerce.com" className="contact-btn">
                Send Email
              </a>
            </div>
            
            <div className="contact-card">
              <Phone size={32} />
              <h3>Live Chat</h3>
              <p>Chat with our support team in real-time</p>
              <button className="contact-btn" onClick={() => alert('Live chat coming soon!')}>
                Start Chat
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Help; 