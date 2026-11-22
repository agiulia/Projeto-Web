const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { requireAuth, requireAdmin } = require('../middlewares/auth');

// publicas
router.get('/cadastro', userController.showRegisterForm);
router.post('/cadastro', userController.register);
router.get('/login', userController.showLoginForm);
router.post('/login', userController.login);
router.get('/logout', userController.logout);

// so ADM
router.get('/', requireAdmin, userController.listUsers);
router.post('/', requireAdmin, userController.addUser);
router.put('/:id/role', requireAdmin, userController.changeRole);
router.delete('/:id', requireAdmin, userController.removeUser);

// logado (ADM ou ele msm)
router.get('/:id', requireAuth, userController.showUser);
router.put('/:id', requireAuth, userController.editUser);
router.put('/:id/senha', requireAuth, userController.changePassword);

module.exports = router;