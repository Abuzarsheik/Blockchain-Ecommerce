const nodemailer = require('nodemailer');
const crypto = require('crypto');

class EmailService {
    constructor() {
        this.transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'localhost',
            port: process.env.SMTP_PORT || 587,
            secure: process.env.SMTP_SECURE === 'true',
            auth: {
                user: process.env.SMTP_USER || 'noreply@yourapp.com',
                pass: process.env.SMTP_PASS || 'password'
            }
        });
    }

    async sendPasswordResetEmail(user, resetToken) {
        const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
        
        const mailOptions = {
            from: process.env.FROM_EMAIL || 'noreply@yourapp.com',
            to: user.email,
            subject: 'Password Reset Request',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2>Password Reset Request</h2>
                    <p>Hello ${user.firstName},</p>
                    <p>You have requested to reset your password. Click the button below to reset your password:</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${resetUrl}" 
                           style="background-color: #007bff; color: white; padding: 12px 30px; 
                                  text-decoration: none; border-radius: 5px; display: inline-block;">
                            Reset Password
                        </a>
                    </div>
                    <p>This link will expire in 1 hour.</p>
                    <p>If you didn't request this password reset, please ignore this email.</p>
                    <hr>
                    <p style="font-size: 12px; color: #666;">
                        If the button doesn't work, copy and paste this link into your browser:<br>
                        ${resetUrl}
                    </p>
                </div>
            `
        };

        try {
            await this.transporter.sendMail(mailOptions);
            console.log(`Password reset email sent to ${user.email}`);
            return true;
        } catch (error) {
            console.error('Error sending password reset email:', error);
            return false;
        }
    }

    async sendEmailVerification(user, verificationToken) {
        const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?token=${verificationToken}`;
        
        const mailOptions = {
            from: process.env.FROM_EMAIL || 'noreply@yourapp.com',
            to: user.email,
            subject: 'Verify Your Email Address',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2>Verify Your Email Address</h2>
                    <p>Hello ${user.firstName},</p>
                    <p>Thank you for registering! Please verify your email address by clicking the button below:</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${verificationUrl}" 
                           style="background-color: #28a745; color: white; padding: 12px 30px; 
                                  text-decoration: none; border-radius: 5px; display: inline-block;">
                            Verify Email
                        </a>
                    </div>
                    <p>This link will expire in 24 hours.</p>
                    <hr>
                    <p style="font-size: 12px; color: #666;">
                        If the button doesn't work, copy and paste this link into your browser:<br>
                        ${verificationUrl}
                    </p>
                </div>
            `
        };

        try {
            await this.transporter.sendMail(mailOptions);
            console.log(`Email verification sent to ${user.email}`);
            return true;
        } catch (error) {
            console.error('Error sending email verification:', error);
            return false;
        }
    }

    async sendLoginNotification(user, ipAddress, userAgent, location) {
        const mailOptions = {
            from: process.env.FROM_EMAIL || 'noreply@yourapp.com',
            to: user.email,
            subject: 'New Login to Your Account',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2>New Login Detected</h2>
                    <p>Hello ${user.firstName},</p>
                    <p>We detected a new login to your account:</p>
                    <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
                        <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
                        <p><strong>IP Address:</strong> ${ipAddress}</p>
                        <p><strong>Device/Browser:</strong> ${userAgent}</p>
                        ${location ? `<p><strong>Location:</strong> ${location}</p>` : ''}
                    </div>
                    <p>If this was you, you can ignore this email. If you don't recognize this login, please:</p>
                    <ul>
                        <li>Change your password immediately</li>
                        <li>Enable two-factor authentication</li>
                        <li>Review your account activity</li>
                    </ul>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/security" 
                           style="background-color: #dc3545; color: white; padding: 12px 30px; 
                                  text-decoration: none; border-radius: 5px; display: inline-block;">
                            Secure My Account
                        </a>
                    </div>
                </div>
            `
        };

        try {
            await this.transporter.sendMail(mailOptions);
            console.log(`Login notification sent to ${user.email}`);
            return true;
        } catch (error) {
            console.error('Error sending login notification:', error);
            return false;
        }
    }

    async send2FASetupEmail(user, qrCodeDataUrl) {
        const mailOptions = {
            from: process.env.FROM_EMAIL || 'noreply@yourapp.com',
            to: user.email,
            subject: 'Two-Factor Authentication Setup',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2>Two-Factor Authentication Setup</h2>
                    <p>Hello ${user.firstName},</p>
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
            `
        };

        try {
            await this.transporter.sendMail(mailOptions);
            console.log(`2FA setup email sent to ${user.email}`);
            return true;
        } catch (error) {
            console.error('Error sending 2FA setup email:', error);
            return false;
        }
    }

    // KYC Notification Emails
    async sendKycStatusUpdate(user, status, notes = null) {
        let subject, title, message, color, actionButton;

        switch (status) {
            case 'approved':
                subject = 'KYC Verification Approved';
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
                subject = 'KYC Verification Requires Attention';
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
            case 'in_review':
                subject = 'KYC Application Received';
                title = 'KYC Application Under Review';
                message = 'Thank you for submitting your identity verification. Our team is currently reviewing your application. We\'ll notify you once the review is complete.';
                color = '#007bff';
                actionButton = `
                    <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/profile/kyc" 
                       style="background-color: ${color}; color: white; padding: 12px 30px; 
                              text-decoration: none; border-radius: 5px; display: inline-block;">
                        Check Status
                    </a>
                `;
                break;
            default:
                return false;
        }

        const mailOptions = {
            from: process.env.FROM_EMAIL || 'noreply@yourapp.com',
            to: user.email,
            subject: subject,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background: linear-gradient(135deg, ${color}, ${color}CC); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                        <h1 style="color: white; margin: 0; font-size: 24px;">${title}</h1>
                    </div>
                    <div style="background-color: #ffffff; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                        <p style="font-size: 16px; color: #333;">Hello ${user.firstName},</p>
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

                        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 30px 0;">
                            <h4 style="margin: 0 0 15px 0; color: #333;">What's Next?</h4>
                            ${status === 'approved' ? `
                                <ul style="color: #666; line-height: 1.6;">
                                    <li>Enjoy higher transaction limits</li>
                                    <li>Access to premium features</li>
                                    <li>Enhanced account security</li>
                                    <li>Priority customer support</li>
                                </ul>
                            ` : status === 'rejected' ? `
                                <ul style="color: #666; line-height: 1.6;">
                                    <li>Review the feedback provided</li>
                                    <li>Update your documents if needed</li>
                                    <li>Resubmit your application</li>
                                    <li>Contact support if you need help</li>
                                </ul>
                            ` : `
                                <ul style="color: #666; line-height: 1.6;">
                                    <li>Review typically takes 1-3 business days</li>
                                    <li>We may contact you for additional information</li>
                                    <li>You'll receive an email once review is complete</li>
                                </ul>
                            `}
                        </div>

                        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
                        <p style="font-size: 14px; color: #888; text-align: center;">
                            If you have any questions, please contact our support team.
                        </p>
                    </div>
                </div>
            `
        };

        try {
            await this.transporter.sendMail(mailOptions);
            console.log(`KYC status update email sent to ${user.email}`);
            return true;
        } catch (error) {
            console.error('Error sending KYC status update email:', error);
            return false;
        }
    }

    async sendKycReminderEmail(user) {
        const mailOptions = {
            from: process.env.FROM_EMAIL || 'noreply@yourapp.com',
            to: user.email,
            subject: 'Complete Your Identity Verification',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background: linear-gradient(135deg, #667eea, #764ba2); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                        <h1 style="color: white; margin: 0; font-size: 24px;">Complete Your Verification</h1>
                    </div>
                    <div style="background-color: #ffffff; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                        <p style="font-size: 16px; color: #333;">Hello ${user.firstName},</p>
                        <p style="font-size: 16px; color: #555; line-height: 1.6;">
                            We noticed you haven't completed your identity verification yet. Completing KYC verification unlocks:
                        </p>
                        
                        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
                            <ul style="color: #555; line-height: 1.8; margin: 0; padding-left: 20px;">
                                <li>Higher transaction limits</li>
                                <li>Access to all platform features</li>
                                <li>Enhanced account security</li>
                                <li>Priority customer support</li>
                                <li>Compliance with regulatory requirements</li>
                            </ul>
                        </div>

                        <div style="text-align: center; margin: 30px 0;">
                            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/profile/kyc" 
                               style="background-color: #667eea; color: white; padding: 12px 30px; 
                                      text-decoration: none; border-radius: 5px; display: inline-block;">
                                Start Verification
                            </a>
                        </div>

                        <div style="background-color: #e3f2fd; border-left: 4px solid #2196f3; padding: 15px; margin: 20px 0;">
                            <h4 style="margin: 0 0 10px 0; color: #1976d2;">Quick & Secure Process</h4>
                            <p style="margin: 0; color: #555;">The verification process is simple and takes only a few minutes. Your information is encrypted and secure.</p>
                        </div>

                        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
                        <p style="font-size: 14px; color: #888; text-align: center;">
                            This is a one-time verification to ensure the security of your account.
                        </p>
                    </div>
                </div>
            `
        };

        try {
            await this.transporter.sendMail(mailOptions);
            console.log(`KYC reminder email sent to ${user.email}`);
            return true;
        } catch (error) {
            console.error('Error sending KYC reminder email:', error);
            return false;
        }
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
}

module.exports = new EmailService(); 