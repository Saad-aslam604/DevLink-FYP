import React from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, Legend } from 'recharts'

const lineData = [
  { month: 'Jan', completed: 2 }, { month: 'Feb', completed: 5 }, { month: 'Mar', completed: 9 }, { month: 'Apr', completed: 14 }, { month: 'May', completed: 18 }, { month: 'Jun', completed: 22 }
]

const barData = [
  { status: 'To Do', count: 8 }, { status: 'In Progress', count: 12 }, { status: 'Review', count: 3 }, { status: 'Done', count: 14 }
]

const pieData = [
  { name: 'Website', value: 12000 }, { name: 'Analytics', value: 34000 }, { name: 'Mobile', value: 54000 }, { name: 'Docs', value: 4000 }
]

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444']

export default function AnalyticsCharts({ projects }: { projects: any[] }) {
  return (
    <div className="analytics-grid grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="p-4 rounded bg-white dark:bg-gray-900 border">
        <div className="text-sm text-gray-500">Project completion trend</div>
        <div style={{ height: 200 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={lineData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="completed" stroke="#3B82F6" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="p-4 rounded bg-white dark:bg-gray-900 border">
        <div className="text-sm text-gray-500">Tasks by status</div>
        <div style={{ height: 200 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="status" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#10B981" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="p-4 rounded bg-white dark:bg-gray-900 border">
        <div className="text-sm text-gray-500">Budget allocation</div>
        <div style={{ height: 200 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" outerRadius={70} fill="#8884d8" label>
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Legend />
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
