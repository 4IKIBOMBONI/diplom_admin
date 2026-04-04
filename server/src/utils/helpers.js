const formatTicketForResponse = (ticket) => {
  return {
    ...ticket,
    creator: ticket.creator
      ? { id: ticket.creator.id, fullName: ticket.creator.fullName, email: ticket.creator.email }
      : null,
    assignee: ticket.assignee
      ? { id: ticket.assignee.id, fullName: ticket.assignee.fullName, email: ticket.assignee.email }
      : null,
  };
};

const STATUS_LABELS = {
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

module.exports = {
  formatTicketForResponse,
  STATUS_LABELS,
  PRIORITY_LABELS,
};
