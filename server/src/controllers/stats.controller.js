const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

exports.getOverview = async (req, res, next) => {
  try {
    const [total, statusCounts, avgResolutionTime] = await Promise.all([
      prisma.ticket.count(),
      prisma.ticket.groupBy({ by: ['status'], _count: true }),
      prisma.$queryRaw`
        SELECT AVG(EXTRACT(EPOCH FROM ("closedAt" - "createdAt")) / 3600) as avg_hours
        FROM "Ticket"
        WHERE "closedAt" IS NOT NULL
      `,
    ]);

    const counts = { OPEN: 0, IN_PROGRESS: 0, COMPLETED: 0, CLOSED: 0 };
    statusCounts.forEach((sc) => {
      counts[sc.status] = sc._count;
    });

    res.json({
      total,
      ...counts,
      avgResolutionHours: avgResolutionTime[0]?.avg_hours
        ? Math.round(parseFloat(avgResolutionTime[0].avg_hours) * 10) / 10
        : 0,
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
