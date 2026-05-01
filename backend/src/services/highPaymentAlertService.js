const { pool } = require('../config/database');
const { sendEmail } = require('../config/email');

/**
 * High Payment Alert Email Template
 */
const highPaymentAlertTemplate = (adminName, transactionDetails) => {
  const {
    amount,
    adminEmail,
    adminName: performedBy,
    loanId,
    customerName,
    loanType,
    timestamp,
  } = transactionDetails;

  const formattedAmount = Number(amount).toLocaleString('en-IN', {
    style: 'currency',
    currency: 'INR',
  });

  const formattedTime = new Date(timestamp).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; background: #f9f9f9; }
        .header { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 20px; border-radius: 8px; text-align: center; }
        .alert-badge { display: inline-block; background: #f5576c; color: white; padding: 8px 16px; border-radius: 20px; font-weight: bold; margin: 10px 0; }
        .content { background: white; padding: 20px; margin-top: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .transaction-details { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 15px 0; border-radius: 4px; }
        .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e0e0e0; }
        .detail-row:last-child { border-bottom: none; }
        .detail-label { font-weight: bold; color: #666; }
        .detail-value { color: #333; text-align: right; }
        .amount-highlight { font-size: 28px; color: #f5576c; font-weight: bold; }
        .admin-info { background: #e3f2fd; border-left: 4px solid #2196f3; padding: 15px; margin: 15px 0; border-radius: 4px; }
        .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; text-align: center; }
        .warning-box { background: #ffebee; border-left: 4px solid #f5576c; padding: 15px; margin: 15px 0; border-radius: 4px; color: #c62828; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🚨 HIGH-VALUE REPAYMENT ALERT</h1>
          <p>Amount Exceeds ₹30,000 Threshold</p>
        </div>

        <div class="content">
          <p>Hello <strong>${adminName}</strong>,</p>

          <p>A high-value repayment transaction has been recorded in the system.</p>

          <div class="warning-box">
            <strong>⚠️ ALERT THRESHOLD EXCEEDED:</strong> This transaction amount is greater than ₹30,000 and requires your attention.
          </div>

          <div style="text-align: center; margin: 20px 0;">
            <div class="amount-highlight">${formattedAmount}</div>
            <p style="color: #666; margin: 10px 0;">Amount Repaid</p>
          </div>

          <h3>📋 Transaction Details</h3>
          <div class="transaction-details">
            <div class="detail-row">
              <span class="detail-label">Customer Name:</span>
              <span class="detail-value">${customerName}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Loan Type:</span>
              <span class="detail-value">${loanType}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Loan ID:</span>
              <span class="detail-value" style="font-family: monospace; font-size: 12px;">${loanId}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Amount:</span>
              <span class="detail-value" style="font-weight: bold; color: #f5576c;">${formattedAmount}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Timestamp:</span>
              <span class="detail-value">${formattedTime}</span>
            </div>
          </div>

          <h3>👤 Performed By</h3>
          <div class="admin-info">
            <div class="detail-row">
              <span class="detail-label">Admin Name:</span>
              <span class="detail-value">${performedBy}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Admin Email:</span>
              <span class="detail-value">${adminEmail}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Transaction Time:</span>
              <span class="detail-value">${formattedTime}</span>
            </div>
          </div>

          <h3>✅ Action Required</h3>
          <ul style="background: #f5f5f5; padding: 15px; border-radius: 8px; list-style: none;">
            <li>✓ Verify the transaction details</li>
            <li>✓ Confirm the customer identity</li>
            <li>✓ Verify payment method/receipt</li>
            <li>✓ Update loan records if needed</li>
          </ul>

          <p style="background: #f0f4ff; padding: 15px; border-radius: 8px; margin-top: 15px;">
            <strong>Note:</strong> All high-value transactions are logged for audit and compliance purposes. This alert is automatically generated when a repayment exceeds ₹30,000.
          </p>

          <div class="footer">
            <p>This is an automated alert. Please verify and take appropriate action.</p>
            <p>Report generated on: <strong>${new Date().toISOString()}</strong></p>
            <p>System: Sri Vinayaka Tenders v2.0</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
};

/**
 * Send high payment alert to all admin email IDs
 */
const sendHighPaymentAlert = async (transactionDetails) => {
  try {
    if (Number(transactionDetails.amount) < 30000) {
      console.log('Transaction amount is below ₹30,000 threshold. No alert sent.');
      return;
    }

    console.log(`🚨 HIGH PAYMENT ALERT: ₹${transactionDetails.amount} - Sending to all admins...`);

    // Get all admin emails
    const adminsResult = await pool.query(
      'SELECT DISTINCT u.id, u.email, p.display_name FROM users u LEFT JOIN profiles p ON u.id::text = p.id::text WHERE u.role = $1 ORDER BY u.created_at',
      ['admin']
    );

    if (adminsResult.rows.length === 0) {
      console.warn('⚠️ No admin emails found. Alert not sent.');
      return;
    }

    // Send emails to all admins
    const emailPromises = adminsResult.rows.map(admin => {
      const html = highPaymentAlertTemplate(
        admin.display_name || admin.email.split('@')[0],
        transactionDetails
      );

      return sendEmail(
        admin.email,
        `🚨 HIGH-VALUE REPAYMENT ALERT: ₹${Number(transactionDetails.amount).toLocaleString('en-IN')} - ${transactionDetails.customerName}`,
        html
      ).catch(err => {
        console.error(`Failed to send alert to ${admin.email}:`, err.message);
        return { success: false };
      });
    });

    const results = await Promise.all(emailPromises);
    const successCount = results.filter(r => r.success).length;

    console.log(`✅ High payment alert sent to ${successCount}/${adminsResult.rows.length} admins`);

    // Log the alert
    try {
      await pool.query(
        `INSERT INTO high_payment_alert_log 
         (loan_id, amount, admin_email, performed_by, timestamp, recipients)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          transactionDetails.loanId,
          transactionDetails.amount,
          transactionDetails.adminEmail,
          transactionDetails.performedBy,
          transactionDetails.timestamp,
          adminsResult.rows.map(r => r.email),
        ]
      );
    } catch (logErr) {
      console.warn('Warning: Could not log high payment alert to database:', logErr.message);
    }

    return { success: true, alertsSent: successCount };
  } catch (err) {
    console.error('❌ High payment alert error:', err);
    throw err;
  }
};

module.exports = {
  sendHighPaymentAlert,
  highPaymentAlertTemplate,
};
