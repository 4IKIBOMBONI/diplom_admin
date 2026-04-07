require('dotenv').config({ path: require('path').resolve(__dirname, '../../server/.env') });
const TelegramBot = require('node-telegram-bot-api');
const { startHandler } = require('./handlers/start');
const { newTicketHandler, handleTicketStep } = require('./handlers/newTicket');
const { statusHandler } = require('./handlers/status');
const { adminHandler, handleAdminCallback } = require('./handlers/admin');
const { getMainKeyboard } = require('./keyboards');
const { uploadAttachment } = require('./api');
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

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

bot.onText(/\/admin/, (msg) => {
  log(`/admin from user ${msg.from.id}`);
  adminHandler(bot, msg.chat.id);
});

bot.onText(/\/status/, (msg) => {
  log(`/status from user ${msg.from.id}`);
  statusHandler(bot, msg.chat.id);
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

  if (data === 'main_menu') {
    const sess = sessions.get(chatId);
    return bot.sendMessage(chatId, 'Выберите действие:', getMainKeyboard());
  }

  if (data === 'help') {
    const sess = sessions.get(chatId);
    const isAdmin = sess && (sess.role === 'ADMIN' || sess.role === 'SUPERADMIN');
    let helpText =
      'Как пользоваться ботом:\n\n' +
      '1. Нажмите "Новая заявка" чтобы создать заявку\n' +
      '2. Следуйте инструкциям бота\n' +
      '3. Нажмите "Мои заявки" чтобы проверить статус\n' +
      '4. Можно прикрепить фото к заявке\n\n' +
      'Команды:\n' +
      '/start — Начало работы\n' +
      '/status — Мои заявки\n';
    if (isAdmin) {
      helpText += '/admin — Панель администратора\n';
    }
    return bot.sendMessage(chatId, helpText, { parse_mode: 'Markdown' });
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

  // Admin callbacks
  const handled = await handleAdminCallback(bot, chatId, data);
  if (handled) return;
});

// Handle photos (attach to ticket during creation)
bot.on('photo', async (msg) => {
  const chatId = msg.chat.id;
  const session = sessions.get(chatId);

  if (!session || !session.token) return;

  // If user is in the description step, save the photo and use caption as description
  if (session.step === 'description' || session.step === 'photo_attach') {
    const photo = msg.photo[msg.photo.length - 1]; // Get largest photo
    const fileId = photo.file_id;

    try {
      const fileInfo = await bot.getFile(fileId);
      const fileUrl = `https://api.telegram.org/file/bot${token}/${fileInfo.file_path}`;

      // Download file
      const fileBuffer = await downloadFile(fileUrl);
      const filename = path.basename(fileInfo.file_path);

      // Store the photo data for later upload
      if (!session.photos) session.photos = [];
      session.photos.push({ buffer: fileBuffer, filename });

      if (session.step === 'description') {
        // Use caption as description if provided
        if (msg.caption) {
          session.ticketData.description = msg.caption;
        } else {
          session.step = 'description';
          return bot.sendMessage(chatId, 'Фото получено! Теперь опишите проблему текстом:');
        }
      }

      // If we have description, create the ticket
      if (session.ticketData.description) {
        session.step = null;
        const { createTicket } = require('./api');

        const ticketPayload = {
          title: session.ticketData.title,
          description: session.ticketData.description,
          categoryId: session.categoryId,
          location: session.ticketData.location,
          source: 'TELEGRAM',
        };

        const ticket = await createTicket(session.token, ticketPayload);

        if (ticket) {
          // Upload photos
          for (const photo of session.photos || []) {
            await uploadAttachment(session.token, ticket.id, photo.buffer, photo.filename);
          }

          const { getCheckStatusKeyboard } = require('./keyboards');
          await bot.sendMessage(
            chatId,
            `*Заявка #${ticket.id} создана.*\n\n` +
            `Тема: ${ticket.title}\n` +
            `Категория: ${ticket.category?.name || '—'}\n` +
            `Аудитория: ${session.ticketData.location || '—'}\n` +
            `Фото: ${(session.photos || []).length} шт.\n` +
            `Статус: На модерации\n\n` +
            'После проверки администратором заявка будет принята в обработку.',
            { parse_mode: 'Markdown', ...getCheckStatusKeyboard(ticket.id) }
          );
        } else {
          await bot.sendMessage(chatId, 'Не удалось создать заявку. Попробуйте позже.');
        }

        session.photos = [];
        session.ticketData = {};
        sessions.set(chatId, session);
      } else {
        await bot.sendMessage(chatId, 'Фото сохранено. Опишите проблему подробнее:');
      }
    } catch (error) {
      log(`Photo handling error: ${error.message}`);
      await bot.sendMessage(chatId, 'Не удалось обработать фото. Попробуйте описать текстом.');
    }
    return;
  }
});

bot.on('message', (msg) => {
  if (msg.text && msg.text.startsWith('/')) return;
  if (msg.photo) return; // Handled by photo handler

  const chatId = msg.chat.id;
  const session = sessions.get(chatId);
  if (!session) return;

  log(`message from chat ${chatId}: "${msg.text}"`);
  handleTicketStep(bot, chatId, msg.text, sessions);
});

function downloadFile(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    client.get(url, (response) => {
      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => resolve(Buffer.concat(chunks)));
      response.on('error', reject);
    }).on('error', reject);
  });
}

log('Telegram bot started');
