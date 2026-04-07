import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/UI/StatusBadge';
import PriorityBadge from '../components/UI/PriorityBadge';
import { formatDate, STATUS_MAP, PRIORITY_MAP } from '../utils/constants';

const STATUSES = ['OPEN', 'IN_PROGRESS', 'COMPLETED', 'CLOSED'];
const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

function DeadlineField({ deadline, status }) {
  if (!deadline) return null;

  const now = new Date();
  const dl = new Date(deadline);
  const isOverdue = dl < now && (status === 'OPEN' || status === 'IN_PROGRESS');
  const hoursUntil = (dl - now) / (1000 * 60 * 60);
  const isSoon = !isOverdue && hoursUntil >= 0 && hoursUntil <= 4;

  let colorClass = 'text-green-600';
  let label = null;

  if (isOverdue) {
    colorClass = 'text-red-600';
    label = 'Просрочено';
  } else if (isSoon) {
    colorClass = 'text-orange-500';
    label = 'Скоро';
  }

  return (
    <div>
      <span className="text-gray-400 block">Дедлайн</span>
      <span className={`font-medium ${colorClass}`}>
        {formatDate(deadline)}
        {label && <span className="ml-1 text-xs font-semibold">({label})</span>}
      </span>
    </div>
  );
}

function StarRating({ value, onChange }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(0)}
          className="focus:outline-none"
          aria-label={`${star} звезда`}
        >
          <svg
            className={`w-7 h-7 transition-colors ${
              star <= (hovered || value) ? 'text-yellow-400' : 'text-gray-300'
            }`}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        </button>
      ))}
    </div>
  );
}

function DisplayStars({ value }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          className={`w-5 h-5 ${star <= value ? 'text-yellow-400' : 'text-gray-300'}`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

function formatFileSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
}

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
  const [moderationLoading, setModerationLoading] = useState(false);

  // Rating state
  const [ratingValue, setRatingValue] = useState(0);
  const [ratingComment, setRatingComment] = useState('');
  const [ratingSubmitting, setRatingSubmitting] = useState(false);

  // Attachments state
  const [uploadFiles, setUploadFiles] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const refreshTicket = async () => {
    const { data } = await api.get(`/tickets/${id}`);
    setTicket(data);
  };

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

  const handleApprove = async () => {
    setModerationLoading(true);
    try {
      const { data } = await api.post(`/tickets/${id}/approve`);
      setTicket(data);
    } catch (err) {
      console.error(err);
    } finally {
      setModerationLoading(false);
    }
  };

  const handleReject = async () => {
    if (!confirm('Отклонить заявку? Она будет удалена.')) return;
    setModerationLoading(true);
    try {
      await api.post(`/tickets/${id}/reject`);
      navigate('/moderation');
    } catch (err) {
      console.error(err);
    } finally {
      setModerationLoading(false);
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

  const handleSubmitRating = async (e) => {
    e.preventDefault();
    if (!ratingValue) return;
    setRatingSubmitting(true);
    try {
      await api.post(`/tickets/${id}/rate`, { rating: ratingValue, comment: ratingComment });
      await refreshTicket();
      setRatingComment('');
    } catch (err) {
      console.error(err);
    } finally {
      setRatingSubmitting(false);
    }
  };

  const handleUploadAttachments = async (e) => {
    e.preventDefault();
    if (!uploadFiles || uploadFiles.length === 0) return;
    setUploading(true);
    try {
      const formData = new FormData();
      for (const file of uploadFiles) {
        formData.append('files', file);
      }
      await api.post(`/tickets/${id}/attachments`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setUploadFiles(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      await refreshTicket();
    } catch (err) {
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" /></div>;
  }

  if (!ticket) return null;

  const isCreator = user && ticket.creatorId === user.id;
  const canRate = isCreator && (ticket.status === 'COMPLETED' || ticket.status === 'CLOSED');

  return (
    <div>
      <button onClick={() => navigate(ticket.status === 'PENDING' && isAdmin ? '/moderation' : '/tickets')} className="text-sm text-primary-500 hover:underline mb-4 inline-flex items-center gap-1">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        {ticket.status === 'PENDING' && isAdmin ? 'Назад к модерации' : 'Назад к списку'}
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
              <DeadlineField deadline={ticket.deadline} status={ticket.status} />
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Описание</h3>
              <p className="text-gray-700 whitespace-pre-wrap">{ticket.description}</p>
            </div>

            {/* Attachments */}
            {((ticket.attachments && ticket.attachments.length > 0) || true) && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h3 className="text-sm font-medium text-gray-500 mb-3">Вложения</h3>

                {ticket.attachments && ticket.attachments.length > 0 ? (
                  <ul className="space-y-2 mb-4">
                    {ticket.attachments.map((att) => {
                      const isImage = att.mimeType && att.mimeType.startsWith('image/');
                      return (
                        <li key={att.id} className="flex items-center gap-3">
                          {isImage && (
                            <a href={`/uploads/${att.filename}`} target="_blank" rel="noreferrer">
                              <img
                                src={`/uploads/${att.filename}`}
                                alt={att.originalName || att.filename}
                                className="w-12 h-12 object-cover rounded border border-gray-200 flex-shrink-0"
                              />
                            </a>
                          )}
                          {!isImage && (
                            <div className="w-12 h-12 flex items-center justify-center rounded border border-gray-200 bg-gray-50 flex-shrink-0">
                              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                              </svg>
                            </div>
                          )}
                          <div className="min-w-0">
                            <a
                              href={`/uploads/${att.filename}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-sm text-primary-600 hover:underline truncate block"
                            >
                              {att.originalName || att.filename}
                            </a>
                            {att.size && (
                              <span className="text-xs text-gray-400">{formatFileSize(att.size)}</span>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-400 mb-4">Вложений нет</p>
                )}

                <form onSubmit={handleUploadAttachments} className="flex items-center gap-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    onChange={(e) => setUploadFiles(e.target.files)}
                    className="text-sm text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200 cursor-pointer"
                  />
                  <button
                    type="submit"
                    disabled={uploading || !uploadFiles || uploadFiles.length === 0}
                    className="px-4 py-1.5 bg-primary-500 text-white rounded-lg text-sm font-medium hover:bg-primary-600 disabled:opacity-50 transition-colors whitespace-nowrap"
                  >
                    {uploading ? 'Загрузка...' : 'Загрузить'}
                  </button>
                </form>
              </div>
            )}

            {/* Moderation controls for PENDING tickets */}
            {isAdmin && ticket.status === 'PENDING' && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h3 className="text-sm font-medium text-gray-500 mb-3">Модерация</h3>
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleApprove}
                    disabled={moderationLoading}
                    className="px-5 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
                  >
                    Одобрить
                  </button>
                  <button
                    onClick={handleReject}
                    disabled={moderationLoading}
                    className="px-5 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
                  >
                    Отклонить
                  </button>
                </div>
              </div>
            )}

            {/* Admin controls */}
            {isAdmin && ticket.status !== 'PENDING' && (
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

          {/* Rating */}
          {canRate && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Оценка</h3>

              {ticket.rating ? (
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <DisplayStars value={ticket.rating} />
                    <span className="text-sm text-gray-500">{ticket.rating} из 5</span>
                  </div>
                  {ticket.ratingComment && (
                    <p className="text-sm text-gray-600 mt-2 bg-gray-50 rounded-lg p-3 whitespace-pre-wrap">
                      {ticket.ratingComment}
                    </p>
                  )}
                </div>
              ) : (
                <form onSubmit={handleSubmitRating} className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-500 mb-2">Оцените работу по заявке:</p>
                    <StarRating value={ratingValue} onChange={setRatingValue} />
                  </div>
                  <div>
                    <textarea
                      value={ratingComment}
                      onChange={(e) => setRatingComment(e.target.value)}
                      placeholder="Комментарий к оценке (необязательно)..."
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none resize-none"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={ratingSubmitting || !ratingValue}
                    className="px-4 py-2 bg-primary-500 text-white rounded-lg text-sm font-medium hover:bg-primary-600 disabled:opacity-50 transition-colors"
                  >
                    {ratingSubmitting ? 'Отправка...' : 'Отправить оценку'}
                  </button>
                </form>
              )}
            </div>
          )}
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
