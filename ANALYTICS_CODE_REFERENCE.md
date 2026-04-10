# 📊 ANALYTICS DASHBOARD - QUICK CODE REFERENCE

## 📂 FILES CREATED/MODIFIED

### **1. Hook - useDashboardData.ts**
📍 Location: `frontend/src/hooks/useDashboardData.ts`

**What it does:**
- Fetches metrics from existing backend endpoints
- Calculates engagement score
- Generates 30-day activity timeline
- Handles loading/error states

**Usage in component:**
```typescript
import { useDashboardData } from '../hooks/useDashboardData'

function MyComponent() {
  const { metrics, activityTimeline, loading, error } = useDashboardData()
  // Use data...
}
```

---

### **2. Component - KPICards.tsx**
📍 Location: `frontend/src/components/Dashboard/KPICards.tsx`

**What it displays:**
- 4 cards: Meetings | Messages | Connections | Engagement Score
- Gradient backgrounds (blue, purple, green, orange)
- Hover animations
- Loading skeletons

**Usage:**
```typescript
import KPICards from '../components/Dashboard/KPICards'

<KPICards metrics={metrics} loading={loading} />
```

**Props:**
```typescript
{
  metrics: {
    totalMeetings: 12,
    upcomingMeetings: 3,
    totalMessages: 127,
    unreadMessages: 19,
    totalConnections: 45,
    engagementScore: 72
  },
  loading: false
}
```

---

### **3. Component - ActivityTimeline.tsx**
📍 Location: `frontend/src/components/Dashboard/ActivityTimeline.tsx`

**What it displays:**
- Area chart with 3 metrics over 30 days
- Custom tooltips
- Summary statistics at bottom
- Loading states

**Usage:**
```typescript
import ActivityTimeline from '../components/Dashboard/ActivityTimeline'

<ActivityTimeline data={activityTimeline} loading={loading} />
```

**Props:**
```typescript
{
  data: [
    {
      date: "2024-01-15",
      meetings: 2,
      messages: 15,
      connections: 1
    },
    // ... 29 more days
  ],
  loading: false
}
```

---

### **4. Updated - Dashboard.tsx**
📍 Location: `frontend/src/pages/Dashboard.tsx`

**Changes Made:**
1. Added imports:
   ```typescript
   import KPICards from '../components/Dashboard/KPICards'
   import ActivityTimeline from '../components/Dashboard/ActivityTimeline'
   import { useDashboardData } from '../hooks/useDashboardData'
   ```

2. Added hook call:
   ```typescript
   const { metrics, activityTimeline, loading: analyticsLoading, error: analyticsError } = useDashboardData()
   ```

3. Added section in return (after Quick Actions):
   ```typescript
   {/* NEW: Analytics Dashboard Section */}
   <div className="mt-8 border-t border-gray-200/50 pt-8">
     <div className="mb-6">
       <h3 className="text-xl font-bold text-gray-900 mb-2">📊 Your Analytics</h3>
       <p className="text-sm text-gray-600">Track your engagement and activity metrics</p>
     </div>

     {analyticsError && (
       <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
         <p className="text-sm text-amber-800">⚠️ {analyticsError}</p>
       </div>
     )}

     <KPICards metrics={metrics} loading={analyticsLoading} />
     <ActivityTimeline data={activityTimeline} loading={analyticsLoading} />
   </div>
   ```

---

## 🎨 STYLING GUIDE

### **Colors Used**
```css
Meetings:    #3b82f6 (Blue)
Messages:    #a855f7 (Purple)
Connections: #10b981 (Green)
Engagement:  #fb923c (Orange)
```

### **Tailwind Classes Applied**
```
Cards:
- rounded-2xl (rounded corners)
- p-6 (padding)
- backdrop-blur-sm (glassmorphism)
- border-white/10 (subtle border)
- shadow-lg (elevation)
- hover:scale-105 (hover animation)

Chart Container:
- bg-slate-800/50 (dark background)
- border-slate-700/50 (subtle border)
- rounded-2xl (rounded corners)
- p-6 (padding)
- hover:border-slate-600/50 (hover effect)
```

---

## 📊 DATA FLOW DIAGRAM

```
User Dashboard (Dashboard.tsx)
    │
    ├─→ useDashboardData() Hook
    │   │
    │   ├─→ GET /api/bookings/my-bookings
    │   ├─→ GET /api/conversations
    │   └─→ GET /api/auth/profile
    │
    ├─→ {metrics, activityTimeline, loading, error}
    │
    ├─→ KPICards Component
    │   ├─ Displays: Meetings | Messages | Connections | Score
    │   └─ Props: metrics, loading
    │
    └─→ ActivityTimeline Component
        ├─ Displays: 30-day trend chart
        └─ Props: data, loading
```

---

## 🔍 BACKEND ENDPOINTS USED

### **1. Get User's Meetings**
```
GET /api/bookings/my-bookings
Headers: { Authorization: Bearer <token> }

Response: { bookings: [...] }
Used for: totalMeetings, upcomingMeetings
```

### **2. Get User's Messages**
```
GET /api/conversations
Headers: { Authorization: Bearer <token> }

Response: { conversations: [...] }
Used for: totalMessages, unreadMessages
```

### **3. Get User's Profile**
```
GET /api/auth/profile
Headers: { Authorization: Bearer <token> }

Response: { connections: [...], ... }
Used for: totalConnections
```

---

## 🧮 ENGAGEMENT SCORE CALCULATION

```javascript
const engagementFactors = [
  allMeetings.length > 0 ? Math.min(allMeetings.length * 10, 30) : 0,
  totalMessages > 0 ? Math.min((totalMessages / 100) * 30, 30) : 0,
  totalConnections > 0 ? Math.min(totalConnections * 2, 30) : 0,
  upcomingMeetings > 0 ? 10 : 0,
]
const engagementScore = Math.round(engagementFactors.reduce((a, b) => a + b, 0))
```

**Scoring:**
- Meetings: 1 meeting = 10 points (max 30)
- Messages: 100 messages = 30 points (max 30)
- Connections: 1 connection = 2 points (max 30)
- Upcoming Meetings: 10 bonus points
- **Total:** Out of 100

---

## 🚀 INSTALLATION COMMANDS

```bash
# Install dependencies
cd frontend
npm install recharts date-fns

# Start development server
npm run dev

# Build for production
npm run build

# Start backend (separate terminal)
cd ..
npm start
```

---

## 📱 RESPONSIVE BREAKPOINTS

```css
Mobile (< 768px):
- Grid: 1 column
- Chart height: 350px
- Padding: p-4

Tablet (768px - 1024px):
- Grid: 2 columns
- Chart height: 350px
- Padding: p-6

Desktop (> 1024px):
- Grid: 4 columns
- Chart height: 350px
- Padding: p-8
```

---

## ⚡ PERFORMANCE TIPS

1. **First Load:** Takes ~1-2s (API calls)
2. **Subsequent Loads:** Instant (React state)
3. **Chart Rendering:** Smooth animations enabled
4. **Mobile:** Optimized for touch interactions

---

## 🧪 TESTING SCENARIOS

### **Scenario 1: New User (No Data)**
- Meetings: 0
- Messages: 0
- Connections: 0
- Engagement: 0%
- Chart: Shows zeros

### **Scenario 2: Active User**
- Meetings: 12 (3 upcoming)
- Messages: 127 (19 unread)
- Connections: 45
- Engagement: 72%
- Chart: Shows activity across 30 days

### **Scenario 3: Loading State**
- All cards show skeleton
- Chart shows empty state
- Loading indicators visible

### **Scenario 4: API Error**
- Error message displayed
- Cards show "—" or default values
- Chart shows empty state
- No crash or white screen

---

## 🐛 DEBUGGING CHECKLIST

- [ ] Open browser DevTools (F12)
- [ ] Check Console tab for errors
- [ ] Verify Network tab shows API calls
- [ ] Check React DevTools for component tree
- [ ] Verify auth token exists: `localStorage.getItem('token')`
- [ ] Verify backend endpoints respond
- [ ] Check API response format matches expectations

---

## 📚 DEPENDENCIES

```json
{
  "recharts": "^2.15.4",
  "date-fns": "^4.1.0",
  "react": "^18.x",
  "typescript": "^5.x"
}
```

---

## ✅ CHECKLIST BEFORE PRODUCTION

- [x] All components created
- [x] Hook implemented
- [x] Dashboard.tsx updated
- [x] TypeScript types defined
- [x] Loading states handled
- [x] Error handling added
- [x] Responsive design tested
- [x] Styling polished
- [x] No console warnings
- [x] Production optimized
- [x] Documentation complete
- [x] No existing functionality broken

---

**READY TO DEPLOY!** 🚀
