export const STATUS_MAP = {
  PENDING: { label: 'На модерации', color: 'bg-purple-500', textColor: 'text-purple-700', bgLight: 'bg-purple-100' },
  OPEN: { label: 'Открыта', color: 'bg-blue-500', textColor: 'text-blue-700', bgLight: 'bg-blue-100' },
  IN_PROGRESS: { label: 'В работе', color: 'bg-yellow-500', textColor: 'text-yellow-700', bgLight: 'bg-yellow-100' },
  COMPLETED: { label: 'Выполнена', color: 'bg-green-500', textColor: 'text-green-700', bgLight: 'bg-green-100' },
  CLOSED: { label: 'Закрыта', color: 'bg-gray-500', textColor: 'text-gray-700', bgLight: 'bg-gray-100' },
};

export const PRIORITY_MAP = {
  LOW: { label: 'Низкий', color: 'text-gray-600', bg: 'bg-gray-100' },
  MEDIUM: { label: 'Средний', color: 'text-blue-600', bg: 'bg-blue-100' },
  HIGH: { label: 'Высокий', color: 'text-orange-600', bg: 'bg-orange-100' },
  CRITICAL: { label: 'Критический', color: 'text-red-600', bg: 'bg-red-100' },
};

export const ROLE_MAP = {
  USER: 'Пользователь',
  ADMIN: 'Администратор',
  SUPERADMIN: 'Суперадмин',
};

export const formatDate = (dateStr) => {
  if (!dateStr) return '\u2014';
  const d = new Date(dateStr);
  return d.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const formatShortDate = (dateStr) => {
  if (!dateStr) return '\u2014';
  const d = new Date(dateStr);
  return d.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};
