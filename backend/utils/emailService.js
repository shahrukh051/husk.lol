'use strict';

const nodemailer = require('nodemailer');
const logger = require('../config/logger');

// ─── Transporter ─────────────────────────────────────────────────────────────
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT, 10) || 587,
  secure: process.env.SMTP_PORT === '465',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// ─── Base HTML template ───────────────────────────────────────────────────────
const baseTemplate = (content) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Velvet Husk</title>
  <style>
    body { margin: 0; padding: 0; background: #131313; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #e5e2e1; }
    .wrapper { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
    .logo { font-size: 24px; font-weight: 900; color: #ffd9df; letter-spacing: -0.05em; margin-bottom: 32px; }
    .card { background: #1c1b1b; border: 1px solid rgba(82,67,69,0.3); border-radius: 16px; padding: 40px; }
    h1 { font-size: 28px; font-weight: 800; color: #ffd9df; margin: 0 0 12px; letter-spacing: -0.03em; }
    p { color: #d6c2c4; line-height: 1.7; margin: 0 0 20px; font-size: 15px; }
    .btn { display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #ffd9df, #ffb1c1); color: #521f2d; font-weight: 700; text-decoration: none; border-radius: 9999px; font-size: 14px; letter-spacing: 0.02em; }
    .divider { border: none; border-top: 1px solid rgba(82,67,69,0.3); margin: 28px 0; }
    .footer { text-align: center; margin-top: 32px; font-size: 11px; color: #9f8c8f; letter-spacing: 0.1em; text-transform: uppercase; }
    .tag { display: inline-block; background: rgba(255,217,223,0.1); color: #ffd9df; padding: 4px 12px; border-radius: 9999px; font-size: 11px; font-weight: 700; letter-spacing: 0.15em; text-transform: uppercase; margin-bottom: 20px; }
    .order-item { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid rgba(82,67,69,0.2); font-size: 14px; }
    .stat-row { display: flex; justify-content: space-between; font-size: 14px; margin: 8px 0; color: #d6c2c4; }
    .stat-row strong { color: #ffd9df; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="logo">Velvet Husk</div>
    <div class="card">
      ${content}
    </div>
    <div class="footer">
      <p style="margin: 8px 0;">© ${new Date().getFullYear()} Velvet Husk Lab · <a href="${process.env.CLIENT_URL}/unsubscribe" style="color: #9f8c8f;">Unsubscribe</a></p>
    </div>
  </div>
</body>
</html>
`;

// ─── Core send function ───────────────────────────────────────────────────────
const sendEmail = async ({ to, subject, html }) => {
  const mailOptions = {
    from: process.env.EMAIL_FROM || 'Velvet Husk <noreply@velvethusk.com>',
    to,
    subject,
    html,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    logger.info(`Email sent to ${to}: ${info.messageId}`);
    return info;
  } catch (err) {
    logger.error(`Email send failed to ${to}:`, err);
    throw err;
  }
};

// ─── Email Methods ────────────────────────────────────────────────────────────

/**
 * Send email verification link
 */
exports.sendEmailVerification = async (user, verifyUrl) => {
  const html = baseTemplate(`
    <div class="tag">Verify your account</div>
    <h1>Welcome to the Lab, ${user.firstName}.</h1>
    <p>You're one step away from joining the Alchemist Club. Verify your email to unlock your full ritual experience.</p>
    <a class="btn" href="${verifyUrl}">Verify Email Address</a>
    <hr class="divider" />
    <p style="font-size: 13px; color: #9f8c8f;">This link expires in 24 hours. If you didn't create an account, you can safely ignore this email.</p>
  `);

  return sendEmail({
    to: user.email,
    subject: 'Verify your Velvet Husk account',
    html,
  });
};

/**
 * Send password reset email
 */
exports.sendPasswordReset = async (user, resetUrl) => {
  const html = baseTemplate(`
    <div class="tag">Password Reset</div>
    <h1>Reset your password.</h1>
    <p>You requested a password reset for your Velvet Husk account. Click below to set a new password.</p>
    <a class="btn" href="${resetUrl}">Reset Password</a>
    <hr class="divider" />
    <p style="font-size: 13px; color: #9f8c8f;">This link expires in 10 minutes. If you didn't request a reset, please ignore this email. Your password won't change.</p>
  `);

  return sendEmail({
    to: user.email,
    subject: 'Reset your Velvet Husk password',
    html,
  });
};

/**
 * Send order confirmation
 */
exports.sendOrderConfirmation = async (order) => {
  const itemsHtml = order.items
    .map(
      (item) => `
      <div class="order-item">
        <span>${item.name} × ${item.quantity}</span>
        <span>$${(item.price * item.quantity).toFixed(2)}</span>
      </div>`
    )
    .join('');

  const html = baseTemplate(`
    <div class="tag">Order Confirmed</div>
    <h1>Your ritual is on its way.</h1>
    <p>Thank you for your order, ${order.user.firstName}. We're preparing your potion with care.</p>
    <p><strong style="color: #ffd9df;">Order #${order.orderNumber}</strong></p>
    ${itemsHtml}
    <hr class="divider" />
    <div class="stat-row"><span>Subtotal</span><strong>$${order.subtotal.toFixed(2)}</strong></div>
    <div class="stat-row"><span>Shipping</span><strong>${order.shippingCost === 0 ? 'FREE' : '$' + order.shippingCost.toFixed(2)}</strong></div>
    <div class="stat-row"><span>Tax</span><strong>$${order.taxAmount.toFixed(2)}</strong></div>
    <div class="stat-row" style="font-size: 16px; margin-top: 12px;"><span>Total</span><strong style="font-size: 18px;">$${order.total.toFixed(2)}</strong></div>
    <hr class="divider" />
    <a class="btn" href="${process.env.CLIENT_URL}/orders/${order._id}">Track Order</a>
  `);

  return sendEmail({
    to: order.user.email,
    subject: `Order confirmed — #${order.orderNumber}`,
    html,
  });
};

/**
 * Send shipping notification
 */
exports.sendShippingNotification = async (order) => {
  const html = baseTemplate(`
    <div class="tag">Shipped</div>
    <h1>Your ritual is en route.</h1>
    <p>Good news — your order <strong style="color: #ffd9df;">#${order.orderNumber}</strong> has been shipped and is on its way to you.</p>
    ${order.trackingNumber ? `<div class="stat-row"><span>Tracking Number</span><strong>${order.trackingNumber}</strong></div>` : ''}
    ${order.carrier ? `<div class="stat-row"><span>Carrier</span><strong>${order.carrier}</strong></div>` : ''}
    <hr class="divider" />
    <a class="btn" href="${process.env.CLIENT_URL}/orders/${order._id}">View Order</a>
  `);

  return sendEmail({
    to: order.user.email,
    subject: `Your order #${order.orderNumber} has shipped`,
    html,
  });
};

/**
 * Send partner application alert to admin
 */
exports.sendPartnerApplicationAlert = async (partner) => {
  const adminEmail = process.env.SMTP_USER;
  const html = baseTemplate(`
    <div class="tag">New Partner Application</div>
    <h1>New application received.</h1>
    <div class="stat-row"><span>Partner ID</span><strong>${partner._id}</strong></div>
    <div class="stat-row"><span>Business</span><strong>${partner.businessName || 'N/A'}</strong></div>
    <div class="stat-row"><span>Niche</span><strong>${partner.niche}</strong></div>
    <div class="stat-row"><span>Audience</span><strong>${partner.audienceSize?.toLocaleString() || '—'}</strong></div>
    <hr class="divider" />
    <a class="btn" href="${process.env.CLIENT_URL}/admin/partners/${partner._id}">Review Application</a>
  `);

  return sendEmail({
    to: adminEmail,
    subject: 'New Partner Application — Velvet Husk',
    html,
  });
};

/**
 * Send partner approval notification
 */
exports.sendPartnerApproval = async (partner) => {
  const html = baseTemplate(`
    <div class="tag">Welcome, Alchemist Partner</div>
    <h1>You're in.</h1>
    <p>Congratulations, ${partner.user.firstName}! Your partner application has been approved. Welcome to the Circle of Alchemy.</p>
    <div class="stat-row"><span>Your Referral Code</span><strong>${partner.referralCode}</strong></div>
    <div class="stat-row"><span>Commission Rate</span><strong>${(partner.commissionRate * 100).toFixed(0)}%</strong></div>
    <div class="stat-row"><span>Your Link</span><strong>${partner.referralLink}</strong></div>
    <hr class="divider" />
    <a class="btn" href="${process.env.CLIENT_URL}/partner">Access Partner Portal</a>
  `);

  return sendEmail({
    to: partner.user.email,
    subject: 'Welcome to the Alchemist Partner Circle',
    html,
  });
};
