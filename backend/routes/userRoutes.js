const express = require("express");
const router = express.Router();
const userUpload = require('../middleware/userUploadMiddleware');
const { authenticate } = require("../middleware/authMiddleware");
const { loginLimiter, otpRequestLimiter, otpVerifyLimiter } = require("../middleware/rateLimiters");
const {registerUser,loginUser,forgotPassword,resetPassword,changePassword} = require("../controllers/userController");
const { verifyOtp, resendOtp } = require("../controllers/verifyController");


router.post("/register", userUpload, registerUser);

router.post("/login", loginLimiter, loginUser);
router.post("/verify-otp", otpVerifyLimiter, verifyOtp);
router.post("/resend-otp", otpRequestLimiter, resendOtp);
router.post("/forgot-password", otpRequestLimiter, forgotPassword);
router.post("/reset-password", otpVerifyLimiter, resetPassword);
router.post("/change-password",authenticate,  changePassword);


module.exports = router;