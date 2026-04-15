import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

export default function PublicSubmitPage() {
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    categoryId: '',
    location: '',
    title: '',
    description: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    axios
      .get('/api/categories/public')
      .then(({ data }) => setCategories(data))
      .catch(() => {});
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.email && !form.phone) {
      setError('Укажите email или телефон для связи');
      return;
    }

    setLoading(true);
    try {
      const { data } = await axios.post('/api/tickets/public', {
        ...form,
        categoryId: parseInt(form.categoryId),
      });
      setSuccess(data.id);
    } catch (err) {
      setError(err.response?.data?.error || 'Не удалось отправить заявку');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1E3A5F] to-[#2C5282] flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 text-center">
          <h1 className="text-2xl font-semibold text-gray-800 mb-2">Заявка отправлена</h1>
          <p className="text-gray-600 mb-1">Номер заявки: <span className="font-semibold">#{success}</span></p>
          <p className="text-gray-600 mb-6">
            Статус: На модерации. После проверки администратором заявка будет принята в обработку.
          </p>
          <div className="flex flex-col gap-2">
            <button
              onClick={() => { setSuccess(null); setForm({ fullName: '', email: '', phone: '', categoryId: '', location: '', title: '', description: '' }); }}
              className="w-full py-2.5 bg-primary-500 text-white rounded-lg font-medium hover:bg-primary-600 transition-colors"
            >
              Подать ещё одну заявку
            </button>
            <Link to="/login" className="text-sm text-primary-500 hover:underline">
              Войти в систему
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1E3A5F] to-[#2C5282] flex items-center justify-center p-4">
      <div className="w-full max-w-xl">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-white">HelpDesk</h1>
          <p className="text-white/60 mt-1">Подать заявку без регистрации</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-6">Новая заявка</h2>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-600 text-sm">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ФИО *</label>
              <input
                type="text"
                required
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                placeholder="Иванов Иван Иванович"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                  placeholder="user@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Телефон</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                  placeholder="+7 (999) 123-45-67"
                />
              </div>
            </div>
            <p className="text-xs text-gray-500 -mt-2">Укажите хотя бы один способ связи</p>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Категория *</label>
              <select
                required
                value={form.categoryId}
                onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none bg-white"
              >
                <option value="">Выберите категорию</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Аудитория / кабинет</label>
              <input
                type="text"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                placeholder="Напр. 301, Корпус А"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Тема *</label>
              <input
                type="text"
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                placeholder="Кратко опишите проблему"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Описание *</label>
              <textarea
                required
                rows={5}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none resize-none"
                placeholder="Подробно опишите проблему..."
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-primary-500 text-white rounded-lg font-medium hover:bg-primary-600 transition-colors disabled:opacity-50"
            >
              {loading ? 'Отправка...' : 'Отправить заявку'}
            </button>
          </form>

          <div className="mt-4 text-center">
            <Link to="/login" className="text-sm text-primary-500 hover:underline">
              Войти в систему
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
