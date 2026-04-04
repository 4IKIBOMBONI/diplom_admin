const { getCategories, createTicket } = require('../api');
const { getCategoryKeyboard, getCheckStatusKeyboard } = require('../keyboards');

const newTicketHandler = async (bot, chatId, sessions) => {
  const session = sessions.get(chatId);
  if (!session || !session.token) {
    return bot.sendMessage(chatId, '❌ Пожалуйста, введите /start для начала работы.');
  }

  const categories = await getCategories();
  if (!categories.length) {
    return bot.sendMessage(chatId, '❌ Не удалось загрузить категории. Попробуйте позже.');
  }

  session.step = 'category';
  session.ticketData = {};
  sessions.set(chatId, session);

  await bot.sendMessage(
    chatId,
    '📝 *Создание новой заявки*\n\nВыберите категорию:',
    { parse_mode: 'Markdown', ...getCategoryKeyboard(categories) }
  );
};

const handleTicketStep = async (bot, chatId, text, sessions) => {
  const session = sessions.get(chatId);
  if (!session || !session.step) return;

  switch (session.step) {
    case 'fullname': {
      // User providing their full name during registration
      session.fullName = text;
      session.step = null;
      sessions.set(chatId, session);
      await bot.sendMessage(chatId, `✅ Спасибо, ${text}! Теперь вы можете создать заявку.`);
      break;
    }

    case 'location': {
      session.ticketData.location = text === 'нет' ? null : text;
      session.step = 'title';
      sessions.set(chatId, session);
      await bot.sendMessage(chatId, '📌 Укажите тему заявки (кратко):');
      break;
    }

    case 'title': {
      session.ticketData.title = text;
      session.step = 'description';
      sessions.set(chatId, session);
      await bot.sendMessage(chatId, '📝 Опишите проблему подробнее:');
      break;
    }

    case 'description': {
      session.ticketData.description = text;
      session.step = null;

      const ticketPayload = {
        title: session.ticketData.title,
        description: session.ticketData.description,
        categoryId: session.categoryId,
        location: session.ticketData.location,
        source: 'TELEGRAM',
      };

      const ticket = await createTicket(session.token, ticketPayload);

      if (ticket) {
        await bot.sendMessage(
          chatId,
          `✅ *Заявка #${ticket.id} создана!*\n\n` +
          `📌 Тема: ${ticket.title}\n` +
          `📂 Категория: ${ticket.category?.name || '—'}\n` +
          `📍 Аудитория: ${session.ticketData.location || '—'}\n` +
          `📊 Статус: Открыта`,
          { parse_mode: 'Markdown', ...getCheckStatusKeyboard(ticket.id) }
        );
      } else {
        await bot.sendMessage(chatId, '❌ Не удалось создать заявку. Попробуйте позже.');
      }

      session.ticketData = {};
      sessions.set(chatId, session);
      break;
    }
  }
};

module.exports = { newTicketHandler, handleTicketStep };
