const jwt = require("jsonwebtoken");
const User = require("../models/User");

// Authenticate — verify JWT and attach req.user
const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Not authorized, no token" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select("-password");

    if (!req.user) {
      return res.status(401).json({ message: "Not authorized, user not found" });
    }

    // A previously-issued token is still cryptographically valid after
    // deactivation, so this check must happen here, not only at login.
    if (req.user.isActive === false) {
      return res.status(403).json({ message: "This account has been deactivated." });
    }

    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Token expired" });
    } else if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ message: "Token invalid" });
    } else {
      console.error("Unexpected auth error:", error);
      return res.status(500).json({ message: "Authentication error" });
    }
  }
};

// Authenticate, but never block the request — attaches req.user when a
// valid token is present, otherwise leaves it undefined and calls next()
// regardless. For routes that are genuinely public (a blog/CMS page) but
// need to know "is this the author/an admin?" to also allow viewing an
// unpublished draft, without splitting the route into two.
const authenticateOptional = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next();
  }

  try {
    const decoded = jwt.verify(authHeader.split(" ")[1], process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("-password");
    if (user && user.isActive !== false) {
      req.user = user;
    }
  } catch {
    // Invalid/expired token on an optional-auth route just means "treat
    // as anonymous" — never a 401.
  }
  next();
};

// Authorize employer
const authorizeEmployer = (req, res, next) => {
  if (req.user.role !== "employer" || !req.user.isVerified) {
    return res.status(403).json({ message: "Access denied. Not an employer or not verified." });
  }
  next();
};

// Authorize admin or superadmin
const authorizeAdmin = (req, res, next) => {
  if (req.user.role !== "admin" && req.user.role !== "superadmin") {
    return res.status(403).json({ message: "Access denied. Admins only." });
  }
  next();
};

// Authorize superadmin only — for sensitive actions
const authorizeSuperAdmin = (req, res, next) => {
  if (req.user.role !== "superadmin") {
    return res.status(403).json({ message: "Access denied. Superadmin only." });
  }
  next();
};

// Generic role gate — usage: authorizeRoles("employer", "recruiter")
const authorizeRoles = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ message: "Access denied for this role." });
  }
  next();
};

// Ownership check — allows access if the requesting user owns the resource
// (req.params.id === req.user._id) OR is an admin/superadmin.
// Usage: router.get("/:id", authenticate, requireOwnerOrAdmin, handler)
const requireOwnerOrAdmin = (req, res, next) => {
  const isAdmin = req.user.role === "admin" || req.user.role === "superadmin";
  const isOwner = String(req.params.id) === String(req.user._id);
  if (!isAdmin && !isOwner) {
    return res.status(403).json({ message: "Access denied." });
  }
  next();
};

module.exports = {
  authenticate,
  authenticateOptional,
  authorizeEmployer,
  authorizeAdmin,
  authorizeSuperAdmin,
  authorizeRoles,
  requireOwnerOrAdmin,
};