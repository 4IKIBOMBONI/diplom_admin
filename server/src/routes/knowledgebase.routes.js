const express = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validate.middleware');
const authMiddleware = require('../middleware/auth.middleware');
const roleMiddleware = require('../middleware/role.middleware');
const kbController = require('../controllers/knowledgebase.controller');

const router = express.Router();

// Public routes (no auth needed)
router.get('/search', kbController.searchSuggestions);
router.get('/', kbController.getArticles);
router.get('/:id', kbController.getArticle);

// Admin routes
router.post(
  '/',
  authMiddleware,
  roleMiddleware('ADMIN', 'SUPERADMIN'),
  [
    body('title').notEmpty().withMessage('Заголовок обязателен'),
    body('content').notEmpty().withMessage('Содержание обязательно'),
    body('categoryName').notEmpty().withMessage('Категория обязательна'),
  ],
  validate,
  kbController.createArticle
);

router.patch(
  '/:id',
  authMiddleware,
  roleMiddleware('ADMIN', 'SUPERADMIN'),
  kbController.updateArticle
);

router.delete(
  '/:id',
  authMiddleware,
  roleMiddleware('ADMIN', 'SUPERADMIN'),
  kbController.deleteArticle
);

module.exports = router;
