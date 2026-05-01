# 🔧 Google Drive Setup - Terminal Commands & Commands Reference

## Step-by-Step Terminal Guide

### Step 1: Verify Current Directory
```bash
pwd
# Output: C:\Users\ravi7\Downloads\mohan'\sri-vinayaka-tenders-v2
```

### Step 2: Check Current .env Configuration
```bash
cd backend
cat .env | grep -A 5 "GOOGLE_DRIVE"
```

**Current Output (Before Setup):**
```
GOOGLE_DRIVE_BACKUP_ENABLED=true
GOOGLE_DRIVE_BACKUP_INTERVAL_HOURS=6
GOOGLE_DRIVE_FOLDER_ID=YOUR_GOOGLE_DRIVE_FOLDER_ID
GOOGLE_DRIVE_API_KEY=YOUR_GOOGLE_DRIVE_API_KEY
```

---

## Step 3: Prepare to Update .env

### Option A: Edit with nano (Linux/Mac/WSL)
```bash
nano backend/.env
# Find the lines above and replace with actual values
# Press Ctrl+X, then Y, then Enter to save
```

### Option B: Edit with PowerShell (Windows)
```powershell
notepad backend\.env
# Find and replace:
# YOUR_GOOGLE_DRIVE_FOLDER_ID → 1a2b3c4d...
# YOUR_GOOGLE_DRIVE_API_KEY → -----BEGIN RSA...
# Press Ctrl+S to save
```

### Option C: Edit with VS Code (Easiest)
```bash
code backend\.env
# Or open from file explorer:
# Right-click → Open with → VS Code
```

---

## Step 4: Update .env with Real Credentials

**Find these lines in backend/.env:**
```
Line ~116: GOOGLE_DRIVE_FOLDER_ID=YOUR_GOOGLE_DRIVE_FOLDER_ID
Line ~117: GOOGLE_DRIVE_API_KEY=YOUR_GOOGLE_DRIVE_API_KEY
```

**Replace with actual values:**
```env
GOOGLE_DRIVE_FOLDER_ID=1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7
GOOGLE_DRIVE_API_KEY=-----BEGIN RSA PRIVATE KEY-----\nMIIEpAIBAAKCAQEA2x8q7v9k...\n-----END RSA PRIVATE KEY-----\n
```

---

## Step 5: Verify Changes Were Saved

```bash
# Check if file was updated
cat backend\.env | grep -A 2 "GOOGLE_DRIVE_FOLDER_ID"
```

**Expected Output:**
```
GOOGLE_DRIVE_FOLDER_ID=1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7
GOOGLE_DRIVE_API_KEY=-----BEGIN RSA PRIVATE KEY-----...
```

If you still see `YOUR_...` values, the file wasn't saved correctly. Try again!

---

## Step 6: Install Dependencies (If Not Done)

```bash
cd backend
npm install
```

**Expected Output:**
```
added XX packages in XX.XXs
```

---

## Step 7: Start Backend Server

```bash
npm run dev
```

**Expected Output:**
```
Sri Vinayaka backend running on http://localhost:3001
Health check: http://localhost:3001/api/health
Environment: production

✅ Daily backup job scheduled for 8:00 PM IST
✅ Scheduled backups: MongoDB (3h), Google Drive (6h)
```

**⚠️ If you see errors like:**
```
Error: Google Drive credentials not configured. These are MANDATORY for backup system.
```

**Solution:** 
- Stop the server (Ctrl+C)
- Check .env again: `cat backend\.env | grep GOOGLE_DRIVE`
- Verify values are correct (not `YOUR_...`)
- Try again: `npm run dev`

---

## Step 8: Test Health Endpoint

**Open new terminal:**
```bash
curl http://localhost:3001/api/health
```

**Expected Output:**
```json
{
  "status": "ok",
  "timestamp": "2025-01-01T12:00:00.000Z",
  "database": "connected",
  "serverless": false
}
```

---

## Step 9: Test Backup Status (Admin Only)

**First, get an admin token** (from login response):
```bash
# Assuming you have ADMIN_TOKEN stored
set ADMIN_TOKEN=your_admin_token_here  # Windows PowerShell
```

**Check backup status:**
```bash
curl -H "Authorization: Bearer %ADMIN_TOKEN%" `
  http://localhost:3001/api/backup/status
```

**Expected Output:**
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

## Step 10: Trigger Manual Backup Test

```bash
curl -X POST -H "Authorization: Bearer %ADMIN_TOKEN%" `
  http://localhost:3001/api/backup/google-drive
```

**Expected Output (Success):**
```json
{
  "success": true,
  "status": "success",
  "message": "Google Drive backup created successfully",
  "timestamp": "2025-01-01T12:00:00.000Z"
}
```

**Or Error (if credentials wrong):**
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

---

## Commands Summary

| Task | Command |
|------|---------|
| Check .env | `cat backend\.env \| grep GOOGLE_DRIVE` |
| Edit .env | `code backend\.env` or `notepad backend\.env` |
| Install deps | `npm install` |
| Start server | `npm run dev` |
| Health check | `curl http://localhost:3001/api/health` |
| Check backup status | `curl -H "Authorization: Bearer %TOKEN%" http://localhost:3001/api/backup/status` |
| Test full backup | `curl -X POST -H "Authorization: Bearer %TOKEN%" http://localhost:3001/api/backup/full` |
| Test Google Drive | `curl -X POST -H "Authorization: Bearer %TOKEN%" http://localhost:3001/api/backup/google-drive` |
| View logs | `npm run dev \| grep -i error` |
| Stop server | `Ctrl + C` |

---

## 🐛 Debugging Commands

### If Backup Fails, Check Logs

```bash
# Start in debug mode
DEBUG=true npm run dev

# Or filter for errors
npm run dev 2>&1 | findstr /I "error google drive"
```

### Verify Environment Variables Are Set

```bash
# Windows PowerShell
Get-Content backend\.env | Select-String "GOOGLE_DRIVE"

# Linux/Mac
grep GOOGLE_DRIVE backend/.env
```

### Test API Key Format

```bash
# The private key should:
# 1. Start with: -----BEGIN RSA PRIVATE KEY-----
# 2. Have \n between lines
# 3. End with: -----END RSA PRIVATE KEY-----

# View first 50 chars
powershell -Command "((Get-Content backend\.env | Select-String GOOGLE_DRIVE_API_KEY) -split '=')[1].Substring(0,50)"
```

### Check Folder ID Format

```bash
# Should be exactly: [26-32 alphanumeric characters]
# No slashes, no spaces

# View current value
powershell -Command "((Get-Content backend\.env | Select-String GOOGLE_DRIVE_FOLDER_ID) -split '=')[1]"
```

---

## Example: Complete Setup Session

```bash
# 1. Navigate to project
cd C:\Users\ravi7\Downloads\mohan'\sri-vinayaka-tenders-v2

# 2. Check current config
cat backend\.env | grep -A 4 "GOOGLE_DRIVE"

# 3. Open editor
code backend\.env

# [EDITOR: Update the two GOOGLE_DRIVE_* values]
# [EDITOR: Save file]

# 4. Verify changes
cat backend\.env | grep -A 4 "GOOGLE_DRIVE"

# 5. Install if needed
cd backend
npm install

# 6. Start server
npm run dev

# [WAIT: See "Scheduled backups" message]

# 7. In another terminal, test
curl http://localhost:3001/api/health

# 8. With admin token
curl -H "Authorization: Bearer eyJ..." `
  http://localhost:3001/api/backup/status

# 9. Verify success
# ✅ All endpoints responding
# ✅ No errors in logs
# ✅ Ready for backups!
```

---

## ✅ Success Checklist

- [ ] .env updated with real credentials (not `YOUR_...`)
- [ ] Backend starts without errors
- [ ] Health endpoint returns 200 OK
- [ ] Backup status shows schedules configured
- [ ] Manual backup succeeds
- [ ] File appears in Google Drive folder
- [ ] No "credentials not configured" errors

---

## 🔐 Security Notes

### Never commit credentials to git!

```bash
# Check if accidentally added
git status

# If .env is staged, remove it
git reset HEAD backend\.env

# Add to .gitignore if not already there
echo "backend/.env" >> .gitignore
echo ".env" >> .gitignore
```

### Secure the service account key

```bash
# Store the downloaded JSON file safely (not in project folder)
# Recommended: Use password manager or secure vault

# If accidentally exposed, rotate the key immediately:
# 1. Go to Google Cloud Console
# 2. APIs & Services → Credentials
# 3. Delete the old key
# 4. Create new key
# 5. Update .env with new key
```

---

## 📞 Troubleshooting via Commands

### Problem: Backend won't start

```bash
# 1. Check for syntax errors
npm run dev 2>&1 | head -20

# 2. Verify Node version
node --version  # Should be 14+

# 3. Clear node_modules and reinstall
rm -r node_modules package-lock.json
npm install
npm run dev
```

### Problem: API key is incorrect

```bash
# 1. Verify format
cat backend\.env | grep API_KEY

# 2. Should start and end correctly
# Correct: -----BEGIN RSA PRIVATE KEY-----\n...
# Wrong:  BEGIN RSA PRIVATE KEY (missing dashes)

# 3. Regenerate in Google Cloud
# - Delete old key
# - Create new key
# - Update .env
```

### Problem: Folder ID is wrong

```bash
# 1. Get from URL
# https://drive.google.com/drive/folders/[THIS_IS_YOUR_ID]

# 2. Should be 26-32 characters
# NOT a URL
# NOT a folder name

# 3. Update in .env
```

---

## 🎯 Final Verification

Once everything is running:

```bash
# 1. Check service is alive
curl http://localhost:3001/api/health

# 2. Check backup config (admin only)
curl -H "Authorization: Bearer %TOKEN%" `
  http://localhost:3001/api/backup/status

# 3. Expected to see
# "mongodbAtlas": "Every 3 hours"
# "googleDrive": "Every 6 hours"
# "local": "Per 3 transactions + Manual"
```

**If all three succeed: ✅ You're all set!**

---

**Total time: ~5-10 minutes**

**Difficulty: Easy ✅**

**Questions?** Check `GOOGLE_DRIVE_SETUP.md` for detailed instructions

Generated: 2025
