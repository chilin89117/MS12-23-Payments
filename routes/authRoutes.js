const express = require('express');
const router = express.Router();
const validateSignup = require('../middleware/validateSignup');
const validateLogin = require('../middleware/validateLogin');
const authController = require('../controllers/authController');

router.get('/login', authController.getLogin);
router.post('/login', validateLogin, authController.postLogin);
router.get('/signup', authController.getSignup);
router.post('/signup', validateSignup, authController.postSignup);
router.post('/logout', authController.postLogout);
router.get('/reset', authController.getReset);
router.post('/reset', authController.postReset);
router.get('/newpwd/:token', authController.getNewPwd);
router.post('/newpwd', authController.postNewPwd);

module.exports = router;
