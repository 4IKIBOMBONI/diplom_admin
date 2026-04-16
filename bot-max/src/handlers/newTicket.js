const { getCategories, createTicket, uploadAttachment } = require('../api');
const { getCategoryKeyboard, getCheckStatusKeyboard } = require('../keyboards');

const newTicketHandler = async (bot, chatId, sessions) => {
  const session = sessions.get(chatId);
  if (!session || !session.token) {
    return bot.sendMessage(chatId, 'Введите /start для начала работы.');
  }

  const categories = await getCategories();
  if (!categories.length) {
    return bot.sendMessage(chatId, 'Не удалось загрузить категории. Попробуйте позже.');
  }

  session.step = 'category';
  session.ticketData = {};
  session.photos = [];
  sessions.set(chatId, session);

  await bot.sendMessage(
    chatId,
    'Создание заявки\n\nВыберите категорию:',
    getCategoryKeyboard(categories)
  );
};

const finalizeTicket = async (bot, chatId, session) => {
  const ticketPayload = {
    title: session.ticketData.title,
    description: session.ticketData.description,
    categoryId: session.categoryId,
    location: session.ticketData.location,
    source: 'MAX',
  };

  const ticket = await createTicket(session.token, ticketPayload);

  if (!ticket) {
    await bot.sendMessage(chatId, 'Не удалось создать заявку. Попробуйте позже.');
    session.step = null;
    session.ticketData = {};
    session.photos = [];
    return;
  }

  for (const photo of session.photos || []) {
    await uploadAttachment(session.token, ticket.id, photo.buffer, photo.filename);
  }

  await bot.sendMessage(
    chatId,
    `Заявка #${ticket.id} создана.\n\n` +
    `Тема: ${ticket.title}\n` +
    `Категория: ${ticket.category?.name || '—'}\n` +
    `Аудитория: ${session.ticketData.location || '—'}\n` +
    `Фото: ${(session.photos || []).length} шт.\n` +
    `Статус: На модерации\n\n` +
    'После проверки администратором заявка будет принята в обработку.',
    getCheckStatusKeyboard(ticket.id)
  );

  session.step = null;
  session.ticketData = {};
  session.photos = [];
};

const handleTicketStep = async (bot, chatId, text, sessions) => {
  const session = sessions.get(chatId);
  if (!session || !session.step) return;

  switch (session.step) {
    case 'location': {
      session.ticketData.location = text === 'нет' ? null : text;
      session.step = 'title';
      sessions.set(chatId, session);
      await bot.sendMessage(chatId, 'Укажите тему заявки (кратко):');
      break;
    }

    case 'title': {
      session.ticketData.title = text;
      session.step = 'description';
      sessions.set(chatId, session);
      await bot.sendMessage(chatId, 'Опишите проблему подробнее (можно прикрепить фото):');
      break;
    }

    case 'description': {
      session.ticketData.description = text;
      sessions.set(chatId, session);
      await finalizeTicket(bot, chatId, session);
      sessions.set(chatId, session);
      break;
    }
  }
};

module.exports = { newTicketHandler, handleTicketStep, finalizeTicket };
