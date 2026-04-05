const { getUserTickets } = require('../api');
const { getMainKeyboard } = require('../keyboards');

const STATUS_LABELS = {
  PENDING: 'На модерации',
  OPEN: 'Открыта',
  IN_PROGRESS: 'В работе',
  COMPLETED: 'Выполнена',
  CLOSED: 'Закрыта',
};

const statusHandler = async (bot, chatId) => {
  if (!global.botSessions) {
    return bot.sendMessage(chatId, 'Введите /start для начала работы.');
  }

  const sess = global.botSessions.get(chatId);
  if (!sess || !sess.token) {
    return bot.sendMessage(chatId, 'Введите /start для начала работы.');
  }

  const tickets = await getUserTickets(sess.token);

  if (!tickets.length) {
    return bot.sendMessage(
      chatId,
      'У вас пока нет заявок.',
      getMainKeyboard()
    );
  }

  let message = '*Ваши последние заявки:*\n\n';
  tickets.forEach((t) => {
    const statusLabel = STATUS_LABELS[t.status] || t.status;
    message += `*#${t.id}* \u2014 ${t.title}\n`;
    message += `${statusLabel} | ${t.category?.name || '\u2014'}\n\n`;
  });

  await bot.sendMessage(chatId, message, { parse_mode: 'Markdown', ...getMainKeyboard() });
};

module.exports = { statusHandler };
