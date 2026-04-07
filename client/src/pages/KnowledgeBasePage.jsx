import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import Pagination from '../components/UI/Pagination';

// ─── Article Modal (full view) ────────────────────────────────────────────────

function ArticleModal({ article, onClose, onEdit, onDelete, isAdmin }) {
  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  if (!article) return null;

  const formattedDate = new Date(article.createdAt).toLocaleDateString('ru-RU', {
    day: '2-digit', month: 'long', year: 'numeric',
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 overflow-y-auto py-8 px-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-lg border border-gray-200 w-full max-w-3xl shadow-xl">
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-gray-200">
          <div className="flex-1 min-w-0 pr-4">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <span className="inline-block bg-primary-50 text-primary-600 text-xs font-medium px-2.5 py-1 rounded-full border border-primary-200">
                {article.categoryName}
              </span>
              <span className="text-xs text-gray-400">{formattedDate}</span>
              <span className="text-xs text-gray-400 flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                {article.viewCount}
              </span>
            </div>
            <h2 className="text-xl font-bold text-gray-800">{article.title}</h2>
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">{article.content}</p>
        </div>

        {/* Tags */}
        {article.tags && article.tags.length > 0 && (
          <div className="px-6 pb-4 flex flex-wrap gap-1.5">
            {article.tags.map((tag) => (
              <span
                key={tag}
                className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full border border-gray-200"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Admin actions */}
        {isAdmin && (
          <div className="flex items-center gap-2 px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-lg">
            <button
              onClick={() => onEdit(article)}
              className="px-3 py-1.5 text-sm font-medium text-primary-600 border border-primary-300 rounded-lg hover:bg-primary-50 transition-colors"
            >
              Редактировать
            </button>
            <button
              onClick={() => onDelete(article)}
              className="px-3 py-1.5 text-sm font-medium text-red-600 border border-red-300 rounded-lg hover:bg-red-50 transition-colors"
            >
              Удалить
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Article Form Modal (create / edit) ──────────────────────────────────────

const EMPTY_FORM = { title: '', content: '', categoryName: '', tags: '' };

function ArticleFormModal({ initial, onClose, onSaved }) {
  const [form, setForm] = useState(
    initial
      ? { title: initial.title, content: initial.content, categoryName: initial.categoryName, tags: (initial.tags || []).join(', ') }
      : EMPTY_FORM
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.content.trim() || !form.categoryName.trim()) {
      setError('Заполните все обязательные поля.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const payload = {
        title: form.title.trim(),
        content: form.content.trim(),
        categoryName: form.categoryName.trim(),
        tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
      };
      if (initial) {
        await api.patch(`/knowledge-base/${initial.id}`, payload);
      } else {
        await api.post('/knowledge-base', payload);
      }
      onSaved();
    } catch (err) {
      setError(err?.response?.data?.message || 'Ошибка при сохранении.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 overflow-y-auto py-8 px-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-lg border border-gray-200 w-full max-w-2xl shadow-xl">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-800">
            {initial ? 'Редактировать статью' : 'Новая статья'}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-2">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Заголовок <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Введите заголовок статьи"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Категория <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.categoryName}
              onChange={(e) => setForm({ ...form, categoryName: e.target.value })}
              placeholder="Например: Установка, Безопасность"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Содержание <span className="text-red-500">*</span>
            </label>
            <textarea
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              placeholder="Текст статьи..."
              rows={10}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none resize-y"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Теги <span className="text-gray-400 font-normal">(через запятую)</span>
            </label>
            <input
              type="text"
              value={form.tags}
              onChange={(e) => setForm({ ...form, tags: e.target.value })}
              placeholder="vpn, настройка, windows"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-primary-500 text-white rounded-lg text-sm font-medium hover:bg-primary-600 disabled:opacity-60 transition-colors"
            >
              {saving ? 'Сохранение...' : initial ? 'Сохранить' : 'Создать'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Delete Confirmation Modal ────────────────────────────────────────────────

function DeleteConfirmModal({ article, onClose, onConfirm, deleting }) {
  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-lg border border-gray-200 w-full max-w-md shadow-xl p-6">
        <h2 className="text-lg font-bold text-gray-800 mb-2">Удалить статью?</h2>
        <p className="text-sm text-gray-600 mb-6">
          Статья <span className="font-medium">«{article.title}»</span> будет удалена безвозвратно.
        </p>
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            disabled={deleting}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-60"
          >
            Отмена
          </button>
          <button
            onClick={onConfirm}
            disabled={deleting}
            className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 disabled:opacity-60 transition-colors"
          >
            {deleting ? 'Удаление...' : 'Удалить'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function KnowledgeBasePage() {
  const { isAdmin } = useAuth();

  const [articles, setArticles] = useState([]);
  const [categories, setCategories] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

  // Modals
  const [viewArticle, setViewArticle] = useState(null);  // full article from API
  const [viewLoading, setViewLoading] = useState(false);
  const [formModal, setFormModal] = useState(null);       // null | 'create' | article-object
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchArticles = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: pagination.limit });
      if (search) params.set('search', search);
      if (selectedCategory) params.set('category', selectedCategory);
      const { data } = await api.get(`/knowledge-base?${params.toString()}`);
      setArticles(data.articles || []);
      setCategories(data.categories || []);
      setPagination((prev) => ({ ...prev, ...data.pagination, page }));
    } catch (err) {
      console.error('Error fetching knowledge base:', err);
    } finally {
      setLoading(false);
    }
  }, [search, selectedCategory, pagination.limit]);

  useEffect(() => {
    fetchArticles(1);
  }, [search, selectedCategory]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setSearch(searchInput.trim());
  };

  const handleCategorySelect = (cat) => {
    setSelectedCategory((prev) => (prev === cat ? '' : cat));
  };

  const handleOpenArticle = async (id) => {
    setViewLoading(true);
    try {
      const { data } = await api.get(`/knowledge-base/${id}`);
      setViewArticle(data);
    } catch (err) {
      console.error('Error fetching article:', err);
    } finally {
      setViewLoading(false);
    }
  };

  const handleCloseView = () => setViewArticle(null);

  const handleEditFromView = (article) => {
    setViewArticle(null);
    setFormModal(article);
  };

  const handleDeleteFromView = (article) => {
    setViewArticle(null);
    setDeleteTarget(article);
  };

  const handleFormSaved = () => {
    setFormModal(null);
    fetchArticles(pagination.page);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/knowledge-base/${deleteTarget.id}`);
      setDeleteTarget(null);
      fetchArticles(pagination.page);
    } catch (err) {
      console.error('Error deleting article:', err);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      {/* Page header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-gray-800">База знаний</h1>
        {isAdmin && (
          <button
            onClick={() => setFormModal('create')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors text-sm font-medium"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Добавить статью
          </button>
        )}
      </div>

      {/* Search bar */}
      <form onSubmit={handleSearchSubmit} className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Поиск по базе знаний..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-primary-500 text-white rounded-lg text-sm font-medium hover:bg-primary-600 transition-colors"
          >
            Найти
          </button>
          {(search || selectedCategory) && (
            <button
              type="button"
              onClick={() => { setSearch(''); setSearchInput(''); setSelectedCategory(''); }}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Сбросить
            </button>
          )}
        </div>
      </form>

      {/* Category filter pills */}
      {categories.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => handleCategorySelect(cat)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors border ${
                selectedCategory === cat
                  ? 'bg-primary-500 text-white border-primary-500'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-primary-300 hover:text-primary-600'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Loading overlay indicator */}
      {viewLoading && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/20">
          <div className="bg-white rounded-lg px-6 py-4 text-sm text-gray-600 shadow-lg border border-gray-200">
            Загрузка статьи...
          </div>
        </div>
      )}

      {/* Article list */}
      {loading ? (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-400">
          Загрузка...
        </div>
      ) : articles.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
          <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-gray-500 font-medium">Статьи не найдены</p>
          {(search || selectedCategory) && (
            <p className="text-gray-400 text-sm mt-1">Попробуйте изменить параметры поиска</p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {articles.map((article) => (
            <ArticleCard
              key={article.id}
              article={article}
              isAdmin={isAdmin}
              onOpen={handleOpenArticle}
              onEdit={(a) => setFormModal(a)}
              onDelete={(a) => setDeleteTarget(a)}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      <Pagination
        page={pagination.page}
        totalPages={pagination.totalPages}
        total={pagination.total}
        limit={pagination.limit}
        onPageChange={(p) => fetchArticles(p)}
      />

      {/* Full article view modal */}
      {viewArticle && (
        <ArticleModal
          article={viewArticle}
          onClose={handleCloseView}
          onEdit={handleEditFromView}
          onDelete={handleDeleteFromView}
          isAdmin={isAdmin}
        />
      )}

      {/* Create / Edit form modal */}
      {formModal !== null && (
        <ArticleFormModal
          initial={formModal === 'create' ? null : formModal}
          onClose={() => setFormModal(null)}
          onSaved={handleFormSaved}
        />
      )}

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <DeleteConfirmModal
          article={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDeleteConfirm}
          deleting={deleting}
        />
      )}
    </div>
  );
}

// ─── Article Card ─────────────────────────────────────────────────────────────

function ArticleCard({ article, isAdmin, onOpen, onEdit, onDelete }) {
  const preview = article.content
    ? article.content.slice(0, 150) + (article.content.length > 150 ? '...' : '')
    : '';

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5 flex flex-col gap-3 hover:border-primary-300 hover:shadow-sm transition-all group">
      {/* Category + views */}
      <div className="flex items-center justify-between gap-2">
        <span className="inline-block bg-primary-50 text-primary-600 text-xs font-medium px-2.5 py-1 rounded-full border border-primary-200 truncate max-w-[70%]">
          {article.categoryName}
        </span>
        <span className="text-xs text-gray-400 flex items-center gap-1 flex-shrink-0">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          {article.viewCount ?? 0}
        </span>
      </div>

      {/* Title */}
      <h3
        className="text-sm font-semibold text-gray-800 leading-snug cursor-pointer group-hover:text-primary-600 transition-colors line-clamp-2"
        onClick={() => onOpen(article.id)}
      >
        {article.title}
      </h3>

      {/* Preview */}
      {preview && (
        <p className="text-xs text-gray-500 leading-relaxed flex-1 line-clamp-3">{preview}</p>
      )}

      {/* Tags */}
      {article.tags && article.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {article.tags.map((tag) => (
            <span
              key={tag}
              className="bg-gray-100 text-gray-500 text-xs px-2 py-0.5 rounded-full border border-gray-200"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* Footer actions */}
      <div className="flex items-center justify-between pt-1 border-t border-gray-100">
        <button
          onClick={() => onOpen(article.id)}
          className="text-xs text-primary-600 font-medium hover:text-primary-700 transition-colors"
        >
          Читать →
        </button>
        {isAdmin && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => onEdit(article)}
              className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
              title="Редактировать"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button
              onClick={() => onDelete(article)}
              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              title="Удалить"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
