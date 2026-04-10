# 📋 DEVLINK ANALYTICS DASHBOARD - EXACT CODE IMPLEMENTATIONS

## Component 1: KPICards.tsx

**File:** `frontend/src/components/Dashboard/KPICards.tsx`

```typescript
import React from 'react'
import { DashboardMetrics } from '../../hooks/useDashboardData'

interface KPICardsProps {
  metrics: DashboardMetrics
  loading: boolean
}

const KPICard: React.FC<{
  icon: React.ReactNode
  label: string
  value: string | number
  subtitle?: string
  gradient: string
}> = ({ icon, label, value, subtitle, gradient }) => (
  <div
    className={`relative overflow-hidden rounded-2xl p-6 ${gradient} backdrop-blur-sm border border-white/10 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105`}
  >
    <div className="absolute inset-0 opacity-5">
      <div className="absolute inset-0 bg-gradient-to-br from-white to-transparent"></div>
    </div>

    <div className="relative z-10">
      <div className="flex items-center justify-between mb-4">
        <div className="text-2xl">{icon}</div>
        <div className="w-1 h-8 bg-white/20 rounded-full"></div>
      </div>

      <p className="text-white/70 text-sm font-medium mb-2">{label}</p>

      <div className="flex items-baseline gap-2">
        <h3 className="text-4xl font-bold text-white">{value}</h3>
        {subtitle && <span className="text-white/50 text-sm">{subtitle}</span>}
      </div>
    </div>

    <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -mr-20 -mt-20"></div>
  </div>
)

export const KPICards: React.FC<KPICardsProps> = ({ metrics, loading }) => {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="rounded-2xl p-6 bg-gradient-to-br from-slate-800 to-slate-900 animate-pulse h-32"
          ></div>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <KPICard
        icon="📞"
        label="Meetings"
        value={metrics.totalMeetings}
        subtitle={`${metrics.upcomingMeetings} upcoming`}
        gradient="bg-gradient-to-br from-blue-600/40 to-blue-900/40"
      />

      <KPICard
        icon="💬"
        label="Messages"
        value={metrics.totalMessages}
        subtitle={`${metrics.unreadMessages} unread`}
        gradient="bg-gradient-to-br from-purple-600/40 to-purple-900/40"
      />

      <KPICard
        icon="🔗"
        label="Connections"
        value={metrics.totalConnections}
        subtitle="Active network"
        gradient="bg-gradient-to-br from-green-600/40 to-green-900/40"
      />

      <KPICard
        icon="⚡"
        label="Engagement"
        value={`${metrics.engagementScore}%`}
        subtitle={
          metrics.engagementScore >= 70
            ? 'Excellent'
            : metrics.engagementScore >= 40
              ? 'Good'
              : 'Getting started'
        }
        gradient="bg-gradient-to-br from-orange-600/40 to-orange-900/40"
      />
    </div>
  )
}

export default KPICards
```

---

## Component 2: ActivityTimeline.tsx

**File:** `frontend/src/components/Dashboard/ActivityTimeline.tsx`

```typescript
import React from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts'
import { format, parseISO } from 'date-fns'
import { ActivityData } from '../../hooks/useDashboardData'

interface ActivityTimelineProps {
  data: ActivityData[]
  loading: boolean
}

const CustomTooltip: React.FC<any> = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900/95 border border-slate-700 rounded-lg p-3 shadow-lg backdrop-blur-sm">
        <p className="text-white font-semibold text-sm">
          {format(parseISO(payload[0].payload.date), 'MMM dd, yyyy')}
        </p>
        {payload.map((entry: any, index: number) => (
          <p key={index} style={{ color: entry.color }} className="text-xs font-medium">
            {entry.name}: {entry.value}
          </p>
        ))}
      </div>
    )
  }
  return null
}

export const ActivityTimeline: React.FC<ActivityTimelineProps> = ({ data, loading }) => {
  if (loading) {
    return (
      <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 h-96 animate-pulse"></div>
    )
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 flex items-center justify-center h-96">
        <p className="text-slate-400 text-center">No activity data available yet</p>
      </div>
    )
  }

  // Format data for better readability (show every 5th day)
  const displayData = data.map((item, index) => ({
    ...item,
    displayDate:
      index % 5 === 0 || index === data.length - 1 ? format(parseISO(item.date), 'MMM dd') : '',
  }))

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 mb-8 hover:border-slate-600/50 transition-colors duration-300">
      <div className="mb-6">
        <h3 className="text-xl font-bold text-white mb-2">Activity Timeline</h3>
        <p className="text-slate-400 text-sm">Last 30 days of engagement</p>
      </div>

      <ResponsiveContainer width="100%" height={350}>
        <AreaChart
          data={displayData}
          margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id="meetingsGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="messagesGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="connectionsGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.1)" />

          <XAxis
            dataKey="displayDate"
            stroke="rgba(148, 163, 184, 0.5)"
            style={{ fontSize: '12px' }}
          />

          <YAxis stroke="rgba(148, 163, 184, 0.5)" style={{ fontSize: '12px' }} />

          <Tooltip content={<CustomTooltip />} />

          <Legend
            wrapperStyle={{ paddingTop: '20px' }}
            iconType="line"
            formatter={(value) => (
              <span style={{ color: 'rgba(226, 232, 240, 1)', fontSize: '12px' }}>{value}</span>
            )}
          />

          <Area
            type="monotone"
            dataKey="meetings"
            stroke="#3b82f6"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#meetingsGradient)"
            name="Meetings"
            isAnimationActive={true}
          />

          <Area
            type="monotone"
            dataKey="messages"
            stroke="#a855f7"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#messagesGradient)"
            name="Messages"
            isAnimationActive={true}
          />

          <Area
            type="monotone"
            dataKey="connections"
            stroke="#10b981"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#connectionsGradient)"
            name="Connections"
            isAnimationActive={true}
          />
        </AreaChart>
      </ResponsiveContainer>

      <div className="mt-6 grid grid-cols-3 gap-4 text-center">
        <div className="p-3 bg-slate-700/30 rounded-lg border border-slate-600/30">
          <p className="text-slate-400 text-xs mb-1">Total Meetings</p>
          <p className="text-blue-400 font-bold text-lg">
            {displayData.reduce((sum, d) => sum + d.meetings, 0)}
          </p>
        </div>
        <div className="p-3 bg-slate-700/30 rounded-lg border border-slate-600/30">
          <p className="text-slate-400 text-xs mb-1">Total Messages</p>
          <p className="text-purple-400 font-bold text-lg">
            {displayData.reduce((sum, d) => sum + d.messages, 0)}
          </p>
        </div>
        <div className="p-3 bg-slate-700/30 rounded-lg border border-slate-600/30">
          <p className="text-slate-400 text-xs mb-1">Connections Made</p>
          <p className="text-green-400 font-bold text-lg">
            {displayData.reduce((sum, d) => sum + d.connections, 0)}
          </p>
        </div>
      </div>
    </div>
  )
}

export default ActivityTimeline
```

---

## Hook: useDashboardData.ts

**File:** `frontend/src/hooks/useDashboardData.ts`

[See ANALYTICS_CODE_REFERENCE.md for full hook code]

---

## Dashboard.tsx Integration

**File:** `frontend/src/pages/Dashboard.tsx`

### Imports to add (top of file):
```typescript
import KPICards from '../components/Dashboard/KPICards'
import ActivityTimeline from '../components/Dashboard/ActivityTimeline'
import { useDashboardData } from '../hooks/useDashboardData'
```

### Inside component function, after `const navigate = useNavigate()`:
```typescript
// NEW: Load analytics data
const { metrics, activityTimeline, loading: analyticsLoading, error: analyticsError } = useDashboardData()
```

### Inside return statement, after Quick Actions buttons section:
```tsx
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

## TypeScript Interfaces

**File:** `frontend/src/hooks/useDashboardData.ts`

```typescript
export interface DashboardMetrics {
  totalMeetings: number
  upcomingMeetings: number
  totalMessages: number
  unreadMessages: number
  totalConnections: number
  engagementScore: number
}

export interface ActivityData {
  date: string
  meetings: number
  messages: number
  connections: number
}

export interface DashboardData {
  metrics: DashboardMetrics
  activityTimeline: ActivityData[]
  loading: boolean
  error: string | null
}
```

---

## Installation Commands

```bash
# Install packages
cd frontend
npm install recharts date-fns

# Or if using yarn
yarn add recharts date-fns

# Start development
npm run dev

# Build for production
npm run build
```

---

## Verification Checklist

After implementation, verify:

```bash
# 1. Check package.json
npm list recharts date-fns

# 2. Start frontend
npm run dev

# 3. In browser console, verify no errors:
console.log('Dashboard loaded')

# 4. Check dashboard displays:
# - KPI Cards with data
# - Activity Timeline chart
# - All existing features still work
```

---

## Complete File Structure

```
frontend/src/
├── components/
│   └── Dashboard/
│       ├── KPICards.tsx .......................... NEW
│       └── ActivityTimeline.tsx ................. NEW
├── hooks/
│   └── useDashboardData.ts ....................... NEW
└── pages/
    └── Dashboard.tsx ............................ UPDATED
```

---

## CSS Classes Used

### Tailwind Classes:
```css
/* Layouts */
grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4
grid grid-cols-3
flex items-center justify-between

/* Styling */
rounded-2xl
p-6 (padding)
mb-6 (margin bottom)
border border-white/10
shadow-lg
backdrop-blur-sm

/* Gradients */
bg-gradient-to-br
from-blue-600/40 to-blue-900/40
from-slate-800 to-slate-900

/* Effects */
hover:shadow-xl
hover:scale-105
transition-all duration-300
animate-pulse

/* Text */
text-white/70
text-sm font-medium
text-4xl font-bold
```

---

## That's All!

Your analytics dashboard is complete and ready to use! 🎉

Start the development server and navigate to your dashboard to see it in action.

```bash
npm run dev
# 🚀 Live at http://localhost:3000
```
