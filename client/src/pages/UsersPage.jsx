import { useState, useEffect } from 'react';
import api from '../services/api';
import { ROLE_MAP, formatShortDate } from '../utils/constants';

const EMPTY_FORM = {
  fullName: '',
  email: '',
  phone: '',
  employeeId: '',
  role: 'USER',
  password: '',
};

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editingUser, setEditingUser] = useState(null);

  // Add-user modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  const fetchUsers = async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 20 });
      if (search) params.set('search', search);
      const { data } = await api.get(`/users?${params.toString()}`);
      setUsers(data.users);
      setPagination(data.pagination);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleRoleChange = async (userId, role) => {
    try {
      await api.patch(`/users/${userId}`, { role });
      fetchUsers(pagination.page);
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleActive = async (userId, isActive) => {
    try {
      await api.patch(`/users/${userId}`, { isActive: !isActive });
      fetchUsers(pagination.page);
    } catch (err) {
      console.error(err);
    }
  };

  const openAddModal = () => {
    setForm(EMPTY_FORM);
    setFormError('');
    setShowAddModal(true);
  };

  const closeAddModal = () => {
    setShowAddModal(false);
    setFormError('');
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!form.fullName.trim()) {
      setFormError('ФИО обязательно для заполнения.');
      return;
    }

    setFormLoading(true);
    try {
      const payload = {
        fullName: form.fullName.trim(),
        role: form.role,
      };
      if (form.email.trim()) payload.email = form.email.trim();
      if (form.phone.trim()) payload.phone = form.phone.trim();
      if (form.employeeId.trim()) payload.employeeId = form.employeeId.trim();
      if (form.password) payload.password = form.password;

      await api.post('/users', payload);
      closeAddModal();
      fetchUsers(1);
    } catch (err) {
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        'Не удалось создать пользователя.';
      setFormError(msg);
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Управление пользователями</h1>

      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
        <div className="flex gap-3">
          <input
            type="text"
            placeholder="Поиск по ФИО или email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
          />
          <button
            onClick={() => fetchUsers(1)}
            className="px-4 py-2 bg-primary-500 text-white rounded-lg text-sm font-medium hover:bg-primary-600"
          >
            Найти
          </button>
          <button
            onClick={openAddModal}
            className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 whitespace-nowrap"
          >
            + Добавить пользователя
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Загрузка...</div>
        ) : (
          <>
            {/* Desktop */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ФИО</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Номер уч. записи</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Роль</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Статус</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Заявок</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Дата рег.</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Действия</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-800">
                        {u.fullName}
                        {u.telegramUsername && (
                          <span className="ml-1 text-xs text-gray-400">@{u.telegramUsername}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{u.email || '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{u.employeeId || '—'}</td>
                      <td className="px-4 py-3">
                        <select
                          value={u.role}
                          onChange={(e) => handleRoleChange(u.id, e.target.value)}
                          className="px-2 py-1 border border-gray-300 rounded text-xs bg-white"
                        >
                          <option value="USER">Пользователь</option>
                          <option value="ADMIN">Администратор</option>
                          <option value="SUPERADMIN">Суперадмин</option>
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${u.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {u.isActive ? 'Активен' : 'Неактивен'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{u._count?.createdTickets || 0}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{formatShortDate(u.createdAt)}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleToggleActive(u.id, u.isActive)}
                          className={`text-xs px-2 py-1 rounded ${u.isActive ? 'text-red-600 hover:bg-red-50' : 'text-green-600 hover:bg-green-50'}`}
                        >
                          {u.isActive ? 'Деактивировать' : 'Активировать'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile */}
            <div className="md:hidden divide-y divide-gray-100">
              {users.map((u) => (
                <div key={u.id} className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-gray-800 text-sm">{u.fullName}</span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${u.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {u.isActive ? 'Активен' : 'Неактивен'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">{u.email || '—'} | {ROLE_MAP[u.role]}</p>
                  {u.employeeId && (
                    <p className="text-xs text-gray-400 mt-0.5">Уч. запись: {u.employeeId}</p>
                  )}
                  <div className="flex gap-2 mt-2">
                    <select
                      value={u.role}
                      onChange={(e) => handleRoleChange(u.id, e.target.value)}
                      className="px-2 py-1 border border-gray-300 rounded text-xs bg-white"
                    >
                      <option value="USER">Пользователь</option>
                      <option value="ADMIN">Администратор</option>
                      <option value="SUPERADMIN">Суперадмин</option>
                    </select>
                    <button
                      onClick={() => handleToggleActive(u.id, u.isActive)}
                      className={`text-xs px-2 py-1 rounded ${u.isActive ? 'text-red-600 bg-red-50' : 'text-green-600 bg-green-50'}`}
                    >
                      {u.isActive ? 'Деактивировать' : 'Активировать'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Add User Modal */}
      {showAddModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={(e) => { if (e.target === e.currentTarget) closeAddModal(); }}
        >
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-800">Добавить пользователя</h2>
              <button
                onClick={closeAddModal}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none"
                aria-label="Закрыть"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleAddUser} className="px-6 py-5 space-y-4">
              {/* ФИО */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ФИО <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="fullName"
                  value={form.fullName}
                  onChange={handleFormChange}
                  placeholder="Иванов Иван Иванович"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                  required
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleFormChange}
                  placeholder="user@example.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                />
              </div>

              {/* Телефон */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Телефон</label>
                <input
                  type="text"
                  name="phone"
                  value={form.phone}
                  onChange={handleFormChange}
                  placeholder="+7 900 000 00 00"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                />
              </div>

              {/* Номер учётной записи */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Номер учётной записи</label>
                <input
                  type="text"
                  name="employeeId"
                  value={form.employeeId}
                  onChange={handleFormChange}
                  placeholder="EMP-001"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                />
              </div>

              {/* Роль */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Роль</label>
                <select
                  name="role"
                  value={form.role}
                  onChange={handleFormChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                >
                  <option value="USER">Пользователь</option>
                  <option value="ADMIN">Администратор</option>
                  <option value="SUPERADMIN">Суперадмин</option>
                </select>
              </div>

              {/* Пароль */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Пароль
                  <span className="ml-1 text-xs text-gray-400 font-normal">(если указан — вход по email&nbsp;+&nbsp;пароль)</span>
                </label>
                <input
                  type="password"
                  name="password"
                  value={form.password}
                  onChange={handleFormChange}
                  placeholder="Необязательно"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                />
              </div>

              {/* Error */}
              {formError && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {formError}
                </p>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-1">
                <button
                  type="button"
                  onClick={closeAddModal}
                  className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {formLoading ? 'Создание...' : 'Создать'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
