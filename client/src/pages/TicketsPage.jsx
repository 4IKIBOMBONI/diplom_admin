import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import StatusBadge from '../components/UI/StatusBadge';
import PriorityBadge from '../components/UI/PriorityBadge';
import Pagination from '../components/UI/Pagination';
import { formatShortDate } from '../utils/constants';

const STATUS_TABS = [
  { key: '', label: 'Все' },
  { key: 'OPEN', label: 'Открыта' },
  { key: 'IN_PROGRESS', label: 'В работе' },
  { key: 'COMPLETED', label: 'Выполнена' },
  { key: 'CLOSED', label: 'Закрыта' },
];

export default function TicketsPage() {
  const { isAdmin } = useAuth();
  const socket = useSocket();
  const navigate = useNavigate();

  const [tickets, setTickets] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 });
  const [counts, setCounts] = useState({ total: 0, OPEN: 0, IN_PROGRESS: 0, COMPLETED: 0, CLOSED: 0 });
  const [loading, setLoading] = useState(true);

  const [filters, setFilters] = useState({ status: '', category: '', priority: '', search: '' });
  const [categories, setCategories] = useState([]);
  const [activeTab, setActiveTab] = useState('');

  const fetchTickets = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 10, sortBy: 'createdAt', order: 'desc' });
      if (activeTab) params.set('status', activeTab);
      else if (filters.status) params.set('status', filters.status);
      if (filters.category) params.set('category', filters.category);
      if (filters.priority) params.set('priority', filters.priority);
      if (filters.search) params.set('search', filters.search);

      const { data } = await api.get(`/tickets?${params.toString()}`);
      setTickets(data.tickets);
      setPagination(data.pagination);
      setCounts(data.counts);
    } catch (err) {
      console.error('Error fetching tickets:', err);
    } finally {
      setLoading(false);
    }
  }, [activeTab, filters]);

  useEffect(() => {
    api.get('/categories').then(({ data }) => setCategories(data)).catch(() => {});
  }, []);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  // Realtime updates
  useEffect(() => {
    if (!socket) return;
    const refresh = () => fetchTickets(pagination.page);
    socket.on('ticket:new', refresh);
    socket.on('ticket:statusChanged', refresh);
    return () => {
      socket.off('ticket:new', refresh);
      socket.off('ticket:statusChanged', refresh);
    };
  }, [socket, fetchTickets, pagination.page]);

  const handleTabClick = (key) => {
    setActiveTab(key);
    setFilters((f) => ({ ...f, status: '' }));
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-gray-800">Заявки</h1>
        <Link
          to="/tickets/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors text-sm font-medium"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Создать заявку
        </Link>
      </div>

      {/* Status tabs */}
      <div className="flex gap-1 mb-4 overflow-x-auto pb-1">
        {STATUS_TABS.map((tab) => {
          const count = tab.key ? counts[tab.key] || 0 : counts.total;
          return (
            <button
              key={tab.key}
              onClick={() => handleTabClick(tab.key)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                activeTab === tab.key
                  ? 'bg-primary-500 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              {tab.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-medium text-gray-500 mb-1">Поиск</label>
            <input
              type="text"
              placeholder="Поиск по теме или описанию..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
            />
          </div>
          <div className="min-w-[150px]">
            <label className="block text-xs font-medium text-gray-500 mb-1">Категория</label>
            <select
              value={filters.category}
              onChange={(e) => setFilters({ ...filters, category: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none bg-white"
            >
              <option value="">Все категории</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="min-w-[140px]">
            <label className="block text-xs font-medium text-gray-500 mb-1">Приоритет</label>
            <select
              value={filters.priority}
              onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none bg-white"
            >
              <option value="">Все</option>
              <option value="LOW">Низкий</option>
              <option value="MEDIUM">Средний</option>
              <option value="HIGH">Высокий</option>
              <option value="CRITICAL">Критический</option>
            </select>
          </div>
          <button
            onClick={() => fetchTickets(1)}
            className="px-4 py-2 bg-primary-500 text-white rounded-lg text-sm font-medium hover:bg-primary-600 transition-colors"
          >
            Применить
          </button>
          <button
            onClick={() => { setFilters({ status: '', category: '', priority: '', search: '' }); setActiveTab(''); }}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Сбросить
          </button>
        </div>
      </div>

      {/* Tickets table / cards */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Загрузка...</div>
        ) : tickets.length === 0 ? (
          <div className="p-8 text-center text-gray-400">Заявки не найдены</div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Тема</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Категория</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Статус</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Приоритет</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Дата</th>
                    {isAdmin && <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Исполнитель</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {tickets.map((t) => (
                    <tr
                      key={t.id}
                      className="hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => navigate(`/tickets/${t.id}`)}
                    >
                      <td className="px-4 py-3 text-sm text-gray-500">#{t.id}</td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-800 max-w-xs truncate">{t.title}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{t.category?.name}</td>
                      <td className="px-4 py-3"><StatusBadge status={t.status} /></td>
                      <td className="px-4 py-3"><PriorityBadge priority={t.priority} /></td>
                      <td className="px-4 py-3 text-sm text-gray-500">{formatShortDate(t.createdAt)}</td>
                      {isAdmin && (
                        <td className="px-4 py-3 text-sm text-gray-600">{t.assignee?.fullName || '—'}</td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-gray-100">
              {tickets.map((t) => (
                <div
                  key={t.id}
                  className="p-4 hover:bg-gray-50 cursor-pointer"
                  onClick={() => navigate(`/tickets/${t.id}`)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <span className="text-xs text-gray-400">#{t.id}</span>
                      <h3 className="text-sm font-medium text-gray-800">{t.title}</h3>
                    </div>
                    <StatusBadge status={t.status} />
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span>{t.category?.name}</span>
                    <PriorityBadge priority={t.priority} />
                    <span>{formatShortDate(t.createdAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <Pagination
        page={pagination.page}
        totalPages={pagination.totalPages}
        total={pagination.total}
        limit={pagination.limit}
        onPageChange={(p) => fetchTickets(p)}
      />
    </div>
  );
}
