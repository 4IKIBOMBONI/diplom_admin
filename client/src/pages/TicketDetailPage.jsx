import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/UI/StatusBadge';
import PriorityBadge from '../components/UI/PriorityBadge';
import { formatDate, STATUS_MAP, PRIORITY_MAP } from '../utils/constants';

const STATUSES = ['OPEN', 'IN_PROGRESS', 'COMPLETED', 'CLOSED'];
const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

export default function TicketDetailPage() {
  const { id } = useParams();
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();

  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [admins, setAdmins] = useState([]);

  useEffect(() => {
    const fetchTicket = async () => {
      try {
        const { data } = await api.get(`/tickets/${id}`);
        setTicket(data);
      } catch {
        navigate('/tickets');
      } finally {
        setLoading(false);
      }
    };
    fetchTicket();
  }, [id, navigate]);

  useEffect(() => {
    if (isAdmin) {
      api.get('/users?role=ADMIN&limit=100').then(({ data }) => {
        setAdmins(data.users || []);
      }).catch(() => {});
      api.get('/users?role=SUPERADMIN&limit=100').then(({ data }) => {
        setAdmins((prev) => [...prev, ...(data.users || [])]);
      }).catch(() => {});
    }
  }, [isAdmin]);

  const handleStatusChange = async (newStatus) => {
    try {
      const { data } = await api.patch(`/tickets/${id}`, { status: newStatus });
      setTicket(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handlePriorityChange = async (newPriority) => {
    try {
      const { data } = await api.patch(`/tickets/${id}`, { priority: newPriority });
      setTicket(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAssigneeChange = async (assigneeId) => {
    try {
      const { data } = await api.patch(`/tickets/${id}`, { assigneeId: assigneeId || null });
      setTicket(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    setSubmitting(true);
    try {
      await api.post(`/tickets/${id}/comments`, { text: commentText, isInternal });
      setCommentText('');
      setIsInternal(false);
      // Refresh ticket to get new comments
      const { data } = await api.get(`/tickets/${id}`);
      setTicket(data);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" /></div>;
  }

  if (!ticket) return null;

  return (
    <div>
      <button onClick={() => navigate('/tickets')} className="text-sm text-primary-500 hover:underline mb-4 inline-flex items-center gap-1">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        Назад к списку
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Ticket info */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-start justify-between mb-4 flex-wrap gap-2">
              <div>
                <span className="text-sm text-gray-400">Заявка #{ticket.id}</span>
                <h1 className="text-xl font-bold text-gray-800 mt-1">{ticket.title}</h1>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={ticket.status} />
                <PriorityBadge priority={ticket.priority} />
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 text-sm">
              <div>
                <span className="text-gray-400 block">Категория</span>
                <span className="text-gray-700 font-medium">{ticket.category?.name}</span>
              </div>
              <div>
                <span className="text-gray-400 block">Автор</span>
                <span className="text-gray-700 font-medium">{ticket.creator?.fullName}</span>
              </div>
              <div>
                <span className="text-gray-400 block">Создана</span>
                <span className="text-gray-700">{formatDate(ticket.createdAt)}</span>
              </div>
              <div>
                <span className="text-gray-400 block">Исполнитель</span>
                <span className="text-gray-700">{ticket.assignee?.fullName || '—'}</span>
              </div>
              {ticket.location && (
                <div>
                  <span className="text-gray-400 block">Аудитория</span>
                  <span className="text-gray-700">{ticket.location}</span>
                </div>
              )}
              <div>
                <span className="text-gray-400 block">Источник</span>
                <span className="text-gray-700">{ticket.source === 'TELEGRAM' ? 'Telegram' : 'Веб'}</span>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Описание</h3>
              <p className="text-gray-700 whitespace-pre-wrap">{ticket.description}</p>
            </div>

            {/* Admin controls */}
            {isAdmin && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h3 className="text-sm font-medium text-gray-500 mb-3">Управление</h3>
                <div className="flex flex-wrap gap-3">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Статус</label>
                    <select
                      value={ticket.status}
                      onChange={(e) => handleStatusChange(e.target.value)}
                      className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white"
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>{STATUS_MAP[s]?.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Приоритет</label>
                    <select
                      value={ticket.priority}
                      onChange={(e) => handlePriorityChange(e.target.value)}
                      className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white"
                    >
                      {PRIORITIES.map((p) => (
                        <option key={p} value={p}>{PRIORITY_MAP[p]?.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Исполнитель</label>
                    <select
                      value={ticket.assigneeId || ''}
                      onChange={(e) => handleAssigneeChange(e.target.value)}
                      className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white"
                    >
                      <option value="">Не назначен</option>
                      {admins.map((a) => (
                        <option key={a.id} value={a.id}>{a.fullName}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Comments */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Комментарии ({ticket.comments?.length || 0})
            </h3>

            <div className="space-y-4 mb-6">
              {ticket.comments?.map((c) => (
                <div key={c.id} className={`p-3 rounded-lg ${c.isInternal ? 'bg-yellow-50 border border-yellow-200' : 'bg-gray-50'}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700">
                      {c.author?.fullName}
                      {c.isInternal && <span className="ml-2 text-xs text-yellow-600">(внутренний)</span>}
                    </span>
                    <span className="text-xs text-gray-400">{formatDate(c.createdAt)}</span>
                  </div>
                  <p className="text-sm text-gray-600 whitespace-pre-wrap">{c.text}</p>
                </div>
              ))}
              {(!ticket.comments || ticket.comments.length === 0) && (
                <p className="text-sm text-gray-400">Комментариев пока нет</p>
              )}
            </div>

            <form onSubmit={handleAddComment}>
              <textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Напишите комментарий..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none resize-none"
              />
              <div className="flex items-center justify-between mt-2">
                <div>
                  {isAdmin && (
                    <label className="flex items-center gap-2 text-sm text-gray-600">
                      <input
                        type="checkbox"
                        checked={isInternal}
                        onChange={(e) => setIsInternal(e.target.checked)}
                        className="rounded border-gray-300"
                      />
                      Внутренний комментарий
                    </label>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={submitting || !commentText.trim()}
                  className="px-4 py-2 bg-primary-500 text-white rounded-lg text-sm font-medium hover:bg-primary-600 disabled:opacity-50 transition-colors"
                >
                  {submitting ? 'Отправка...' : 'Отправить'}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right: Status history timeline */}
        <div>
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">История обработки</h3>
            <div className="relative">
              {ticket.statusHistory?.map((h, i) => {
                const config = STATUS_MAP[h.newStatus] || STATUS_MAP.OPEN;
                return (
                  <div key={h.id} className="flex gap-3 pb-6 last:pb-0">
                    <div className="flex flex-col items-center">
                      <div className={`w-3 h-3 rounded-full ${config.color} flex-shrink-0 mt-1`} />
                      {i < ticket.statusHistory.length - 1 && (
                        <div className="w-0.5 flex-1 bg-gray-200 mt-1" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">{config.label}</p>
                      {h.oldStatus && (
                        <p className="text-xs text-gray-400">
                          из "{STATUS_MAP[h.oldStatus]?.label}"
                        </p>
                      )}
                      <p className="text-xs text-gray-400">{h.changedBy?.fullName}</p>
                      <p className="text-xs text-gray-400">{formatDate(h.createdAt)}</p>
                    </div>
                  </div>
                );
              })}
              {(!ticket.statusHistory || ticket.statusHistory.length === 0) && (
                <p className="text-sm text-gray-400">Нет записей</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
