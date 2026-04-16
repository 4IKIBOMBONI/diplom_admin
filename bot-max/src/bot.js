require('dotenv').config({ path: require('path').resolve(__dirname, '../../server/.env') });
const fs = require('fs');
const path = require('path');

const { MaxClient } = require('./maxClient');
const { startHandler } = require('./handlers/start');
const { newTicketHandler, handleTicketStep, finalizeTicket } = require('./handlers/newTicket');
const { statusHandler } = require('./handlers/status');
const { adminHandler, handleAdminCallback } = require('./handlers/admin');
const { getMainKeyboard } = require('./keyboards');

const logFile = path.resolve(__dirname, '../bot.log');
function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  try { fs.appendFileSync(logFile, line + '\n'); } catch (_) {}
}

const token = process.env.MAX_BOT_TOKEN;
const baseUrl = process.env.MAX_API_URL || 'https://botapi.max.ru';
const apiUrl = process.env.API_URL;

log(`MAX bot starting. API_URL=${apiUrl} MAX_API_URL=${baseUrl}`);
log(`MAX_BOT_TOKEN=${token ? token.substring(0, 10) + '...' : 'NOT SET'}`);

if (!token) {
  log('ERROR: MAX_BOT_TOKEN is not set. Получите токен у @MasterBot в приложении MAX.');
  process.exit(1);
}

const bot = new MaxClient(token, baseUrl);

const sessions = new Map();
global.botSessions = sessions;

bot.onCommand('/start', async (message) => {
  const chatId = message.recipient?.chat_id;
  log(`/start from user ${message.sender?.user_id} (${message.sender?.name})`);
  await startHandler(bot, message, sessions);
});

bot.onCommand('/admin', async (message) => {
  const chatId = message.recipient?.chat_id;
  log(`/admin from user ${message.sender?.user_id}`);
  await adminHandler(bot, chatId);
});

bot.onCommand('/status', async (message) => {
  const chatId = message.recipient?.chat_id;
  log(`/status from user ${message.sender?.user_id}`);
  await statusHandler(bot, chatId);
});

bot.onCallback(async (cb) => {
  const chatId = cb.message?.recipient?.chat_id;
  const data = cb.payload;

  if (cb.callback_id) {
    await bot.answerCallback(cb.callback_id);
  }

  log(`callback_query: ${data} from chat ${chatId}`);

  if (!chatId || !data) return;

  if (data === 'new_ticket') {
    return newTicketHandler(bot, chatId, sessions);
  }

  if (data === 'my_tickets') {
    return statusHandler(bot, chatId);
  }

  if (data === 'main_menu') {
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
    return bot.sendMessage(chatId, helpText);
  }

  if (data.startsWith('check_status_')) {
    return statusHandler(bot, chatId);
  }

  if (data.startsWith('cat_')) {
    const session = sessions.get(chatId);
    if (session && session.step === 'category') {
      session.categoryId = parseInt(data.replace('cat_', ''));
      session.step = 'location';
      sessions.set(chatId, session);
      return bot.sendMessage(chatId, 'Укажите аудиторию/кабинет (или напишите "нет"):');
    }
  }

  const handled = await handleAdminCallback(bot, chatId, data);
  if (handled) return;
});

// Обработчик обычных сообщений: текст + вложения (фото)
bot.onMessage(async (message) => {
  const chatId = message.recipient?.chat_id;
  const text = message.body?.text || '';
  const attachments = message.body?.attachments || [];

  if (text.startsWith('/')) return;

  const session = sessions.get(chatId);

  // Фото-вложение — только если идёт создание заявки
  const images = attachments.filter(
    (a) => a.type === 'image' || a.type === 'photo' || a.type === 'file'
  );

  if (session && session.token && images.length > 0) {
    if (!session.photos) session.photos = [];

    for (const img of images) {
      const url = img.payload?.url || img.payload?.photo_url || img.payload?.token_url;
      if (!url) continue;
      const buffer = await bot.downloadFile(url);
      if (buffer) {
        const filename = img.payload?.filename || `photo_${Date.now()}.jpg`;
        session.photos.push({ buffer, filename });
        log(`photo attached: ${filename} (${buffer.length} bytes)`);
      }
    }

    if (session.step === 'description' && text) {
      session.ticketData.description = text;
      await finalizeTicket(bot, chatId, session);
      sessions.set(chatId, session);
      return;
    }

    if (session.step === 'description' && !text) {
      await bot.sendMessage(chatId, 'Фото получено! Теперь опишите проблему текстом:');
      return;
    }

    if (text && session.step !== 'description') {
      // Фото пришло на другом шаге — просто сохранили, продолжаем обычный текстовый поток
      await handleTicketStep(bot, chatId, text, sessions);
      return;
    }

    await bot.sendMessage(chatId, 'Фото сохранено. Опишите проблему подробнее:');
    return;
  }

  if (!session) return;

  log(`message from chat ${chatId}: "${text}"`);
  await handleTicketStep(bot, chatId, text, sessions);
});

async function main() {
  try {
    const me = await bot.getMe();
    log(`Bot identity: ${me?.name || me?.username || 'unknown'} (id=${me?.user_id || '?'})`);
  } catch (error) {
    log(`getMe failed: ${error.message}. Продолжаем, возможно неверный токен.`);
  }

  await bot.startPolling();
}

main().catch((e) => {
  log(`fatal: ${e.message}`);
  process.exit(1);
});

log('MAX bot initialized');
