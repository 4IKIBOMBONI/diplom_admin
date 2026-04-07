const { findOrCreateUser } = require('../api');
const { getMainKeyboard } = require('../keyboards');

const startHandler = async (bot, msg, sessions) => {
  const chatId = msg.chat.id;
  const telegramId = String(msg.from.id);
  const telegramUsername = msg.from.username || '';
  const fullName = [msg.from.first_name, msg.from.last_name].filter(Boolean).join(' ') || 'Пользователь';

  const result = await findOrCreateUser(telegramId, telegramUsername, fullName);

  if (result && result.accessToken) {
    sessions.set(chatId, {
      token: result.accessToken,
      step: null,
      role: result.user?.role || 'USER',
    });

    const isAdmin = result.user?.role === 'ADMIN' || result.user?.role === 'SUPERADMIN';

    let welcomeText =
      `Добро пожаловать, *${result.user?.fullName || fullName}*.\n\n` +
      'Через этого бота вы можете подать заявку в IT-отдел.\n';

    if (isAdmin) {
      welcomeText += '\nУ вас есть права администратора. Используйте /admin для управления заявками.\n';
    }

    welcomeText += '\nВыберите действие:';

    await bot.sendMessage(
      chatId,
      welcomeText,
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
