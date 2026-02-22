const APP_NAME = 'Sri Vinayaka Tenders';
const YEAR = new Date().getFullYear();

const baseLayout = (content, recipientEmail) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${APP_NAME}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f6f9;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f6f9;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #1a365d 0%, #2563eb 100%);padding:32px 40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:0.5px;">${APP_NAME}</h1>
              <p style="margin:6px 0 0;color:#93c5fd;font-size:13px;font-weight:500;">Finance Management System</p>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding:36px 40px;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color:#f8fafc;padding:24px 40px;border-top:1px solid #e2e8f0;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="text-align:center;">
                    <p style="margin:0 0 8px;color:#64748b;font-size:11px;">🔒 <strong>Confidential</strong></p>
                    <p style="margin:0 0 4px;color:#94a3b8;font-size:11px;">Need technical assistance? Contact us at <a href="mailto:${process.env.EMAIL_REPLY_TO || process.env.SMTP_USERNAME}" style="color:#2563eb;text-decoration:none;">${process.env.EMAIL_REPLY_TO || process.env.SMTP_USERNAME}</a></p>
                    <p style="margin:12px 0 4px;color:#94a3b8;font-size:11px;">© ${YEAR} ${APP_NAME}. All rights reserved.</p>
                    <p style="margin:0;color:#cbd5e1;font-size:10px;">This email was sent to: ${recipientEmail}</p>
                    <p style="margin:6px 0 0;color:#cbd5e1;font-size:10px;line-height:1.5;">Internal System - Confidential. This email and any attachments are for the exclusive and confidential use of the intended recipient. If you are not the intended recipient, please do not read, distribute, or take action based on this message.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

const passwordResetTemplate = (displayName, resetLink, email) => {
  const content = `
    <div style="text-align:center;margin-bottom:28px;">
      <div style="display:inline-block;background-color:#fef3c7;border-radius:50%;padding:16px;margin-bottom:16px;">
        <span style="font-size:32px;">🔐</span>
      </div>
      <h2 style="margin:0;color:#1e293b;font-size:20px;font-weight:700;">Password Reset Request</h2>
    </div>
    <p style="color:#475569;font-size:14px;line-height:1.7;margin:0 0 20px;">
      Hello <strong style="color:#1e293b;">${displayName || 'User'}</strong>,
    </p>
    <p style="color:#475569;font-size:14px;line-height:1.7;margin:0 0 24px;">
      We received a request to reset the password for your account. Click the button below to set a new password:
    </p>
    <div style="text-align:center;margin:28px 0;">
      <a href="${resetLink}" style="display:inline-block;background:linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);color:#ffffff;text-decoration:none;padding:14px 36px;border-radius:10px;font-size:15px;font-weight:600;letter-spacing:0.3px;box-shadow:0 4px 12px rgba(37,99,235,0.3);">
        🔓 Reset Password
      </a>
    </div>
    <div style="background-color:#fef9c3;border:1px solid #fde047;border-radius:10px;padding:16px 20px;margin:24px 0;">
      <p style="margin:0;color:#854d0e;font-size:13px;line-height:1.6;">
        ⚠️ <strong>Important:</strong><br>
        • This link expires in <strong>1 hour</strong>.<br>
        • If you did not request this reset, please ignore this email or contact your administrator immediately.
      </p>
    </div>
    <p style="color:#94a3b8;font-size:12px;margin-top:20px;">
      If the button doesn't work, copy this link:<br>
      <a href="${resetLink}" style="color:#2563eb;word-break:break-all;font-size:11px;">${resetLink}</a>
    </p>`;
  return baseLayout(content, email);
};

const adminPasswordResetTemplate = (displayName, email, tempPassword, loginUrl) => {
  const content = `
    <div style="text-align:center;margin-bottom:28px;">
      <div style="display:inline-block;background-color:#dbeafe;border-radius:50%;padding:16px;margin-bottom:16px;">
        <span style="font-size:32px;">🔐</span>
      </div>
      <h2 style="margin:0;color:#1e293b;font-size:20px;font-weight:700;">Your Password Has Been Reset</h2>
    </div>
    <p style="color:#475569;font-size:14px;line-height:1.7;margin:0 0 20px;">
      Hello <strong style="color:#1e293b;">${displayName || 'User'}</strong>,
    </p>
    <p style="color:#475569;font-size:14px;line-height:1.7;margin:0 0 24px;">
      An administrator has reset your password. Your new temporary credentials for the ${APP_NAME} are:
    </p>
    <div style="background-color:#f1f5f9;border-radius:12px;padding:20px 24px;margin:20px 0;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding:8px 0;">
            <span style="color:#64748b;font-size:13px;">📧 Email:</span><br>
            <strong style="color:#1e293b;font-size:15px;">${email}</strong>
          </td>
        </tr>
        <tr>
          <td style="padding:8px 0;border-top:1px solid #e2e8f0;">
            <span style="color:#64748b;font-size:13px;">🔑 Temporary Password:</span><br>
            <code style="color:#dc2626;font-size:16px;font-weight:700;background:#fef2f2;padding:4px 12px;border-radius:6px;letter-spacing:1px;">${tempPassword}</code>
          </td>
        </tr>
      </table>
    </div>
    <div style="text-align:center;margin:28px 0;">
      <a href="${loginUrl}" style="display:inline-block;background:linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);color:#ffffff;text-decoration:none;padding:14px 36px;border-radius:10px;font-size:15px;font-weight:600;letter-spacing:0.3px;box-shadow:0 4px 12px rgba(37,99,235,0.3);">
        🔓 Login Now
      </a>
    </div>
    <div style="background-color:#fef9c3;border:1px solid #fde047;border-radius:10px;padding:16px 20px;margin:24px 0;">
      <p style="margin:0;color:#854d0e;font-size:13px;line-height:1.6;">
        ⚠️ <strong>Important:</strong><br>
        • Please change your password after logging in for security purposes.<br>
        • Do not share this password with anyone.<br>
        • If you did not expect this reset, please contact your administrator immediately.
      </p>
    </div>`;
  return baseLayout(content, email);
};

const backupEmailTemplate = (displayName, fileName, stats) => {
  const content = `
    <div style="text-align:center;margin-bottom:28px;">
      <div style="display:inline-block;background-color:#dcfce7;border-radius:50%;padding:16px;margin-bottom:16px;">
        <span style="font-size:32px;">📦</span>
      </div>
      <h2 style="margin:0;color:#1e293b;font-size:20px;font-weight:700;">Data Backup Complete</h2>
    </div>
    <p style="color:#475569;font-size:14px;line-height:1.7;margin:0 0 20px;">
      Hello <strong style="color:#1e293b;">${displayName || 'Admin'}</strong>,
    </p>
    <p style="color:#475569;font-size:14px;line-height:1.7;margin:0 0 24px;">
      A data backup has been successfully created and is attached to this email.
    </p>
    <div style="background-color:#f1f5f9;border-radius:12px;padding:20px 24px;margin:20px 0;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding:6px 0;"><span style="color:#64748b;font-size:13px;">📄 File:</span> <strong style="color:#1e293b;">${fileName}</strong></td>
        </tr>
        <tr>
          <td style="padding:6px 0;border-top:1px solid #e2e8f0;"><span style="color:#64748b;font-size:13px;">📊 Loans:</span> <strong style="color:#1e293b;">${stats.loans || 0}</strong></td>
        </tr>
        <tr>
          <td style="padding:6px 0;border-top:1px solid #e2e8f0;"><span style="color:#64748b;font-size:13px;">💰 Investors:</span> <strong style="color:#1e293b;">${stats.investors || 0}</strong></td>
        </tr>
        <tr>
          <td style="padding:6px 0;border-top:1px solid #e2e8f0;"><span style="color:#64748b;font-size:13px;">🕐 Date:</span> <strong style="color:#1e293b;">${new Date().toLocaleString()}</strong></td>
        </tr>
      </table>
    </div>
    <div style="background-color:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:16px 20px;margin:24px 0;">
      <p style="margin:0;color:#1e40af;font-size:13px;line-height:1.6;">
        💡 <strong>Tip:</strong> Store this backup file in a safe location. You can use it to restore your data from Settings → Data Management → Restore from Backup.
      </p>
    </div>`;
  return baseLayout(content, process.env.SMTP_USERNAME);
};

const notificationEmailTemplate = (displayName, email, title, message) => {
  const content = `
    <div style="text-align:center;margin-bottom:28px;">
      <div style="display:inline-block;background-color:#fce7f3;border-radius:50%;padding:16px;margin-bottom:16px;">
        <span style="font-size:32px;">🔔</span>
      </div>
      <h2 style="margin:0;color:#1e293b;font-size:20px;font-weight:700;">${title}</h2>
    </div>
    <p style="color:#475569;font-size:14px;line-height:1.7;margin:0 0 20px;">
      Hello <strong style="color:#1e293b;">${displayName || 'User'}</strong>,
    </p>
    <div style="background-color:#f1f5f9;border-radius:12px;padding:20px 24px;margin:20px 0;">
      <p style="color:#334155;font-size:14px;line-height:1.7;margin:0;">${message}</p>
    </div>`;
  return baseLayout(content, email);
};

const highPaymentAlertTemplate = (adminName, paidByUser, amount, paymentDate, loanId, customerName, recipientEmail) => {
  const formattedAmount = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
  const formattedDate  = new Date(paymentDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
  const content = `
    <div style="text-align:center;margin-bottom:28px;">
      <div style="display:inline-block;background-color:#fef3c7;border-radius:50%;padding:16px;margin-bottom:16px;">
        <span style="font-size:36px;">🚨</span>
      </div>
      <h2 style="margin:0;color:#1e293b;font-size:22px;font-weight:700;">High-Value Payment Alert</h2>
      <p style="margin:6px 0 0;color:#dc2626;font-size:13px;font-weight:600;">⚠️ Immediate Action Required If Unauthorized</p>
    </div>
    <p style="color:#475569;font-size:14px;line-height:1.7;margin:0 0 20px;">
      Hello <strong style="color:#1e293b;">${adminName || 'Admin'}</strong>,<br>
      A high-value payment exceeding <strong style="color:#dc2626;">₹30,000</strong> has been recorded in the system.
    </p>
    <div style="background:linear-gradient(135deg,#fef9c3,#fef3c7);border:2px solid #f59e0b;border-radius:14px;padding:24px;margin:20px 0;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #fde68a;">
            <span style="color:#78350f;font-size:12px;text-transform:uppercase;font-weight:600;">💰 Amount Paid</span><br>
            <strong style="color:#b45309;font-size:26px;">${formattedAmount}</strong>
          </td>
        </tr>
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #fde68a;">
            <span style="color:#78350f;font-size:12px;text-transform:uppercase;font-weight:600;">👤 Paid By (User)</span><br>
            <strong style="color:#1e293b;font-size:15px;">${paidByUser.displayName || 'Unknown'}</strong>
            <span style="color:#64748b;font-size:13px;"> — ${paidByUser.email || ''}</span>
          </td>
        </tr>
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #fde68a;">
            <span style="color:#78350f;font-size:12px;text-transform:uppercase;font-weight:600;">🧾 Customer (Loan)</span><br>
            <strong style="color:#1e293b;font-size:15px;">${customerName || 'N/A'}</strong>
          </td>
        </tr>
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #fde68a;">
            <span style="color:#78350f;font-size:12px;text-transform:uppercase;font-weight:600;">📅 Payment Date</span><br>
            <strong style="color:#1e293b;font-size:15px;">${formattedDate}</strong>
          </td>
        </tr>
        <tr>
          <td style="padding:10px 0;">
            <span style="color:#78350f;font-size:12px;text-transform:uppercase;font-weight:600;">🆔 Loan Reference</span><br>
            <code style="color:#64748b;font-size:12px;">${loanId}</code>
          </td>
        </tr>
      </table>
    </div>
    <div style="background-color:#fef2f2;border:1px solid #fca5a5;border-radius:10px;padding:16px 20px;margin:24px 0;">
      <p style="margin:0;color:#991b1b;font-size:13px;line-height:1.7;">
        🔴 <strong>If this payment was NOT authorized:</strong><br>
        Please take <strong>immediate action</strong> — review the transaction in the system and contact the relevant personnel without delay.
        Unauthorized high-value transactions must be escalated immediately.
      </p>
    </div>
    <p style="color:#94a3b8;font-size:12px;margin-top:20px;text-align:center;">
      This is an automated security alert generated on <strong>${new Date().toLocaleString('en-IN')}</strong>.
    </p>`;
  return baseLayout(content, recipientEmail);
};

const welcomeUserTemplate = (displayName, email, password, loginUrl) => {
  const content = `
    <div style="text-align:center;margin-bottom:28px;">
      <div style="display:inline-block;background-color:#dcfce7;border-radius:50%;padding:16px;margin-bottom:16px;">
        <span style="font-size:32px;">🎉</span>
      </div>
      <h2 style="margin:0;color:#1e293b;font-size:20px;font-weight:700;">Welcome to ${APP_NAME}!</h2>
    </div>
    <p style="color:#475569;font-size:14px;line-height:1.7;margin:0 0 20px;">
      Hello <strong style="color:#1e293b;">${displayName || 'User'}</strong>,
    </p>
    <p style="color:#475569;font-size:14px;line-height:1.7;margin:0 0 24px;">
      Your account has been created on the <strong>${APP_NAME}</strong> platform. Here are your login credentials:
    </p>
    <div style="background-color:#f1f5f9;border-radius:12px;padding:20px 24px;margin:20px 0;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding:8px 0;">
            <span style="color:#64748b;font-size:13px;">📧 Login Email:</span><br>
            <strong style="color:#1e293b;font-size:15px;">${email}</strong>
          </td>
        </tr>
        <tr>
          <td style="padding:8px 0;border-top:1px solid #e2e8f0;">
            <span style="color:#64748b;font-size:13px;">🔑 Password:</span><br>
            <code style="color:#059669;font-size:16px;font-weight:700;background:#ecfdf5;padding:4px 12px;border-radius:6px;letter-spacing:1px;">${password}</code>
          </td>
        </tr>
      </table>
    </div>
    <div style="text-align:center;margin:28px 0;">
      <a href="${loginUrl}" style="display:inline-block;background:linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);color:#ffffff;text-decoration:none;padding:14px 36px;border-radius:10px;font-size:15px;font-weight:600;letter-spacing:0.3px;box-shadow:0 4px 12px rgba(37,99,235,0.3);">
        🚀 Login Now
      </a>
    </div>
    <div style="background-color:#fef9c3;border:1px solid #fde047;border-radius:10px;padding:16px 20px;margin:24px 0;">
      <p style="margin:0;color:#854d0e;font-size:13px;line-height:1.6;">
        ⚠️ <strong>Security Reminders:</strong><br>
        • Please change your password after your first login.<br>
        • Do not share your credentials with anyone.<br>
        • If you did not expect this email, please contact your administrator.
      </p>
    </div>`;
  return baseLayout(content, email);
};

module.exports = {
  passwordResetTemplate,
  adminPasswordResetTemplate,
  backupEmailTemplate,
  notificationEmailTemplate,
  highPaymentAlertTemplate,
  welcomeUserTemplate,
};
