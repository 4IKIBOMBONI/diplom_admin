const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

exports.getOverview = async (req, res, next) => {
  try {
    const [total, statusCounts, avgResolutionTime, overdueCount, avgRating, pendingCount] = await Promise.all([
      prisma.ticket.count(),
      prisma.ticket.groupBy({ by: ['status'], _count: true }),
      prisma.$queryRaw`
        SELECT AVG(EXTRACT(EPOCH FROM ("closedAt" - "createdAt")) / 3600) as avg_hours
        FROM "Ticket"
        WHERE "closedAt" IS NOT NULL
      `,
      prisma.ticket.count({
        where: {
          deadline: { lt: new Date() },
          status: { in: ['OPEN', 'IN_PROGRESS'] },
        },
      }),
      prisma.$queryRaw`
        SELECT AVG("rating")::float as avg_rating, COUNT("rating")::int as rated_count
        FROM "Ticket"
        WHERE "rating" IS NOT NULL
      `,
      prisma.ticket.count({ where: { status: 'PENDING' } }),
    ]);

    const counts = { PENDING: 0, OPEN: 0, IN_PROGRESS: 0, COMPLETED: 0, CLOSED: 0 };
    statusCounts.forEach((sc) => {
      counts[sc.status] = sc._count;
    });

    res.json({
      total,
      ...counts,
      overdueCount,
      pendingCount,
      avgResolutionHours: avgResolutionTime[0]?.avg_hours
        ? Math.round(parseFloat(avgResolutionTime[0].avg_hours) * 10) / 10
        : 0,
      avgRating: avgRating[0]?.avg_rating
        ? Math.round(parseFloat(avgRating[0].avg_rating) * 10) / 10
        : 0,
      ratedCount: avgRating[0]?.rated_count || 0,
    });
  } catch (error) {
    next(error);
  }
};

exports.getByCategory = async (req, res, next) => {
  try {
    const stats = await prisma.ticket.groupBy({
      by: ['categoryId'],
      _count: true,
    });

    const categories = await prisma.category.findMany();
    const result = categories.map((cat) => {
      const stat = stats.find((s) => s.categoryId === cat.id);
      return {
        categoryId: cat.id,
        categoryName: cat.name,
        count: stat ? stat._count : 0,
      };
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
};

exports.getByPeriod = async (req, res, next) => {
  try {
    const { period = 'day', days = 30 } = req.query;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    let dateFormat;
    if (period === 'month') {
      dateFormat = 'YYYY-MM';
    } else if (period === 'week') {
      dateFormat = 'IYYY-IW';
    } else {
      dateFormat = 'YYYY-MM-DD';
    }

    const stats = await prisma.$queryRaw`
      SELECT TO_CHAR("createdAt", ${dateFormat}) as period,
             COUNT(*)::int as count
      FROM "Ticket"
      WHERE "createdAt" >= ${startDate}
      GROUP BY period
      ORDER BY period ASC
    `;

    res.json(stats);
  } catch (error) {
    next(error);
  }
};

// Extended analytics: per-assignee stats
exports.getByAssignee = async (req, res, next) => {
  try {
    const assignees = await prisma.user.findMany({
      where: { role: { in: ['ADMIN', 'SUPERADMIN'] }, isActive: true },
      select: {
        id: true,
        fullName: true,
        _count: { select: { assignedTickets: true } },
      },
    });

    const result = [];
    for (const assignee of assignees) {
      const [activeCount, completedCount, avgTime, avgRating] = await Promise.all([
        prisma.ticket.count({
          where: { assigneeId: assignee.id, status: { in: ['OPEN', 'IN_PROGRESS'] } },
        }),
        prisma.ticket.count({
          where: { assigneeId: assignee.id, status: { in: ['COMPLETED', 'CLOSED'] } },
        }),
        prisma.$queryRaw`
          SELECT AVG(EXTRACT(EPOCH FROM ("closedAt" - "createdAt")) / 3600) as avg_hours
          FROM "Ticket"
          WHERE "assigneeId" = ${assignee.id} AND "closedAt" IS NOT NULL
        `,
        prisma.$queryRaw`
          SELECT AVG("rating")::float as avg_rating
          FROM "Ticket"
          WHERE "assigneeId" = ${assignee.id} AND "rating" IS NOT NULL
        `,
      ]);

      result.push({
        id: assignee.id,
        fullName: assignee.fullName,
        totalAssigned: assignee._count.assignedTickets,
        activeCount,
        completedCount,
        avgResolutionHours: avgTime[0]?.avg_hours
          ? Math.round(parseFloat(avgTime[0].avg_hours) * 10) / 10
          : 0,
        avgRating: avgRating[0]?.avg_rating
          ? Math.round(parseFloat(avgRating[0].avg_rating) * 10) / 10
          : 0,
      });
    }

    res.json(result);
  } catch (error) {
    next(error);
  }
};

// SLA compliance stats
exports.getSlaStats = async (req, res, next) => {
  try {
    const [totalWithDeadline, overdueResolved, overdueActive, onTimeResolved] = await Promise.all([
      prisma.ticket.count({ where: { deadline: { not: null } } }),
      prisma.$queryRaw`
        SELECT COUNT(*)::int as count FROM "Ticket"
        WHERE "deadline" IS NOT NULL
        AND "closedAt" IS NOT NULL
        AND "closedAt" > "deadline"
      `,
      prisma.ticket.count({
        where: {
          deadline: { lt: new Date() },
          status: { in: ['OPEN', 'IN_PROGRESS'] },
        },
      }),
      prisma.$queryRaw`
        SELECT COUNT(*)::int as count FROM "Ticket"
        WHERE "deadline" IS NOT NULL
        AND "closedAt" IS NOT NULL
        AND "closedAt" <= "deadline"
      `,
    ]);

    const onTime = onTimeResolved[0]?.count || 0;
    const overdue = (overdueResolved[0]?.count || 0) + overdueActive;
    const compliance = totalWithDeadline > 0
      ? Math.round((onTime / (onTime + overdue)) * 100)
      : 100;

    res.json({
      totalWithDeadline,
      onTimeResolved: onTime,
      overdueResolved: overdueResolved[0]?.count || 0,
      overdueActive,
      slaCompliance: compliance,
    });
  } catch (error) {
    next(error);
  }
};

// Export tickets as CSV
exports.exportTickets = async (req, res, next) => {
  try {
    const { status, dateFrom, dateTo } = req.query;
    const where = {};

    if (status) where.status = status;
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo);
    }

    const tickets = await prisma.ticket.findMany({
      where,
      include: {
        category: true,
        creator: { select: { fullName: true, email: true, employeeId: true } },
        assignee: { select: { fullName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const STATUS_LABELS = {
      PENDING: 'На модерации', OPEN: 'Открыта', IN_PROGRESS: 'В работе',
      COMPLETED: 'Выполнена', CLOSED: 'Закрыта',
    };
    const PRIORITY_LABELS = {
      LOW: 'Низкий', MEDIUM: 'Средний', HIGH: 'Высокий', CRITICAL: 'Критический',
    };

    // UTF-8 BOM for Excel
    let csv = '\uFEFF';
    csv += 'ID;Тема;Описание;Статус;Приоритет;Категория;Автор;Исполнитель;Аудитория;Источник;Оценка;Дедлайн;Создана;Закрыта\n';

    for (const t of tickets) {
      const row = [
        t.id,
        `"${(t.title || '').replace(/"/g, '""')}"`,
        `"${(t.description || '').replace(/"/g, '""').replace(/\n/g, ' ')}"`,
        STATUS_LABELS[t.status] || t.status,
        PRIORITY_LABELS[t.priority] || t.priority,
        t.category?.name || '',
        t.creator?.fullName || '',
        t.assignee?.fullName || '',
        t.location || '',
        t.source === 'TELEGRAM' ? 'Telegram' : 'Веб',
        t.rating || '',
        t.deadline ? new Date(t.deadline).toLocaleString('ru-RU') : '',
        new Date(t.createdAt).toLocaleString('ru-RU'),
        t.closedAt ? new Date(t.closedAt).toLocaleString('ru-RU') : '',
      ];
      csv += row.join(';') + '\n';
    }

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="tickets_export_${Date.now()}.csv"`);
    res.send(csv);
  } catch (error) {
    next(error);
  }
};
