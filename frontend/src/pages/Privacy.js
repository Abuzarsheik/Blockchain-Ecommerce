import React from 'react';
import { Shield, Eye, Lock, Database } from 'lucide-react';
import '../styles/Privacy.css';

const Privacy = () => {
  return (
    <div className="privacy-page">
      <div className="privacy-container">
        <div className="privacy-header">
          <Shield size={48} />
          <h1>Privacy Policy</h1>
          <p>Last updated: January 1, 2024</p>
        </div>

        <div className="privacy-content">
          <section className="privacy-section">
            <h2>Information We Collect</h2>
            <div className="info-card">
              <Eye size={24} />
              <div>
                <h3>Personal Information</h3>
                <p>We collect information you provide directly to us, such as when you create an account, make a purchase, or contact us for support.</p>
                <ul>
                  <li>Name and contact information</li>
                  <li>Wallet addresses and transaction data</li>
                  <li>Profile information and preferences</li>
                  <li>Payment information (processed securely)</li>
                </ul>
              </div>
            </div>
          </section>

          <section className="privacy-section">
            <h2>How We Use Your Information</h2>
            <div className="info-card">
              <Database size={24} />
              <div>
                <h3>Usage Purposes</h3>
                <p>We use the information we collect to provide, maintain, and improve our services:</p>
                <ul>
                  <li>Process transactions and maintain your account</li>
                  <li>Verify blockchain transactions and NFT authenticity</li>
                  <li>Provide customer support and respond to inquiries</li>
                  <li>Send important updates about our services</li>
                  <li>Improve our platform and develop new features</li>
                </ul>
              </div>
            </div>
          </section>

          <section className="privacy-section">
            <h2>Data Protection & Security</h2>
            <div className="info-card">
              <Lock size={24} />
              <div>
                <h3>Security Measures</h3>
                <p>We implement industry-standard security measures to protect your personal information:</p>
                <ul>
                  <li>End-to-end encryption for sensitive data</li>
                  <li>Secure blockchain technology for transaction data</li>
                  <li>Regular security audits and monitoring</li>
                  <li>Restricted access to personal information</li>
                  <li>Secure data storage and transmission protocols</li>
                </ul>
              </div>
            </div>
          </section>

          <section className="privacy-section">
            <h2>Information Sharing</h2>
            <p>We do not sell, trade, or otherwise transfer your personal information to third parties except in the following circumstances:</p>
            <ul>
              <li><strong>Service Providers:</strong> We may share information with trusted third-party service providers who assist us in operating our platform</li>
              <li><strong>Legal Requirements:</strong> We may disclose information when required by law or to protect our rights and safety</li>
              <li><strong>Blockchain Records:</strong> Transaction data is recorded on public blockchains as part of the technology's nature</li>
              <li><strong>Business Transfers:</strong> Information may be transferred in connection with a merger, acquisition, or sale of assets</li>
            </ul>
          </section>

          <section className="privacy-section">
            <h2>Your Rights</h2>
            <p>You have certain rights regarding your personal information:</p>
            <ul>
              <li><strong>Access:</strong> Request access to the personal information we hold about you</li>
              <li><strong>Correction:</strong> Request correction of inaccurate or incomplete information</li>
              <li><strong>Deletion:</strong> Request deletion of your personal information (subject to legal obligations)</li>
              <li><strong>Portability:</strong> Request a copy of your data in a structured, machine-readable format</li>
              <li><strong>Objection:</strong> Object to certain processing of your personal information</li>
            </ul>
          </section>

          <section className="privacy-section">
            <h2>Cookies and Tracking</h2>
            <p>We use cookies and similar technologies to enhance your experience on our platform. You can control cookie settings through your browser preferences.</p>
          </section>

          <section className="privacy-section">
            <h2>Data Retention</h2>
            <p>We retain your personal information for as long as necessary to provide our services and comply with legal obligations. Blockchain transaction data is permanently recorded and cannot be deleted.</p>
          </section>

          <section className="privacy-section">
            <h2>Children's Privacy</h2>
            <p>Our services are not intended for individuals under the age of 18. We do not knowingly collect personal information from children under 18.</p>
          </section>

          <section className="privacy-section">
            <h2>Changes to This Policy</h2>
            <p>We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the new policy on our platform and updating the "Last updated" date.</p>
          </section>

          <section className="privacy-section">
            <h2>Contact Us</h2>
            <p>If you have any questions about this Privacy Policy or our data practices, please contact us:</p>
            <div className="contact-info">
              <p><strong>Email:</strong> privacy@blocmerce.com</p>
              <p><strong>Address:</strong> 123 Blockchain Avenue, Crypto City, BC 12345</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Privacy; 