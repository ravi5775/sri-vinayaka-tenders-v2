# 📊 Google Drive Setup - Visual Flow & Architecture

## Complete Setup Flow

```
START: Google Drive Backup Setup
  │
  ├─────────────────────────────────────────────────────────┐
  │                                                         │
  ▼                                                         │
┌─────────────────────────────────────────────────────────┐ │
│ 1. CREATE GOOGLE CLOUD PROJECT                          │ │
│    https://console.cloud.google.com                     │ │
│    ├─ Click: NEW PROJECT                               │ │
│    ├─ Name: "Sri Vinayaka Backup"                       │ │
│    └─ CREATE                                             │ │
└─────────────────────────────────────────────────────────┘ │
  │                                                         │
  ▼                                                         │
┌─────────────────────────────────────────────────────────┐ │
│ 2. ENABLE GOOGLE DRIVE API                              │ │
│    APIs & Services → Library                            │ │
│    ├─ Search: "Google Drive API"                        │ │
│    └─ Click: ENABLE                                     │ │
└─────────────────────────────────────────────────────────┘ │
  │                                                         │
  ▼                                                         │
┌─────────────────────────────────────────────────────────┐ │
│ 3. CREATE SERVICE ACCOUNT                               │ │
│    APIs & Services → Credentials                        │ │
│    ├─ + CREATE CREDENTIALS → Service Account            │ │
│    ├─ Name: "sri-vinayaka-backup"                       │ │
│    ├─ CREATE AND CONTINUE                               │ │
│    ├─ Role: Editor                                      │ │
│    └─ CONTINUE                                           │
└─────────────────────────────────────────────────────────┘ │
  │                                                         │
  ▼                                                         │
┌─────────────────────────────────────────────────────────┐ │
│ 4. DOWNLOAD API KEY (JSON)                              │ │
│    ├─ CREATE KEY → JSON → CREATE                        │ │
│    ├─ JSON file downloads automatically                 │ │
│    └─ Save: service-account-key.json ⚠️                 │
│                                                          │
│    EXTRACT FROM JSON:                                   │
│    ├─ Field: "private_key"                              │
│    └─ Value: -----BEGIN RSA PRIVATE KEY-----...         │
│       └─→ This is: GOOGLE_DRIVE_API_KEY                 │
└─────────────────────────────────────────────────────────┘ │
  │                                                         │
  ├─────────────────────────────────────────────────────┐  │
  │                                                     │  │
  ▼                                                     ▼  │
┌──────────────────────────┐  ┌──────────────────────────┐ │
│ 5A. CREATE FOLDER        │  │ 5B. GET SERVICE EMAIL    │ │
│     (in Google Drive)     │  │     (in Google Cloud)    │ │
│                          │  │                          │ │
│ ├─ Drive.google.com      │  │ ├─ Service Accounts      │ │
│ ├─ + New → Folder        │  │ ├─ Copy email:           │ │
│ ├─ Name folder           │  │ │  xxx@xxx.iam...        │ │
│ └─ GET FOLDER ID         │  │ └─ Service Account Email │
│    from URL              │  └──────────────────────────┘ │
│                          │                                │
│ https://drive.google..   │                                │
│ /folders/{FOLDER_ID}     │                                │
│                          │                                │
│ This is:                 │                                │
│ GOOGLE_DRIVE_FOLDER_ID   │                                │
└──────────────────────────┘                                │
  │                                                         │
  ▼                                                         │
┌─────────────────────────────────────────────────────────┐ │
│ 6. SHARE FOLDER WITH SERVICE ACCOUNT                    │ │
│    ├─ Google Drive: Right-click folder                  │ │
│    ├─ Select: Share                                     │ │
│    ├─ Paste: Service account email                      │ │
│    ├─ Permission: Editor                                │ │
│    └─ Share                                              │
└─────────────────────────────────────────────────────────┘ │
  │                                                         │
  ▼                                                         │
┌─────────────────────────────────────────────────────────┐ │
│ 7. UPDATE .env FILE                                     │ │
│    backend/.env                                          │ │
│                                                          │ │
│    BEFORE:                                              │ │
│    GOOGLE_DRIVE_FOLDER_ID=YOUR_GOOGLE_DRIVE_FOLDER_ID  │ │
│    GOOGLE_DRIVE_API_KEY=YOUR_GOOGLE_DRIVE_API_KEY       │ │
│                                                          │ │
│    AFTER:                                               │ │
│    GOOGLE_DRIVE_FOLDER_ID=1a2b3c4d5e6f7g8h9i0j...      │ │
│    GOOGLE_DRIVE_API_KEY=-----BEGIN RSA PRIVATE...       │ │
└─────────────────────────────────────────────────────────┘ │
  │                                                         │
  ▼                                                         │ │
┌─────────────────────────────────────────────────────────┐ │ │
│ 8. RESTART BACKEND                                      │ │ │
│    Terminal: npm run dev                                │ │ │
│                                                          │ │ │
│    Should see:                                          │ │ │
│    ✅ Scheduled backups: MongoDB (3h), Google Drive...  │ │ │
│                                                          │ │ │
│    If ERROR:                                            │ │ │
│    ❌ Google Drive credentials not configured           │ │ │
│       └─ Check .env values, try again                  │ │ │
└─────────────────────────────────────────────────────────┘ │ │
  │                                                         │ │
  ▼                                                         │ │
┌─────────────────────────────────────────────────────────┐ │ │
│ 9. VERIFY & TEST                                        │ │ │
│    ├─ Health check (public):                            │ │ │
│    │  curl http://localhost:3001/api/health             │ │ │
│    │  → Should return 200 OK                            │ │ │
│    │                                                    │ │ │
│    ├─ Backup status (admin):                            │ │ │
│    │  curl -H "Authorization: Bearer TOKEN"...          │ │ │
│    │  http://localhost:3001/api/backup/status           │ │ │
│    │  → Should show schedules                           │ │ │
│    │                                                    │ │ │
│    └─ Manual backup test:                               │ │ │
│       curl -X POST -H "Authorization: Bearer TOKEN"...  │ │ │
│       http://localhost:3001/api/backup/google-drive     │ │ │
│       → Should return "success": true                   │ │ │
└─────────────────────────────────────────────────────────┘ │ │
  │                                                         │ │
  ▼                                                         │ │
┌─────────────────────────────────────────────────────────┐ │ │
│ 10. VERIFY FILE IN GOOGLE DRIVE                         │ │ │
│     ├─ Go to drive.google.com                           │ │ │
│     ├─ Open "Sri Vinayaka Backups" folder               │ │ │
│     ├─ Should see file:                                 │ │ │
│     │  backup-2025-01-01T120000-000Z.json               │ │ │
│     └─ ✅ SUCCESS!                                      │ │ │
└─────────────────────────────────────────────────────────┘ │ │
  │                                                         │ │
  └─────────────────────────────────────────────────────────┘ │
                                                            │
                              END: Setup Complete! 🎉
```

---

## Data Flow After Setup

```
┌──────────────────────────────────────────────────────────────┐
│              Sri Vinayaka Database (PostgreSQL)              │
│              - Loans + Transactions                          │
│              - Investors + Payments                          │
└──────────────────────────────────────────────────────────────┘
                            │
                            │ Backup Service
                            │ Fetches Data
                            ▼
┌──────────────────────────────────────────────────────────────┐
│              Backup Data (JSON Format)                       │
│              Timestamp: 2025-01-01T12:00:00Z                │
│              Size: ~500KB-2MB                                │
└──────────────────────────────────────────────────────────────┘
         │                      │                      │
         │                      │                      │
    ┌────▼─────┐          ┌────▼─────┐          ┌────▼──────┐
    │   LOCAL   │          │ MONGODB   │          │ GOOGLE    │
    │  ./backups│          │  ATLAS    │          │  DRIVE    │
    │   JSON    │          │  Cloud    │          │  PRIMARY  │
    └──────────┘          └──────────┘          └───────────┘
         │                      │                      │
         │ Every 3h             │ Every 6h             │ Every 6h
         │ + Manual             │ + Manual             │ + Manual
         │ + Transaction        │ + Transaction        │ + Transaction
         │                      │                      │
         └──────────────────────┴──────────────────────┘
                               │
                         Email Report
                         Daily 8 PM IST
                         To All Admins
                               │
                               ▼
                    ┌──────────────────────┐
                    │  Admin Email Inbox   │
                    │  📧 Backup Report    │
                    │  🚨 Payment Alert    │
                    └──────────────────────┘
```

---

## Credentials Mapping

```
Google Cloud Console              →  Your Backend .env
───────────────────────────────────────────────────────

Service Account
│
├─ Project: "Sri Vinayaka..."    
│
├─ Service Account Email
│  └─→ xxx@xxx.iam.gserviceaccount.com
│     └─→ (Used for folder sharing)
│
├─ API Key (Private Key)
│  └─→ -----BEGIN RSA PRIVATE KEY-----
│      MIIEpAIBAAKCAQEA2x8q7v9k...
│      -----END RSA PRIVATE KEY-----
│     └─→ GOOGLE_DRIVE_API_KEY


Google Drive                      →  Your Backend .env
────────────────────────────────────────────────────

Folder: "Sri Vinayaka Backups"
│
└─ Folder ID (from URL)
   https://drive.google.com/drive/folders/
   1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7
   └─→ GOOGLE_DRIVE_FOLDER_ID=1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7
```

---

## Time-Based Backup Schedule

```
                            24-Hour Timeline
├─────────┬─────────┬─────────┬─────────┬─────────┬─────────┤
0h        3h        6h        9h        12h       15h       18h       21h      24h
│         │         │         │         │         │         │         │        │
│         ▼         │         ▼         │         ▼         │         │        │
│     MongoDB       │       Google      │      MongoDB      │         │        │
│     Backup        │       Drive       │      Backup       │         │        │
│     (Auto)        │       Backup      │      (Auto)       │         │        │
│                   │       (Auto)      │                   │         │        │
│                   │                   │                   │         │        │
│                   │                   │                   │      ┌──▼──┐     │
│                   │                   │                   │      │ 20:00    │
│                   │                   │                   │      │ 8 PM     │
│                   │                   │                   │      │ Daily    │
│                   │                   │                   │      │ Email    │
│                   │                   │                   │      │ Report   │
│                   │                   │                   │      └─────┘     │
└─────────┴─────────┴─────────┴─────────┴─────────┴─────────┴─────────┴────────┘

Plus:
• Every 3 transactions/payments → All destinations
• >₹30,000 payment → Alert email to all admins (immediate)
• Manual trigger anytime → All destinations
```

---

## Files Created During Setup

```
Google Cloud Console
    │
    └─ service-account-key.json (Downloaded)
       ├─ type: "service_account"
       ├─ project_id: "sri-vinayaka-backup-xxxxx"
       ├─ private_key_id: "xxxxx"
       ├─ private_key: "-----BEGIN RSA..." ⚠️ Secret!
       ├─ client_email: "xxx@xxx.iam.gserviceaccount.com"
       └─ [other fields...]

Google Drive
    │
    └─ Sri Vinayaka Backups/ (Folder)
       ├─ backup-2025-01-01T120000-000Z.json
       ├─ backup-2025-01-01T060000-000Z.json
       └─ backup-2024-12-31T180000-000Z.json
          [Automatic backups appear here]

Your Project
    │
    └─ backend/.env (Updated)
       ├─ GOOGLE_DRIVE_FOLDER_ID=1a2b3c4d...
       └─ GOOGLE_DRIVE_API_KEY=-----BEGIN...
```

---

## Error Scenarios & Recovery

```
SCENARIO 1: Folder ID Wrong
────────────────────────────
Error: "Permission denied: Folder not found"
│
├─ ROOT CAUSE: Folder ID has extra spaces or wrong value
├─ CHECK: Verify folder ID from URL (no spaces!)
├─ SOLUTION: Update .env with correct folder ID
└─ RETRY: npm run dev


SCENARIO 2: API Key Invalid
────────────────────────────
Error: "Invalid credentials provided"
│
├─ ROOT CAUSE: Private key copied incorrectly
├─ CHECK: Should start with "-----BEGIN RSA..."
├─ SOLUTION: Regenerate key from Google Cloud Console
└─ RETRY: Update .env + npm run dev


SCENARIO 3: Folder Not Shared
──────────────────────────────
Error: "Forbidden: Unable to write to folder"
│
├─ ROOT CAUSE: Folder not shared with service account
├─ CHECK: Verify folder permissions
├─ SOLUTION: Share folder with service account email
└─ RETRY: npm run dev


SCENARIO 4: API Not Enabled
────────────────────────────
Error: "Google Drive API not enabled"
│
├─ ROOT CAUSE: Forgot to enable API in Google Cloud
├─ CHECK: APIs & Services → Library
├─ SOLUTION: Enable "Google Drive API"
└─ RETRY: npm run dev
```

---

## Success Indicators

```
✅ EVERYTHING WORKING

Backend Logs:
✅ "Scheduled backups: MongoDB (3h), Google Drive (6h)"
✅ No error messages on startup
✅ Health check returns 200 OK

API Responses:
✅ /api/backup/status returns schedules
✅ POST /api/backup/google-drive returns "success": true
✅ All admin endpoints accessible

Google Drive:
✅ Files appear in "Sri Vinayaka Backups" folder
✅ Files have timestamps in names
✅ Files can be downloaded and opened
```

---

## Quick Checklist

```
□ Google Cloud Project Created
  └─ Name: "Sri Vinayaka Backup"

□ Google Drive API Enabled
  └─ APIs & Services → Library → Enabled

□ Service Account Created
  └─ Email: xxx@xxx.iam.gserviceaccount.com
  └─ Role: Editor

□ API Key Downloaded
  └─ File: service-account-key.json
  └─ Extracted private_key value

□ Google Drive Folder Created
  └─ Name: "Sri Vinayaka Backups"
  └─ Folder ID: 1a2b3c4d...

□ Folder Shared with Service Account
  └─ Permission: Editor
  └─ Email: xxx@xxx.iam.gserviceaccount.com

□ .env File Updated
  └─ GOOGLE_DRIVE_FOLDER_ID = 1a2b3c4d...
  └─ GOOGLE_DRIVE_API_KEY = -----BEGIN...

□ Backend Restarted
  └─ Command: npm run dev
  └─ Shows: ✅ Scheduled backups...

□ Testing Completed
  └─ Health check: 200 OK
  └─ Backup status: Shows schedules
  └─ Manual backup: "success": true

□ Verified in Google Drive
  └─ File uploaded to folder
  └─ Timestamp in filename
```

---

**Total Setup Time: ~10 minutes** ⏱️

**Difficulty: Easy** ✅

**Support: See GOOGLE_DRIVE_SETUP.md for detailed instructions**

Generated: 2025
