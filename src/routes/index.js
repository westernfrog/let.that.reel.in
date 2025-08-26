const express = require('express');
const { reelifyController } = require('../controllers/reelifyController');
const { uploadController } = require('../controllers/uploadController');

const router = express.Router();

router.post('/reelify', reelifyController);
router.post('/upload', uploadController);

module.exports = router;
