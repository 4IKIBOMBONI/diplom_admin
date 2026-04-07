const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');

const prisma = new PrismaClient();

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

/**
 * Send a Telegram message to a user by their userId
 */
const sendTelegramMessage = async (userId, text) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.telegramId) return;

    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) return;

    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: user.telegramId,
        text,
        parse_mode: 'Markdown',
      }),
    });

    if (!response.ok) {
      logger.warn(`Telegram send failed for user ${userId}: ${response.status}`);
    }
  } catch (error) {
    logger.warn(`Telegram notification error for user ${userId}: ${error.message}`);
  }
};

/**
 * Notify ticket creator about status change
 */
const notifyStatusChange = async (ticketId, oldStatus, newStatus, changedByName) => {
  try {
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: { category: true },
    });
    if (!ticket) return;

    const oldLabel = STATUS_LABELS[oldStatus] || oldStatus;
    const newLabel = STATUS_LABELS[newStatus] || newStatus;

    const text =
      `*Статус заявки изменён*\n\n` +
      `Заявка: *#${ticket.id}* — ${ticket.title}\n` +
      `Категория: ${ticket.category?.name || '—'}\n` +
      `Статус: ${oldLabel} → *${newLabel}*\n` +
      `Изменил: ${changedByName}`;

    await sendTelegramMessage(ticket.creatorId, text);
  } catch (error) {
    logger.warn(`notifyStatusChange error: ${error.message}`);
  }
};

/**
 * Notify ticket creator about assignment
 */
const notifyAssignment = async (ticketId, assigneeName) => {
  try {
    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) return;

    const text =
      `*Назначен исполнитель*\n\n` +
      `Заявка: *#${ticket.id}* — ${ticket.title}\n` +
      `Исполнитель: ${assigneeName}`;

    await sendTelegramMessage(ticket.creatorId, text);
  } catch (error) {
    logger.warn(`notifyAssignment error: ${error.message}`);
  }
};

/**
 * Notify ticket creator about new comment
 */
const notifyNewComment = async (ticketId, commentText, authorName, isInternal) => {
  if (isInternal) return; // Don't notify about internal comments

  try {
    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) return;

    const truncated = commentText.length > 200 ? commentText.substring(0, 200) + '...' : commentText;
    const text =
      `*Новый комментарий*\n\n` +
      `Заявка: *#${ticket.id}* — ${ticket.title}\n` +
      `От: ${authorName}\n\n` +
      `${truncated}`;

    await sendTelegramMessage(ticket.creatorId, text);
  } catch (error) {
    logger.warn(`notifyNewComment error: ${error.message}`);
  }
};

/**
 * Notify ticket creator that ticket was approved
 */
const notifyTicketApproved = async (ticketId) => {
  try {
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: { category: true },
    });
    if (!ticket) return;

    const text =
      `*Заявка одобрена!*\n\n` +
      `Заявка: *#${ticket.id}* — ${ticket.title}\n` +
      `Категория: ${ticket.category?.name || '—'}\n` +
      `Статус: *Открыта*\n\n` +
      `Ваша заявка прошла модерацию и принята в обработку.`;

    await sendTelegramMessage(ticket.creatorId, text);
  } catch (error) {
    logger.warn(`notifyTicketApproved error: ${error.message}`);
  }
};

/**
 * Notify admins about a new pending ticket (via Telegram)
 */
const notifyAdminsNewTicket = async (ticket) => {
  try {
    const admins = await prisma.user.findMany({
      where: {
        role: { in: ['ADMIN', 'SUPERADMIN'] },
        isActive: true,
        telegramId: { not: null },
      },
    });

    const text =
      `*Новая заявка на модерации*\n\n` +
      `*#${ticket.id}* — ${ticket.title}\n` +
      `Категория: ${ticket.category?.name || '—'}\n` +
      `Приоритет: ${PRIORITY_LABELS[ticket.priority] || ticket.priority}\n` +
      `Автор: ${ticket.creator?.fullName || '—'}\n` +
      `Источник: ${ticket.source === 'TELEGRAM' ? 'Telegram' : 'Веб-форма'}`;

    for (const admin of admins) {
      await sendTelegramMessage(admin.id, text);
    }
  } catch (error) {
    logger.warn(`notifyAdminsNewTicket error: ${error.message}`);
  }
};

/**
 * Notify about approaching or passed deadline
 */
const notifyDeadlineWarning = async (ticketId) => {
  try {
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: { assignee: true },
    });
    if (!ticket || !ticket.deadline) return;

    const hoursLeft = Math.round((ticket.deadline - new Date()) / (1000 * 60 * 60));
    const isOverdue = hoursLeft < 0;

    const text = isOverdue
      ? `*SLA просрочен!*\n\nЗаявка *#${ticket.id}* — ${ticket.title}\nПросрочено на ${Math.abs(hoursLeft)} ч.`
      : `*SLA: осталось ${hoursLeft} ч.*\n\nЗаявка *#${ticket.id}* — ${ticket.title}`;

    if (ticket.assigneeId) {
      await sendTelegramMessage(ticket.assigneeId, text);
    }

    // Also notify admins
    const admins = await prisma.user.findMany({
      where: { role: { in: ['ADMIN', 'SUPERADMIN'] }, isActive: true, telegramId: { not: null } },
    });
    for (const admin of admins) {
      if (admin.id !== ticket.assigneeId) {
        await sendTelegramMessage(admin.id, text);
      }
    }
  } catch (error) {
    logger.warn(`notifyDeadlineWarning error: ${error.message}`);
  }
};

module.exports = {
  sendTelegramMessage,
  notifyStatusChange,
  notifyAssignment,
  notifyNewComment,
  notifyTicketApproved,
  notifyAdminsNewTicket,
  notifyDeadlineWarning,
};
