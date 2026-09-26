const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Role = require("../models/Role");
const { ALL_PERMISSION_KEYS, DEFAULT_SYSTEM_ROLES } = require("../utils/permissionsConfig");

// Authenticate — verify JWT and attach req.user
const authenticate = async (req, res, next) => {
  let token = null;
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.split(" ")[1];
  } else if (req.query && req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({ message: "Not authorized, no token" });
  }

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
// regardless.
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
const isSuperAdmin = (user) => {
  return user && typeof user.role === "string" && user.role.toLowerCase() === "superadmin";
};

// Fetch effective permissions array for any user
const getUserPermissions = async (user) => {
  if (!user) return [];
  const roleName = typeof user.role === "string" ? user.role.toLowerCase() : "";

  // Super Admin always has full access to all permissions
  if (roleName === "superadmin") {
    return ALL_PERMISSION_KEYS;
  }

  // Look up role in database
  let roleDoc = null;
  if (user.customRole) {
    roleDoc = await Role.findById(user.customRole);
  }
  if (!roleDoc && roleName) {
    roleDoc = await Role.findOne({ name: roleName, status: "active" });
  }

  if (roleDoc) {
    return roleDoc.permissions || [];
  }

  // Fallback to system role defaults
  const defaultRole = DEFAULT_SYSTEM_ROLES.find((r) => r.name === roleName);
  if (defaultRole) {
    return defaultRole.permissions || [];
  }

  return [];
};

// Require at least one of the specified permissions (Super Admin override applies)
const requirePermission = (...requiredPermissions) => async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: "Not authorized, no user found" });
  }

  // Super Admin override (always authorized)
  if (isSuperAdmin(req.user)) {
    return next();
  }

  try {
    const userPerms = await getUserPermissions(req.user);
    const hasPerm = requiredPermissions.some(
      (p) => userPerms.includes(p) || userPerms.includes("*")
    );

    if (!hasPerm) {
      return res.status(403).json({
        message: `Access denied. Requires permission: ${requiredPermissions.join(" or ")}`,
        requiredPermissions,
      });
    }

    next();
  } catch (err) {
    console.error("Error in requirePermission middleware:", err);
    res.status(500).json({ message: "Authorization check error" });
  }
};

const authorizeAdmin = (req, res, next) => {
  const role = req.user.role ? req.user.role.toLowerCase() : "";
  if (role !== "admin" && role !== "superadmin") {
    return res.status(403).json({ message: "Access denied. Admins only." });
  }
  next();
};

// Authorize superadmin only — for sensitive security/roles actions
const authorizeSuperAdmin = (req, res, next) => {
  if (!isSuperAdmin(req.user)) {
    return res.status(403).json({ message: "Access denied. Superadmin only." });
  }
  next();
};

// Generic role gate — usage: authorizeRoles("employer", "recruiter")
const authorizeRoles = (...roles) => (req, res, next) => {
  if (!req.user) {
    return res.status(403).json({ message: "Access denied for this role." });
  }
  const userRole = typeof req.user.role === "string" ? req.user.role.toLowerCase() : "";
  const normalizedRoles = roles.map((r) => (typeof r === "string" ? r.toLowerCase() : r));
  if (!normalizedRoles.includes(userRole)) {
    return res.status(403).json({ message: "Access denied for this role." });
  }
  next();
};

// Ownership check
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
  isSuperAdmin,
  getUserPermissions,
  requirePermission,
};