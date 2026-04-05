import { useState, useEffect } from 'react';
import api from '../services/api';
import PriorityBadge from '../components/UI/PriorityBadge';
import { formatDate } from '../utils/constants';

export default function ModerationPage() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);

  const fetchPending = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/tickets/pending');
      setTickets(data.tickets);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPending();
  }, []);

  const handleApprove = async (id) => {
    setActionLoading(id);
    try {
      await api.post(`/tickets/${id}/approve`);
      setTickets((prev) => prev.filter((t) => t.id !== id));
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (id) => {
    if (!confirm('Отклонить заявку? Она будет удалена.')) return;
    setActionLoading(id);
    try {
      await api.post(`/tickets/${id}/reject`);
      setTickets((prev) => prev.filter((t) => t.id !== id));
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Модерация заявок</h1>
        <span className="text-sm text-gray-500">
          Ожидают проверки: {tickets.length}
        </span>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Загрузка...</div>
        ) : tickets.length === 0 ? (
          <div className="p-8 text-center text-gray-400">Нет заявок на модерации</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {tickets.map((t) => (
              <div key={t.id} className="p-5 hover:bg-gray-50">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs text-gray-400">#{t.id}</span>
                      <PriorityBadge priority={t.priority} />
                      <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-600">
                        {t.source === 'TELEGRAM' ? 'Telegram' : 'Веб-форма'}
                      </span>
                    </div>
                    <h3 className="text-sm font-semibold text-gray-800 mb-1">{t.title}</h3>
                    <p className="text-sm text-gray-600 mb-2 line-clamp-2">{t.description}</p>
                    <div className="flex items-center gap-4 text-xs text-gray-400">
                      <span>Автор: {t.creator?.fullName}</span>
                      <span>Категория: {t.category?.name}</span>
                      <span>{formatDate(t.createdAt)}</span>
                      {t.location && <span>Аудитория: {t.location}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleApprove(t.id)}
                      disabled={actionLoading === t.id}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
                    >
                      Одобрить
                    </button>
                    <button
                      onClick={() => handleReject(t.id)}
                      disabled={actionLoading === t.id}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
                    >
                      Отклонить
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
