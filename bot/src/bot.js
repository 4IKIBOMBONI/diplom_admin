require('dotenv').config({ path: require('path').resolve(__dirname, '../../server/.env') });
const TelegramBot = require('node-telegram-bot-api');
const { startHandler } = require('./handlers/start');
const { newTicketHandler, handleTicketStep } = require('./handlers/newTicket');
const { statusHandler } = require('./handlers/status');
const { getMainKeyboard } = require('./keyboards');

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  console.error('TELEGRAM_BOT_TOKEN is not set');
  process.exit(1);
}

const bot = new TelegramBot(token, { polling: true });

// User sessions for ticket creation flow
const sessions = new Map();
global.botSessions = sessions;

bot.onText(/\/start/, (msg) => startHandler(bot, msg, sessions));

bot.on('callback_query', async (query) => {
  const chatId = query.message.chat.id;
  const data = query.data;

  await bot.answerCallbackQuery(query.id);

  if (data === 'new_ticket') {
    return newTicketHandler(bot, chatId, sessions);
  }

  if (data === 'my_tickets') {
    return statusHandler(bot, chatId);
  }

  if (data === 'help') {
    return bot.sendMessage(chatId,
      '📌 *��ак пользоваться ботом:*\n\n' +
      '1. Нажмите "📝 Новая заявка" чтобы создать заявку\n' +
      '2. Следуйте инструкциям бота\n' +
      '3. Нажмите "📋 Мои заявки" чтобы проверить статус\n\n' +
      'Вы также можете использовать команды:\n' +
      '/start — Начало работы\n' +
      '/status — Мои заявки',
      { parse_mode: 'Markdown' }
    );
  }

  if (data.startsWith('check_status_')) {
    return statusHandler(bot, chatId);
  }

  // Ticket creation flow: category selection
  if (data.startsWith('cat_')) {
    const session = sessions.get(chatId);
    if (session && session.step === 'category') {
      session.categoryId = parseInt(data.replace('cat_', ''));
      session.step = 'location';
      return bot.sendMessage(chatId, '📍 Укажите аудиторию/кабинет (или напишите "нет"):');
    }
  }
});

bot.onText(/\/status/, (msg) => statusHandler(bot, msg.chat.id));

// Handle text messages for ticket creation flow
bot.on('message', (msg) => {
  if (msg.text && msg.text.startsWith('/')) return; // Skip commands

  const chatId = msg.chat.id;
  const session = sessions.get(chatId);
  if (!session) return;

  handleTicketStep(bot, chatId, msg.text, sessions);
});

console.log('🤖 Telegram bot started');
