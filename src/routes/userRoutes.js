const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { requireAuth, requireAdmin } = require('../middlewares/auth');

router.get('/cadastro', userController.showRegisterForm);
router.post('/cadastro', userController.register);
router.get('/login', userController.showLoginForm);
router.post('/login', userController.login);
router.get('/logout', userController.logout);

module.exports = router;