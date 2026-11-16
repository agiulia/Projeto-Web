const express = require('express');
const router = express.Router();
const homeController = require('../controllers/homeController');

router.get('/', homeController.index);

const bookController = require('../controllers/bookController');

router.get('/buscar', bookController.buscar);

module.exports = router;