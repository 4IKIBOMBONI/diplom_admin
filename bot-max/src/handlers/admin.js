const {
  getPendingTickets,
  approveTicket,
  rejectTicket,
  getAllTickets,
  updateTicketStatus,
  assignTicket,
  getAdmins,
  getTicketDetail,
} = require('../api');
const { getAdminKeyboard } = require('../keyboards');

const STATUS_LABELS = {
  PENDING: 'На модерации',
  OPEN: 'Открыта',
  IN_PROGRESS: 'В работе',
  COMPLETED: 'Выполнена',
  CLOSED: 'Закрыта',
};

const PRIORITY_LABELS = {
  LOW: 'Низкий',
  MEDIUM: 'Средний',
  HIGH: 'Высокий',
  CRITICAL: 'Критический',
};

const adminHandler = async (bot, chatId) => {
  const sess = global.botSessions.get(chatId);
  if (!sess || !sess.token) {
    return bot.sendMessage(chatId, 'Введите /start для начала работы.');
  }

  if (sess.role !== 'ADMIN' && sess.role !== 'SUPERADMIN') {
    return bot.sendMessage(chatId, 'У вас нет прав администратора.');
  }

  await bot.sendMessage(chatId, 'Панель администратора\n\nВыберите действие:', getAdminKeyboard());
};

const handleAdminCallback = async (bot, chatId, data) => {
  const sess = global.botSessions.get(chatId);
  if (!sess || !sess.token) return false;
  if (sess.role !== 'ADMIN' && sess.role !== 'SUPERADMIN') return false;

  if (data === 'admin_pending') {
    const tickets = await getPendingTickets(sess.token);
    if (!tickets.length) {
      return bot.sendMessage(chatId, 'Нет заявок на модерации.', getAdminKeyboard());
    }

    let msg = 'Заявки на модерации:\n\n';
    const buttons = [];

    for (const t of tickets) {
      msg += `#${t.id} — ${t.title}\n`;
      msg += `Приоритет: ${PRIORITY_LABELS[t.priority] || t.priority}\n`;
      msg += `Автор: ${t.creator?.fullName || '—'}\n`;
      msg += `Категория: ${t.category?.name || '—'}\n\n`;
      buttons.push([
        { type: 'callback', text: `✅ Одобрить #${t.id}`, payload: `approve_${t.id}` },
        { type: 'callback', text: `❌ Отклонить #${t.id}`, payload: `reject_${t.id}` },
      ]);
    }

    buttons.push([{ type: 'callback', text: '◀ Назад', payload: 'admin_back' }]);

    await bot.sendMessage(chatId, msg, {
      reply_markup: { inline_keyboard: buttons },
    });
    return true;
  }

  if (data.startsWith('approve_')) {
    const ticketId = parseInt(data.replace('approve_', ''));
    const result = await approveTicket(sess.token, ticketId);
    if (result) {
      await bot.sendMessage(chatId, `Заявка #${ticketId} одобрена.`, getAdminKeyboard());
    } else {
      await bot.sendMessage(chatId, 'Не удалось одобрить заявку.', getAdminKeyboard());
    }
    return true;
  }

  if (data.startsWith('reject_')) {
    const ticketId = parseInt(data.replace('reject_', ''));
    const result = await rejectTicket(sess.token, ticketId);
    if (result) {
      await bot.sendMessage(chatId, `Заявка #${ticketId} отклонена.`, getAdminKeyboard());
    } else {
      await bot.sendMessage(chatId, 'Не удалось отклонить заявку.', getAdminKeyboard());
    }
    return true;
  }

  if (data === 'admin_open') {
    const tickets = await getAllTickets(sess.token, 'OPEN');
    return showTicketList(bot, chatId, tickets, 'Открытые заявки');
  }

  if (data === 'admin_in_progress') {
    const tickets = await getAllTickets(sess.token, 'IN_PROGRESS');
    return showTicketList(bot, chatId, tickets, 'Заявки в работе');
  }

  if (data.startsWith('detail_')) {
    const ticketId = parseInt(data.replace('detail_', ''));
    const ticket = await getTicketDetail(sess.token, ticketId);
    if (!ticket) {
      return bot.sendMessage(chatId, 'Заявка не найдена.', getAdminKeyboard());
    }

    let msg = `Заявка #${ticket.id}\n\n`;
    msg += `Тема: ${ticket.title}\n`;
    msg += `Описание: ${ticket.description}\n\n`;
    msg += `Статус: ${STATUS_LABELS[ticket.status] || ticket.status}\n`;
    msg += `Приоритет: ${PRIORITY_LABELS[ticket.priority] || ticket.priority}\n`;
    msg += `Категория: ${ticket.category?.name || '—'}\n`;
    msg += `Автор: ${ticket.creator?.fullName || '—'}\n`;
    msg += `Исполнитель: ${ticket.assignee?.fullName || 'Не назначен'}\n`;
    if (ticket.location) msg += `Аудитория: ${ticket.location}\n`;
    if (ticket.deadline) {
      const dl = new Date(ticket.deadline);
      const isOverdue = dl < new Date() && ['OPEN', 'IN_PROGRESS'].includes(ticket.status);
      msg += `Дедлайн: ${dl.toLocaleString('ru-RU')}${isOverdue ? ' ⚠️ ПРОСРОЧЕНО' : ''}\n`;
    }
    if (ticket.rating) msg += `Оценка: ${'⭐'.repeat(ticket.rating)}\n`;

    const buttons = [];
    if (['OPEN', 'IN_PROGRESS', 'COMPLETED'].includes(ticket.status)) {
      const statusButtons = [];
      if (ticket.status === 'OPEN') statusButtons.push({ type: 'callback', text: 'В работу', payload: `setstatus_${ticket.id}_IN_PROGRESS` });
      if (ticket.status === 'IN_PROGRESS') statusButtons.push({ type: 'callback', text: 'Выполнена', payload: `setstatus_${ticket.id}_COMPLETED` });
      if (ticket.status === 'COMPLETED') statusButtons.push({ type: 'callback', text: 'Закрыть', payload: `setstatus_${ticket.id}_CLOSED` });
      if (statusButtons.length) buttons.push(statusButtons);
    }
    if (['OPEN', 'IN_PROGRESS'].includes(ticket.status)) {
      buttons.push([{ type: 'callback', text: 'Назначить исполнителя', payload: `assign_${ticket.id}` }]);
    }
    buttons.push([{ type: 'callback', text: '◀ Назад', payload: 'admin_back' }]);

    await bot.sendMessage(chatId, msg, {
      reply_markup: { inline_keyboard: buttons },
    });
    return true;
  }

  if (data.startsWith('setstatus_')) {
    const parts = data.replace('setstatus_', '').split('_');
    const ticketId = parseInt(parts[0]);
    const newStatus = parts.slice(1).join('_');

    const result = await updateTicketStatus(sess.token, ticketId, newStatus);
    if (result) {
      await bot.sendMessage(chatId, `Заявка #${ticketId} → ${STATUS_LABELS[newStatus] || newStatus}`, getAdminKeyboard());
    } else {
      await bot.sendMessage(chatId, 'Не удалось изменить статус.', getAdminKeyboard());
    }
    return true;
  }

  if (data.startsWith('assign_')) {
    const ticketId = parseInt(data.replace('assign_', ''));
    const admins = await getAdmins(sess.token);

    if (!admins.length) {
      return bot.sendMessage(chatId, 'Нет доступных исполнителей.', getAdminKeyboard());
    }

    const buttons = admins.map((a) => [
      { type: 'callback', text: a.fullName, payload: `doassign_${ticketId}_${a.id}` },
    ]);
    buttons.push([{ type: 'callback', text: '◀ Назад', payload: `detail_${ticketId}` }]);

    await bot.sendMessage(chatId, 'Выберите исполнителя:', {
      reply_markup: { inline_keyboard: buttons },
    });
    return true;
  }

  if (data.startsWith('doassign_')) {
    const parts = data.replace('doassign_', '').split('_');
    const ticketId = parseInt(parts[0]);
    const assigneeId = parseInt(parts[1]);

    const result = await assignTicket(sess.token, ticketId, assigneeId);
    if (result) {
      await bot.sendMessage(chatId, `Заявка #${ticketId} назначена на ${result.assignee?.fullName || '—'}`, getAdminKeyboard());
    } else {
      await bot.sendMessage(chatId, 'Не удалось назначить исполнителя.', getAdminKeyboard());
    }
    return true;
  }

  if (data === 'admin_back') {
    await bot.sendMessage(chatId, 'Панель администратора', getAdminKeyboard());
    return true;
  }

  return false;
};

async function showTicketList(bot, chatId, tickets, title) {
  if (!tickets.length) {
    return bot.sendMessage(chatId, `${title}: нет заявок.`, getAdminKeyboard());
  }

  let msg = `${title}:\n\n`;
  const buttons = [];

  for (const t of tickets) {
    msg += `#${t.id} — ${t.title}\n`;
    msg += `${STATUS_LABELS[t.status]} | ${t.category?.name || '—'} | ${t.assignee?.fullName || 'Не назначен'}\n\n`;
    buttons.push([{ type: 'callback', text: `Подробнее #${t.id}`, payload: `detail_${t.id}` }]);
  }

  buttons.push([{ type: 'callback', text: '◀ Назад', payload: 'admin_back' }]);

  await bot.sendMessage(chatId, msg, {
    reply_markup: { inline_keyboard: buttons },
  });
  return true;
}

module.exports = { adminHandler, handleAdminCallback };
