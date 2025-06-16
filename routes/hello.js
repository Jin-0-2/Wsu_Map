const express = require('express');
const router = express.Router();
const helloController = require('../controllers/helloController');

// GET /
router.get('/', helloController.main);

module.exports = router;
