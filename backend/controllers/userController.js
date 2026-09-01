const User = require("../models/User");
const Jobseeker = require("../models/Jobseeker");
const Employer = require("../models/Employer");
const sendMail = require("../utils/sendMail");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const sendNotification = require("../utils/sendNotifications");
const { recordAudit } = require("../utils/auditLogger");


// Register User
const registerUser = async (req, res) => {
  const {
    name,
    email,
    password,
    role,
    // Jobseeker fields 
    skills,
    qualifications,
    experiences,
    // Employer fields 
    panNumber,
    establishedDate,
    industryType,
    companySize,
    address,
    telephone,
    description,
  } = req.body;

  // Access uploaded files from req.files (using multer's upload.fields for multiple files)
  const profilePicFile = req.files && req.files['profilePic'] ? req.files['profilePic'][0] : null;
  const resumeFile = req.files && req.files['resume'] ? req.files['resume'][0] : null;
  const companyLogoFile = req.files && req.files['companyLogo'] ? req.files['companyLogo'][0] : null;

  if (!name || !email || !password || !role) {
    return res.status(400).json({ message: "All required fields (name, email, password, role) are missing." });
  }

  if (!["jobseeker", "employer"].includes(role)) {
    return res.status(400).json({ message: "Invalid role. Public registration only supports 'jobseeker' or 'employer'." });
  }

  if (password.length < 6) {
    return res.status(400).json({ message: "Password must be at least 6 characters long." });
  }

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res
        .status(409)
        .json({ message: "User with this email already exists." });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // OTP valid for 10 minutes

    let userData = {
      name,
      email,
      password: hashedPassword,
      role,
      otpCode: otp,
      otpExpires: otpExpiry,
    };

    let user;

    if (role === "jobseeker") {
      let parsedSkills = [];
      if (skills) {
        try {
          parsedSkills = JSON.parse(skills);
        } catch (e) {
          console.error("Failed to parse skills JSON:", skills, e);
          return res
            .status(400)
            .json({ message: "Invalid format for skills." });
        }
      }

      let parsedQualifications = [];
      if (qualifications) {
        try {
          parsedQualifications = JSON.parse(qualifications);
        } catch (e) {
          console.error(
            "Failed to parse qualifications JSON:",
            qualifications,
            e
          );
          return res
            .status(400)
            .json({ message: "Invalid format for qualifications." });
        }
      }

      let parsedExperiences = [];
      if (experiences) {
        try {
          parsedExperiences = JSON.parse(experiences);
        } catch (e) {
          console.error("Failed to parse experiences JSON:", experiences, e);
          return res
            .status(400)
            .json({ message: "Invalid format for experiences." });
        }
      }

      // Add profilePic and resume paths if files were uploaded
      if (profilePicFile) {
        userData.profilePic = `/uploads/profile_pics/${profilePicFile.filename}`; // Store relative path
      }
      if (resumeFile) {
        userData.resume = `/uploads/resumes/${resumeFile.filename}`; // Store relative path
      }

      user = new Jobseeker({
        ...userData,
        skills: parsedSkills, // Use parsed array
        qualifications: parsedQualifications, // Use parsed array of objects
        experiences: parsedExperiences, // Use parsed array of objects
      });
    } else if (role === "employer") {
      // Add companyLogo path if file was uploaded
      if (companyLogoFile) {
        userData.companyLogo = `/uploads/company_logos/${companyLogoFile.filename}`; // Store relative path
      }

      user = new Employer({
        ...userData,
        panNumber,
        establishedDate,
        industryType,
        companySize,
        address,
        telephone,
        description,
      });
    } else if (role === "admin") {
      // Handle admin specific fields if any, or just use base userData
      user = new User({ ...userData });
    } else {
      return res.status(400).json({ message: "Invalid role specified." });
    }

    await user.save();

    await sendMail(email, "Verify your email", `Your OTP code is ${otp}`);

    // Notify admins (and superadmins — see notifyAllAdmins's comment) on
    // every new registration — employers and jobseekers both, mirroring
    // the same pattern (previously employer-only).
    if (role === "employer" || role === "jobseeker") {
      await sendNotification.notifyAllAdmins({
        type: role === "employer" ? "employer_registration" : "jobseeker_registration",
        message:
          role === "employer"
            ? `A new employer "${user.name}" has registered and is awaiting verification.`
            : `A new jobseeker "${user.name}" has registered.`,
        link: role === "employer" ? "/admin/employers" : "/admin/users",
      });
    }

    await recordAudit({
      req,
      actor: { id: user._id, name: user.name, email: user.email, role: user.role },
      module: "auth",
      action: "auth.register",
      targetType: "User",
      targetId: user._id,
      targetLabel: user.email,
      metadata: { role },
      success: true,
      statusCode: 201,
    });

    res.status(201).json({ message: "User registered successfully!" });
  } catch (error) {
    console.error("Register error:", error);
    // Consider adding logic here to delete uploaded files if user creation fails
    res.status(500).json({ message: "An error occurred during registration. Please try again later." });
  }
};


// Login User
const loginUser = async (req, res) => {
  const { email, password } = req.body;

  // Input validation
  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }
  // Belt-and-suspenders alongside the global sanitizeInput middleware:
  // a findOne({ email }) below must never receive anything but a plain
  // string, or a NoSQL operator object could alter the query semantics.
  if (typeof email !== "string" || typeof password !== "string") {
    return res.status(400).json({ message: "Invalid request" });
  }

  try {
    // Check if user exists. Deliberately return the SAME generic message
    // whether the email doesn't exist or the password is wrong, so an
    // attacker can't use this endpoint to discover which emails are
    // registered (user enumeration).
    const user = await User.findOne({ email });
    if (!user) {
      // Deliberately don't log the attempted email as a targetLabel here —
      // it's unverified input, not a real account, and logging arbitrary
      // strings an attacker supplies invites log pollution.
      await recordAudit({
        req,
        module: "auth",
        action: "auth.login_failed",
        metadata: { reason: "no_such_account" },
        success: false,
        statusCode: 401,
      });
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // Reject if the account is currently locked out from too many
    // recent failed attempts.
    if (user.isLocked()) {
      const minutesLeft = Math.ceil((user.lockUntil - Date.now()) / 60000);
      await recordAudit({
        req,
        module: "auth",
        action: "auth.login_blocked_locked",
        targetType: "User",
        targetId: user._id,
        targetLabel: user.email,
        metadata: { minutesLeft },
        success: false,
        statusCode: 423,
      });
      return res.status(423).json({
        message: `Account temporarily locked due to too many failed login attempts. Try again in ${minutesLeft} minute(s).`
      });
    }

    // Validate password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;

      const MAX_ATTEMPTS = 5;
      const LOCK_DURATION_MS = 15 * 60 * 1000; // 15 minutes

      let justLocked = false;
      if (user.failedLoginAttempts >= MAX_ATTEMPTS) {
        user.lockUntil = new Date(Date.now() + LOCK_DURATION_MS);
        user.failedLoginAttempts = 0; // reset counter once locked
        justLocked = true;
      }

      await user.save();

      await recordAudit({
        req,
        module: "auth",
        action: justLocked ? "auth.account_locked" : "auth.login_failed",
        targetType: "User",
        targetId: user._id,
        targetLabel: user.email,
        metadata: { reason: "wrong_password", failedAttempts: user.failedLoginAttempts },
        success: false,
        statusCode: 401,
      });
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // Successful login: reset lockout state and record login metadata
    // Block deactivated accounts here (after password verification, not
    // before) so we don't leak deactivation status to an unauthenticated
    // guesser via a different error message than a wrong password gives.
    if (user.isActive === false) {
      await recordAudit({
        req,
        module: "auth",
        action: "auth.login_blocked_deactivated",
        targetType: "User",
        targetId: user._id,
        targetLabel: user.email,
        success: false,
        statusCode: 403,
      });
      return res.status(403).json({
        message: "This account has been deactivated. Contact support if this was a mistake.",
      });
    }

    user.failedLoginAttempts = 0;
    user.lockUntil = undefined;
    user.lastLogin = new Date();
    user.lastLoginIP = req.ip;
    user.lastLoginUserAgent = req.headers['user-agent'];
    await user.save();

    await recordAudit({
      req,
      actor: { id: user._id, name: user.name, email: user.email, role: user.role },
      module: "auth",
      action: "auth.login_success",
      targetType: "User",
      targetId: user._id,
      targetLabel: user.email,
      success: true,
      statusCode: 200,
    });

    // Generate JWT token with a realistic, bounded lifetime.
    // Admins get a short-lived token; regular users get a longer but
    // still finite one. Configurable via env so it can be tuned per
    // environment without a code change.
    const expiresIn = user.role === 'admin'
      ? (process.env.JWT_EXPIRES_IN_ADMIN || '1d')
      : (process.env.JWT_EXPIRES_IN_USER || '7d');
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn }
    );

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      token,
    });
  } catch (error) {
    console.error("Error in loginUser:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const forgotPassword = async (req, res) => {
  const { email } = req.body;

  if (!email) return res.status(400).json({ message: "Email is required" });

  try {
    const user = await User.findOne({ email });

    // Always return the same success message whether or not the email is
    // registered — otherwise this endpoint leaks which emails have
    // accounts, which is a common target-list-building technique.
    if (!user) {
      return res.json({ message: "If that email is registered, an OTP has been sent." });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // expires in 10 mins

    user.otpCode = otp;
    user.otpExpires = otpExpiry;
    await user.save();

    await sendMail(email, "Reset your password", `Your OTP code is ${otp}`);

    res.json({ message: "If that email is registered, an OTP has been sent." });
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({ message: "Server error" });
  }
};


const resetPassword = async (req, res) => {
  const { email, otp, newPassword } = req.body;

  if (!email || !otp || !newPassword) {
    return res
      .status(400)
      .json({ message: "Email, OTP, and new password are required" });
  }

  if (newPassword.length < 6) {
    return res
      .status(400)
      .json({ message: "Password must be at least 6 characters" });
  }

  try {
    const user = await User.findOne({ email });

    if (!user) return res.status(404).json({ message: "User not found" });

    // Role-aware — this endpoint serves both jobseeker and employer
    // accounts, and each role's Settings page (where Change Password
    // lives) is at a different route.
    const settingsLink = user.role === "employer" ? "/employer/settings" : "/user/settings";

    if (user.otpCode !== otp || user.otpExpires < Date.now()) {
      await sendNotification({
        recipient: user._id,
        type: "password_reset",
        message:
          "Unsuccessful password reset attempt due to invalid or expired OTP",
        link: settingsLink,
      });
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    user.otpCode = undefined;
    user.otpExpires = undefined;

    await user.save();

    await sendNotification({
      recipient: user._id,
      type: "password_reset",
      message: "Your password was successfully reset",
      link: settingsLink,
    });

    res.json({ message: "Password reset successful" });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const changePassword = async (req, res) => {
  const userId = req.user?.id;
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res
      .status(400)
      .json({ message: "Current and new passwords are required" });
  }

  if (newPassword.length < 6) {
    return res
      .status(400)
      .json({ message: "New password must be at least 6 characters" });
  }

  try {
    const user = await User.findById(userId);

    if (!user) return res.status(404).json({ message: "User not found" });

    const settingsLink = user.role === "employer" ? "/employer/settings" : "/user/settings";

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      await sendNotification({
        recipient: user._id,
        type: "password_change",
        message:
          "Unsuccessful password change attempt with incorrect current password",
        link: settingsLink,
      });
      return res.status(401).json({ message: "Current password is incorrect" });
    }

    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      return res
        .status(400)
        .json({
          message: "New password cannot be the same as the current password",
        });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    await sendNotification({
      recipient: user._id,
      type: "password_change",
      message: "Your password was successfully changed",
      link: settingsLink,
    });

    res.json({ message: "Password changed successfully" });
  } catch (error) {
    console.error("Change password error:", error);
    res.status(500).json({ message: "Server error" });
  }
};


module.exports = { registerUser, loginUser, forgotPassword, resetPassword, changePassword };