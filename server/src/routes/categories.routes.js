const express = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validate.middleware');
const authMiddleware = require('../middleware/auth.middleware');
const roleMiddleware = require('../middleware/role.middleware');
const categoriesController = require('../controllers/categories.controller');

const router = express.Router();

// Public endpoint for bot
router.get('/public', categoriesController.getCategories);

router.use(authMiddleware);

// All authenticated users can get active categories
router.get('/', categoriesController.getCategories);

// Admin routes
router.get('/all', roleMiddleware('ADMIN', 'SUPERADMIN'), categoriesController.getAllCategories);

router.post(
  '/',
  roleMiddleware('SUPERADMIN'),
  [body('name').notEmpty().withMessage('Название обязательно')],
  validate,
  categoriesController.createCategory
);

router.patch('/:id', roleMiddleware('SUPERADMIN'), categoriesController.updateCategory);
router.delete('/:id', roleMiddleware('SUPERADMIN'), categoriesController.deleteCategory);

module.exports = router;
