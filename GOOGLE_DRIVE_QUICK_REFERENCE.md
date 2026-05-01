# 🚀 Google Drive Setup - Quick Reference Card

## What You Need to Do (5 Minutes)

### 1️⃣ Create Google Cloud Project
- Go to https://console.cloud.google.com
- Click "NEW PROJECT"
- Name it: "Sri Vinayaka Backup"
- Click CREATE

### 2️⃣ Enable Google Drive API
- Click "APIs & Services" → "Library"
- Search: "Google Drive API"
- Click ENABLE

### 3️⃣ Create Service Account & Get API Key
- Click "APIs & Services" → "Credentials"
- Click "+ CREATE CREDENTIALS" → "Service Account"
- Name: `sri-vinayaka-backup`
- Click CREATE AND CONTINUE
- Add "Editor" role
- Click CONTINUE
- Click CREATE KEY → Select JSON → CREATE
- **Save the downloaded JSON file** ⚠️

### 4️⃣ Extract API Key from JSON
- Open the downloaded JSON file
- Find the field: `"private_key"`
- **Copy the entire value** (looks like: `-----BEGIN RSA PRIVATE KEY-----\n...`)
- This is your: **GOOGLE_DRIVE_API_KEY**

### 5️⃣ Create Google Drive Folder & Get Folder ID
- Go to https://drive.google.com
- Create new folder: "Sri Vinayaka Backups"
- Open folder and copy URL
- Extract folder ID from URL: `https://drive.google.com/drive/folders/{FOLDER_ID}`
- This is your: **GOOGLE_DRIVE_FOLDER_ID**

### 6️⃣ Share Folder with Service Account
- From Google Cloud Console, copy service account email: `xxx@xxx.iam.gserviceaccount.com`
- In Google Drive, right-click folder → Share
- Paste service account email
- Select "Editor" permission
- Click Share

### 7️⃣ Update .env File
```env
GOOGLE_DRIVE_FOLDER_ID=1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7
GOOGLE_DRIVE_API_KEY=-----BEGIN RSA PRIVATE KEY-----\nMIIEpAIB...
```

### 8️⃣ Restart Backend
```bash
cd backend
npm run dev
```

**Done!** ✅ Backup system will now upload to Google Drive every 6 hours!

---

## 📍 Key Points

| Item | Where to Find | What It Looks Like |
|------|---------------|-------------------|
| **Google Cloud Console** | https://console.cloud.google.com | Project dashboard |
| **Google Drive API** | APIs & Services → Library | "Google Drive API" |
| **Service Account Email** | Credentials → Service Accounts | `xxx@xxx.iam.gserviceaccount.com` |
| **Private Key (API Key)** | Downloaded JSON file | `-----BEGIN RSA PRIVATE KEY-----` |
| **Folder ID** | Google Drive URL | `1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7` |

---

## ⚠️ Common Mistakes

❌ **Mistake 1:** Using wrong field from JSON
- ✅ Use `private_key` field
- ❌ Don't use `client_id` or `project_id`

❌ **Mistake 2:** Folder ID has extra spaces
- ✅ Copy from URL directly
- ❌ Don't add spaces or extra characters

❌ **Mistake 3:** Forgot to share folder
- ✅ Folder must be shared with service account email
- ❌ Sharing with your Gmail isn't enough

❌ **Mistake 4:** Wrong permission level
- ✅ Service account needs "Editor" access
- ❌ "Viewer" won't work

---

## ✅ Verification Steps

After setup, verify everything works:

**Step 1:** Check credentials in .env
```bash
cat backend/.env | grep GOOGLE_DRIVE
```
Should show values (not `YOUR_...`)

**Step 2:** Start backend
```bash
npm run dev
```
Should see: `✅ Scheduled backups: MongoDB (3h), Google Drive (6h)`

**Step 3:** Test backup
```bash
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  -X POST http://localhost:3001/api/backup/google-drive
```
Should return: `"success": true`

**Step 4:** Check Google Drive
- File should appear in "Sri Vinayaka Backups" folder
- Filename: `backup-2025-01-01T120000...json`

---

## 🆘 If Something Goes Wrong

| Error | Solution |
|-------|----------|
| "credentials not configured" | Check .env has both FOLDER_ID and API_KEY |
| "Invalid credentials" | Verify private_key copied correctly (check quotes) |
| Folder permission denied | Ensure folder is shared with service account email |
| File not uploading | Check folder ID has no extra spaces |
| Rate limit exceeded | Wait 5 minutes, then try again |

---

## 📞 Quick Support

**Full documentation:** See `GOOGLE_DRIVE_SETUP.md` for detailed steps

**Backend logs:** `npm run dev | grep -i google`

**Check .env:** `cat backend/.env | grep GOOGLE_DRIVE`

---

**⏱️ Total Setup Time: ~10 minutes** ⏱️

**Difficulty Level: Easy ✅**

---

Generated: 2025
