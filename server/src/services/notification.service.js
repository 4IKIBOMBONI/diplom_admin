const { getIO } = require('../socket');
const logger = require('../utils/logger');

const notifyNewTicket = (ticket) => {
  const io = getIO();
  if (!io) return;
  // Admins get all new ticket notifications
  io.to('role:ADMIN').emit('ticket:new', ticket);
  logger.info(`Notification: new ticket #${ticket.id}`);
};

const notifyStatusChanged = (ticketId, oldStatus, newStatus, changedBy, creatorId) => {
  const io = getIO();
  if (!io) return;
  const data = { ticketId, oldStatus, newStatus, changedBy };
  io.to('role:ADMIN').emit('ticket:statusChanged', data);
  io.to(`user:${creatorId}`).emit('ticket:statusChanged', data);
  logger.info(`Notification: ticket #${ticketId} status ${oldStatus} -> ${newStatus}`);
};

const notifyAssigned = (ticketId, assignee, creatorId) => {
  const io = getIO();
  if (!io) return;
  const data = { ticketId, assignee };
  io.to('role:ADMIN').emit('ticket:assigned', data);
  io.to(`user:${creatorId}`).emit('ticket:assigned', data);
  if (assignee.id) {
    io.to(`user:${assignee.id}`).emit('ticket:assigned', data);
  }
  logger.info(`Notification: ticket #${ticketId} assigned to ${assignee.fullName}`);
};

const notifyCommented = (ticketId, comment, creatorId) => {
  const io = getIO();
  if (!io) return;
  const data = { ticketId, comment };
  io.to('role:ADMIN').emit('ticket:commented', data);
  io.to(`user:${creatorId}`).emit('ticket:commented', data);
  logger.info(`Notification: new comment on ticket #${ticketId}`);
};

module.exports = {
  notifyNewTicket,
  notifyStatusChanged,
  notifyAssigned,
  notifyCommented,
};
