const express = require('express');
const router = express.Router();
const bookController = require('../controllers/bookController');
const { requireAuth, requireAdmin } = require('../middlewares/auth');

// qualquer usuário logado
router.get('/', requireAuth, bookController.listBooks);
router.get('/:id', requireAuth, bookController.showBook);

// só ADM
router.post('/', requireAdmin, bookController.addBook);
router.put('/:id', requireAdmin, bookController.editBook);
router.delete('/:id', requireAdmin, bookController.removeBook);

module.exports = router;