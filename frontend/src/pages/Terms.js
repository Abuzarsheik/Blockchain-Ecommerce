import React from 'react';
import { FileText, AlertTriangle, Scale, Users } from 'lucide-react';
import '../styles/Terms.css';

const Terms = () => {
  return (
    <div className="terms-page">
      <div className="terms-container">
        <div className="terms-header">
          <FileText size={48} />
          <h1>Terms of Service</h1>
          <p>Last updated: January 1, 2024</p>
        </div>

        <div className="terms-content">
          <section className="terms-section">
            <h2>1. Acceptance of Terms</h2>
            <p>By accessing and using Blocmerce, you accept and agree to be bound by the terms and provision of this agreement. These Terms of Service ("Terms") govern your use of our platform and services.</p>
          </section>

          <section className="terms-section">
            <h2>2. Description of Service</h2>
            <div className="info-card">
              <Users size={24} />
              <div>
                <h3>Platform Services</h3>
                <p>Blocmerce provides a blockchain-based marketplace where users can:</p>
                <ul>
                  <li>Buy and sell NFTs and digital assets</li>
                  <li>Create and mint new NFTs</li>
                  <li>Verify authenticity through blockchain technology</li>
                  <li>Engage in secure cryptocurrency transactions</li>
                </ul>
              </div>
            </div>
          </section>

          <section className="terms-section">
            <h2>3. User Accounts</h2>
            <p>To access certain features of our service, you must register for an account. You agree to:</p>
            <ul>
              <li>Provide accurate, current, and complete information</li>
              <li>Maintain and update your account information</li>
              <li>Maintain the security of your account credentials</li>
              <li>Accept responsibility for all activities under your account</li>
              <li>Notify us immediately of any unauthorized use</li>
            </ul>
          </section>

          <section className="terms-section">
            <h2>4. Blockchain and Cryptocurrency</h2>
            <div className="warning-card">
              <AlertTriangle size={24} />
              <div>
                <h3>Important Notice</h3>
                <p>Blockchain transactions are irreversible. You acknowledge that:</p>
                <ul>
                  <li>All transactions are final and cannot be reversed</li>
                  <li>You are responsible for transaction fees and gas costs</li>
                  <li>Network congestion may cause delays</li>
                  <li>Cryptocurrency values are volatile</li>
                  <li>You understand the risks associated with digital assets</li>
                </ul>
              </div>
            </div>
          </section>

          <section className="terms-section">
            <h2>5. Prohibited Uses</h2>
            <p>You agree not to use our service to:</p>
            <ul>
              <li>Violate any applicable laws or regulations</li>
              <li>Infringe on intellectual property rights</li>
              <li>Engage in fraudulent or deceptive practices</li>
              <li>Upload malicious code or harmful content</li>
              <li>Manipulate or attempt to manipulate market prices</li>
              <li>Create fake or duplicate accounts</li>
              <li>Interfere with the operation of our platform</li>
            </ul>
          </section>

          <section className="terms-section">
            <h2>6. Intellectual Property</h2>
            <div className="info-card">
              <Scale size={24} />
              <div>
                <h3>Rights and Ownership</h3>
                <p>Users retain ownership of their original content and NFTs. By using our platform:</p>
                <ul>
                  <li>You grant us license to display your content on our platform</li>
                  <li>You represent that you own or have rights to the content</li>
                  <li>You will not infringe on others' intellectual property</li>
                  <li>Our platform technology and design remain our property</li>
                </ul>
              </div>
            </div>
          </section>

          <section className="terms-section">
            <h2>7. Fees and Payments</h2>
            <p>Our platform charges fees for certain services:</p>
            <ul>
              <li>Platform fee of 2.5% on all sales transactions</li>
              <li>Gas fees for blockchain transactions (paid to network)</li>
              <li>Additional fees may apply for premium features</li>
              <li>All fees are clearly disclosed before transactions</li>
            </ul>
          </section>

          <section className="terms-section">
            <h2>8. Disclaimers</h2>
            <p>Our service is provided "as is" without warranties of any kind. We disclaim all warranties, express or implied, including:</p>
            <ul>
              <li>Warranties of merchantability and fitness for purpose</li>
              <li>Warranties regarding security or uninterrupted service</li>
              <li>Warranties about the accuracy of information</li>
              <li>Warranties regarding third-party content or services</li>
            </ul>
          </section>

          <section className="terms-section">
            <h2>9. Limitation of Liability</h2>
            <p>To the maximum extent permitted by law, Blocmerce shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits or revenues.</p>
          </section>

          <section className="terms-section">
            <h2>10. Indemnification</h2>
            <p>You agree to indemnify and hold harmless Blocmerce and its affiliates from any claims, damages, or expenses arising from your use of our service or violation of these terms.</p>
          </section>

          <section className="terms-section">
            <h2>11. Termination</h2>
            <p>We may terminate or suspend your account and access to our service at our sole discretion, without prior notice, for conduct that we believe violates these Terms or is harmful to other users.</p>
          </section>

          <section className="terms-section">
            <h2>12. Governing Law</h2>
            <p>These Terms shall be governed by and construed in accordance with the laws of the jurisdiction in which Blocmerce operates, without regard to conflict of law provisions.</p>
          </section>

          <section className="terms-section">
            <h2>13. Changes to Terms</h2>
            <p>We reserve the right to modify these Terms at any time. We will notify users of any material changes. Your continued use of our service after such modifications constitutes acceptance of the updated Terms.</p>
          </section>

          <section className="terms-section">
            <h2>14. Contact Information</h2>
            <p>If you have any questions about these Terms of Service, please contact us:</p>
            <div className="contact-info">
              <p><strong>Email:</strong> legal@blocmerce.com</p>
              <p><strong>Address:</strong> 123 Blockchain Avenue, Crypto City, BC 12345</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Terms; 