const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { requireAdmin } = require('../middlewares/auth');

router.get('/', requireAdmin, adminController.showAdmin);
router.get('/perfilAdmin', requireAdmin, (req, res) => {
    res.render('admin/perfilAdmin');
});
router.post('/emprestimos/:id/aceitar', requireAdmin, adminController.accept);
router.post('/emprestimos/:id/recusar', requireAdmin, adminController.reject);
router.post('/emprestimos/:id/devolver', requireAdmin, adminController.giveBack);

router.get('/livros', requireAdmin, adminController.showBookForm);
router.post('/livros', requireAdmin, adminController.addBook);

router.get('/usuarios', requireAdmin, adminController.showUsers);
router.post('/usuarios/:id/role', requireAdmin, adminController.changeUserRole);
router.post('/usuarios/:id/excluir', requireAdmin, adminController.removeUserAdmin);

module.exports = router;