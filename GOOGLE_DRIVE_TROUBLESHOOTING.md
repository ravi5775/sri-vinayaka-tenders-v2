# 🔍 Google Drive Setup - Comprehensive Troubleshooting Guide

## Problem: Backend Won't Start

### Error Message
```
Error: Google Drive credentials not configured. 
These are MANDATORY for backup system.
```

### Solution Checklist

**Step 1: Check .env File Exists**
```bash
# Windows PowerShell
Test-Path backend\.env

# Output should be: True
```

**Step 2: Verify GOOGLE_DRIVE Variables Are Set**
```bash
# View the values
cat backend\.env | grep GOOGLE_DRIVE
```

**Expected Output:**
```
GOOGLE_DRIVE_BACKUP_ENABLED=true
GOOGLE_DRIVE_BACKUP_INTERVAL_HOURS=6
GOOGLE_DRIVE_FOLDER_ID=1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7
GOOGLE_DRIVE_API_KEY=-----BEGIN RSA PRIVATE KEY-----\nMIIEpAI...
```

**If you see:**
```
GOOGLE_DRIVE_FOLDER_ID=YOUR_GOOGLE_DRIVE_FOLDER_ID
GOOGLE_DRIVE_API_KEY=YOUR_GOOGLE_DRIVE_API_KEY
```

❌ **NOT UPDATED YET!** - Follow GOOGLE_DRIVE_SETUP.md steps 1-7

**Step 3: Check for Syntax Errors**
```bash
# The private_key should:
# ✅ Start with: -----BEGIN RSA PRIVATE KEY-----
# ✅ End with: -----END RSA PRIVATE KEY-----
# ✅ Use \n between lines (literal backslash-n, not newlines)
# ✅ No extra spaces or quotes

# View the format
powershell -Command "(Get-Content backend\.env -Raw | Select-String 'GOOGLE_DRIVE_API_KEY').Line.Substring(0,80)"
```

**Step 4: Verify npm Dependencies Installed**
```bash
# Check if node-schedule is installed
npm list node-schedule

# If not installed, run:
npm install

# Should show: node-schedule@2.1.1
```

**Step 5: Try Starting Backend Again**
```bash
npm run dev
```

If still failing, go to **"Backend Logs Not Clear"** section below.

---

## Problem: Backend Starts But File Not Uploading to Google Drive

### Check 1: Verify Manual Backup Works
```bash
# Get admin token first (from login)
curl -X POST -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  http://localhost:3001/api/backup/google-drive
```

**Success Response:**
```json
{
  "success": true,
  "status": "success",
  "message": "Google Drive backup created successfully",
  "timestamp": "2025-01-01T12:00:00.000Z"
}
```

**Error Response:**
```json
{
  "success": false,
  "error": {
    "code": "GOOGLE_DRIVE_BACKUP_ERROR",
    "message": "Google Drive backup failed",
    "timestamp": "2025-01-01T12:00:00.000Z"
  }
}
```

### Check 2: Verify Folder Permissions

**In Google Drive:**
1. Go to "Sri Vinayaka Backups" folder
2. Right-click → Share
3. Check if service account email is listed with "Editor" access

**Missing?** Add it:
- Paste service account email: `xxx@xxx.iam.gserviceaccount.com`
- Select "Editor" permission
- Click Share

### Check 3: Verify Folder ID

```bash
# Get the ID from URL
# https://drive.google.com/drive/folders/1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7
#                                        ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

# Check if .env has EXACTLY this (no spaces!)
grep GOOGLE_DRIVE_FOLDER_ID backend\.env
```

### Check 4: Verify API Key Format

```bash
# The key should:
# 1. Be 1800+ characters long
# 2. Start with: -----BEGIN RSA PRIVATE KEY-----
# 3. End with: -----END RSA PRIVATE KEY-----
# 4. Have \n (literal backslash-n) between lines

# Check length
powershell -Command "((Get-Content backend\.env | Select-String 'GOOGLE_DRIVE_API_KEY') -split '=')[1].Length"
```

**Should output: 1800+**

### Check 5: Check Backend Logs

```bash
# Stop current backend
# Press Ctrl+C

# Start with debug enabled
DEBUG=true npm run dev

# Look for:
✅ "Google Drive API initialized"
✅ "Backup to Google Drive: Success"
❌ "Google Drive API error:"
```

### Check 6: Verify Scheduled Backups Are Enabled

```bash
# Check environment variables
grep -E "BACKUP|GOOGLE_DRIVE" backend\.env | grep -E "ENABLED|INTERVAL"
```

**Expected:**
```
ENABLE_SCHEDULED_BACKUPS=true
GOOGLE_DRIVE_BACKUP_ENABLED=true
GOOGLE_DRIVE_BACKUP_INTERVAL_HOURS=6
```

---

## Problem: "Permission Denied" Error

### Error Message
```
Error: Permission denied. Service account does not have access to folder.
```

### Root Cause
The Google Drive folder is not shared with the service account.

### Solution

**Step 1: Get Service Account Email**
```
From Google Cloud Console:
1. APIs & Services → Credentials
2. Service Accounts tab
3. Click the service account
4. Copy the email: xxx@xxx.iam.gserviceaccount.com
```

**Step 2: Share Folder in Google Drive**
```
1. Go to https://drive.google.com
2. Find "Sri Vinayaka Backups" folder
3. Right-click → Share
4. Paste the service account email
5. Select: Editor (not Viewer!)
6. Click Share
7. Click Share again to confirm
```

**Step 3: Wait 1-2 Minutes**
Google takes time to sync permissions.

**Step 4: Test Again**
```bash
curl -X POST -H "Authorization: Bearer TOKEN" \
  http://localhost:3001/api/backup/google-drive
```

Should now work!

---

## Problem: "Invalid Credentials" Error

### Error Message
```
Error: Invalid credentials. Unable to authenticate with Google API.
```

### Root Causes & Solutions

**Cause 1: Wrong Private Key Copied**

✅ **Correct:** 
```
-----BEGIN RSA PRIVATE KEY-----
MIIEpAIBAAKCAQEA2x8q7v9k...
-----END RSA PRIVATE KEY-----
```

❌ **Wrong:**
```
BEGIN RSA PRIVATE KEY
MIIEpAIBAAKCAQEA2x8q7v9k
END RSA PRIVATE KEY
```

**Solution:**
1. Go to Google Cloud Console
2. APIs & Services → Credentials
3. Service Accounts → Your service account
4. Keys tab → Create new key → JSON
5. Download new JSON file
6. Find `private_key` field
7. Copy entire value including `-----BEGIN...` and `-----END...`
8. Update .env
9. Restart backend

**Cause 2: Missing \n Between Lines**

❌ **Wrong (actual newlines):**
```env
GOOGLE_DRIVE_API_KEY=-----BEGIN RSA PRIVATE KEY-----
MIIEpAIBAAKCAQEA...
-----END RSA PRIVATE KEY-----
```

✅ **Correct (literal \n):**
```env
GOOGLE_DRIVE_API_KEY=-----BEGIN RSA PRIVATE KEY-----\nMIIEpAIBAAKCAQEA...\n-----END RSA PRIVATE KEY-----
```

**Solution:**
- Use a text editor like VS Code (not Notepad)
- Replace actual line breaks with literal `\n`
- Or copy from JSON exactly as shown

**Cause 3: Extra Spaces or Quotes**

❌ **Wrong:**
```
GOOGLE_DRIVE_API_KEY= "-----BEGIN..." (space before)
GOOGLE_DRIVE_API_KEY=-----BEGIN..."  (extra quote)
```

✅ **Correct:**
```
GOOGLE_DRIVE_API_KEY=-----BEGIN...
```

**Solution:**
- Edit .env carefully
- No spaces around `=`
- No quotes around value
- No extra characters

---

## Problem: Files Not Appearing in Google Drive Folder

### Check 1: Verify Folder ID Exists

```bash
# Open the folder URL
https://drive.google.com/drive/folders/YOUR_FOLDER_ID

# Should show the "Sri Vinayaka Backups" folder
```

**If 404 Not Found:**
- Go to https://drive.google.com
- Find "Sri Vinayaka Backups" folder
- Copy ID from URL
- Update .env: GOOGLE_DRIVE_FOLDER_ID=new_id
- Restart backend

### Check 2: Check Backup Actually Ran

```bash
# Trigger manual backup
curl -X POST -H "Authorization: Bearer TOKEN" \
  http://localhost:3001/api/backup/google-drive
```

**Response should be:**
```json
{
  "success": true,
  "status": "success",
  "message": "Google Drive backup created successfully",
  "timestamp": "2025-01-01T12:00:00.000Z"
}
```

### Check 3: Check Local Backup File Exists

```bash
# If Google backup works, local backup should also exist
ls backend/backups/ | grep "backup-"

# Should show files like:
# backup-2025-01-01T120000-000Z.json
```

### Check 4: Wait for Auto Sync

- Manual backups appear immediately
- Scheduled backups run every 6 hours
- Files uploaded automatically at 12:00 AM, 6:00 AM, 12:00 PM, 6:00 PM, etc.

### Check 5: Refresh Google Drive

```
1. Open https://drive.google.com
2. Press F5 to refresh browser
3. Check "Sri Vinayaka Backups" folder
4. Files should appear
```

### Check 6: Check Folder Sharing

```
1. Verify folder shared with service account
2. Right-click folder → Share
3. Check if xxx@xxx.iam.gserviceaccount.com listed
4. Must be "Editor" permission (not Viewer)
```

---

## Problem: "Folder Not Found" Error

### Error Message
```
Error: Folder not found. Check GOOGLE_DRIVE_FOLDER_ID.
```

### Solution

**Step 1: Get Correct Folder ID**
```
1. Open https://drive.google.com
2. Find "Sri Vinayaka Backups" folder
3. Click to open it
4. Look at URL: https://drive.google.com/drive/folders/1a2b3c4d...
5. Copy the ID part (26-32 characters)
```

**Step 2: Verify No Extra Characters**
```bash
# Check current value
grep GOOGLE_DRIVE_FOLDER_ID backend\.env

# Should be exactly the ID (no spaces, slashes, or extra chars)
# ✅ 1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7
# ❌ /1a2b3c4d5e6f7g8h9i0j/1k2l3m4n5o6p7/ (too many slashes)
# ❌ 1a2b3c4d 5e6f7g8h9i0j (spaces)
```

**Step 3: Update .env**
```bash
# Edit .env
code backend\.env

# Find line and update:
GOOGLE_DRIVE_FOLDER_ID=1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7
```

**Step 4: Restart Backend**
```bash
npm run dev
```

---

## Problem: API Key Validation Fails

### Symptoms
- Logs show: "Invalid key format"
- Or: "Unable to parse private key"
- Or: "Authentication failed"

### Solution

**Step 1: Regenerate Key from Google Cloud**

```
1. Go to: https://console.cloud.google.com
2. APIs & Services → Credentials
3. Service Accounts tab
4. Click your service account
5. Keys tab
6. Find current key → Delete (...)
7. Create new key → Select JSON
8. Download file
```

**Step 2: Extract Private Key Correctly**

```
Open the downloaded JSON file:
{
  "type": "service_account",
  "project_id": "xxx",
  "private_key_id": "xxx",
  "private_key": "-----BEGIN RSA PRIVATE KEY-----\nMIIEpAI...=\n-----END RSA PRIVATE KEY-----\n",
  ...
}

Copy the ENTIRE value of "private_key" field:
(including the quotes and \n characters)
```

**Step 3: Update .env**

```bash
# Open .env with VS Code
code backend\.env

# Find: GOOGLE_DRIVE_API_KEY=...
# Replace with: GOOGLE_DRIVE_API_KEY=-----BEGIN RSA PRIVATE KEY-----\nMIIEpAI...
```

**Important:** Keep the literal `\n` characters (don't expand to actual newlines)

**Step 4: Verify Format**

```bash
# Check length (should be 1800+ characters)
powershell -Command "((Get-Content backend\.env | Select-String 'GOOGLE_DRIVE_API_KEY') -split '=')[1].Length"
```

**Step 5: Test Again**

```bash
npm run dev
```

---

## Problem: "Rate Limited" Error

### Error Message
```
Error: Rate limit exceeded. Too many backup requests.
```

### Solution

**Step 1: Wait 5 Minutes**
Google API has rate limits. Just wait and try again.

**Step 2: Check Request Frequency**

```bash
# View backup status to see last backup time
curl -H "Authorization: Bearer TOKEN" \
  http://localhost:3001/api/backup/status
```

**Step 3: Don't Trigger Backups Too Frequently**
- Manual backups: OK to run anytime (but wait 5 min between each)
- Scheduled backups: MongoDB (3h), Google Drive (6h)
- If rate limited, wait 5 minutes before next attempt

**Step 4: Check API Quotas**

```
1. Google Cloud Console
2. APIs & Services → Library
3. Google Drive API → Quotas
4. Check if any quotas exceeded
5. Usually resets hourly
```

---

## Problem: Backend Logs Not Clear

### Getting Better Logs

**Option 1: Start with Debug Mode**
```bash
DEBUG=true npm run dev 2>&1 | tee backup.log
```

**Option 2: Filter for Errors Only**
```bash
npm run dev 2>&1 | findstr /I "error google drive"
```

**Option 3: Save All Output to File**
```bash
npm run dev > backend.log 2>&1
```

Then view with:
```bash
type backend.log | findstr "error\|google\|drive"
```

### Interpreting Logs

**Good Logs (Startup):**
```
✅ "Daily backup job scheduled for 8:00 PM IST"
✅ "Scheduled backups: MongoDB (3h), Google Drive (6h)"
✅ "Server running on port 3001"
```

**Bad Logs (Startup Errors):**
```
❌ "Google Drive credentials not configured"
❌ "Cannot read property 'GOOGLE_DRIVE_FOLDER_ID' of undefined"
❌ "Error: ENOENT: no such file or directory, open '.env'"
```

**Backup Logs (During Backup):**
```
✅ "Creating backup..."
✅ "Local backup: Success"
✅ "Google Drive backup: Success"
❌ "Google Drive backup failed: Permission denied"
```

---

## Problem: Email Alert Not Sending

### Check 1: Verify Email Service Is Running

```bash
# Check backend logs for email errors
npm run dev 2>&1 | findstr "email\|gmail\|smtp"
```

### Check 2: Test Email Configuration

```bash
# Check SMTP settings in .env
grep -E "SMTP|EMAIL" backend\.env
```

**Expected:**
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=srivinayakatender@gmail.com
SMTP_PASSWORD=hndl subs qmnw gxsz
```

### Check 3: Gmail Account Setup

1. Gmail account: srivinayakatender@gmail.com
2. App password enabled: Yes
3. 2FA enabled: Yes
4. App password correct: See SMTP_PASSWORD in .env

### Check 4: Manual Email Test

```bash
# Trigger email endpoint (admin only)
curl -X POST -H "Authorization: Bearer TOKEN" \
  http://localhost:3001/api/backup/email
```

**Should send email to all admin users**

---

## Problem: High-Payment Alert Not Triggering

### Check 1: Verify Amount Threshold

```bash
# Check threshold in .env
grep HIGH_PAYMENT backend\.env

# Should show:
HIGH_PAYMENT_THRESHOLD=30000
```

### Check 2: Test with Large Transaction

```bash
# Create transaction/payment > ₹30,000
# For example: ₹35,000

# Alert should:
✅ Appear in backend logs
✅ Send email to all admin users
✅ Log in high_payment_alert_log table
```

### Check 3: Check Admin Email Addresses

```bash
# Backend needs admin email addresses from database
# Check if users have role='admin' and email set

# Query database:
psql -U postgres -d sri_vinayaka -c "SELECT email FROM users WHERE role='admin';"
```

**Should return email addresses for all admins**

---

## Problem: "npm: command not found"

### Solution

**Step 1: Verify Node.js Installed**
```bash
node --version
npm --version
```

**If not installed:**
- Download from https://nodejs.org/ (v14+)
- Install and restart terminal
- Verify: `node --version`

**Step 2: Check PATH Environment Variable**

```powershell
# Windows
$env:Path -split ';' | findstr "node"

# Should show Node.js installation path
```

If not shown, add Node.js to PATH manually.

---

## Problem: Cannot Connect to Google Drive

### Symptoms
- Backend logs show "ENOTFOUND"
- Or "ETIMEDOUT"
- Or "Network error"

### Solution

**Step 1: Check Internet Connection**
```bash
ping google.com
```

**Step 2: Check Firewall**
- Google Drive API: *.googleapis.com
- Ensure firewall allows HTTPS outbound

**Step 3: Check API Credentials**
```bash
# Verify API is enabled in Google Cloud
# https://console.cloud.google.com → APIs & Services → Enabled APIs
# Should show: Google Drive API ✅ ENABLED
```

**Step 4: Try Again After Network Recovery**
```bash
npm run dev
```

---

## Checklist: Verify Complete Setup

```
Google Cloud
├─ [ ] Project Created: "Sri Vinayaka Backup"
├─ [ ] Google Drive API: ENABLED
├─ [ ] Service Account: Created
├─ [ ] API Key: Downloaded (JSON)
├─ [ ] Service Account Email: xxx@xxx.iam.gserviceaccount.com
└─ [ ] Private Key: -----BEGIN RSA PRIVATE KEY-----...

Google Drive
├─ [ ] Folder Created: "Sri Vinayaka Backups"
├─ [ ] Folder ID: 1a2b3c4d...
└─ [ ] Folder Shared with Service Account Email (Editor)

Backend Setup
├─ [ ] .env Updated: GOOGLE_DRIVE_FOLDER_ID
├─ [ ] .env Updated: GOOGLE_DRIVE_API_KEY
├─ [ ] npm install: Completed
└─ [ ] Backend Started: npm run dev (no errors)

Verification
├─ [ ] Health Check: curl http://localhost:3001/api/health (200 OK)
├─ [ ] Backup Status: See schedules (admin only)
├─ [ ] Manual Backup: "success": true
├─ [ ] File in Drive: backup-2025-01-01T*.json visible
└─ [ ] Daily Email: Scheduled for 8 PM IST
```

---

## When Everything Fails: Nuclear Option

```bash
# 1. Stop backend
# Press Ctrl+C

# 2. Remove old key
rm -r node_modules package-lock.json

# 3. Regenerate Google credentials:
#    - Google Cloud: Delete old key, create new
#    - Google Drive: Delete old folder, create new

# 4. Update .env with NEW credentials (copy exactly)

# 5. Fresh install
npm install

# 6. Start fresh
npm run dev

# 7. Test
curl http://localhost:3001/api/health
```

---

## Support Resources

| Issue | Documentation |
|-------|---|
| Setup instructions | `GOOGLE_DRIVE_SETUP.md` |
| Terminal commands | `GOOGLE_DRIVE_TERMINAL_COMMANDS.md` |
| Visual flow | `GOOGLE_DRIVE_VISUAL_FLOW.md` |
| Quick reference | `GOOGLE_DRIVE_QUICK_REFERENCE.md` |
| Full summary | `IMPLEMENTATION_COMPLETE.md` |

---

**Still stuck?** Try this order:

1. Check .env: `grep GOOGLE_DRIVE backend\.env`
2. Check logs: `npm run dev 2>&1 | grep -i error`
3. Restart backend: `npm run dev`
4. Test manual backup: `curl -X POST ...`
5. Verify in Google Drive

If issue persists, check logs carefully for exact error message above!

Generated: 2025
