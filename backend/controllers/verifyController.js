const User = require("../models/User");
const sendMail = require("../utils/sendMail");

const verifyOtp = async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) return res.status(400).json({ message: "Email and OTP are required" });

  try {
    const user = await User.findOne({ email });

    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.emailVerified) return res.status(400).json({ message: "Email already verified" });

    if (user.otpCode !== otp || user.otpExpires < Date.now()) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    user.emailVerified = true;
    user.otpCode = undefined;
    user.otpExpires = undefined;
    await user.save();

    res.json({ message: "Email verified successfully" });
  } catch (error) {
    console.error("OTP verification error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Resend OTP
const resendOtp = async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ message: "Email is required to resend OTP" });
  }
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    if (user.emailVerified) {
      return res.status(400).json({ message: "Email already verified. No need to resend OTP." });
    }
    // Generate new OTP and expiry
    const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const newOtpExpiry = new Date(Date.now() + 10 * 60 * 1000); // New OTP valid for 10 minutes
    user.otpCode = newOtp;
    user.otpExpires = newOtpExpiry;
    await user.save();
    // Send the new OTP via email
    await sendMail(email, "Your new OTP for email verification", `Your new OTP code is ${newOtp}. It is valid for 10 minutes.`);
    res.json({ message: "New OTP sent successfully!" });
  } catch (error) {
    console.error("Resend OTP error:", error);
    res.status(500).json({ message: "Server error occurred while resending OTP." });
  }
};
module.exports = { verifyOtp, resendOtp };
