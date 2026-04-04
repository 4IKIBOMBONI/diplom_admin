const express = require('express');
const authMiddleware = require('../middleware/auth.middleware');
const roleMiddleware = require('../middleware/role.middleware');
const statsController = require('../controllers/stats.controller');

const router = express.Router();

router.use(authMiddleware);
router.use(roleMiddleware('ADMIN', 'SUPERADMIN'));

router.get('/overview', statsController.getOverview);
router.get('/by-category', statsController.getByCategory);
router.get('/by-period', statsController.getByPeriod);

module.exports = router;
