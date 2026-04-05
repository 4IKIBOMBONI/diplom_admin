const getMainKeyboard = () => ({
  reply_markup: {
    inline_keyboard: [
      [{ text: 'Новая заявка', callback_data: 'new_ticket' }],
      [
        { text: 'Мои заявки', callback_data: 'my_tickets' },
        { text: 'Помощь', callback_data: 'help' },
      ],
    ],
  },
});

const getCategoryKeyboard = (categories) => ({
  reply_markup: {
    inline_keyboard: categories.map((cat) => [
      { text: cat.name, callback_data: `cat_${cat.id}` },
    ]),
  },
});

const getCheckStatusKeyboard = (ticketId) => ({
  reply_markup: {
    inline_keyboard: [
      [{ text: 'Проверить статус', callback_data: `check_status_${ticketId}` }],
      [{ text: 'Новая заявка', callback_data: 'new_ticket' }],
    ],
  },
});

module.exports = { getMainKeyboard, getCategoryKeyboard, getCheckStatusKeyboard };
