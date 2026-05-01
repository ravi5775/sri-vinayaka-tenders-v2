# Google Apps Script Setup Guide

This guide will help you deploy a Google Apps Script that enables secure backup uploads to your personal Google Drive without service account limitations.

---

## Why Google Apps Script?

✅ **Solves Service Account Limitations**
- Service accounts cannot write to Google Drive (Google's security limitation)
- Google Apps Script runs with YOUR personal account (full permissions)
- No additional Google Workspace subscription needed

✅ **Benefits**
- Automatic backups to your personal Google Drive
- Files stored in your "sri-vinayaka-backups" folder
- Completely free
- Secure with secret key verification

---

## Step-by-Step Setup

### Step 1: Prepare the Apps Script Code

The file `google-apps-script.gs` contains the complete script. You'll copy this into Google Apps Script editor.

**Key Configuration (Inside google-apps-script.gs):**
```javascript
const CONFIG = {
  BACKUP_FOLDER_NAME: 'sri-vinayaka-backups',
  SECRET_KEY: 'your-secret-key-here'  // ← Change this to a random string
};
```

### Step 2: Create a Google Apps Script Project

1. **Open Google Apps Script Editor**
   - Go to: https://script.google.com
   - Sign in with your Google account (tender@gmail.com)

2. **Create New Project**
   - Click "Create project"
   - Name it: `Sri Vinayaka Backup`
   - Click "Create"

### Step 3: Replace the Script Code

1. **Clear Default Code**
   - You'll see a blank `Code.gs` file
   - Delete all content (select all with Ctrl+A, press Delete)

2. **Paste New Code**
   - Open `google-apps-script.gs` from the repository
   - Copy ALL the code
   - Paste it into the `Code.gs` file in Google Apps Script editor

3. **Save the Project**
   - Press Ctrl+S or Click "Save"

### Step 4: Configure the Secret Key

1. **Generate a Random Secret Key**
   - Use an online generator: https://www.random.org/strings/
   - Or manually create one: `backup-secret-123456`

2. **Update the Script**
   - In `Code.gs`, find line with `SECRET_KEY: 'your-secret-key-here'`
   - Replace with your generated key
   - Example: `SECRET_KEY: 'backup-secret-12345678'`

3. **Save Again**
   - Press Ctrl+S

### Step 5: Deploy the Script as Web App

1. **Start Deployment**
   - Click **"Deploy"** button (top right)
   - Select **"New deployment"**

2. **Configure Deployment Settings**
   - **Type** (dropdown): Select "Web app"
   - **Execute as**: Select your email (`tender@gmail.com`)
   - **Who has access**: Select "Anyone" (scripts verify via secret key)
   - Click **"Deploy"**

3. **Review Permissions**
   - Google will show a permission dialog
   - Click "Review permissions"
   - Select your Google account
   - Click "Allow"
   - Google will warn this is an unverified app - that's normal
   - Click "Advanced" → "Go to Sri Vinayaka Backup (unsafe)"
   - Click "Allow"

4. **Copy the Deployment URL**
   - After deployment, you'll see:
     ```
     Deployment ID: (some-id)
     New URL: https://script.google.com/macros/d/(LONG-ID)/usercopy
     ```
   - **Copy this URL** - you'll need it next

### Step 6: Update Backend Configuration

1. **Open `backend/.env`**

2. **Update Google Apps Script Settings**
   ```env
   GOOGLE_APPS_SCRIPT_URL=https://script.google.com/macros/d/(YOUR-LONG-ID)/usercopy
   GOOGLE_APPS_SCRIPT_SECRET=backup-secret-12345678
   ```

3. **Replace placeholders:**
   - `(YOUR-LONG-ID)` = The long ID from the URL (copied in Step 5)
   - `backup-secret-12345678` = The secret key you created in Step 4

4. **Save the file**

### Step 7: Restart the Backend

```bash
# Kill existing process
Get-Process -Name node | Stop-Process -Force

# Restart backend
cd backend
npm start
```

---

## Testing the Setup

### Test 1: Manual Backup Trigger

```bash
# In a new terminal, from project root
node test-backup.js
```

**Expected Output:**
```
Admin user logged in
Response Status: 200
Backup Result: {
  "success": true,
  "fileId": "...",
  "fileName": "backup-2026-05-01T...",
  "webViewLink": "https://drive.google.com/file/d/...",
  "timestamp": "2026-05-01T..."
}
```

### Test 2: Check Google Drive

1. Open Google Drive: https://drive.google.com
2. Look for folder: **`sri-vinayaka-backups`**
3. Inside should be your backup JSON files
4. Each file has format: `backup-TIMESTAMP.json`

### Test 3: Automatic Scheduled Backup

The backend will automatically backup every 6 hours:
- Check terminal logs for:
  ```
  ✅ File uploaded to Google Drive
     File ID: ...
     File Link: ...
  ```

---

## Troubleshooting

### Problem: "GOOGLE_APPS_SCRIPT_URL not configured"
**Solution:**
- Check backend/.env has correct URL from Step 5
- Make sure you copied the ENTIRE URL
- Restart backend with `npm start`

### Problem: "Invalid or missing secret key"
**Solution:**
- Check SECRET in backend/.env matches the CONFIG.SECRET_KEY in google-apps-script.gs
- Both must be EXACTLY the same
- Restart backend after fixing

### Problem: "403 Forbidden" or "Access Denied"
**Solution:**
- You may not have granted proper permissions in Step 5
- Go to https://script.google.com
- Find your "Sri Vinayaka Backup" project
- Click **Deploy** → Find deployment
- Click pencil icon to view details
- Check "Who has access" is set to "Anyone"

### Problem: Google Drive folder not created
**Solution:**
- First backup takes 2-3 seconds to create folder
- Check again after running test
- Make sure you granted permissions in Step 5

### Problem: Can't find deployment URL
**Solution:**
- Go to https://script.google.com
- Click your project: "Sri Vinayaka Backup"
- Click Deploy icon (top right)
- Find the "usercopy" deployment - click it
- URL appears in the dialog

---

## Advanced: Updating the Secret Key

If you want to change the secret key later:

1. **In Google Apps Script:**
   - Go to https://script.google.com
   - Open "Sri Vinayaka Backup" project
   - Find line: `SECRET_KEY: 'old-key'`
   - Change to: `SECRET_KEY: 'new-key'`
   - Press Ctrl+S to save
   - Apps Script automatically uses the latest code

2. **In Backend:**
   - Update `backend/.env`
   - Change: `GOOGLE_APPS_SCRIPT_SECRET=new-key`
   - Save file
   - Restart backend: `npm start`

---

## What Gets Backed Up?

Each backup file contains:
```json
{
  "timestamp": "2026-05-01T06:59:07.636Z",
  "totalLoans": 69,
  "totalInvestors": 10,
  "totalTransactions": 625,
  "totalPayments": 6,
  "loans": [...],
  "investors": [...],
  "transactions": [...],
  "payments": [...]
}
```

**Backup Schedule:**
- ✅ Manual: Anytime via `/api/backup/google-drive` endpoint
- ✅ Automatic: Every 6 hours (scheduled job)
- ✅ Transaction-triggered: After every 3 transactions
- ✅ Daily email: 8 PM IST with backup summary

---

## Security Notes

✅ **Secret Key**
- Stored in backend/.env (keep safe, don't commit to git)
- Verified on each request
- Prevents unauthorized uploads

✅ **Google Drive Access**
- Only accessible with secret key
- Backup files stored in your personal Google Drive
- You maintain full control

✅ **No Service Account Issues**
- Personal account handles all uploads
- No Google Workspace subscription needed
- Works with regular Google account

---

## Need Help?

1. Check terminal logs: `npm start` output will show detailed errors
2. Verify URLs and secrets match exactly (case-sensitive)
3. Test Apps Script independently using the test function:
   - In google-apps-script.gs, click Run → testBackupUpload()
   - Check browser console for test results

---

## Next Steps

1. ✅ Deploy Google Apps Script (this guide)
2. ✅ Update backend/.env with deployment URL
3. ✅ Restart backend
4. ✅ Run manual backup test
5. ✅ Verify files appear in Google Drive

Your backup system is now fully functional! 🎉
