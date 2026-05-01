# Deployment Instructions - CSP Fix for Cloud Instance

## Quick Deploy Steps

### 1. SSH into your EC2 instance
```bash
ssh -i your-key.pem ec2-user@13.61.5.220
```

### 2. Update code from GitHub
```bash
cd ~/sri-vinayaka-tenders-v2
git pull origin vercel-psql-migration
```

### 3. Rebuild frontend
```bash
npm run build
pm2 restart svt-frontend
```

### 4. Restart backend with new Helmet CSP config
```bash
cd backend
pm2 restart svt-backend --update-env
```

### 5. Verify services are running
```bash
pm2 status
```

Expected output:
```
┌────┬────────────────────┬──────────┬──────┬───────────┬──────────┬──────────┐
│ id │ name               │ mode     │ ↺    │ status    │ cpu      │ memory   │
├────┼────────────────────┼──────────┼──────┼───────────┼──────────┼──────────┤
│ 0  │ svt-backend        │ fork     │ ↑    │ online    │ 0%       │ 16.6mb   │
│ 1  │ svt-frontend       │ fork     │ ↑    │ online    │ 0%       │ 58.6mb   │
└────┴────────────────────┴──────────┴──────┴───────────┴──────────┴──────────┘
```

---

## Testing the Fix

### 1. Open browser and go to http://13.61.5.220
- Wait for page to load
- Open Developer Console (F12)

### 2. Go to Settings (Admin)
- Click Settings icon/menu
- Look for "Backup" section

### 3. Click "Backup to Google Drive" button
- Check browser console (F12 → Console tab)
- Should **NOT** see any CSP errors
- Should see: "Backup uploaded to Google Drive & downloaded locally!" (green toast)

### 4. Verify CSP Headers
In browser console, run:
```javascript
// Check response headers from backend
fetch('/api/backup/google-drive', {method: 'POST'})
  .then(r => {
    console.log('CSP Header:', r.headers.get('content-security-policy'));
    console.log('X-Frame-Options:', r.headers.get('x-frame-options'));
  });
```

Should see:
```
CSP Header: default-src 'self'; script-src 'self' 'unsafe-inline'; ...
X-Frame-Options: DENY
```

### 5. Check Google Drive
- Log into srivinayakatender@gmail.com
- Go to Google Drive
- Check "sri-vinayaka-backups" folder
- Should see new backup file with ISO timestamp in name

---

## Troubleshooting

### If you see CSP errors still:

1. **Clear browser cache** (Ctrl+Shift+Delete)
   - Clear all browsing data
   - Revisit http://13.61.5.220

2. **Verify backend restart**
   ```bash
   pm2 logs svt-backend
   ```
   Look for: "App is running on port 3001"

3. **Check .env is loaded**
   ```bash
   cd backend && pm2 restart svt-backend --update-env
   ```

4. **Verify Helmet config**
   ```bash
   curl -I http://13.61.5.220/api/backup/google-drive \
     -H "Authorization: Bearer YOUR_JWT_TOKEN"
   ```
   Should see CSP header in response

### If backup still fails:

1. **Check backend logs**
   ```bash
   pm2 logs svt-backend | tail -50
   ```

2. **Check if Google Apps Script is reachable**
   ```bash
   curl -I https://script.google.com/macros/s/AKfycbxN0pnAP7nU1CWNmwHqqpcG7Ahtu48afdCyutQBSDLj7I3SJ5t0I7dpmioKiY7GYwDU2A/exec
   ```

3. **Verify backend .env has Google Apps Script URL**
   ```bash
   cd backend && grep GOOGLE_APPS_SCRIPT .env
   ```
   Should show: `GOOGLE_APPS_SCRIPT_URL=https://script.google.com/...`

---

## What Changed

| File | Change |
|------|--------|
| `index.html` | Removed restrictive CSP meta tags |
| `backend/src/app.js` | Enabled proper Helmet CSP headers |
| `src/components/SettingsModal.tsx` | Changed to call `/api/backup/google-drive` backend API |

---

## Rollback (if needed)

If something breaks, rollback to previous version:

```bash
cd ~/sri-vinayaka-tenders-v2
git checkout HEAD~1
npm run build
cd backend && pm2 restart svt-backend --update-env
cd .. && pm2 restart svt-frontend
```

---

## Expected Behavior After Fix

✅ **Backup Button Works**
- Click backup button → No CSP errors
- Browser console is clean (except for normal app logs)

✅ **Security Headers Set Correctly**
- HTTP response includes proper CSP headers
- No meta tag warnings in console

✅ **Backup File Created**
- File appears in Google Drive
- File contains current data snapshot
- Email notification sent (if enabled)

✅ **No Console Errors**
- Gone: "Refused to connect because it violates the document's Content Security Policy"
- Gone: "X-Frame-Options may only be set via an HTTP header"
- Gone: "frame-ancestors is ignored when delivered via a <meta> element"

---

## Performance Notes

Backend API call adds minimal latency:
- Frontend → Backend: ~1-5ms (same server)
- Backend → Google Apps Script: ~2-5 seconds (as before)
- Total time: ~2-5 seconds (same as direct call)

No performance regression - actually more secure!

---

## Next Steps (Optional)

After confirming backup works:

1. Consider using HTTPS instead of HTTP
   - Update `BASE_URL=https://13.61.5.220` in backend/.env
   - Set up SSL certificate (Let's Encrypt recommended)
   - Restart backend and frontend

2. Test other backup methods:
   - MongoDB backup (if enabled)
   - Local backup download
   - Email with JSON attachment

3. Monitor logs for any issues:
   ```bash
   pm2 logs --lines=100
   ```

---

**Questions?** Check `/memories/` for detailed technical explanations.
