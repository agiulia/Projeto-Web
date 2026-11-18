const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

router.get('/cadastro', userController.showRegisterForm);
router.post('/cadastro', userController.register);

module.exports = router;