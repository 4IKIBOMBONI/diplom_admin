const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

exports.getArticles = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search, category } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const where = { isPublished: true };

    if (category) {
      where.categoryName = category;
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } },
        { tags: { hasSome: [search.toLowerCase()] } },
      ];
    }

    const [articles, total] = await Promise.all([
      prisma.knowledgeBase.findMany({
        where,
        skip,
        take,
        orderBy: { viewCount: 'desc' },
      }),
      prisma.knowledgeBase.count({ where }),
    ]);

    // Get unique category names
    const categories = await prisma.knowledgeBase.findMany({
      where: { isPublished: true },
      select: { categoryName: true },
      distinct: ['categoryName'],
      orderBy: { categoryName: 'asc' },
    });

    res.json({
      articles,
      categories: categories.map((c) => c.categoryName),
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

exports.getArticle = async (req, res, next) => {
  try {
    const article = await prisma.knowledgeBase.findUnique({
      where: { id: parseInt(req.params.id) },
    });

    if (!article) {
      return res.status(404).json({ error: 'Статья не найдена' });
    }

    // Increment view count
    await prisma.knowledgeBase.update({
      where: { id: article.id },
      data: { viewCount: { increment: 1 } },
    });

    res.json(article);
  } catch (error) {
    next(error);
  }
};

exports.createArticle = async (req, res, next) => {
  try {
    const { title, content, categoryName, tags, isPublished } = req.body;

    const article = await prisma.knowledgeBase.create({
      data: {
        title,
        content,
        categoryName,
        tags: tags || [],
        isPublished: isPublished !== false,
      },
    });

    res.status(201).json(article);
  } catch (error) {
    next(error);
  }
};

exports.updateArticle = async (req, res, next) => {
  try {
    const { title, content, categoryName, tags, isPublished } = req.body;

    const existing = await prisma.knowledgeBase.findUnique({
      where: { id: parseInt(req.params.id) },
    });
    if (!existing) {
      return res.status(404).json({ error: 'Статья не найдена' });
    }

    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (content !== undefined) updateData.content = content;
    if (categoryName !== undefined) updateData.categoryName = categoryName;
    if (tags !== undefined) updateData.tags = tags;
    if (isPublished !== undefined) updateData.isPublished = isPublished;

    const article = await prisma.knowledgeBase.update({
      where: { id: parseInt(req.params.id) },
      data: updateData,
    });

    res.json(article);
  } catch (error) {
    next(error);
  }
};

exports.deleteArticle = async (req, res, next) => {
  try {
    const existing = await prisma.knowledgeBase.findUnique({
      where: { id: parseInt(req.params.id) },
    });
    if (!existing) {
      return res.status(404).json({ error: 'Статья не найдена' });
    }

    await prisma.knowledgeBase.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ message: 'Статья удалена' });
  } catch (error) {
    next(error);
  }
};

// Public search for suggestions (when creating ticket)
exports.searchSuggestions = async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) {
      return res.json([]);
    }

    const articles = await prisma.knowledgeBase.findMany({
      where: {
        isPublished: true,
        OR: [
          { title: { contains: q, mode: 'insensitive' } },
          { content: { contains: q, mode: 'insensitive' } },
          { tags: { hasSome: [q.toLowerCase()] } },
        ],
      },
      select: { id: true, title: true, categoryName: true },
      take: 5,
      orderBy: { viewCount: 'desc' },
    });

    res.json(articles);
  } catch (error) {
    next(error);
  }
};
