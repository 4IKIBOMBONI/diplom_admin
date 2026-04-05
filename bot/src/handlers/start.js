const { findOrCreateUser } = require('../api');
const { getMainKeyboard } = require('../keyboards');

const startHandler = async (bot, msg, sessions) => {
  const chatId = msg.chat.id;
  const telegramId = String(msg.from.id);
  const telegramUsername = msg.from.username || '';
  const fullName = [msg.from.first_name, msg.from.last_name].filter(Boolean).join(' ') || 'Пользователь';

  const result = await findOrCreateUser(telegramId, telegramUsername, fullName);

  if (result && result.accessToken) {
    sessions.set(chatId, { token: result.accessToken, step: null });

    await bot.sendMessage(
      chatId,
      `Добро пожаловать, *${result.user?.fullName || fullName}*.\n\n` +
      'Через этого бота вы можете подать заявку в IT-отдел.\n' +
      'Выберите действие:',
      { parse_mode: 'Markdown', ...getMainKeyboard() }
    );
  } else {
    await bot.sendMessage(
      chatId,
      'Не удалось подключиться к серверу. Попробуйте позже.',
    );
  }
};

module.exports = { startHandler };
