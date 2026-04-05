import { useState, useEffect } from 'react';
import api from '../services/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

export default function DashboardPage() {
  const [overview, setOverview] = useState(null);
  const [byCategory, setByCategory] = useState([]);
  const [byPeriod, setByPeriod] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [ov, cat, period] = await Promise.all([
          api.get('/stats/overview'),
          api.get('/stats/by-category'),
          api.get('/stats/by-period?period=day&days=30'),
        ]);
        setOverview(ov.data);
        setByCategory(cat.data);
        setByPeriod(period.data);
      } catch (err) {
        console.error('Error fetching stats:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" /></div>;
  }

  const cards = [
    { label: 'Всего заявок', value: overview?.total || 0, color: 'bg-blue-500' },
    { label: 'Открытых', value: overview?.OPEN || 0, color: 'bg-blue-400' },
    { label: 'В работе', value: overview?.IN_PROGRESS || 0, color: 'bg-yellow-500' },
    { label: 'Среднее время (ч)', value: overview?.avgResolutionHours || 0, color: 'bg-green-500' },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Дашборд</h1>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {cards.map((card) => (
          <div key={card.label} className="bg-white rounded-lg border border-gray-200 p-5">
            <div>
              <p className="text-sm text-gray-500">{card.label}</p>
              <p className="text-2xl font-bold text-gray-800 mt-1">{card.value}</p>
            </div>
          </div>
        ))}
      </div>

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

      {/* Additional stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
        <div className="bg-white rounded-lg border border-gray-200 p-5 text-center">
          <p className="text-sm text-gray-500">Выполненных</p>
          <p className="text-3xl font-bold text-green-600 mt-1">{overview?.COMPLETED || 0}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-5 text-center">
          <p className="text-sm text-gray-500">Закрытых</p>
          <p className="text-3xl font-bold text-gray-600 mt-1">{overview?.CLOSED || 0}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-5 text-center">
          <p className="text-sm text-gray-500">Требуют внимания</p>
          <p className="text-3xl font-bold text-orange-600 mt-1">{(overview?.OPEN || 0) + (overview?.IN_PROGRESS || 0)}</p>
        </div>
      </div>
    </div>
  );
}
