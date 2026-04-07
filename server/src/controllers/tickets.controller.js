const { PrismaClient } = require('@prisma/client');
const { notifyNewTicket, notifyStatusChanged, notifyAssigned, notifyCommented } = require('../services/notification.service');
const telegramService = require('../services/telegram.service');

const prisma = new PrismaClient();

const ticketInclude = {
  category: true,
  creator: { select: { id: true, fullName: true, email: true, employeeId: true } },
  assignee: { select: { id: true, fullName: true, email: true } },
  attachments: true,
};

// Calculate SLA deadline based on priority and category
const calculateDeadline = (priority, slaHours) => {
  const multipliers = { LOW: 2, MEDIUM: 1, HIGH: 0.5, CRITICAL: 0.25 };
  const hours = slaHours * (multipliers[priority] || 1);
  const deadline = new Date();
  deadline.setHours(deadline.getHours() + hours);
  return deadline;
};

exports.getTickets = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      category,
      priority,
      search,
      sortBy = 'createdAt',
      order = 'desc',
      assigneeId,
      overdue,
    } = req.query;

    const where = {};

    // Users can only see their own tickets
    if (req.user.role === 'USER') {
      where.creatorId = req.user.id;
    } else {
      // Admins don't see PENDING tickets in the main list
      if (!status) {
        where.status = { not: 'PENDING' };
      }
    }

    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (category) where.categoryId = parseInt(category);
    if (assigneeId) where.assigneeId = parseInt(assigneeId);

    // Filter overdue tickets
    if (overdue === 'true') {
      where.deadline = { lt: new Date() };
      where.status = { in: ['OPEN', 'IN_PROGRESS'] };
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const allowedSortFields = ['createdAt', 'updatedAt', 'priority', 'status', 'id', 'deadline'];
    const orderByField = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';

    const [tickets, total] = await Promise.all([
      prisma.ticket.findMany({
        where,
        include: ticketInclude,
        skip,
        take,
        orderBy: { [orderByField]: order === 'asc' ? 'asc' : 'desc' },
      }),
      prisma.ticket.count({ where }),
    ]);

    // Get counts by status
    const baseWhere = req.user.role === 'USER' ? { creatorId: req.user.id } : { status: { not: 'PENDING' } };
    const statusCounts = await prisma.ticket.groupBy({
      by: ['status'],
      where: baseWhere,
      _count: true,
    });

    const counts = {
      total,
      OPEN: 0,
      IN_PROGRESS: 0,
      COMPLETED: 0,
      CLOSED: 0,
    };
    statusCounts.forEach((sc) => {
      if (sc.status !== 'PENDING') {
        counts[sc.status] = sc._count;
      }
    });

    res.json({
      tickets,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / take),
      },
      counts,
    });
  } catch (error) {
    next(error);
  }
};

// Get pending tickets for moderation (admin/superadmin)
exports.getPendingTickets = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const where = { status: 'PENDING' };

    const [tickets, total] = await Promise.all([
      prisma.ticket.findMany({
        where,
        include: ticketInclude,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.ticket.count({ where }),
    ]);

    res.json({
      tickets,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / take),
      },
    });
  } catch (error) {
    next(error);
  }
};

// Approve a pending ticket
exports.approveTicket = async (req, res, next) => {
  try {
    const { id } = req.params;

    const ticket = await prisma.ticket.findUnique({
      where: { id: parseInt(id) },
      include: { category: true },
    });
    if (!ticket) {
      return res.status(404).json({ error: 'Заявка не найдена' });
    }
    if (ticket.status !== 'PENDING') {
      return res.status(400).json({ error: 'Заявка уже прошла модерацию' });
    }

    // Calculate SLA deadline
    const deadline = calculateDeadline(ticket.priority, ticket.category.slaHours);

    const updated = await prisma.ticket.update({
      where: { id: parseInt(id) },
      data: { status: 'OPEN', deadline },
      include: ticketInclude,
    });

    await prisma.statusHistory.create({
      data: {
        oldStatus: 'PENDING',
        newStatus: 'OPEN',
        ticketId: parseInt(id),
        changedById: req.user.id,
      },
    });

    notifyNewTicket(updated);
    // Telegram notification to creator
    telegramService.notifyTicketApproved(parseInt(id));

    res.json(updated);
  } catch (error) {
    next(error);
  }
};

// Reject a pending ticket
exports.rejectTicket = async (req, res, next) => {
  try {
    const { id } = req.params;

    const ticket = await prisma.ticket.findUnique({ where: { id: parseInt(id) } });
    if (!ticket) {
      return res.status(404).json({ error: 'Заявка не найдена' });
    }
    if (ticket.status !== 'PENDING') {
      return res.status(400).json({ error: 'Заявка уже прошла модерацию' });
    }

    await prisma.ticket.delete({ where: { id: parseInt(id) } });

    res.json({ message: 'Заявка отклонена' });
  } catch (error) {
    next(error);
  }
};

exports.getTicket = async (req, res, next) => {
  try {
    const ticket = await prisma.ticket.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        ...ticketInclude,
        comments: {
          include: {
            author: { select: { id: true, fullName: true, email: true, role: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
        statusHistory: {
          include: {
            changedBy: { select: { id: true, fullName: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!ticket) {
      return res.status(404).json({ error: 'Заявка не найдена' });
    }

    // Users can only see their own tickets
    if (req.user.role === 'USER' && ticket.creatorId !== req.user.id) {
      return res.status(403).json({ error: 'Недостаточно прав' });
    }

    // Filter internal comments for regular users
    if (req.user.role === 'USER') {
      ticket.comments = ticket.comments.filter((c) => !c.isInternal);
    }

    res.json(ticket);
  } catch (error) {
    next(error);
  }
};

exports.createTicket = async (req, res, next) => {
  try {
    const { title, description, categoryId, priority, location, source } = req.body;

    // Get category for SLA
    const category = await prisma.category.findUnique({ where: { id: parseInt(categoryId) } });
    if (!category) {
      return res.status(400).json({ error: 'Категория не найдена' });
    }

    // Admins create tickets directly as OPEN, users go through moderation
    const isAdmin = req.user.role === 'ADMIN' || req.user.role === 'SUPERADMIN';
    const initialStatus = isAdmin ? 'OPEN' : 'PENDING';
    const ticketPriority = priority || 'MEDIUM';

    // Calculate SLA deadline (only for OPEN tickets, PENDING gets it after approval)
    const deadline = isAdmin ? calculateDeadline(ticketPriority, category.slaHours) : null;

    const ticket = await prisma.ticket.create({
      data: {
        title,
        description,
        categoryId: parseInt(categoryId),
        priority: ticketPriority,
        location,
        source: source || 'WEB',
        status: initialStatus,
        creatorId: req.user.id,
        deadline,
      },
      include: ticketInclude,
    });

    // Create initial status history
    await prisma.statusHistory.create({
      data: {
        newStatus: initialStatus,
        ticketId: ticket.id,
        changedById: req.user.id,
      },
    });

    if (isAdmin) {
      notifyNewTicket(ticket);
    } else {
      // Notify admins about new pending ticket via Telegram
      telegramService.notifyAdminsNewTicket(ticket);
    }

    res.status(201).json(ticket);
  } catch (error) {
    next(error);
  }
};

exports.updateTicket = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, priority, assigneeId, title, description, categoryId } = req.body;

    const existing = await prisma.ticket.findUnique({
      where: { id: parseInt(id) },
      include: ticketInclude,
    });

    if (!existing) {
      return res.status(404).json({ error: 'Заявка не найдена' });
    }

    // Only admins can update status/assignee
    if (req.user.role === 'USER') {
      return res.status(403).json({ error: 'Недостаточно прав' });
    }

    const updateData = {};
    if (title) updateData.title = title;
    if (description) updateData.description = description;
    if (categoryId) updateData.categoryId = parseInt(categoryId);
    if (priority) updateData.priority = priority;
    if (assigneeId !== undefined) {
      updateData.assigneeId = assigneeId ? parseInt(assigneeId) : null;
    }

    if (status && status !== existing.status) {
      updateData.status = status;
      if (status === 'CLOSED') {
        updateData.closedAt = new Date();
      }

      await prisma.statusHistory.create({
        data: {
          oldStatus: existing.status,
          newStatus: status,
          ticketId: parseInt(id),
          changedById: req.user.id,
        },
      });

      notifyStatusChanged(parseInt(id), existing.status, status, {
        id: req.user.id,
        fullName: req.user.fullName,
      }, existing.creatorId);

      // Telegram notification
      telegramService.notifyStatusChange(parseInt(id), existing.status, status, req.user.fullName);
    }

    const updated = await prisma.ticket.update({
      where: { id: parseInt(id) },
      data: updateData,
      include: ticketInclude,
    });

    if (assigneeId && assigneeId !== existing.assigneeId) {
      notifyAssigned(parseInt(id), updated.assignee, existing.creatorId);
      telegramService.notifyAssignment(parseInt(id), updated.assignee?.fullName || 'Не назначен');
    }

    res.json(updated);
  } catch (error) {
    next(error);
  }
};

exports.deleteTicket = async (req, res, next) => {
  try {
    const { id } = req.params;

    const ticket = await prisma.ticket.findUnique({ where: { id: parseInt(id) } });
    if (!ticket) {
      return res.status(404).json({ error: 'Заявка не найдена' });
    }

    await prisma.ticket.delete({ where: { id: parseInt(id) } });
    res.json({ message: 'Заявка удалена' });
  } catch (error) {
    next(error);
  }
};

exports.addComment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { text, isInternal } = req.body;

    const ticket = await prisma.ticket.findUnique({ where: { id: parseInt(id) } });
    if (!ticket) {
      return res.status(404).json({ error: 'Заявка не найдена' });
    }

    // Users can only comment on their own tickets
    if (req.user.role === 'USER' && ticket.creatorId !== req.user.id) {
      return res.status(403).json({ error: 'Недостаточно прав' });
    }

    // Only admins can make internal comments
    const commentIsInternal = req.user.role !== 'USER' && isInternal;

    const comment = await prisma.comment.create({
      data: {
        text,
        isInternal: commentIsInternal,
        ticketId: parseInt(id),
        authorId: req.user.id,
      },
      include: {
        author: { select: { id: true, fullName: true, email: true, role: true } },
      },
    });

    notifyCommented(parseInt(id), comment, ticket.creatorId);
    // Telegram notification
    telegramService.notifyNewComment(parseInt(id), text, req.user.fullName, commentIsInternal);

    res.status(201).json(comment);
  } catch (error) {
    next(error);
  }
};

exports.getComments = async (req, res, next) => {
  try {
    const { id } = req.params;

    const ticket = await prisma.ticket.findUnique({ where: { id: parseInt(id) } });
    if (!ticket) {
      return res.status(404).json({ error: 'Заявка не найдена' });
    }

    if (req.user.role === 'USER' && ticket.creatorId !== req.user.id) {
      return res.status(403).json({ error: 'Недостаточно прав' });
    }

    const where = { ticketId: parseInt(id) };
    if (req.user.role === 'USER') {
      where.isInternal = false;
    }

    const comments = await prisma.comment.findMany({
      where,
      include: {
        author: { select: { id: true, fullName: true, email: true, role: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    res.json(comments);
  } catch (error) {
    next(error);
  }
};

// Rate a completed/closed ticket
exports.rateTicket = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rating, comment } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Оценка должна быть от 1 до 5' });
    }

    const ticket = await prisma.ticket.findUnique({ where: { id: parseInt(id) } });
    if (!ticket) {
      return res.status(404).json({ error: 'Заявка не найдена' });
    }

    // Only ticket creator can rate
    if (ticket.creatorId !== req.user.id) {
      return res.status(403).json({ error: 'Оценить заявку может только автор' });
    }

    if (!['COMPLETED', 'CLOSED'].includes(ticket.status)) {
      return res.status(400).json({ error: 'Оценить можно только завершённую заявку' });
    }

    if (ticket.rating) {
      return res.status(400).json({ error: 'Заявка уже оценена' });
    }

    const updated = await prisma.ticket.update({
      where: { id: parseInt(id) },
      data: {
        rating: parseInt(rating),
        ratingComment: comment || null,
      },
      include: ticketInclude,
    });

    res.json(updated);
  } catch (error) {
    next(error);
  }
};

// Upload attachments to a ticket
exports.uploadAttachments = async (req, res, next) => {
  try {
    const { id } = req.params;

    const ticket = await prisma.ticket.findUnique({ where: { id: parseInt(id) } });
    if (!ticket) {
      return res.status(404).json({ error: 'Заявка не найдена' });
    }

    if (req.user.role === 'USER' && ticket.creatorId !== req.user.id) {
      return res.status(403).json({ error: 'Недостаточно прав' });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'Файлы не загружены' });
    }

    const attachments = await Promise.all(
      req.files.map((file) =>
        prisma.attachment.create({
          data: {
            filename: file.filename,
            originalName: file.originalname,
            mimeType: file.mimetype,
            size: file.size,
            ticketId: parseInt(id),
          },
        })
      )
    );

    res.status(201).json(attachments);
  } catch (error) {
    next(error);
  }
};

// Get overdue tickets count
exports.getOverdueCount = async (req, res, next) => {
  try {
    const count = await prisma.ticket.count({
      where: {
        deadline: { lt: new Date() },
        status: { in: ['OPEN', 'IN_PROGRESS'] },
      },
    });
    res.json({ count });
  } catch (error) {
    next(error);
  }
};
