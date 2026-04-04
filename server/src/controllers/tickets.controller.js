const { PrismaClient } = require('@prisma/client');
const { notifyNewTicket, notifyStatusChanged, notifyAssigned, notifyCommented } = require('../services/notification.service');

const prisma = new PrismaClient();

const ticketInclude = {
  category: true,
  creator: { select: { id: true, fullName: true, email: true } },
  assignee: { select: { id: true, fullName: true, email: true } },
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
    } = req.query;

    const where = {};

    // Users can only see their own tickets
    if (req.user.role === 'USER') {
      where.creatorId = req.user.id;
    }

    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (category) where.categoryId = parseInt(category);
    if (assigneeId) where.assigneeId = parseInt(assigneeId);

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const allowedSortFields = ['createdAt', 'updatedAt', 'priority', 'status', 'id'];
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
    const baseWhere = req.user.role === 'USER' ? { creatorId: req.user.id } : {};
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
      counts[sc.status] = sc._count;
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
      return res.status(404).json({ error: 'Тикет не найден' });
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

    const ticket = await prisma.ticket.create({
      data: {
        title,
        description,
        categoryId: parseInt(categoryId),
        priority: priority || 'MEDIUM',
        location,
        source: source || 'WEB',
        creatorId: req.user.id,
      },
      include: ticketInclude,
    });

    // Create initial status history
    await prisma.statusHistory.create({
      data: {
        newStatus: 'OPEN',
        ticketId: ticket.id,
        changedById: req.user.id,
      },
    });

    notifyNewTicket(ticket);
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
      return res.status(404).json({ error: 'Тикет не найден' });
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
    }

    const updated = await prisma.ticket.update({
      where: { id: parseInt(id) },
      data: updateData,
      include: ticketInclude,
    });

    if (assigneeId && assigneeId !== existing.assigneeId) {
      notifyAssigned(parseInt(id), updated.assignee, existing.creatorId);
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
      return res.status(404).json({ error: 'Тикет не найден' });
    }

    await prisma.ticket.delete({ where: { id: parseInt(id) } });
    res.json({ message: 'Тикет удалён' });
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
      return res.status(404).json({ error: 'Тикет не найден' });
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
      return res.status(404).json({ error: 'Тикет не найден' });
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
