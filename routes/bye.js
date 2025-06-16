const express = require('express');
const router = express.Router();
const byeController = require('../controllers/byeController');

// GET /
router.get('/', byeController.main);

router.get('/seeYou', byeController.seeYou);

module.exports = router;
