const express = require('express');
const router = express.Router();
const { register, login, completeProfile } = require('../controllers/authController');
const protect = require('../middleware/authMiddleware');

router.post('/register', register);
router.post('/login', login);
router.put('/complete-profile', protect, completeProfile);

module.exports = router;
