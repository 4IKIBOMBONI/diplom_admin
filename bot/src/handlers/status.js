const { getUserTickets } = require('../api');
const { getMainKeyboard } = require('../keyboards');

const STATUS_LABELS = {
  OPEN: '🔵 Открыта',
  IN_PROGRESS: '🟡 В работе',
  COMPLETED: '🟢 Выполнена',
  CLOSED: '⚪ Закрыта',
};

const statusHandler = async (bot, chatId) => {
  // We need the sessions map, but for simplicity get it from the bot's context
  // The token should be stored in the session
  const session = bot._sessions?.get(chatId);

  // Try to get from the global sessions
  if (!global.botSessions) {
    return bot.sendMessage(chatId, '❌ Пожалуйста, введите /start для начала работы.');
  }

  const sess = global.botSessions.get(chatId);
  if (!sess || !sess.token) {
    return bot.sendMessage(chatId, '❌ Пожалуйста, введите /start для начала работы.');
  }

  const tickets = await getUserTickets(sess.token);

  if (!tickets.length) {
    return bot.sendMessage(
      chatId,
      '📋 У вас пока нет заявок.',
      getMainKeyboard()
    );
  }

  let message = '📋 *Ваши последние заявки:*\n\n';
  tickets.forEach((t) => {
    const statusLabel = STATUS_LABELS[t.status] || t.status;
    message += `*#${t.id}* — ${t.title}\n`;
    message += `${statusLabel} | ${t.category?.name || '—'}\n\n`;
  });

  await bot.sendMessage(chatId, message, { parse_mode: 'Markdown', ...getMainKeyboard() });
};

module.exports = { statusHandler };
