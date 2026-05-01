const schedule = require('node-schedule');
const {
  fetchBackupData,
  backupToLocal,
  backupToMongoDB,
  backupToGoogleDrive,
} = require('../services/backupService');
const { sendEmail } = require('./email');
const { pool } = require('./database');
const {
  getDailyBackupTime,
  setDailyBackupTime,
  DEFAULT_DAILY_BACKUP_TIME,
} = require('./appSettings');

let dailyBackupJob = null;
let scheduledDailyBackupTime = DEFAULT_DAILY_BACKUP_TIME;

const isValidTime24h = (value) => /^([01]\d|2[0-3]):[0-5]\d$/.test(value);

const parseTime24h = (value) => {
  if (!isValidTime24h(value)) return null;
  const [hour, minute] = value.split(':').map(Number);
  return { hour, minute };
};

const formatBackupTimeLabel = (value) => {
  const parsed = parseTime24h(value);
  if (!parsed) return value;
  const hour12 = parsed.hour % 12 || 12;
  const period = parsed.hour >= 12 ? 'PM' : 'AM';
  return `${hour12.toString().padStart(2, '0')}:${parsed.minute.toString().padStart(2, '0')} ${period} IST`;
};

const buildBackupRule = (value) => {
  const parsed = parseTime24h(value);
  if (!parsed) {
    throw new Error(`Invalid backup time '${value}'. Expected HH:MM in 24-hour format.`);
  }

  const rule = new schedule.RecurrenceRule();
  rule.tz = 'Asia/Kolkata';
  rule.hour = parsed.hour;
  rule.minute = parsed.minute;
  rule.second = 0;
  return rule;
};

const scheduleDailyBackupJob = async () => {
  if (dailyBackupJob) {
    dailyBackupJob.cancel();
    dailyBackupJob = null;
  }

  scheduledDailyBackupTime = await getDailyBackupTime();
  const jobRule = buildBackupRule(scheduledDailyBackupTime);

  dailyBackupJob = schedule.scheduleJob(jobRule, async () => {
    console.log(`🕐 Daily backup job triggered at ${formatBackupTimeLabel(scheduledDailyBackupTime)}...`);

    try {
      await runDailyBackupReport();
    } catch (err) {
      console.error('❌ Daily backup job error:', err.message);
    }
  });

  console.log(`✅ Daily backup job scheduled for ${formatBackupTimeLabel(scheduledDailyBackupTime)}`);
  return scheduledDailyBackupTime;
};

const runDailyBackupReport = async () => {
  // Fetch backup data
  const backupData = await fetchBackupData();
  const backupFileName = `daily-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  const backupFileContent = JSON.stringify(backupData, null, 2);
  const backupAttachment = {
    filename: backupFileName,
    content: backupFileContent,
    contentType: 'application/json',
  };

  // Backup to all destinations
  console.log('📦 Starting daily backups...');
  const results = await Promise.allSettled([
    backupToLocal(),
    backupToMongoDB(),
    backupToGoogleDrive('sri-vinayaka-daily-backups'),
  ]);

  const backupSuccess = results.every(r => r.status === 'fulfilled');
  console.log(backupSuccess ? '✅ Daily backups completed' : '⚠️ Some backups failed');

  // Get all admin emails
  const adminsResult = await pool.query(
    `SELECT DISTINCT ON (LOWER(u.email))
      u.id,
      LOWER(u.email) AS email,
      COALESCE(p.display_name, split_part(LOWER(u.email), '@', 1)) AS display_name
     FROM users u
     LEFT JOIN profiles p ON u.id = p.id
     WHERE u.role = $1 AND u.email IS NOT NULL AND u.email <> ''
     ORDER BY LOWER(u.email), u.created_at`,
    ['admin']
  );

  const adminRecipients = adminsResult.rows.length > 0
    ? adminsResult.rows
    : process.env.ADMIN_NOTIFICATION_EMAIL
      ? [{ id: null, email: process.env.ADMIN_NOTIFICATION_EMAIL, display_name: process.env.ADMIN_NOTIFICATION_EMAIL.split('@')[0] }]
      : [];

  if (adminsResult.rows.length === 0) {
    console.warn('⚠️ No admin recipients found in database, falling back to ADMIN_NOTIFICATION_EMAIL');
  }

  // Send emails to all admins
  const emailPromises = adminRecipients.map(admin => {
    const html = dailyBackupEmailTemplate(
      admin.display_name || admin.email.split('@')[0],
      backupData,
      new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' })
    );

    return sendEmail(
      admin.email,
      `📦 Daily Backup Report - ${new Date().toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })}`,
      html,
      [backupAttachment]
    ).catch(err => {
      console.error(`Failed to send backup email to ${admin.email}:`, err.message);
      return { success: false };
    });
  });

  await Promise.all(emailPromises);
  console.log(`✅ Daily backup emails sent to ${adminRecipients.length} admins`);

  return {
    backupData,
    results,
    admins: adminRecipients,
  };
};

/**
 * Daily backup email template
 */
const dailyBackupEmailTemplate = (adminName, backupData, backupTime) => {
  const summary = backupData.summary || {};
  const timestamp = new Date(backupData.timestamp).toLocaleString('en-IN', {
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
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px; text-align: center; }
        .content { background: white; padding: 20px; margin-top: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .stat { display: inline-block; width: 48%; margin: 10px 1%; padding: 15px; background: #f0f4ff; border-radius: 8px; text-align: center; }
        .stat-value { font-size: 24px; font-weight: bold; color: #667eea; }
        .stat-label { font-size: 12px; color: #666; margin-top: 5px; text-transform: uppercase; }
        .alert { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 15px 0; border-radius: 4px; }
        .success { background: #d4edda; border-left: 4px solid #28a745; color: #155724; }
        .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; text-align: center; }
        .timestamp { color: #667eea; font-weight: bold; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>📦 Daily Backup Report</h1>
          <p>Sri Vinayaka Tenders System</p>
        </div>

        <div class="content">
          <p>Hello <strong>${adminName}</strong>,</p>

          <p>Your automated daily backup has been completed successfully at <span class="timestamp">${timestamp}</span>.</p>

          <div style="background: #d4edda; border-left: 4px solid #28a745; padding: 15px; margin: 15px 0; border-radius: 4px; color: #155724;">
            ✅ <strong>Backup Status: SUCCESS</strong>
          </div>

          <h3>📊 Backup Summary</h3>
          <div>
            <div class="stat">
              <div class="stat-value">${summary.totalLoans || 0}</div>
              <div class="stat-label">Loans Backed Up</div>
            </div>
            <div class="stat">
              <div class="stat-value">${summary.totalInvestors || 0}</div>
              <div class="stat-label">Investors Backed Up</div>
            </div>
            <div class="stat">
              <div class="stat-value">${summary.totalTransactions || 0}</div>
              <div class="stat-label">Transactions Backed Up</div>
            </div>
            <div class="stat">
              <div class="stat-value">${summary.totalPayments || 0}</div>
              <div class="stat-label">Payments Backed Up</div>
            </div>
          </div>

          <h3>☁️ Backup Destinations</h3>
          <div class="alert success">
            <strong>✅ Local Device</strong><br>
            <small>Location: ./backups/ | Format: JSON</small>
          </div>
          <div class="alert success">
            <strong>✅ MongoDB Atlas</strong><br>
            <small>Cloud Backup | Full History Retained</small>
          </div>
          <div class="alert success">
            <strong>✅ Google Drive</strong><br>
            <small>Folder: sri-vinayaka-daily-backups | Timestamp: ${new Date().toISOString().replace(/[:.]/g, '-')}</small>
          </div>

          <h3>⏰ Schedule Information</h3>
          <ul style="background: #f5f5f5; padding: 15px; border-radius: 8px;">
            <li><strong>Daily Email Report:</strong> 8:00 PM IST</li>
            <li><strong>MongoDB Atlas Backup:</strong> Every 3 hours (automatic)</li>
            <li><strong>Google Drive Backup:</strong> Every 6 hours (automatic)</li>
            <li><strong>Transaction-Triggered Backup:</strong> Every 3 transactions</li>
          </ul>

          <h3>💾 Data Protection</h3>
          <p>Your data is protected across 3 independent locations with automatic backups. In case of any system failure, you can restore from any of these destinations with minimal data loss.</p>

          <div class="footer">
            <p>This is an automated email. Please do not reply to this message.</p>
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
 * Start daily backup job at 8 PM IST
 */
const startDailyBackupJob = async () => {
  try {
    await scheduleDailyBackupJob();
  } catch (err) {
    console.error('Failed to schedule daily backup job:', err);
  }
};

const restartDailyBackupJob = async () => {
  return scheduleDailyBackupJob();
};

const getCurrentDailyBackupSchedule = async () => {
  const time24h = await getDailyBackupTime();
  const parsed = parseTime24h(time24h) || parseTime24h(DEFAULT_DAILY_BACKUP_TIME);
  return {
    time24h,
    label: formatBackupTimeLabel(time24h),
    cron: parsed ? `0 ${parsed.minute} ${parsed.hour} * * *` : null,
  };
};

const updateDailyBackupSchedule = async (time24h) => {
  if (!isValidTime24h(time24h)) {
    throw new Error('Time must be in HH:MM 24-hour format');
  }

  await setDailyBackupTime(time24h);
  return restartDailyBackupJob();
};

/**
 * Stop daily backup job
 */
const stopDailyBackupJob = () => {
  if (dailyBackupJob) {
    dailyBackupJob.cancel();
    console.log('⏹️ Daily backup job stopped');
  }
};

module.exports = {
  startDailyBackupJob,
  stopDailyBackupJob,
  runDailyBackupReport,
  restartDailyBackupJob,
  getCurrentDailyBackupSchedule,
  updateDailyBackupSchedule,
};
