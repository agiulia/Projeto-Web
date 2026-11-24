const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { requireAdmin } = require('../middlewares/auth');

router.get('/', requireAdmin, adminController.showAdmin);
router.post('/emprestimos/:id/aceitar', requireAdmin, adminController.accept);
router.post('/emprestimos/:id/recusar', requireAdmin, adminController.reject);

module.exports = router;