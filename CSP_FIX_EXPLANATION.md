# Content Security Policy (CSP) Fix - Google Drive Backup

## Problem Diagnosis

You encountered three CSP-related errors on your cloud deployment:

```
ERROR 1: "frame-ancestors is ignored when delivered via a <meta> element"
ERROR 2: "X-Frame-Options may only be set via an HTTP header"
ERROR 3: "connect-src 'self' violates... script.google.com" ⚠️ **BLOCKER**
```

### Root Cause

The frontend (SettingsModal.tsx) was **directly calling the Google Apps Script URL** from the browser:

```javascript
// ❌ BROKEN - Frontend tries to call external API
fetch('https://script.google.com/macros/s/AKfycbx...', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload),
});
```

**Why it failed:**
1. `index.html` had a restrictive CSP meta tag: `connect-src 'self'`
   - This only allows connections to the same origin
   - Blocks cross-origin requests to script.google.com
   
2. Meta tags **cannot** enforce:
   - `frame-ancestors` directive
   - `X-Frame-Options` header
   - These MUST be HTTP response headers

3. Browser blocked the fetch with error:
   ```
   Refused to connect because it violates the document's Content Security Policy
   ```

---

## Solution Architecture

### ✅ FIXED FLOW

```
Frontend Button Click
  ↓
fetch('/api/backup/google-drive') ← Same origin, allowed by CSP
  ↓
Backend Express app
  ↓
Backend calls Google Apps Script ← Backend-to-backend, no CSP restrictions
  ↓
Google Drive saves backup file
  ↓
Response sent back to frontend
```

### Changes Made

#### 1. **Frontend (src/components/SettingsModal.tsx)**
- ❌ Removed direct Google Apps Script URL: `const APPS_SCRIPT_URL = '...'`
- ✅ Changed to backend API call: `fetch('/api/backup/google-drive', ...)`
- No request body needed (backend fetches data internally)

**Before:**
```javascript
await fetch(APPS_SCRIPT_URL, {
  method: 'POST',
  mode: 'no-cors',
  body: JSON.stringify(payload),
});
```

**After:**
```javascript
const response = await fetch('/api/backup/google-drive', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
});
```

#### 2. **Frontend (index.html)**
- ❌ Removed restrictive CSP meta tag
- ✅ Removed conflicting security headers in meta tags
- ✅ Let backend set proper HTTP headers via Helmet

**Before:**
```html
<meta http-equiv="Content-Security-Policy"
  content="connect-src 'self'; frame-ancestors 'none'; ..." />
<meta http-equiv="X-Frame-Options" content="DENY" />
<meta http-equiv="Strict-Transport-Security" content="..." />
```

**After:**
```html
<!-- Security Headers: Set via HTTP response headers from backend -->
<!-- See backend/src/app.js for Helmet security configuration -->
```

#### 3. **Backend (backend/src/app.js)**
- ❌ Changed: `contentSecurityPolicy: false`
- ✅ Enabled proper CSP with directives
- ✅ Added frame-ancestors and X-Frame-Options as HTTP headers (not meta)

**Before:**
```javascript
app.use(helmet({
  contentSecurityPolicy: false, // ❌ Disabled
  ...
}));
```

**After:**
```javascript
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'blob:'],
      connectSrc: ["'self'"],  // ✅ Frontend connections to same-origin
      frameAncestors: ["'none'"],  // ✅ Set as HTTP header
      baseUri: ["'self'"],
      formAction: ["'self'"],
    },
  },
  hsts: { ... },
  xFrameOptions: { action: 'deny' },  // ✅ Set as HTTP header
}));
```

---

## How It Works Now

### Flow Diagram
```
User clicks "Backup to Google Drive" button in frontend
    ↓
SettingsModal.handleExportData() calls fetch('/api/backup/google-drive')
    ↓
Request reaches backend (same origin, passes CSP) ✅
    ↓
Backend Express app has proper HTTP headers set by Helmet:
  - X-Frame-Options: DENY (HTTP header, not meta)
  - Content-Security-Policy: connect-src 'self'; (HTTP header)
  - HSTS: max-age=31536000 (HTTP header)
    ↓
Backend route handler POST /api/backup/google-drive triggers
    ↓
backupToGoogleDrive() fetches all backup data internally
    ↓
Backend makes fetch to Google Apps Script URL
  (Backend→Backend connection, NOT restricted by frontend CSP) ✅
    ↓
Google Apps Script receives backup JSON, creates file in Google Drive
    ↓
Success response returned to backend
    ↓
Backend returns 200 success to frontend
    ↓
Frontend shows toast: "Backup uploaded to Google Drive!"
    ↓
User can verify file in Google Drive
```

---

## Security Implications

### Why This Is More Secure

1. **API Key Protection**: Google Apps Script URL is now in backend .env, not exposed in frontend code
2. **CSP Enforcement**: Frontend is properly protected with restrictive CSP:
   - Can only connect to same-origin
   - External API calls happen server-side only
3. **Proper HTTP Headers**: Security headers now set correctly via HTTP (not meta tags)
4. **Backend Validation**: Backend validates all backup data before sending

### CSP Headers Now Set Correctly

✅ **HTTP Response Headers** (from backend):
- `X-Frame-Options: DENY` (prevents clickjacking)
- `Content-Security-Policy: connect-src 'self'; ...` (controls external connections)
- `Strict-Transport-Security: max-age=31536000` (enforces HTTPS)

---

## Testing Checklist

After deploying this fix on EC2:

1. **Frontend Build**:
   ```bash
   cd /root/sri-vinayaka-tenders-v2
   npm run build
   pm2 restart svt-frontend --update-env
   ```

2. **Backend Restart** (to load new Helmet config):
   ```bash
   cd backend
   pm2 restart svt-backend --update-env
   ```

3. **Test Backup Button**:
   - Open http://13.61.5.220 in browser
   - Go to Settings
   - Click "Backup to Google Drive"
   - Check browser console - should **NOT** see CSP errors anymore
   - Toast should show: "Backup uploaded to Google Drive!"

4. **Verify Browser Console**:
   - Should NOT see: `"connect-src 'self'" ... script.google.com`
   - Should NOT see: `X-Frame-Options may only be set via HTTP header`
   - Should NOT see: `frame-ancestors is ignored when delivered via <meta>`

5. **Check Google Drive**:
   - Log in to your Google Drive
   - Look in "sri-vinayaka-backups" folder
   - Should see new backup file with timestamp

---

## Files Changed

1. **frontend/index.html**
   - Removed restrictive CSP meta tag
   - Removed X-Frame-Options meta tag
   - Added comment pointing to backend config

2. **backend/src/app.js**
   - Enabled proper CSP with Helmet directives
   - Configured frame-ancestors as HTTP header
   - Configured X-Frame-Options as HTTP header
   - Added HSTS header

3. **src/components/SettingsModal.tsx**
   - Removed direct Google Apps Script URL
   - Changed to backend API call: `/api/backup/google-drive`
   - Simplified payload (backend fetches data internally)

---

## Rollback Plan (if needed)

If something breaks:

```bash
git revert <commit-hash>
git push origin vercel-psql-migration
cd backend && pm2 restart svt-backend --update-env
cd .. && npm run build && pm2 restart svt-frontend --update-env
```

---

## Additional Notes

### Why frontend shouldn't call external APIs

- **Security**: Backend controls authentication, rate limiting, API keys
- **CSP Compliance**: Browser CSP policies restrict frontend to same-origin
- **Performance**: Backend can cache, optimize, batch requests
- **Maintainability**: Single point of control for external integrations

### Why HTTP headers are better than meta tags

| Feature | HTTP Header | Meta Tag |
|---------|------------|----------|
| frame-ancestors | ✅ Works | ❌ Ignored |
| X-Frame-Options | ✅ Works | ❌ Ignored |
| HSTS | ✅ Works | ⚠️ Limited |
| CSP (most directives) | ✅ Works | ✅ Works |
| Enforcement | ✅ Strict | ⚠️ Loose |

---

## Next Steps

1. Deploy these changes to your EC2 instance
2. Test the backup button (see Testing Checklist above)
3. Verify no CSP errors in browser console
4. Monitor backend logs for any issues
5. Confirm backup file appears in Google Drive

All backup functionality should now work correctly! 🎉
