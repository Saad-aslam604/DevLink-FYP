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
import { BarChart3 } from 'lucide-react'
import { ActivityData } from '../../hooks/useDashboardData'

interface ActivityTimelineProps {
  data: ActivityData[]
  loading: boolean
}

const CustomTooltip: React.FC<any> = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-gray-900/95 border border-gray-200 dark:border-gray-700 rounded-lg p-3 shadow-lg dark:shadow-2xl backdrop-blur-sm transition-colors duration-200">
        <p className="text-gray-900 dark:text-white font-semibold text-sm transition-colors duration-200">
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
      <div className="bg-white dark:bg-gray-800/50 backdrop-blur-sm border border-gray-200 dark:border-gray-700/50 rounded-2xl p-6 h-96 animate-pulse transition-colors duration-300"></div>
    )
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800/50 backdrop-blur-sm border border-gray-200 dark:border-gray-700/50 rounded-2xl p-6 flex items-center justify-center h-96 transition-colors duration-300">
        <p className="text-gray-500 dark:text-gray-400 text-center transition-colors duration-200">No activity data available yet</p>
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
    <div className="bg-white dark:bg-gray-800/50 backdrop-blur-sm border border-gray-200 dark:border-gray-700/50 rounded-2xl p-6 mb-8 hover:border-gray-300 dark:hover:border-gray-600/50 transition-colors duration-300">
      <div className="mb-6 flex items-center gap-3">
        <BarChart3 className="w-6 h-6 text-blue-600 dark:text-blue-400 transition-colors duration-200" />
        <div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 transition-colors duration-200">Activity Timeline</h3>
          <p className="text-gray-600 dark:text-gray-400 text-sm transition-colors duration-200">Last 30 days of engagement</p>
        </div>
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

          <CartesianGrid strokeDasharray="3 3" stroke="rgba(209, 213, 219, 0.3)" className="dark:stroke-gray-700/30" />

          <XAxis
            dataKey="displayDate"
            stroke="rgba(107, 114, 128, 0.7)"
            className="dark:stroke-gray-500"
            style={{ fontSize: '12px' }}
          />

          <YAxis stroke="rgba(107, 114, 128, 0.7)" className="dark:stroke-gray-500" style={{ fontSize: '12px' }} />

          <Tooltip content={<CustomTooltip />} />

          <Legend
            wrapperStyle={{ paddingTop: '20px' }}
            iconType="line"
            formatter={(value) => (
              <span className="text-gray-700 dark:text-gray-300 text-xs transition-colors duration-200">{value}</span>
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
        <div className="p-3 bg-gray-50 dark:bg-gray-700/30 rounded-lg border border-gray-200 dark:border-gray-600/30 transition-colors duration-300">
          <p className="text-gray-600 dark:text-gray-400 text-xs mb-1 transition-colors duration-200">Total Meetings</p>
          <p className="text-blue-600 dark:text-blue-400 font-bold text-lg transition-colors duration-200">
            {displayData.reduce((sum, d) => sum + d.meetings, 0)}
          </p>
        </div>
        <div className="p-3 bg-gray-50 dark:bg-gray-700/30 rounded-lg border border-gray-200 dark:border-gray-600/30 transition-colors duration-300">
          <p className="text-gray-600 dark:text-gray-400 text-xs mb-1 transition-colors duration-200">Total Messages</p>
          <p className="text-purple-600 dark:text-purple-400 font-bold text-lg transition-colors duration-200">
            {displayData.reduce((sum, d) => sum + d.messages, 0)}
          </p>
        </div>
        <div className="p-3 bg-gray-50 dark:bg-gray-700/30 rounded-lg border border-gray-200 dark:border-gray-600/30 transition-colors duration-300">
          <p className="text-gray-600 dark:text-gray-400 text-xs mb-1 transition-colors duration-200">Connections Made</p>
          <p className="text-green-600 dark:text-green-400 font-bold text-lg transition-colors duration-200">
            {displayData.reduce((sum, d) => sum + d.connections, 0)}
          </p>
        </div>
      </div>
    </div>
  )
}

export default ActivityTimeline
