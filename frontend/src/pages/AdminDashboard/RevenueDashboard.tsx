import React, { useEffect, useState, useMemo } from 'react'
import AdminLayout from './AdminLayout'
import adminRevenueApi from '../../services/adminRevenueApi'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend } from 'recharts'
import { DownloadCloud, TrendingUp } from 'lucide-react'

type Totals = { totalPlatformFee: number; totalMentorPayout: number; count: number }

export default function RevenueDashboard() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [totals, setTotals] = useState<Totals | null>(null)
  const [daily, setDaily] = useState<any[]>([])
  const [topMentors, setTopMentors] = useState<any[]>([])
  const [transactions, setTransactions] = useState<any[]>([])
  const [growth, setGrowth] = useState<{ platformFeePct?: number | null; mentorPayoutPct?: number | null } | null>(null)
  const [refundRate, setRefundRate] = useState<number | null>(null)
  const [cancellationRate, setCancellationRate] = useState<number | null>(null)
  const [monthlyTrendData, setMonthlyTrendData] = useState<any[]>([])
  const [moM, setMoM] = useState<number | null>(null)
  const [yoY, setYoY] = useState<number | null>(null)
  const [page, setPage] = useState<number>(1)
  const [limit, setLimit] = useState<number>(50)
  const [sortField, setSortField] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [range, setRange] = useState<string>('30days')

  const load = async (p = page, l = limit) => {
    setLoading(true)
    setError(null)
    try {
      const res = await adminRevenueApi.fetchRevenue({ range, page: p, limit: l })
      if (res && res.success && res.data) {
        setTotals(res.data.totals || null)
        setDaily(res.data.daily || [])
        setTopMentors(res.data.topMentors || [])
          setTransactions(res.data.transactions || [])
          setGrowth(res.data.growth || null)
          setRefundRate(typeof res.data.refundRate === 'number' ? res.data.refundRate : null)
          setCancellationRate(typeof res.data.cancellationRate === 'number' ? res.data.cancellationRate : null)
              setMonthlyTrendData(res.data.monthlyTrend || [])
              setMoM(typeof res.data.moM === 'number' ? res.data.moM : null)
              setYoY(typeof res.data.yoY === 'number' ? res.data.yoY : null)
      } else {
        setError('Failed to load revenue data')
      }
    } catch (e: any) {
      console.error('Revenue load failed', e)
      setError(e?.message || 'Failed to fetch')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [range])
  useEffect(() => { load(page, limit) }, [page, limit])

  const pieData = useMemo(() => topMentors.map((m: any) => ({ name: m.mentorName || m.mentorEmail || m.mentorId || 'Unknown', value: m.mentorEarnings || 0 })), [topMentors])
  const COLORS = ['#0ea5e9', '#06b6d4', '#3b82f6', '#60a5fa', '#0284c7']

  const handleExport = async () => {
    try {
      const resp = await adminRevenueApi.exportRevenueCsv()
      // axios returns blob
      const blob = new Blob([resp.data], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'devlink_revenue_export.csv'
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch (e) {
      console.error('Export failed', e)
      alert('Export failed')
    }
  }

  // Client-side sorted transactions for the current page
  const sortedTransactions = useMemo(() => {
    if (!sortField) return transactions
    const copy = [...transactions]
    copy.sort((a: any, b: any) => {
      const aVal = a[sortField]
      const bVal = b[sortField]
      // handle nested fields like payer.name or metadata.platformFee
      const resolve = (v: any) => {
        if (v === null || v === undefined) return ''
        return (typeof v === 'object') ? JSON.stringify(v) : v
      }
      const av = resolve(aVal)
      const bv = resolve(bVal)
      if (typeof av === 'number' && typeof bv === 'number') return sortDir === 'asc' ? av - bv : bv - av
      const s = String(av).localeCompare(String(bv))
      return sortDir === 'asc' ? s : -s
    })
    return copy
  }, [transactions, sortField, sortDir])

  function toggleSort(field: string) {
    if (sortField === field) setSortDir(prev => prev === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('asc') }
  }

  return (
    <AdminLayout>
      <div className="space-y-4">
        <header className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Revenue Dashboard</h1>
          <div className="flex items-center gap-2">
            <select value={range} onChange={e => setRange(e.target.value)} className="px-3 py-2 border rounded">
              <option value="7days">Last 7 days</option>
              <option value="30days">Last 30 days</option>
              <option value="90days">Last 90 days</option>
              <option value="year">Last year</option>
              <option value="all">All time</option>
            </select>
            <button onClick={handleExport} className="inline-flex items-center gap-2 px-3 py-2 bg-indigo-600 text-white rounded"><DownloadCloud size={16} />Export CSV</button>
          </div>
        </header>

        {loading ? (
          <div className="p-4 bg-white dark:bg-gray-800 rounded">Loading…</div>
        ) : error ? (
          <div className="p-4 bg-red-50 text-red-700 rounded">{error}</div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="p-4 bg-white dark:bg-gray-800 rounded shadow">
                <div className="text-sm text-gray-500">Platform Revenue (15%)</div>
                <div className="text-2xl font-bold mt-2">${((totals && totals.totalPlatformFee) || 0) / 100}</div>
              </div>
              <div className="p-4 bg-white dark:bg-gray-800 rounded shadow">
                <div className="text-sm text-gray-500">Total Transactions</div>
                <div className="text-2xl font-bold mt-2">{(totals && totals.count) || 0}</div>
              </div>
              <div className="p-4 bg-white dark:bg-gray-800 rounded shadow">
                <div className="text-sm text-gray-500">Mentor Payouts (85%)</div>
                <div className="text-2xl font-bold mt-2">${((totals && totals.totalMentorPayout) || 0) / 100}</div>
              </div>
              <div className="p-4 bg-white dark:bg-gray-800 rounded shadow">
                <div className="text-sm text-gray-500">Growth (platform)</div>
                <div className="text-2xl font-bold mt-2 text-green-600 flex items-center gap-2">
                  <TrendingUp size={18}/>{growth && typeof growth.platformFeePct === 'number' ? `${growth.platformFeePct.toFixed(1)}%` : '--'}
                </div>
                <div className="text-xs text-gray-500 mt-1">Refunds: {refundRate !== null ? `${(refundRate * 100).toFixed(1)}%` : '--'} • Cancellations: {cancellationRate !== null ? `${(cancellationRate * 100).toFixed(1)}%` : '--'}</div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2 p-4 bg-white dark:bg-gray-800 rounded shadow">
                <h3 className="text-sm font-semibold mb-2">Daily Revenue</h3>
                <div style={{ height: 260 }}>
                  <ResponsiveContainer>
                    <BarChart data={daily.map(d => ({ date: d._id, value: d.platformFee }))}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip formatter={(v:any) => `$${(v/100).toFixed(2)}`} contentStyle={{ background: '#fff' }} />
                      <Legend />
                      <Bar name="Platform fee (cents)" dataKey="value" fill="#3b82f6" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4">
                  <h4 className="text-sm font-semibold mb-2">Monthly trend (last 12 months)</h4>
                  <div style={{ height: 180 }}>
                    <ResponsiveContainer>
                      <LineChart data={monthlyTrendData.map(d => ({ month: d._id, value: d.platformFee }))}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip formatter={(v:any) => `$${(v/100).toFixed(2)}`} />
                        <Line type="monotone" dataKey="value" stroke="#06b6d4" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-white dark:bg-gray-800 rounded shadow">
                <h3 className="text-sm font-semibold mb-2">Top Mentors</h3>
                {/* Make container slightly taller and allow overflow so legend isn't clipped */}
                <div style={{ height: 360, overflow: 'visible' }}>
                  {/* ResponsiveContainer should have explicit width/height percent to fill parent */}
                  <ResponsiveContainer width="100%" height="100%">
                    {/* Put legend below the chart so it doesn't clip the pie; center chart inside area */}
                    <PieChart margin={{ top: 10, right: 10, left: 10, bottom: 60 }}>
                      {/* Center the pie and use a donut style so labels/legend fit below */}
                      <Pie
                        data={pieData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="45%"
                        innerRadius={40}
                        outerRadius={80}
                        fill="#8884d8"
                        labelLine={false}
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v:any) => `$${(v/100).toFixed(2)}`} contentStyle={{ background: '#fff' }} />
                      {/* Legend placed horizontally below the chart to avoid side clipping */}
                      <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ marginTop: 8 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

              <div className="mt-4 bg-white dark:bg-gray-800 rounded shadow p-4">
              <h3 className="text-lg font-semibold mb-2">Recent Transactions</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-gray-500">
                      <th className="py-2 cursor-pointer" onClick={() => toggleSort('createdAt')}>Date {sortField === 'createdAt' ? (sortDir==='asc'?'▲':'▼') : ''}</th>
                      <th className="cursor-pointer" onClick={() => toggleSort('payer')}>Student {sortField === 'payer' ? (sortDir==='asc'?'▲':'▼') : ''}</th>
                      <th className="cursor-pointer" onClick={() => toggleSort('mentor')}>Mentor {sortField === 'mentor' ? (sortDir==='asc'?'▲':'▼') : ''}</th>
                      <th className="cursor-pointer" onClick={() => toggleSort('amount')}>Amount {sortField === 'amount' ? (sortDir==='asc'?'▲':'▼') : ''}</th>
                      <th className="cursor-pointer" onClick={() => toggleSort('metadata')}>Platform Fee {sortField === 'metadata' ? (sortDir==='asc'?'▲':'▼') : ''}</th>
                      <th className="cursor-pointer" onClick={() => toggleSort('metadata')}>Mentor Payout {sortField === 'metadata' ? (sortDir==='asc'?'▲':'▼') : ''}</th>
                      <th className="cursor-pointer" onClick={() => toggleSort('status')}>Status {sortField === 'status' ? (sortDir==='asc'?'▲':'▼') : ''}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedTransactions.map((t:any) => (
                      <tr key={t._id} className="border-t">
                        <td className="py-2">{new Date(t.createdAt).toLocaleString()}</td>
                        <td>{t.payer && (t.payer.name || t.payer.email)}</td>
                        <td>{t.mentor && (t.mentor.name || t.mentor.email)}</td>
                        <td>${((t.amount||0)/100).toFixed(2)}</td>
                        <td>${(((t.metadata && t.metadata.platformFee)||0)/100).toFixed(2)}</td>
                        <td>${(((t.metadata && t.metadata.mentorAmount)||0)/100).toFixed(2)}</td>
                        <td>{t.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button className="px-3 py-1 border rounded disabled:opacity-50" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p-1))}>Prev</button>
                  <div>Page <strong>{page}</strong></div>
                  <button className="px-3 py-1 border rounded" onClick={() => setPage(p => p + 1)} disabled={transactions.length < limit}>Next</button>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-500">Per page</label>
                  <select value={String(limit)} onChange={e => { setLimit(Number(e.target.value)); setPage(1) }} className="px-2 py-1 border rounded">
                    <option value="10">10</option>
                    <option value="25">25</option>
                    <option value="50">50</option>
                    <option value="100">100</option>
                  </select>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  )
}
