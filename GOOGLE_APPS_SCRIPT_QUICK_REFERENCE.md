# Google Apps Script Integration - Quick Reference

## What Changed?

### Before (❌ Didn't Work)
```
Backend → Service Account → Google Drive API
          ❌ Service accounts have NO storage quota
          ❌ 403 Forbidden error
```

### After (✅ Works!)
```
Backend → HTTPS POST → Google Apps Script (Your Account) → Google Drive
          ✅ Uses your personal Google account
          ✅ Files save to your Drive
          ✅ Secured with secret key
```

---

## Files Updated

### 1. **google-apps-script.gs** (NEW)
- Web app that receives backups
- Runs with your personal account permissions
- Automatically creates "sri-vinayaka-backups" folder
- Location: `/google-apps-script.gs`

### 2. **backend/src/config/googleDrive.js** (UPDATED)
- **Removed:** Service account API calls
- **Added:** HTTPS POST requests to Apps Script
- **Removed:** `googleapis` dependency requirement
- Now uses simple `https` module

### 3. **backend/src/services/backupService.js** (UPDATED)
- Updated `backupToGoogleDrive()` function
- Changed to call Apps Script endpoint
- Simplified folder management (Apps Script handles it)

### 4. **backend/.env** (UPDATED)
- **Removed:** `GOOGLE_DRIVE_FOLDER_ID`
- **Removed:** `GOOGLE_DRIVE_API_KEY`
- **Added:** `GOOGLE_APPS_SCRIPT_URL`
- **Added:** `GOOGLE_APPS_SCRIPT_SECRET`

---

## Setup Checklist

- [ ] Read `GOOGLE_APPS_SCRIPT_SETUP.md`
- [ ] Go to https://script.google.com
- [ ] Create new project: "Sri Vinayaka Backup"
- [ ] Copy `google-apps-script.gs` code into editor
- [ ] Change `SECRET_KEY` to random string
- [ ] Deploy as Web app (Execute as: Your account)
- [ ] Grant permissions (click "Allow")
- [ ] Copy deployment URL
- [ ] Update `backend/.env`:
  - `GOOGLE_APPS_SCRIPT_URL=` (paste URL)
  - `GOOGLE_APPS_SCRIPT_SECRET=` (paste secret)
- [ ] Restart backend: `npm start`
- [ ] Test with: `node test-backup.js`
- [ ] Check Google Drive for backup folder

---

## Environment Variables

```env
# Google Drive Backup via Google Apps Script
GOOGLE_DRIVE_BACKUP_ENABLED=true
GOOGLE_DRIVE_BACKUP_INTERVAL_HOURS=6

# Deployment URL from Google Apps Script
GOOGLE_APPS_SCRIPT_URL=https://script.google.com/macros/d/YOUR-DEPLOYMENT-ID/usercopy

# Secret key (must match CONFIG.SECRET_KEY in google-apps-script.gs)
GOOGLE_APPS_SCRIPT_SECRET=your-secret-key-here
```

---

## How It Works (Technical)

### 1. Backend Needs Backup
- Gets backup data from PostgreSQL & MongoDB
- Creates JSON file content

### 2. Send to Apps Script
```javascript
POST https://script.google.com/macros/d/ID/usercopy?secret=key
{
  "timestamp": "2026-05-01T...",
  "totalLoans": 69,
  "totalInvestors": 10,
  ...
}
```

### 3. Google Apps Script Processes
- Verifies secret key matches
- Parses JSON data
- Gets or creates "sri-vinayaka-backups" folder
- Creates new file with backup data

### 4. Returns Success Response
```json
{
  "success": true,
  "fileId": "...",
  "fileName": "backup-2026-05-01T...",
  "webViewLink": "https://drive.google.com/file/d/...",
  "timestamp": "2026-05-01T..."
}
```

### 5. Backend Logs Success
```
✅ File uploaded to Google Drive
   File ID: 1abc...xyz
   File Link: https://drive.google.com/file/d/1abc...xyz/view
   Created: 2026-05-01T06:59:07.636Z
```

---

## Backup Schedule

- **Manual**: `POST /api/backup/google-drive` (admin only)
- **Automatic**: Every 6 hours (00:00, 06:00, 12:00, 18:00 UTC)
- **Transaction-Triggered**: After every 3 transactions
- **Daily Email**: 8 PM IST (sends summary of all backups)

---

## Security

✅ **Secret Key Verification**
- Each request must include correct secret
- Invalid secret → 403 error
- Change secret in both places if needed

✅ **Personal Account**
- Apps Script runs with YOUR account
- Only you can manage the backups folder
- Files stored in your personal Google Drive

✅ **No Sensitive Data**
- Backup URL is safe to share
- Secret key is sensitive (don't share)
- Verify requests via secret key

---

## Troubleshooting Quick Fixes

| Problem | Fix |
|---------|-----|
| "URL not configured" | Copy full URL to `.env` |
| "Secret key mismatch" | Ensure both places have same secret |
| "Access denied" | Grant permissions in Apps Script Deploy dialog |
| "Folder not created" | Check Apps Script logs, test again |
| "404 Not Found" | Verify deployment URL is correct |

---

## Testing

```bash
# Test manual backup
node test-backup.js

# Watch logs
npm start

# Check Google Drive
# https://drive.google.com → look for "sri-vinayaka-backups" folder
```

---

## Rollback (If Needed)

If you want to go back to local-only backups:

1. Update `.env`:
   ```env
   GOOGLE_DRIVE_BACKUP_ENABLED=false
   LOCAL_BACKUP_ENABLED=true
   ```

2. Restart backend: `npm start`

Your backups will still work via MongoDB Atlas and local storage.

---

**Need detailed setup help?** → See `GOOGLE_APPS_SCRIPT_SETUP.md`
