const express = require('express');
const router = express.Router();
const loanController = require('../controllers/loanController');
const { requireAuth } = require('../middlewares/auth');

router.post('/', requireAuth, loanController.requestLoan);

module.exports = router;