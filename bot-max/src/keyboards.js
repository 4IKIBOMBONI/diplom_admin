// Клавиатуры для MAX Bot API.
// Структура: массив строк, каждая строка — массив кнопок.
// Тип callback: { type: 'callback', text: '...', payload: '...' }

const getMainKeyboard = () => ({
  reply_markup: {
    inline_keyboard: [
      [{ type: 'callback', text: 'Новая заявка', payload: 'new_ticket' }],
      [
        { type: 'callback', text: 'Мои заявки', payload: 'my_tickets' },
        { type: 'callback', text: 'Помощь', payload: 'help' },
      ],
    ],
  },
});

const getAdminKeyboard = () => ({
  reply_markup: {
    inline_keyboard: [
      [{ type: 'callback', text: 'На модерации', payload: 'admin_pending' }],
      [
        { type: 'callback', text: 'Открытые', payload: 'admin_open' },
        { type: 'callback', text: 'В работе', payload: 'admin_in_progress' },
      ],
      [{ type: 'callback', text: '◀ Главное меню', payload: 'main_menu' }],
    ],
  },
});

const getCategoryKeyboard = (categories) => ({
  reply_markup: {
    inline_keyboard: categories.map((cat) => [
      { type: 'callback', text: cat.name, payload: `cat_${cat.id}` },
    ]),
  },
});

const getCheckStatusKeyboard = (ticketId) => ({
  reply_markup: {
    inline_keyboard: [
      [{ type: 'callback', text: 'Проверить статус', payload: `check_status_${ticketId}` }],
      [{ type: 'callback', text: 'Новая заявка', payload: 'new_ticket' }],
    ],
  },
});

module.exports = { getMainKeyboard, getAdminKeyboard, getCategoryKeyboard, getCheckStatusKeyboard };
