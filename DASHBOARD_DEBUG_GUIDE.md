# Dashboard Analytics - Debugging Guide

## Changes Made to Fix Zero Values

### File: `frontend/src/hooks/useDashboardData.ts`

**Key Fixes:**

1. **Changed Messages Endpoint**
   - ❌ OLD: `/conversations` (doesn't exist)
   - ✅ NEW: `/messages/recent` (actual endpoint)

2. **Added Better Response Parsing**
   - Handles multiple response formats from backend
   - Checks for `bookings` property in response
   - Checks for `data.user`, `user`, and fallback options for profile

3. **Added Console Logging**
   - `📅 Bookings fetched:` - Shows number of bookings
   - `💬 Messages data:` - Shows messages response
   - `👤 Profile data:` - Shows profile response
   - `📊 Dashboard metrics calculated:` - Shows calculated values

4. **Better Error Handling**
   - Try-catch for date parsing
   - Fallback values for missing data
   - Console error logs with emoji prefix

---

## How to Debug

### Step 1: Open Browser DevTools
1. Press **F12** or **Right-click → Inspect**
2. Go to **Console** tab
3. Clear any existing logs

### Step 2: Look for Debug Logs
When dashboard loads, you should see:

```
📅 Bookings fetched: X [array of bookings...]
💬 Messages data: {...}
👤 Profile data: {...}
📊 Dashboard metrics calculated: {
  totalMeetings: X,
  upcomingMeetings: Y,
  totalMessages: Z,
  totalConnections: N,
  engagementScore: S
}
```

### Step 3: Check for Errors
Look for any red error messages that start with:
- `❌ Error fetching dashboard data:`
- Network errors (failed to fetch)
- 401/403 Unauthorized errors

---

## If You Still See Zero Values

### Check 1: Verify API Endpoints Are Correct
- [ ] `/bookings/my` returns `{ bookings: [...] }`
- [ ] `/messages/recent` returns array or object with messages
- [ ] `/auth/me` returns `{ data: { user: {...} } }`

### Check 2: Verify Authentication
- [ ] Token is in localStorage
- [ ] Token is valid and not expired
- [ ] Authorization header is being sent

### Check 3: Browser Console for Network Errors
1. Go to **Network** tab in DevTools
2. Filter by "bookings", "messages", "auth"
3. Check for failed requests (red)
4. Click on each request and check:
   - Request Headers (look for Authorization)
   - Response (check response format)
   - Status code (should be 200)

### Check 4: Check Backend Logs
In terminal running backend server, look for:
- `📅 FETCHING BOOKINGS FOR USER:` - Should show your user ID
- Messages about successful fetches
- Any error messages

---

## Expected Response Formats

### /bookings/my
```json
{
  "success": true,
  "bookings": [
    {
      "_id": "...",
      "mentor": { "firstName": "...", ... },
      "student": { "firstName": "...", ... },
      "startTime": "2026-04-15T10:00:00Z",
      "endTime": "2026-04-15T11:00:00Z",
      "status": "confirmed",
      "price": 5000
    }
  ],
  "count": 1
}
```

### /messages/recent
```json
[
  {
    "_id": "...",
    "booking": "...",
    "sender": "...",
    "content": "Hello!",
    "createdAt": "2026-04-02T12:00:00Z"
  }
]
```

### /auth/me
```json
{
  "success": true,
  "data": {
    "user": {
      "_id": "...",
      "email": "user@example.com",
      "followers": [...],
      "following": [...],
      "connections": [...]
    }
  }
}
```

---

## If Backend Endpoints Don't Exist

You may need to create or fix the missing endpoints:

1. **Check if `/messages/recent` exists**
   - File: `src/routes/messages.js`
   - If not, it needs to be created

2. **Check response format of `/bookings/my`**
   - Should return `{ bookings: [...] }`
   - Not `{ success: true, data: { bookings: [...] } }`

3. **Verify `/auth/me` response format**
   - Should return user data with followers/connections

---

## Testing Steps

1. **Create a test booking**
   - Dashboard should show updated count

2. **Send a test message**
   - Messages count should increase

3. **Follow/Connect with someone**
   - Connections count should increase

4. **Check KPI cards update**
   - Upcoming Meetings card
   - Messages card
   - Connections card
   - Engagement Score card

---

## Quick Reference

| Card | Data Source | Debug Log |
|------|-------------|-----------|
| Meetings | `/bookings/my` | `📅 Bookings fetched` |
| Messages | `/messages/recent` | `💬 Messages data` |
| Connections | `/auth/me` | `👤 Profile data` |
| Engagement | Calculated | `📊 Dashboard metrics` |

---

## Contact / Next Steps

If values are still showing as zero after checking all this:
1. Share the console logs from the debug output
2. Check that you have data in the database (bookings, messages, connections)
3. Verify all API endpoints are properly implemented in backend
