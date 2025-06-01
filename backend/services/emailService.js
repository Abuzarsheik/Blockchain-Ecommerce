const nodemailer = require('nodemailer');
const crypto = require('crypto');

class EmailService {
    constructor() {
        this.transporter = null;
        this.emailEnabled = false;
        this.isInitialized = false;
    }

    async init() {
        try {
            // Check if email credentials are provided
            const hasEmailConfig = process.env.SMTP_USER && process.env.SMTP_PASS && 
                                   process.env.SMTP_USER !== 'noreply@yourapp.com' && 
                                   process.env.SMTP_PASS !== 'password';

            if (hasEmailConfig && process.env.EMAIL_SERVICE_ENABLED === 'true') {
                this.transporter = nodemailer.createTransport({
                    host: process.env.SMTP_HOST || 'smtp.gmail.com',
                    port: process.env.SMTP_PORT || 587,
                    secure: process.env.SMTP_SECURE === 'true',
                    auth: {
                        user: process.env.SMTP_USER,
                        pass: process.env.SMTP_PASS
                    },
                    tls: {
                        rejectUnauthorized: false
                    }
                });

                // Verify transporter
                await this.transporter.verify();
                this.emailEnabled = true;
                console.log('✅ Email service configured with real SMTP');
            } else {
                // Create a dummy transporter for development
                this.transporter = nodemailer.createTransport({
                    streamTransport: true,
                    newline: 'unix',
                    buffer: true
                });
                this.emailEnabled = false;
                console.log('⚠️ Email service running in development mode (no emails sent)');
            }

            this.isInitialized = true;
            return true;
        } catch (error) {
            console.error('❌ Email service initialization failed:', error);
            this.emailEnabled = false;
            this.isInitialized = false;
            return false;
        }
    }

    getEmailTemplate(type, data) {
        const baseTemplate = `
            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center;">
                    <img src="${process.env.FRONTEND_URL || 'http://localhost:3000'}/assets/logo-white.png" alt="Blocmerce" style="height: 50px; margin-bottom: 20px;">
                    <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 300;">{{title}}</h1>
                </div>
                <div style="padding: 40px 30px; background: #ffffff;">
                    {{content}}
                </div>
                <div style="background: #f8f9fa; padding: 30px; text-align: center; border-top: 1px solid #e9ecef;">
                    <p style="margin: 0; font-size: 14px; color: #6c757d;">
                        © ${new Date().getFullYear()} Blocmerce. All rights reserved.
                    </p>
                    <div style="margin-top: 20px;">
                        <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/support" style="color: #667eea; text-decoration: none; margin: 0 10px;">Support</a>
                        <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/privacy" style="color: #667eea; text-decoration: none; margin: 0 10px;">Privacy</a>
                        <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/terms" style="color: #667eea; text-decoration: none; margin: 0 10px;">Terms</a>
                    </div>
                </div>
            </div>
        `;

        const templates = {
            passwordReset: {
                title: 'Reset Your Password',
                content: `
                    <p style="font-size: 16px; color: #333; line-height: 1.6;">Hello <strong>${data.firstName}</strong>,</p>
                    <p style="font-size: 16px; color: #555; line-height: 1.6;">
                        You have requested to reset your password for your Blocmerce account. Click the button below to create a new password:
                    </p>
                    <div style="text-align: center; margin: 40px 0;">
                        <a href="${data.resetUrl}" 
                           style="background: linear-gradient(135deg, #667eea, #764ba2); color: white; padding: 16px 32px; 
                                  text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600;
                                  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);">
                            Reset Password
                        </a>
                    </div>
                    <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 20px; margin: 30px 0;">
                        <p style="margin: 0; color: #856404;"><strong>⚠️ Security Notice:</strong></p>
                        <p style="margin: 10px 0 0 0; color: #856404;">This link will expire in <strong>1 hour</strong> for your security.</p>
                    </div>
                    <p style="font-size: 14px; color: #666; line-height: 1.6;">
                        If you didn't request this password reset, please ignore this email and your password will remain unchanged.
                    </p>
                    <hr style="border: none; border-top: 1px solid #e9ecef; margin: 30px 0;">
                    <p style="font-size: 12px; color: #6c757d;">
                        If the button doesn't work, copy and paste this link into your browser:<br>
                        <a href="${data.resetUrl}" style="color: #667eea; word-break: break-all;">${data.resetUrl}</a>
                    </p>
                `
            },
            emailVerification: {
                title: 'Verify Your Email Address',
                content: `
                    <p style="font-size: 16px; color: #333; line-height: 1.6;">Hello <strong>${data.firstName}</strong>,</p>
                    <p style="font-size: 16px; color: #555; line-height: 1.6;">
                        Welcome to Blocmerce! 🎉 Please verify your email address to activate your account and start trading NFTs.
                    </p>
                    <div style="text-align: center; margin: 40px 0;">
                        <a href="${data.verificationUrl}" 
                           style="background: linear-gradient(135deg, #28a745, #20c997); color: white; padding: 16px 32px; 
                                  text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600;
                                  box-shadow: 0 4px 12px rgba(40, 167, 69, 0.4);">
                            Verify Email Address
                        </a>
                    </div>
                    <div style="background: #d1ecf1; border: 1px solid #bee5eb; border-radius: 8px; padding: 20px; margin: 30px 0;">
                        <p style="margin: 0; color: #0c5460;"><strong>📧 Verification Required:</strong></p>
                        <p style="margin: 10px 0 0 0; color: #0c5460;">This link will expire in <strong>24 hours</strong>.</p>
                    </div>
                    <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 30px 0;">
                        <h4 style="margin: 0 0 15px 0; color: #333;">🚀 What's Next?</h4>
                        <ul style="color: #555; line-height: 1.8; margin: 0; padding-left: 20px;">
                            <li>Complete your profile setup</li>
                            <li>Explore the NFT marketplace</li>
                            <li>Connect your crypto wallet</li>
                            <li>Start buying and selling NFTs</li>
                        </ul>
                    </div>
                    <hr style="border: none; border-top: 1px solid #e9ecef; margin: 30px 0;">
                    <p style="font-size: 12px; color: #6c757d;">
                        If the button doesn't work, copy and paste this link into your browser:<br>
                        <a href="${data.verificationUrl}" style="color: #667eea; word-break: break-all;">${data.verificationUrl}</a>
                    </p>
                `
            },
            welcome: {
                title: 'Welcome to Blocmerce! 🎉',
                content: `
                    <p style="font-size: 16px; color: #333; line-height: 1.6;">Hello <strong>${data.firstName}</strong>,</p>
                    <p style="font-size: 16px; color: #555; line-height: 1.6;">
                        Welcome to the future of digital commerce! Your Blocmerce account has been successfully created and verified.
                    </p>
                    <div style="background: linear-gradient(135deg, #667eea, #764ba2); color: white; padding: 30px; border-radius: 12px; margin: 30px 0; text-align: center;">
                        <h3 style="margin: 0 0 20px 0;">🌟 You're Ready to Start!</h3>
                        <p style="margin: 0; opacity: 0.9;">Join thousands of users trading premium NFTs on our secure platform</p>
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 30px 0;">
                        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center;">
                            <h4 style="margin: 0 0 10px 0; color: #333;">🛒 Start Shopping</h4>
                            <p style="margin: 0; color: #666; font-size: 14px;">Browse our curated NFT collections</p>
                        </div>
                        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center;">
                            <h4 style="margin: 0 0 10px 0; color: #333;">💼 Start Selling</h4>
                            <p style="margin: 0; color: #666; font-size: 14px;">Create and list your own NFTs</p>
                        </div>
                    </div>
                    <div style="text-align: center; margin: 40px 0;">
                        <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/marketplace" 
                           style="background: linear-gradient(135deg, #667eea, #764ba2); color: white; padding: 16px 32px; 
                                  text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600;
                                  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);">
                            Explore Marketplace
                        </a>
                    </div>
                `
            }
        };

        const template = templates[type];
        if (!template) return null;

        return baseTemplate
            .replace('{{title}}', template.title)
            .replace('{{content}}', template.content);
    }

    async sendEmail(to, subject, htmlContent, attachments = null) {
        if (!this.isInitialized) {
            await this.init();
        }

        if (!this.emailEnabled) {
            console.log(`📧 [DEV MODE] Email would be sent to ${to}`);
            console.log(`📧 [DEV MODE] Subject: ${subject}`);
            return { success: true, messageId: 'dev_mode_' + Date.now() };
        }

        const mailOptions = {
            from: {
                name: process.env.FROM_NAME || 'Blocmerce',
                address: process.env.FROM_EMAIL || 'noreply@blocmerce.com'
            },
            to: to,
            subject: subject,
            html: htmlContent,
            attachments: attachments
        };

        try {
            const result = await this.transporter.sendMail(mailOptions);
            console.log(`📧 Email sent to ${to}: ${subject}`);
            return { success: true, messageId: result.messageId };
        } catch (error) {
            console.error('📧 Error sending email:', error);
            return { success: false, error: error.message };
        }
    }

    async sendPasswordResetEmail(user, resetToken) {
        const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
        
        const htmlContent = this.getEmailTemplate('passwordReset', {
            firstName: user.firstName || user.name || 'User',
            resetUrl: resetUrl
        });

        return await this.sendEmail(
            user.email,
            'Reset Your Blocmerce Password',
            htmlContent
        );
    }

    async sendEmailVerification(user, verificationToken) {
        const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?token=${verificationToken}`;
        
        const htmlContent = this.getEmailTemplate('emailVerification', {
            firstName: user.firstName || user.name || 'User',
            verificationUrl: verificationUrl
        });

        return await this.sendEmail(
            user.email,
            'Verify Your Blocmerce Account',
            htmlContent
        );
    }

    async sendWelcomeEmail(user) {
        const htmlContent = this.getEmailTemplate('welcome', {
            firstName: user.firstName || user.name || 'User'
        });

        return await this.sendEmail(
            user.email,
            'Welcome to Blocmerce! 🎉',
            htmlContent
        );
    }

    async sendTransactionNotification(user, transaction) {
        const subject = `Transaction ${transaction.type} - ${transaction.amount} ${transaction.currency}`;
        const htmlContent = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2>Transaction Notification</h2>
                <p>Hello ${user.firstName || user.name},</p>
                <p>Your transaction has been processed:</p>
                <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <p><strong>Type:</strong> ${transaction.type}</p>
                    <p><strong>Amount:</strong> ${transaction.amount} ${transaction.currency}</p>
                    <p><strong>Status:</strong> ${transaction.status}</p>
                    <p><strong>Date:</strong> ${new Date(transaction.createdAt).toLocaleString()}</p>
                </div>
            </div>
        `;

        return await this.sendEmail(user.email, subject, htmlContent);
    }

    async sendOrderNotification(user, order, type) {
        const subjects = {
            created: 'Order Confirmation',
            shipped: 'Order Shipped',
            delivered: 'Order Delivered',
            cancelled: 'Order Cancelled'
        };

        const subject = `${subjects[type]} - Order #${order._id}`;
        const htmlContent = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2>${subjects[type]}</h2>
                <p>Hello ${user.firstName || user.name},</p>
                <p>Your order status has been updated:</p>
                <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <p><strong>Order ID:</strong> ${order._id}</p>
                    <p><strong>Status:</strong> ${order.status}</p>
                    <p><strong>Total:</strong> $${order.total}</p>
                </div>
            </div>
        `;

        return await this.sendEmail(user.email, subject, htmlContent);
    }

    async send2FASetupEmail(user, qrCodeDataUrl) {
        const htmlContent = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2>Two-Factor Authentication Setup</h2>
                <p>Hello ${user.firstName || user.name},</p>
                <p>You have enabled two-factor authentication for your account. Please scan the QR code below with your authenticator app:</p>
                <div style="text-align: center; margin: 30px 0;">
                    <img src="${qrCodeDataUrl}" alt="2FA QR Code" style="max-width: 300px;">
                </div>
                <p>Popular authenticator apps include:</p>
                <ul>
                    <li>Google Authenticator</li>
                    <li>Microsoft Authenticator</li>
                    <li>Authy</li>
                </ul>
                <p>After scanning, enter the 6-digit code from your app to complete the setup.</p>
            </div>
        `;

        return await this.sendEmail(
            user.email,
            'Two-Factor Authentication Setup',
            htmlContent
        );
    }

    // KYC Notification Emails
    async sendKycStatusUpdate(user, status, notes = null) {
        let subject, title, message, color, actionButton;

        switch (status) {
            case 'approved':
                subject = 'KYC Verification Approved ✅';
                title = 'KYC Verification Approved! 🎉';
                message = 'Congratulations! Your identity verification has been successfully completed. You now have full access to all platform features.';
                color = '#28a745';
                actionButton = `
                    <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/profile" 
                       style="background-color: ${color}; color: white; padding: 12px 30px; 
                              text-decoration: none; border-radius: 5px; display: inline-block;">
                        View Profile
                    </a>
                `;
                break;
            case 'rejected':
                subject = 'KYC Verification Requires Attention ⚠️';
                title = 'KYC Verification Update Required';
                message = 'Your identity verification requires additional information. Please review the feedback below and resubmit your application.';
                color = '#dc3545';
                actionButton = `
                    <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/profile/kyc" 
                       style="background-color: ${color}; color: white; padding: 12px 30px; 
                              text-decoration: none; border-radius: 5px; display: inline-block;">
                        Update KYC Application
                    </a>
                `;
                break;
            default:
                subject = 'KYC Verification Update';
                title = 'KYC Status Update';
                message = 'Your KYC verification status has been updated.';
                color = '#007bff';
                actionButton = '';
        }

        const htmlContent = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: linear-gradient(135deg, ${color}, ${color}CC); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                    <h1 style="color: white; margin: 0; font-size: 24px;">${title}</h1>
                </div>
                <div style="background-color: #ffffff; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                    <p style="font-size: 16px; color: #333;">Hello ${user.firstName || user.name},</p>
                    <p style="font-size: 16px; color: #555; line-height: 1.6;">${message}</p>
                    
                    ${notes ? `
                        <div style="background-color: #f8f9fa; border-left: 4px solid ${color}; padding: 15px; margin: 20px 0;">
                            <h4 style="margin: 0 0 10px 0; color: ${color};">Additional Information:</h4>
                            <p style="margin: 0; color: #666;">${notes}</p>
                        </div>
                    ` : ''}

                    <div style="text-align: center; margin: 30px 0;">
                        ${actionButton}
                    </div>
                </div>
            </div>
        `;

        return await this.sendEmail(user.email, subject, htmlContent);
    }

    generateSecureToken(length = 32) {
        return crypto.randomBytes(length).toString('hex');
    }

    generateBackupCodes(count = 10) {
        const codes = [];
        for (let i = 0; i < count; i++) {
            // Generate 8-character alphanumeric codes
            const code = crypto.randomBytes(4).toString('hex').toUpperCase();
            codes.push(code);
        }
        return codes;
    }

    // Test email connectivity
    async testConnection() {
        if (!this.isInitialized) {
            await this.init();
        }

        if (!this.emailEnabled) {
            return { success: true, message: 'Email service in development mode' };
        }

        try {
            await this.transporter.verify();
            return { success: true, message: 'Email service connection successful' };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
}

module.exports = new EmailService(); 