const { findOrCreateUser } = require('../api');
const { getMainKeyboard } = require('../keyboards');

const startHandler = async (bot, message, sessions) => {
  const chatId = message.recipient?.chat_id;
  const sender = message.sender || {};
  const maxId = String(sender.user_id || '');
  const maxUsername = sender.username || '';
  const fullName =
    sender.name ||
    [sender.first_name, sender.last_name].filter(Boolean).join(' ') ||
    'Пользователь MAX';

  const result = await findOrCreateUser(maxId, maxUsername, fullName);

  if (result && result.accessToken) {
    sessions.set(chatId, {
      token: result.accessToken,
      step: null,
      role: result.user?.role || 'USER',
      userId: result.user?.id,
    });

    const isAdmin = result.user?.role === 'ADMIN' || result.user?.role === 'SUPERADMIN';

    let welcomeText =
      `Добро пожаловать, ${result.user?.fullName || fullName}!\n\n` +
      'Через этого бота вы можете подать заявку в IT-отдел.\n';

    if (isAdmin) {
      welcomeText += '\nУ вас есть права администратора. Используйте /admin для управления заявками.\n';
    }

    welcomeText += '\nВыберите действие:';

    await bot.sendMessage(chatId, welcomeText, getMainKeyboard());
  } else {
    await bot.sendMessage(
      chatId,
      'Не удалось подключиться к серверу. Попробуйте позже.',
    );
  }
};

module.exports = { startHandler };
