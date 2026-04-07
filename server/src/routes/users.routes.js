const express = require('express');
const authMiddleware = require('../middleware/auth.middleware');
const roleMiddleware = require('../middleware/role.middleware');
const usersController = require('../controllers/users.controller');

const router = express.Router();

router.use(authMiddleware);

// Profile update (any authenticated user)
router.patch('/profile', usersController.updateProfile);

// Admin routes
router.get('/', roleMiddleware('ADMIN', 'SUPERADMIN'), usersController.getUsers);
router.get('/:id', roleMiddleware('ADMIN', 'SUPERADMIN'), usersController.getUser);
router.post('/', roleMiddleware('SUPERADMIN'), usersController.createUser);
router.patch('/:id', roleMiddleware('SUPERADMIN'), usersController.updateUser);
router.delete('/:id', roleMiddleware('SUPERADMIN'), usersController.deleteUser);

module.exports = router;
