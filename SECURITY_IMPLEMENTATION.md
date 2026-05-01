# 🔐 Security Implementation Guide - Sri Vinayaka Tenders v2

## Overview

This document details the comprehensive security improvements implemented to:
1. Reduce JWT token expiration to 15 minutes
2. Restrict sensitive API endpoints to admin users only
3. Mask sensitive information in error responses
4. Prevent information disclosure to public/unauthenticated users

---

## 🔑 JWT Token Expiration Changes

### Previous Configuration
```env
JWT_EXPIRE=24h              # 24 hours (too long - security risk)
JWT_REFRESH_EXPIRE=7d       # 7 days
```

### Updated Configuration ✅
```env
JWT_EXPIRE=15m              # 15 minutes (short-lived access token)
JWT_REFRESH_EXPIRE=7d       # 7 days (refresh token stays longer)
```

### Benefits
✅ **Reduced attack surface** - Shorter window for token misuse
✅ **Better security** - Compromised tokens have limited lifetime
✅ **Compliance** - Follows OAuth 2.0 best practices
✅ **Refresh token flow** - Long-lived refresh tokens reduce server load

### Impact
- Users must refresh their token every 15 minutes
- Refresh token endpoint must be called to get new access token
- More secure than 24-hour access tokens

---

## 🛡️ Admin-Only Endpoints Middleware

### New Middleware: `requireAdmin.js`

**File Created:** `backend/src/middleware/requireAdmin.js`

**Purpose:** Ensures user is authenticated AND has admin role

**Behavior:**
```javascript
// Returns 401 if not authenticated
{
  success: false,
  error: {
    code: 'UNAUTHORIZED',
    message: 'Authentication required',
    timestamp: '2025-01-01T12:00:00.000Z'
  }
}

// Returns 403 if authenticated but not admin
{
  success: false,
  error: {
    code: 'FORBIDDEN',
    message: 'Admin access required',
    timestamp: '2025-01-01T12:00:00.000Z'
  }
}
```

### Applied To Backup API Endpoints

All backup endpoints now require admin role:
```javascript
router.use(requireAdmin); // Applied to all routes

// All these endpoints now require admin:
- POST /api/backup/full           ✅ Admin only
- POST /api/backup/local          ✅ Admin only
- POST /api/backup/mongodb        ✅ Admin only
- POST /api/backup/google-drive   ✅ Admin only
- POST /api/backup/email          ✅ Admin only
- GET  /api/backup/status         ✅ Admin only
- GET  /api/backup/metadata       ✅ Admin only
- POST /api/backup/reset-counter  ✅ Admin only
```

---

## 🔒 Error Response Masking

### New Middleware: `errorHandler.js`

**File Created:** `backend/src/middleware/errorHandler.js`

**Purpose:** Masks sensitive information in error responses based on user role

### Response Behavior

#### For Authenticated Admin Users ✅
Full error details provided for debugging:
```json
{
  "success": false,
  "error": {
    "code": "BACKUP_ERROR",
    "message": "MongoDB connection failed: ECONNREFUSED 127.0.0.1:27017",
    "timestamp": "2025-01-01T12:00:00.000Z",
    "stack": "Error: MongoDB connection failed..." // Only in DEBUG=true
  }
}
```

#### For Public/Unauthenticated Users 🚫
Generic error messages without sensitive details:
```json
{
  "success": false,
  "error": {
    "code": "SERVER_ERROR",
    "message": "An error occurred. Please contact support",
    "timestamp": "2025-01-01T12:00:00.000Z"
  }
}
```

### Standard Error Codes

| HTTP Code | Code | Message |
|-----------|------|---------|
| 400 | `BAD_REQUEST` | Invalid request parameters |
| 401 | `UNAUTHORIZED` | Authentication required |
| 403 | `FORBIDDEN` | Access denied |
| 404 | `NOT_FOUND` | Resource not found |
| 429 | `RATE_LIMIT_EXCEEDED` | Too many requests. Please try again later |
| 500 | `SERVER_ERROR` | An error occurred. Please contact support |

### Sensitive Data Masking

The `maskSensitiveData()` function masks:
- ✅ Database URLs (shows `postgresql://***:***@localhost/***`)
- ✅ Connection strings (shows `mongodb://***:***@*.mongodb.net/***`)
- ✅ API keys (shows only last 4 chars: `***ABCD`)
- ✅ Email addresses (shows `ab***@domain.com`)

---

## 📋 Backup API Endpoint Responses

### Before (Information Disclosure Risk)
```json
{
  "error": "MongoDB backup failed: ECONNREFUSED Connection refused"
}
```

### After (Masked for Public)
```json
{
  "success": false,
  "error": {
    "code": "MONGODB_BACKUP_ERROR",
    "message": "MongoDB backup failed",
    "timestamp": "2025-01-01T12:00:00.000Z"
  }
}
```

---

## 🔐 Implementation Details

### 1. JWT Token Changes ✅

**File:** `backend/.env`
```env
JWT_EXPIRE=15m              # ← Changed from 24h
JWT_REFRESH_EXPIRE=7d       # ← Unchanged
```

**Effect:**
- Access tokens valid for 15 minutes only
- Users receive 401 after 15 minutes
- Refresh endpoint (`/api/auth/refresh`) must be called
- New access token issued with another 15 minutes

### 2. Admin-Only Middleware ✅

**File:** `backend/src/middleware/requireAdmin.js`

**Applied in:** `backend/src/routes/backup.js`
```javascript
router.use(requireAdmin); // Line 18 - All routes protected
```

**Checks:**
1. User is authenticated (has valid JWT)
2. User role is 'admin'
3. Returns 403 if not admin, 401 if not authenticated

### 3. Error Masking ✅

**File:** `backend/src/middleware/errorHandler.js`

**Applied in:** `backend/src/app.js`
```javascript
const errorHandler = require('./middleware/errorHandler');
// ...
app.use(errorHandler); // Line 147
```

**Logic:**
- Checks `req.user.role === 'admin'`
- Admins get full error details
- Non-admins/public get generic messages
- All errors logged server-side for debugging

### 4. Backup Route Updates ✅

**File:** `backend/src/routes/backup.js`

**Changes:**
- Added `requireAdmin` middleware (line 18)
- Updated all responses to include `success` field
- Masked sensitive data in responses
- Changed error messages to generic codes
- Removed exposed database connection info

---

## 🧪 Testing the Security

### Test 1: Unauthenticated Request
```bash
curl http://localhost:3001/api/backup/status
# Response (401):
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required",
    "timestamp": "2025-01-01T12:00:00.000Z"
  }
}
```

### Test 2: Non-Admin User Request
```bash
curl -H "Authorization: Bearer $USER_TOKEN" http://localhost:3001/api/backup/status
# Response (403):
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "Admin access required",
    "timestamp": "2025-01-01T12:00:00.000Z"
  }
}
```

### Test 3: Admin Request (Valid)
```bash
curl -H "Authorization: Bearer $ADMIN_TOKEN" http://localhost:3001/api/backup/status
# Response (200):
{
  "success": true,
  "status": "ok",
  "transactionCounter": 2,
  "transactionsUntilBackup": 1,
  "schedules": {...}
}
```

### Test 4: JWT Token Expiration (15 min)
```bash
# Wait 15 minutes, then try:
curl -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/loans

# Response (401):
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required",
    "timestamp": "2025-01-01T12:00:00.000Z"
  }
}

# Call refresh endpoint to get new token:
curl -X POST http://localhost:3001/api/auth/refresh
```

---

## 📊 Security Checklist

### ✅ Completed
- [x] JWT expiration reduced to 15 minutes
- [x] Backup endpoints restricted to admin only
- [x] Error responses mask sensitive data
- [x] Public users see only status codes and generic messages
- [x] Admin users see full details for debugging
- [x] All error responses include error codes
- [x] Timestamps included in all error responses
- [x] Connection strings masked in responses
- [x] API keys masked in responses
- [x] Email addresses partially masked in responses
- [x] Database URLs masked in responses
- [x] Error messages logged server-side
- [x] No sensitive info in HTTP responses

---

## 🔄 Refresh Token Flow

### How It Works

**Step 1: User Logs In**
```bash
POST /api/auth/login
Response: { accessToken, refreshToken, expiresIn: 900 } # 15 min
```

**Step 2: Use Access Token (Valid for 15 minutes)**
```bash
GET /api/loans
Headers: { Authorization: "Bearer $ACCESS_TOKEN" }
```

**Step 3: Access Token Expires**
```bash
# After 15 minutes:
GET /api/loans
Response (401): { code: 'UNAUTHORIZED', message: 'Authentication required' }
```

**Step 4: Refresh Token to Get New Access Token**
```bash
POST /api/auth/refresh
Headers: { Authorization: "Bearer $REFRESH_TOKEN" }
Response: { accessToken, expiresIn: 900 } # New token, valid for 15 min
```

**Step 5: Continue with New Token**
```bash
GET /api/loans
Headers: { Authorization: "Bearer $NEW_ACCESS_TOKEN" }
```

---

## 🔧 Deploying the Changes

### 1. Update Environment
```bash
cd backend

# Update .env - JWT_EXPIRE is already set to 15m
cat .env | grep JWT_EXPIRE
# Should show: JWT_EXPIRE=15m
```

### 2. Install Dependencies
```bash
npm install
# No new dependencies added
```

### 3. Restart Backend
```bash
npm run dev
# Or with PM2:
pm2 restart sri-vinayaka-backend
```

### 4. Verify Changes
```bash
# Test health endpoint (no auth required)
curl http://localhost:3001/api/health

# Test protected backup endpoint (should get 401)
curl http://localhost:3001/api/backup/status

# Error response should be generic (no sensitive info):
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required"
  }
}
```

---

## 📝 Files Modified

| File | Changes |
|------|---------|
| `backend/.env` | Updated JWT_EXPIRE to 15m |
| `backend/src/middleware/requireAdmin.js` | Created - admin-only middleware |
| `backend/src/middleware/errorHandler.js` | Created - error response masking |
| `backend/src/app.js` | Added errorHandler import and registration |
| `backend/src/routes/backup.js` | Added requireAdmin middleware, masked responses |

---

## 🎯 Security Benefits

### Before Implementation
❌ 24-hour JWT tokens (too long-lived)
❌ Public users could access backup API
❌ Sensitive error details exposed to attackers
❌ Database connection strings visible in responses
❌ API keys partially visible

### After Implementation
✅ 15-minute JWT tokens (reduced attack window)
✅ Only authenticated admins can access backup API
✅ Public users see only generic error messages
✅ All sensitive data masked in responses
✅ Full errors logged server-side for debugging
✅ Compliance with security best practices

---

## 🚀 Production Deployment

### Considerations
1. **Token Expiration Impact**: Users will need to refresh tokens every 15 minutes
   - Frontend must handle 401 errors gracefully
   - Implement automatic token refresh in API client
   - Show "Session expired" message to users

2. **Admin-Only Access**: Non-admin users cannot access backup API
   - Restrict endpoint access to admin role only
   - Public documentation should reflect this
   - Provide clear error messages

3. **Error Messages**: Generic messages for public users
   - Admin users get full debugging info
   - Non-admins get helpful but safe messages
   - Support team can access server logs for debugging

---

## 📞 Troubleshooting

### Issue: "Invalid token" error after 15 minutes
**Solution:** Implement token refresh in frontend
```javascript
// If you get 401, call refresh endpoint and retry
if (response.status === 401) {
  const newToken = await fetch('/api/auth/refresh');
  // Retry original request with new token
}
```

### Issue: "Access denied" when trying backup API as regular user
**Solution:** Admin role required
- Only users with `role = 'admin'` can access backup endpoints
- Create admin user or upgrade existing user role

### Issue: Error response doesn't show error details
**Solution:** This is by design for security
- Admins will see full details
- Server logs contain all error information
- Check server logs for debugging: `npm run dev | grep ERROR`

---

## 📚 Related Documentation

- `BACKUP_SYSTEM.md` - Backup API details
- `IMPLEMENTATION_COMPLETE.md` - Complete system documentation
- `QUICK_SETUP_GUIDE.md` - Setup instructions
- `.env` - Configuration file

---

## ✅ Implementation Status

**Status:** ✅ COMPLETE AND DEPLOYED

All security improvements have been implemented and tested:
- JWT expiration: ✅ 15 minutes
- Admin-only endpoints: ✅ Applied to backup API
- Error masking: ✅ Sensitive data hidden from public
- Error logging: ✅ Full errors logged server-side
- Status codes: ✅ All responses include error codes

**Ready for Production:** Yes ✅

---

**Last Updated:** 2025
**System:** Sri Vinayaka Tenders v2.0
**Security Level:** Enhanced ✅
