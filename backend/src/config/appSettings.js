const { pool } = require('./database');

const APP_SETTINGS_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )
`;

const DEFAULT_DAILY_BACKUP_TIME = '20:00';
const DAILY_BACKUP_TIME_KEY = 'daily_backup_time';

let appSettingsReady = false;

const ensureAppSettingsTable = async () => {
  if (!appSettingsReady) {
    await pool.query(APP_SETTINGS_TABLE_SQL);
    appSettingsReady = true;
  }
};

const getAppSetting = async (key, fallbackValue = null) => {
  await ensureAppSettingsTable();
  const result = await pool.query('SELECT value FROM app_settings WHERE key = $1', [key]);
  return result.rows[0]?.value ?? fallbackValue;
};

const setAppSetting = async (key, value) => {
  await ensureAppSettingsTable();
  await pool.query(
    `INSERT INTO app_settings (key, value, updated_at)
     VALUES ($1, $2, now())
     ON CONFLICT (key)
     DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
    [key, value]
  );
  return { key, value };
};

const getDailyBackupTime = async () => {
  return getAppSetting(DAILY_BACKUP_TIME_KEY, DEFAULT_DAILY_BACKUP_TIME);
};

const setDailyBackupTime = async (time24h) => {
  return setAppSetting(DAILY_BACKUP_TIME_KEY, time24h);
};

module.exports = {
  ensureAppSettingsTable,
  getAppSetting,
  setAppSetting,
  getDailyBackupTime,
  setDailyBackupTime,
  DEFAULT_DAILY_BACKUP_TIME,
  DAILY_BACKUP_TIME_KEY,
};