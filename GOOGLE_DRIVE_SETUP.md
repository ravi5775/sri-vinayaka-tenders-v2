# 📁 Google Drive Backup Setup - Complete Step-by-Step Guide

## Overview
This guide walks you through obtaining Google Drive credentials (API Key and Folder ID) required for the backup system to function.

**Without these credentials, the backup system will NOT start.**

---

## ⚠️ Important
- This is **MANDATORY** for production
- The system will fail to start if credentials are missing
- Both `GOOGLE_DRIVE_FOLDER_ID` and `GOOGLE_DRIVE_API_KEY` are required

---

## 📋 Prerequisites
- Google Account (Gmail account)
- Access to [Google Cloud Console](https://console.cloud.google.com)
- Administrator privileges to create projects/APIs

---

## 🔧 Step 1: Create Google Cloud Project

### 1.1 Open Google Cloud Console
1. Go to https://console.cloud.google.com
2. Click **"Select a Project"** at the top-left
3. Click **"NEW PROJECT"**

### 1.2 Create New Project
1. **Project name:** `Sri Vinayaka Backup` (or similar)
2. **Parent organization:** (leave as Organization if shown)
3. Click **"CREATE"**
4. Wait for project to be created (2-3 minutes)

### 1.3 Verify Project Created
- At the top-left, confirm the project name shows: `Sri Vinayaka Backup`
- You should see project ID like: `sri-vinayaka-backup-xxxxx`

---

## 🔑 Step 2: Enable Google Drive API

### 2.1 Navigate to APIs & Services
1. In the left sidebar, click **"APIs & Services"**
2. Click **"Library"**

### 2.2 Search for Google Drive API
1. In the search box, type: `Google Drive API`
2. Click on the first result: **"Google Drive API"**

### 2.3 Enable the API
1. Click **"ENABLE"** button
2. Wait for enablement (page will refresh)
3. You should see: **"API enabled"**

---

## 🔐 Step 3: Create Service Account (for API Key)

### 3.1 Go to Service Accounts
1. In left sidebar: **"APIs & Services"** → **"Credentials"**
2. Click **"+ CREATE CREDENTIALS"** at the top
3. Select **"Service Account"** from dropdown

### 3.2 Fill Service Account Details
1. **Service account name:** `sri-vinayaka-backup` (or any name)
2. **Service account ID:** (auto-filled, can leave as is)
3. **Description:** `Backup system for Sri Vinayaka Tenders`
4. Click **"CREATE AND CONTINUE"**

### 3.3 Grant Permissions (Optional but Recommended)
1. **Grant this service account access to project:**
2. Under "Select a role", search for: `Editor`
3. Click to select **"Editor"** role
4. Click **"CONTINUE"**

### 3.4 Create & Download Key
1. Click **"CREATE KEY"** button
2. Select **"JSON"** key type
3. Click **"CREATE"**

**⚠️ Important:** A JSON file will download automatically
- Save this file somewhere safe: `service-account-key.json`
- **Do NOT share this file** - it contains sensitive credentials

### 3.5 Extract API Key from JSON
1. Open the downloaded `service-account-key.json` file
2. Find the field: `"private_key"`
3. Copy the entire value (including quotes)

Example:
```json
{
  "type": "service_account",
  "project_id": "sri-vinayaka-backup-xxxxx",
  "private_key_id": "...",
  "private_key": "-----BEGIN RSA PRIVATE KEY-----\nMIIEpAIBAAKCAQEA...\n-----END RSA PRIVATE KEY-----\n",
  ...
}
```

**Copy the `private_key` value** → This is your `GOOGLE_DRIVE_API_KEY`

---

## 📂 Step 4: Create Google Drive Folder (for Folder ID)

### 4.1 Open Google Drive
1. Go to https://drive.google.com
2. Sign in with your Google Account

### 4.2 Create New Folder
1. Right-click in empty space → **"New folder"**
   OR
   Click **"+ New"** → **"Folder"**
2. Name it: `Sri Vinayaka Backups` (or any name)
3. Press **Enter** to create

### 4.3 Get Folder ID
1. Right-click the folder → **"Get link"**
   OR
   Open the folder and look at the URL
   
2. The URL will look like:
   ```
   https://drive.google.com/drive/folders/1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7
   ```

3. The long string of characters after `/folders/` is your **Folder ID**:
   ```
   GOOGLE_DRIVE_FOLDER_ID=1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7
   ```

---

## 🔗 Step 5: Share Folder with Service Account

### 5.1 Get Service Account Email
1. Go back to Google Cloud Console
2. **"APIs & Services"** → **"Credentials"**
3. Under "Service Accounts", click on the service account you created
4. Copy the email address (format: `xxx@xxx.iam.gserviceaccount.com`)

### 5.2 Share Folder
1. Go back to Google Drive
2. Right-click the folder → **"Share"**
3. Paste the service account email
4. Select **"Editor"** permission
5. Uncheck **"Notify people"** (optional)
6. Click **"Share"**

---

## ✅ Step 6: Update .env Configuration

### 6.1 Prepare Credentials
You should now have:
- `GOOGLE_DRIVE_API_KEY` = The private_key from service-account-key.json
- `GOOGLE_DRIVE_FOLDER_ID` = The folder ID from Google Drive URL

### 6.2 Update Backend .env File

**File:** `backend/.env`

Find these lines:
```env
GOOGLE_DRIVE_FOLDER_ID=YOUR_GOOGLE_DRIVE_FOLDER_ID
GOOGLE_DRIVE_API_KEY=YOUR_GOOGLE_DRIVE_API_KEY
```

Replace with actual values:
```env
GOOGLE_DRIVE_FOLDER_ID=1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7
GOOGLE_DRIVE_API_KEY=-----BEGIN RSA PRIVATE KEY-----\nMIIEpAIB...
```

**Example .env:**
```env
# ═══════════════════════════════════════════════════════════════════
# BACKUP SYSTEM CONFIGURATION
# ═══════════════════════════════════════════════════════════════════

# Google Drive Backup Schedule (every 6 hours)
GOOGLE_DRIVE_BACKUP_ENABLED=true
GOOGLE_DRIVE_BACKUP_INTERVAL_HOURS=6
GOOGLE_DRIVE_FOLDER_ID=1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7
GOOGLE_DRIVE_API_KEY=-----BEGIN RSA PRIVATE KEY-----\nMIIEpAIBAAKCAQEA2x8q7v...[rest of key]\n-----END RSA PRIVATE KEY-----\n
```

---

## 🚀 Step 7: Verify & Start Backend

### 7.1 Verify Configuration
```bash
cd backend

# Check that credentials are set
cat .env | grep GOOGLE_DRIVE
```

Should output:
```
GOOGLE_DRIVE_BACKUP_ENABLED=true
GOOGLE_DRIVE_BACKUP_INTERVAL_HOURS=6
GOOGLE_DRIVE_FOLDER_ID=1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7
GOOGLE_DRIVE_API_KEY=-----BEGIN RSA PRIVATE KEY-----\n...
```

### 7.2 Start Backend
```bash
npm install  # If not already done
npm run dev
```

### 7.3 Expected Output
```
Sri Vinayaka backend running on http://localhost:3001
✅ Daily backup job scheduled for 8:00 PM IST
✅ Scheduled backups: MongoDB (3h), Google Drive (6h)
```

**No errors?** ✅ Google Drive is configured correctly!

---

## 🧪 Step 8: Test Google Drive Backup

### 8.1 Trigger Manual Backup
```bash
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  -X POST http://localhost:3001/api/backup/google-drive
```

Response (Success):
```json
{
  "success": true,
  "status": "success",
  "message": "Google Drive backup created successfully",
  "timestamp": "2025-01-01T12:00:00.000Z"
}
```

### 8.2 Verify File in Google Drive
1. Go to https://drive.google.com
2. Open the "Sri Vinayaka Backups" folder
3. You should see a file: `backup-2025-01-01T120000...json`

### 8.3 Check Backup Status
```bash
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  http://localhost:3001/api/backup/status
```

Response:
```json
{
  "success": true,
  "status": "ok",
  "transactionCounter": 0,
  "transactionsUntilBackup": 3,
  "schedules": {
    "mongodbAtlas": "Every 3 hours",
    "googleDrive": "Every 6 hours",
    "local": "Per 3 transactions + Manual"
  }
}
```

---

## ❌ Troubleshooting

### Issue: "Google Drive credentials not configured"
```
Error: Google Drive credentials not configured. These are MANDATORY for backup system.
```

**Solution:**
1. Verify .env has both values:
   ```bash
   grep GOOGLE_DRIVE_FOLDER_ID backend/.env
   grep GOOGLE_DRIVE_API_KEY backend/.env
   ```
2. Both should show values (not `YOUR_...`)
3. Restart backend: `npm run dev`

---

### Issue: "Invalid credentials" Error
```
Error: Invalid credentials provided to Google Drive
```

**Solution:**
1. Verify you copied the `private_key` correctly (should start with `-----BEGIN`)
2. Ensure folder is shared with service account email
3. Verify folder ID doesn't have extra spaces
4. Check that API is enabled in Google Cloud Console

---

### Issue: Backup uploads but file not visible in Drive
```
Backup completed but file not in folder
```

**Solution:**
1. Check if file is in a different location
2. Verify folder ID is correct
3. Check folder permissions (should be "Editor")
4. Try manual backup again

---

### Issue: "Rate limit exceeded" Error
```
Error: Google Drive API rate limit exceeded
```

**Solution:**
1. Wait a few minutes before retrying
2. Reduce backup frequency in .env:
   ```env
   GOOGLE_DRIVE_BACKUP_INTERVAL_HOURS=12  # Instead of 6
   ```
3. Check if you have usage limits on service account

---

## 📊 Configuration Summary

| Setting | Value | Example |
|---------|-------|---------|
| GOOGLE_DRIVE_BACKUP_ENABLED | true/false | true |
| GOOGLE_DRIVE_BACKUP_INTERVAL_HOURS | number | 6 |
| GOOGLE_DRIVE_FOLDER_ID | Folder ID from URL | 1a2b3c4d... |
| GOOGLE_DRIVE_API_KEY | Private key from JSON | -----BEGIN RSA... |

---

## 🔒 Security Best Practices

✅ **DO:**
- Store `service-account-key.json` securely (not in git)
- Keep `.env` file secure (not in git)
- Use separate service accounts for different environments
- Rotate keys periodically (annually recommended)
- Enable API access logging in Google Cloud

❌ **DON'T:**
- Share the API key with others
- Commit .env to version control
- Use personal Google account API keys
- Share service-account-key.json
- Expose credentials in error messages

---

## 📝 Checklist

- [ ] Google Cloud Project created
- [ ] Google Drive API enabled
- [ ] Service Account created
- [ ] API Key downloaded and extracted
- [ ] Google Drive folder created
- [ ] Folder ID obtained from URL
- [ ] Service account email found
- [ ] Folder shared with service account
- [ ] .env file updated with credentials
- [ ] Backend restarted
- [ ] Manual backup tested successfully
- [ ] File visible in Google Drive folder

---

## ✨ What Happens Next

Once configured:

✅ **Every 6 hours** - Automatic backup to Google Drive
✅ **Every 3 transactions** - Backup triggered to all destinations
✅ **Daily at 8 PM** - Email report sent to all admins
✅ **>₹30,000 payment** - High-payment alert sent to all admins

---

## 📞 Support

**If backup still doesn't work after setup:**

1. Check server logs: `npm run dev | grep -i "google\|drive\|backup"`
2. Verify credentials: `cat backend/.env | grep GOOGLE_DRIVE`
3. Test API access: Try manual backup endpoint
4. Check Google Cloud Console for API errors

---

**Next Step:** Follow steps 1-7 to complete Google Drive setup, then restart your backend! 🚀

Generated: 2025
System: Sri Vinayaka Tenders v2.0
