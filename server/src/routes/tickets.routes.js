const express = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validate.middleware');
const authMiddleware = require('../middleware/auth.middleware');
const roleMiddleware = require('../middleware/role.middleware');
const ticketsController = require('../controllers/tickets.controller');

const router = express.Router();

router.use(authMiddleware);

router.get('/', ticketsController.getTickets);
router.get('/:id', ticketsController.getTicket);

router.post(
  '/',
  [
    body('title').notEmpty().withMessage('Тема обязательна'),
    body('description').notEmpty().withMessage('Описание обязательно'),
    body('categoryId').isInt().withMessage('Категория обязательна'),
  ],
  validate,
  ticketsController.createTicket
);

router.patch(
  '/:id',
  roleMiddleware('ADMIN', 'SUPERADMIN'),
  ticketsController.updateTicket
);

router.delete(
  '/:id',
  roleMiddleware('SUPERADMIN'),
  ticketsController.deleteTicket
);

router.post(
  '/:id/comments',
  [body('text').notEmpty().withMessage('Текст комментария обязателен')],
  validate,
  ticketsController.addComment
);

router.get('/:id/comments', ticketsController.getComments);

module.exports = router;
