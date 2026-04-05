require('dotenv').config({ path: require('path').resolve(__dirname, '../../server/.env') });
const TelegramBot = require('node-telegram-bot-api');
const { startHandler } = require('./handlers/start');
const { newTicketHandler, handleTicketStep } = require('./handlers/newTicket');
const { statusHandler } = require('./handlers/status');
const { getMainKeyboard } = require('./keyboards');
const fs = require('fs');
const path = require('path');

// Logging
const logFile = path.resolve(__dirname, '../bot.log');
function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  fs.appendFileSync(logFile, line + '\n');
}

const token = process.env.TELEGRAM_BOT_TOKEN;
const apiUrl = process.env.API_URL;

log(`Bot starting. API_URL=${apiUrl}`);
log(`TELEGRAM_BOT_TOKEN=${token ? token.substring(0, 10) + '...' : 'NOT SET'}`);

if (!token) {
  log('ERROR: TELEGRAM_BOT_TOKEN is not set');
  process.exit(1);
}

const bot = new TelegramBot(token, { polling: true });

// User sessions for ticket creation flow
const sessions = new Map();
global.botSessions = sessions;

bot.onText(/\/start/, (msg) => {
  log(`/start from user ${msg.from.id} (${msg.from.first_name})`);
  startHandler(bot, msg, sessions);
});

bot.on('callback_query', async (query) => {
  const chatId = query.message.chat.id;
  const data = query.data;

  await bot.answerCallbackQuery(query.id);
  log(`callback_query: ${data} from chat ${chatId}`);

  if (data === 'new_ticket') {
    return newTicketHandler(bot, chatId, sessions);
  }

  if (data === 'my_tickets') {
    return statusHandler(bot, chatId);
  }

  if (data === 'help') {
    return bot.sendMessage(chatId,
      'Как пользоваться ботом:\n\n' +
      '1. Нажмите "Новая заявка" чтобы создать заявку\n' +
      '2. Следуйте инструкциям бота\n' +
      '3. Нажмите "Мои заявки" чтобы проверить статус\n\n' +
      'Команды:\n' +
      '/start — Начало работы\n' +
      '/status — Мои заявки',
      { parse_mode: 'Markdown' }
    );
  }

  if (data.startsWith('check_status_')) {
    return statusHandler(bot, chatId);
  }

  if (data.startsWith('cat_')) {
    const session = sessions.get(chatId);
    if (session && session.step === 'category') {
      session.categoryId = parseInt(data.replace('cat_', ''));
      session.step = 'location';
      return bot.sendMessage(chatId, 'Укажите аудиторию/кабинет (или напишите "нет"):');
    }
  }
});

bot.onText(/\/status/, (msg) => {
  log(`/status from user ${msg.from.id}`);
  statusHandler(bot, msg.chat.id);
});

bot.on('message', (msg) => {
  if (msg.text && msg.text.startsWith('/')) return;

  const chatId = msg.chat.id;
  const session = sessions.get(chatId);
  if (!session) return;

  log(`message from chat ${chatId}: "${msg.text}"`);
  handleTicketStep(bot, chatId, msg.text, sessions);
});

log('Telegram bot started');
