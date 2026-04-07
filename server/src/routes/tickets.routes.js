const express = require('express');
const { body } = require('express-validator');
const multer = require('multer');
const path = require('path');
const validate = require('../middleware/validate.middleware');
const authMiddleware = require('../middleware/auth.middleware');
const roleMiddleware = require('../middleware/role.middleware');
const ticketsController = require('../controllers/tickets.controller');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.resolve(__dirname, '../../uploads'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf',
      'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain', 'application/zip', 'application/x-rar-compressed',
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Неподдерживаемый ти�� файла'));
    }
  },
});

router.use(authMiddleware);

router.get('/', ticketsController.getTickets);

// Moderation endpoints (admin/superadmin)
router.get('/pending', roleMiddleware('ADMIN', 'SUPERADMIN'), ticketsController.getPendingTickets);
router.get('/overdue-count', roleMiddleware('ADMIN', 'SUPERADMIN'), ticketsController.getOverdueCount);
router.post('/:id/approve', roleMiddleware('ADMIN', 'SUPERADMIN'), ticketsController.approveTicket);
router.post('/:id/reject', roleMiddleware('ADMIN', 'SUPERADMIN'), ticketsController.rejectTicket);

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

// Rating
router.post('/:id/rate', ticketsController.rateTicket);

// Attachments
router.post(
  '/:id/attachments',
  upload.array('files', 5),
  ticketsController.uploadAttachments
);

// Comments
router.post(
  '/:id/comments',
  [body('text').notEmpty().withMessage('Текст комментария обязателен')],
  validate,
  ticketsController.addComment
);

router.get('/:id/comments', ticketsController.getComments);

module.exports = router;
