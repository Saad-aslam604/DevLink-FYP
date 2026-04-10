import React from 'react'
import { Calendar, MessageCircle, Users, TrendingUp } from 'lucide-react'
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
  lightBg: string
  darkBg: string
  iconColor: string
}> = ({ icon, label, value, subtitle, gradient, lightBg, darkBg, iconColor }) => (
  <div
    className={`relative overflow-hidden rounded-2xl p-6 transition-all duration-300 ${lightBg} ${darkBg} backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 shadow-lg hover:shadow-xl dark:hover:shadow-2xl transform hover:scale-105`}
  >
    <div className="absolute inset-0 opacity-5 dark:opacity-10">
      <div className="absolute inset-0 bg-gradient-to-br from-white dark:from-gray-400 to-transparent"></div>
    </div>

    <div className="relative z-10">
      <div className="flex items-center justify-between mb-4">
        <div className={`${iconColor} transition-colors duration-200`}>
          {icon}
        </div>
        <div className="w-1 h-8 bg-gray-300/20 dark:bg-white/20 rounded-full transition-colors duration-200"></div>
      </div>

      <p className="text-gray-600 dark:text-gray-400 text-sm font-medium mb-2 transition-colors duration-200">{label}</p>

      <div className="flex flex-col gap-1">
        <h3 className="text-4xl font-bold text-gray-900 dark:text-gray-100 transition-colors duration-200">{value}</h3>
        {subtitle && <span className="text-gray-500 dark:text-gray-500 text-sm transition-colors duration-200">{subtitle}</span>}
      </div>
    </div>

    <div className="absolute top-0 right-0 w-40 h-40 bg-gray-100/5 dark:bg-white/5 rounded-full -mr-20 -mt-20 transition-colors duration-300"></div>
  </div>
)

export const KPICards: React.FC<KPICardsProps> = ({ metrics, loading }) => {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="rounded-2xl p-6 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 animate-pulse h-32 transition-colors duration-300"
          ></div>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <KPICard
        icon={<Calendar className="w-6 h-6" />}
        label="Meetings"
        value={metrics.totalMeetings}
        subtitle={`${metrics.upcomingMeetings} upcoming`}
        gradient="bg-gradient-to-br from-blue-600/40 to-blue-900/40"
        lightBg="bg-white"
        darkBg="dark:bg-gray-800"
        iconColor="text-blue-600 dark:text-blue-400"
      />

      <KPICard
        icon={<MessageCircle className="w-6 h-6" />}
        label="Messages"
        value={metrics.totalMessages}
        subtitle={`${metrics.unreadMessages} unread`}
        gradient="bg-gradient-to-br from-purple-600/40 to-purple-900/40"
        lightBg="bg-white"
        darkBg="dark:bg-gray-800"
        iconColor="text-purple-600 dark:text-purple-400"
      />

      <KPICard
        icon={<Users className="w-6 h-6" />}
        label="Active Collaborators"
        value={metrics.activeCollaborators}
        subtitle="People you've worked with"
        gradient="bg-gradient-to-br from-green-600/40 to-green-900/40"
        lightBg="bg-white"
        darkBg="dark:bg-gray-800"
        iconColor="text-green-600 dark:text-green-400"
      />

      <KPICard
        icon={<TrendingUp className="w-6 h-6" />}
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
        lightBg="bg-white"
        darkBg="dark:bg-gray-800"
        iconColor="text-orange-600 dark:text-orange-400"
      />
    </div>
  )
}

export default KPICards
