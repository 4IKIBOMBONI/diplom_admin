import { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line,
} from 'recharts';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function StatCard({ label, value, colorClass }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5">
      <p className="text-sm text-gray-500">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${colorClass || 'text-gray-800'}`}>{value}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Export dropdown
// ---------------------------------------------------------------------------

function ExportDropdown() {
  const [open, setOpen] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [status, setStatus] = useState('');
  const [exporting, setExporting] = useState(false);
  const ref = useRef(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleExport = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams();
      if (dateFrom) params.set('dateFrom', dateFrom);
      if (dateTo) params.set('dateTo', dateTo);
      if (status) params.set('status', status);

      const response = await api.get(`/stats/export?${params.toString()}`, {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `stats_export_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setOpen(false);
    } catch (err) {
      console.error('Export error:', err);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm"
      >
        <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        Экспорт
        <svg className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-72 bg-white border border-gray-200 rounded-lg shadow-lg z-50 p-4">
          <p className="text-sm font-semibold text-gray-700 mb-3">Параметры экспорта</p>

          <div className="space-y-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Дата от</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Дата до</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Статус (необязательно)</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                <option value="">Все статусы</option>
                <option value="OPEN">Открытые</option>
                <option value="IN_PROGRESS">В работе</option>
                <option value="COMPLETED">Выполненные</option>
                <option value="CLOSED">Закрытые</option>
              </select>
            </div>
          </div>

          <button
            onClick={handleExport}
            disabled={exporting}
            className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {exporting ? (
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            )}
            {exporting ? 'Экспорт...' : 'Экспорт CSV'}
          </button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function DashboardPage() {
  const [overview, setOverview] = useState(null);
  const [byCategory, setByCategory] = useState([]);
  const [byPeriod, setByPeriod] = useState([]);
  const [byAssignee, setByAssignee] = useState([]);
  const [sla, setSla] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [ov, cat, period, assignee, slaData] = await Promise.all([
          api.get('/stats/overview'),
          api.get('/stats/by-category'),
          api.get('/stats/by-period?period=day&days=30'),
          api.get('/stats/by-assignee'),
          api.get('/stats/sla'),
        ]);
        setOverview(ov.data);
        setByCategory(cat.data);
        setByPeriod(period.data);
        setByAssignee(assignee.data);
        setSla(slaData.data);
      } catch (err) {
        console.error('Error fetching stats:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  // Top row stat cards
  const topCards = [
    { label: 'Всего заявок',       value: overview?.total ?? 0,                colorClass: 'text-blue-600' },
    { label: 'Открытых',           value: overview?.OPEN ?? 0,                 colorClass: 'text-blue-400' },
    { label: 'В работе',           value: overview?.IN_PROGRESS ?? 0,          colorClass: 'text-yellow-500' },
    { label: 'Среднее время (ч)',  value: overview?.avgResolutionHours ?? 0,   colorClass: 'text-green-600' },
    { label: 'Просроченных SLA',   value: overview?.overdueCount ?? 0,         colorClass: 'text-red-600' },
    { label: 'На модерации',       value: overview?.pendingCount ?? 0,         colorClass: 'text-purple-600' },
    {
      label: 'Средняя оценка',
      value: overview?.avgRating != null
        ? `${Number(overview.avgRating).toFixed(1)} / 5`
        : '— / 5',
      colorClass: 'text-emerald-600',
    },
  ];

  const slaPercent = sla?.slaCompliance != null
    ? `${Number(sla.slaCompliance).toFixed(1)}%`
    : '—';

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Дашборд</h1>
        <ExportDropdown />
      </div>

      {/* Top stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4 mb-8">
        {topCards.map((card) => (
          <StatCard key={card.label} {...card} />
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar chart: by category */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">По категориям</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={byCategory}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="categoryName" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill="#3182CE" radius={[4, 4, 0, 0]} name="Заявок" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Line chart: by period */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Динамика за 30 дней</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={byPeriod}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="period" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="#3182CE" strokeWidth={2} dot={{ r: 3 }} name="Заявок" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Additional stats + SLA card */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
        <div className="bg-white rounded-lg border border-gray-200 p-5 text-center">
          <p className="text-sm text-gray-500">Выполненных</p>
          <p className="text-3xl font-bold text-green-600 mt-1">{overview?.COMPLETED ?? 0}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-5 text-center">
          <p className="text-sm text-gray-500">Закрытых</p>
          <p className="text-3xl font-bold text-gray-600 mt-1">{overview?.CLOSED ?? 0}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-5 text-center">
          <p className="text-sm text-gray-500">Требуют внимания</p>
          <p className="text-3xl font-bold text-orange-600 mt-1">
            {(overview?.OPEN ?? 0) + (overview?.IN_PROGRESS ?? 0)}
          </p>
        </div>

        {/* SLA compliance card */}
        <div className="bg-white rounded-lg border border-gray-200 p-5 text-center">
          <p className="text-sm text-gray-500 mb-1">Соблюдение SLA</p>
          <p className="text-3xl font-bold text-blue-600">{slaPercent}</p>
          {sla && (
            <div className="mt-3 space-y-1 text-xs text-gray-500 text-left">
              <div className="flex justify-between">
                <span>В срок:</span>
                <span className="font-medium text-green-600">{sla.onTimeResolved ?? 0}</span>
              </div>
              <div className="flex justify-between">
                <span>Просрочено (завершено):</span>
                <span className="font-medium text-orange-500">{sla.overdueResolved ?? 0}</span>
              </div>
              <div className="flex justify-between">
                <span>Просрочено (активных):</span>
                <span className="font-medium text-red-600">{sla.overdueActive ?? 0}</span>
              </div>
              <div className="flex justify-between border-t border-gray-100 pt-1 mt-1">
                <span>Всего с дедлайном:</span>
                <span className="font-medium text-gray-700">{sla.totalWithDeadline ?? 0}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Per-assignee table */}
      <div className="bg-white rounded-lg border border-gray-200 mt-6 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800">Статистика по сотрудникам</h3>
        </div>
        {byAssignee.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-10">Нет данных</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  {['ФИО', 'Всего', 'Активных', 'Завершено', 'Ср. время (ч)', 'Ср. оценка'].map((col) => (
                    <th
                      key={col}
                      className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {byAssignee.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3 text-sm font-medium text-gray-800 whitespace-nowrap">
                      {row.fullName || '—'}
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-700">{row.totalAssigned ?? 0}</td>
                    <td className="px-5 py-3 text-sm text-yellow-600 font-medium">{row.activeCount ?? 0}</td>
                    <td className="px-5 py-3 text-sm text-green-600 font-medium">{row.completedCount ?? 0}</td>
                    <td className="px-5 py-3 text-sm text-gray-700">
                      {row.avgResolutionHours != null ? Number(row.avgResolutionHours).toFixed(1) : '—'}
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-700">
                      {row.avgRating != null ? (
                        <span className="inline-flex items-center gap-1">
                          <svg className="w-3.5 h-3.5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.957a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.37 2.448a1 1 0 00-.364 1.118l1.286 3.957c.3.921-.755 1.688-1.54 1.118l-3.37-2.448a1 1 0 00-1.175 0l-3.37 2.448c-.784.57-1.838-.197-1.54-1.118l1.286-3.957a1 1 0 00-.364-1.118L2.062 9.384c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69l1.287-3.957z" />
                          </svg>
                          {Number(row.avgRating).toFixed(1)}
                        </span>
                      ) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
