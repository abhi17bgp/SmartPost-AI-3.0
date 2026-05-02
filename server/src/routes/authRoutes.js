const express = require('express');
const authController = require('../controllers/authController');

const router = express.Router();

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/logout', authController.logout);

router.post('/forgotPassword', authController.forgotPassword);
router.patch('/resetPassword/:token', authController.resetPassword);
router.patch('/verifyEmail/:token', authController.verifyEmail);

router.delete('/deleteMe', authController.protect, authController.deleteAccount);
router.patch('/updateMe', authController.protect, authController.uploadUserPhoto, authController.updateMe);
router.get('/me', authController.protect, authController.getMe);
router.post('/performance-check', authController.protect, authController.performanceCheck);

module.exports = router;
