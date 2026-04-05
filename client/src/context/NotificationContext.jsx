import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useSocket } from './SocketContext';
import toast from 'react-hot-toast';
import { STATUS_MAP } from '../utils/constants';

const NotificationContext = createContext(null);

export const useNotifications = () => useContext(NotificationContext);

export function NotificationProvider({ children }) {
  const socket = useSocket();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const addNotification = useCallback((notification) => {
    setNotifications((prev) => [notification, ...prev].slice(0, 50));
    setUnreadCount((prev) => prev + 1);
  }, []);

  const clearNotifications = useCallback(() => {
    setUnreadCount(0);
  }, []);

  useEffect(() => {
    if (!socket) return;

    const onNewTicket = (ticket) => {
      const msg = `Новая заявка #${ticket.id}: ${ticket.title}`;
      toast(msg);
      addNotification({ type: 'ticket:new', message: msg, data: ticket, createdAt: new Date() });
    };

    const onStatusChanged = ({ ticketId, oldStatus, newStatus, changedBy }) => {
      const statusLabel = STATUS_MAP[newStatus]?.label || newStatus;
      const msg = `Заявка #${ticketId} \u2014 статус изменен на "${statusLabel}"`;
      toast(msg);
      addNotification({ type: 'ticket:statusChanged', message: msg, data: { ticketId, newStatus }, createdAt: new Date() });
    };

    const onAssigned = ({ ticketId, assignee }) => {
      const msg = `Заявка #${ticketId} назначена: ${assignee?.fullName}`;
      toast(msg);
      addNotification({ type: 'ticket:assigned', message: msg, data: { ticketId }, createdAt: new Date() });
    };

    const onCommented = ({ ticketId, comment }) => {
      const msg = `Новый комментарий к заявке #${ticketId}`;
      toast(msg);
      addNotification({ type: 'ticket:commented', message: msg, data: { ticketId }, createdAt: new Date() });
    };

    socket.on('ticket:new', onNewTicket);
    socket.on('ticket:statusChanged', onStatusChanged);
    socket.on('ticket:assigned', onAssigned);
    socket.on('ticket:commented', onCommented);

    return () => {
      socket.off('ticket:new', onNewTicket);
      socket.off('ticket:statusChanged', onStatusChanged);
      socket.off('ticket:assigned', onAssigned);
      socket.off('ticket:commented', onCommented);
    };
  }, [socket, addNotification]);

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, clearNotifications }}>
      {children}
    </NotificationContext.Provider>
  );
}
