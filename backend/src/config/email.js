const nodemailer = require('nodemailer');

// Create reusable transporter
const createTransporter = () => {
  if (process.env.EMAIL_ENABLED !== 'true') {
    console.log('📧 Email is disabled. Set EMAIL_ENABLED=true to enable.');
    return null;
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: process.env.SMTP_AUTH_REQUIRED === 'true' ? {
      user: process.env.SMTP_USERNAME,
      pass: process.env.SMTP_PASSWORD,
    } : undefined,
  });
};

let transporter = null;

const getTransporter = () => {
  if (!transporter) {
    transporter = createTransporter();
  }
  return transporter;
};

const sendEmail = async (to, subject, html) => {
  const transport = getTransporter();
  if (!transport) {
    console.log(`📧 [Email Disabled] To: ${to} | Subject: ${subject}`);
    return { success: false, reason: 'Email disabled' };
  }

  const maxRetries = parseInt(process.env.EMAIL_MAX_RETRIES || '3');
  const retryDelay = parseInt(process.env.EMAIL_RETRY_DELAY_SECONDS || '5') * 1000;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const info = await transport.sendMail({
        from: `"${process.env.EMAIL_FROM_NAME || 'Sri Vinayaka Tenders'}" <${process.env.EMAIL_FROM || process.env.SMTP_USERNAME}>`,
        replyTo: process.env.EMAIL_REPLY_TO || process.env.SMTP_USERNAME,
        to,
        subject,
        html,
      });
      console.log(`✅ Email sent to ${to} (attempt ${attempt}): ${info.messageId}`);
      return { success: true, messageId: info.messageId };
    } catch (err) {
      console.error(`❌ Email attempt ${attempt}/${maxRetries} failed:`, err.message);
      if (attempt < maxRetries) {
        await new Promise(r => setTimeout(r, retryDelay));
      }
    }
  }
  return { success: false, reason: 'Max retries exceeded' };
};

module.exports = { sendEmail, getTransporter };
