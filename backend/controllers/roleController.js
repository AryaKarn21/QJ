const Role = require("../models/Role");
const Permission = require("../models/Permission");
const User = require("../models/User");
const {
  PERMISSION_MODULES,
  ALL_PERMISSION_KEYS,
  initializeRbac,
} = require("../utils/permissionsConfig");
const { recordAudit } = require("../utils/auditLogger");

/**
 * GET /api/admin/roles — list all roles with user count and permission summary
 */
exports.getRoles = async (req, res) => {
  try {
    await initializeRbac();
    const roles = await Role.find().sort({ isSystem: -1, createdAt: 1 });

    // Fetch user counts per role
    const userCounts = await User.aggregate([
      { $group: { _id: "$role", count: { $sum: 1 } } },
    ]);
    const countMap = userCounts.reduce((acc, curr) => {
      if (curr._id) acc[curr._id.toLowerCase()] = curr.count;
      return acc;
    }, {});

    const enriched = roles.map((r) => {
      const plain = r.toObject();
      plain.userCount = countMap[r.name.toLowerCase()] || 0;
      return plain;
    });

    res.json(enriched);
  } catch (error) {
    console.error("Error fetching roles:", error);
    res.status(500).json({ message: "Server error fetching roles" });
  }
};

/**
 * GET /api/admin/roles/:id — single role details
 */
exports.getRoleById = async (req, res) => {
  try {
    const role = await Role.findById(req.params.id);
    if (!role) return res.status(404).json({ message: "Role not found" });
    res.json(role);
  } catch (error) {
    console.error("Error fetching role:", error);
    res.status(500).json({ message: "Server error fetching role" });
  }
};

/**
 * POST /api/admin/roles — create a custom administrative role
 */
exports.createRole = async (req, res) => {
  try {
    const { name, displayName, description, permissions = [], status = "active" } = req.body;

    if (!displayName || !displayName.trim()) {
      return res.status(400).json({ message: "Role display name is required" });
    }

    const normalizedName = (name || displayName)
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, "-")
      .replace(/^-+|-+$/g, "");

    if (!normalizedName) {
      return res.status(400).json({ message: "Valid role name is required" });
    }

    const existing = await Role.findOne({ name: normalizedName });
    if (existing) {
      return res.status(409).json({ message: `Role "${normalizedName}" already exists` });
    }

    // Filter valid permissions
    const validPermissions = Array.isArray(permissions)
      ? permissions.filter((p) => ALL_PERMISSION_KEYS.includes(p))
      : [];

    const role = await Role.create({
      name: normalizedName,
      displayName: displayName.trim(),
      description: (description || "").trim(),
      permissions: validPermissions,
      status: status === "inactive" ? "inactive" : "active",
      isSystem: false,
      createdBy: req.user?._id,
      updatedBy: req.user?._id,
    });

    await recordAudit({
      req,
      actor: {
        id: req.user?._id,
        name: req.user?.name,
        email: req.user?.email,
        role: req.user?.role,
      },
      module: "roles",
      action: `Created role "${role.displayName}" (${role.name})`,
      targetType: "Role",
      targetId: role._id,
      targetLabel: role.displayName,
      metadata: {
        permissionsCount: validPermissions.length,
        permissions: validPermissions,
      },
    });

    res.status(201).json(role);
  } catch (error) {
    console.error("Error creating role:", error);
    res.status(500).json({ message: error.message || "Server error creating role" });
  }
};

/**
 * PUT /api/admin/roles/:id — update role permissions, name, description, status
 */
exports.updateRole = async (req, res) => {
  try {
    const role = await Role.findById(req.params.id);
    if (!role) return res.status(404).json({ message: "Role not found" });

    const { displayName, description, permissions, status } = req.body;

    // Self-lockout / Safety guard: Super Admin role can never have permissions removed or be deactivated
    if (role.name === "superadmin") {
      if (status === "inactive") {
        return res.status(400).json({ message: "The primary Super Admin role cannot be deactivated" });
      }
      if (permissions && permissions.length < ALL_PERMISSION_KEYS.length) {
        return res.status(400).json({ message: "Super Admin must retain all permissions" });
      }
    }

    const oldPermissions = [...(role.permissions || [])];
    const oldStatus = role.status;

    if (displayName && displayName.trim()) {
      role.displayName = displayName.trim();
    }
    if (description !== undefined) {
      role.description = description.trim();
    }
    if (status && (status === "active" || status === "inactive")) {
      role.status = status;
    }
    if (Array.isArray(permissions)) {
      if (role.name === "superadmin") {
        role.permissions = ALL_PERMISSION_KEYS;
      } else {
        role.permissions = permissions.filter((p) => ALL_PERMISSION_KEYS.includes(p));
      }
    }

    role.updatedBy = req.user?._id;
    await role.save();

    // Audit log
    await recordAudit({
      req,
      actor: {
        id: req.user?._id,
        name: req.user?.name,
        email: req.user?.email,
        role: req.user?.role,
      },
      module: "roles",
      action: `Updated role "${role.displayName}" (${role.name})`,
      targetType: "Role",
      targetId: role._id,
      targetLabel: role.displayName,
      metadata: {
        oldPermissionsCount: oldPermissions.length,
        newPermissionsCount: role.permissions.length,
        addedPermissions: role.permissions.filter((p) => !oldPermissions.includes(p)),
        removedPermissions: oldPermissions.filter((p) => !role.permissions.includes(p)),
        statusChanged: oldStatus !== role.status ? { from: oldStatus, to: role.status } : undefined,
      },
    });

    res.json(role);
  } catch (error) {
    console.error("Error updating role:", error);
    res.status(500).json({ message: "Server error updating role" });
  }
};

/**
 * DELETE /api/admin/roles/:id — delete custom role
 */
exports.deleteRole = async (req, res) => {
  try {
    const role = await Role.findById(req.params.id);
    if (!role) return res.status(404).json({ message: "Role not found" });

    if (role.isSystem || role.name === "superadmin" || role.name === "admin") {
      return res.status(400).json({ message: "System roles cannot be deleted" });
    }

    // Check if any users are currently assigned this role
    const assignedCount = await User.countDocuments({ role: role.name });
    if (assignedCount > 0) {
      return res.status(400).json({
        message: `Cannot delete role. ${assignedCount} user(s) are currently assigned this role. Reassign them first.`,
      });
    }

    await Role.findByIdAndDelete(req.params.id);

    await recordAudit({
      req,
      actor: {
        id: req.user?._id,
        name: req.user?.name,
        email: req.user?.email,
        role: req.user?.role,
      },
      module: "roles",
      action: `Deleted custom role "${role.displayName}" (${role.name})`,
      targetType: "Role",
      targetId: role._id,
      targetLabel: role.displayName,
    });

    res.json({ message: `Role "${role.displayName}" deleted successfully` });
  } catch (error) {
    console.error("Error deleting role:", error);
    res.status(500).json({ message: "Server error deleting role" });
  }
};

/**
 * GET /api/admin/permissions — returns structured list of all permission modules
 */
exports.getPermissions = async (_req, res) => {
  try {
    await initializeRbac();
    res.json({
      modules: PERMISSION_MODULES,
      allKeys: ALL_PERMISSION_KEYS,
    });
  } catch (error) {
    console.error("Error fetching permissions:", error);
    res.status(500).json({ message: "Server error fetching permissions" });
  }
};

/**
 * GET /api/admin/my-permissions — returns logged-in user's effective permissions
 */
exports.getMyPermissions = async (req, res) => {
  try {
    const { getUserPermissions } = require("../middleware/authMiddleware");
    const permissions = await getUserPermissions(req.user);
    res.json({
      role: req.user?.role,
      isSuperAdmin: (req.user?.role || "").toLowerCase() === "superadmin",
      permissions,
    });
  } catch (error) {
    console.error("Error getting user permissions:", error);
    res.status(500).json({ message: "Server error getting permissions" });
  }
};

/**
 * POST /api/admin/users/:id/assign-role — assign a role to a user
 */
exports.assignUserRole = async (req, res) => {
  try {
    const { role: newRoleName } = req.body;
    if (!newRoleName) {
      return res.status(400).json({ message: "New role name is required" });
    }

    const targetUser = await User.findById(req.params.id);
    if (!targetUser) {
      return res.status(404).json({ message: "User not found" });
    }

    const normalizedNewRole = newRoleName.trim().toLowerCase();

    // Verify role exists in Role collection or is one of the valid role names
    const roleDoc = await Role.findOne({ name: normalizedNewRole });
    if (!roleDoc && !["jobseeker", "employer", "recruiter", "mentor", "admin", "superadmin"].includes(normalizedNewRole)) {
      return res.status(400).json({ message: `Role "${newRoleName}" is not recognized` });
    }

    const oldRole = targetUser.role;

    // Self-lockout protection: if targetUser is the LAST superadmin, prevent demoting them
    if (oldRole === "superadmin" && normalizedNewRole !== "superadmin") {
      const activeSuperAdmins = await User.countDocuments({ role: "superadmin", isActive: true });
      if (activeSuperAdmins <= 1) {
        return res.status(400).json({
          message: "Cannot demote the final active Super Admin. Assign another Super Admin first.",
        });
      }
    }

    targetUser.role = normalizedNewRole;
    if (roleDoc) {
      targetUser.customRole = roleDoc._id;
    }
    await targetUser.save();

    await recordAudit({
      req,
      actor: {
        id: req.user?._id,
        name: req.user?.name,
        email: req.user?.email,
        role: req.user?.role,
      },
      module: "roles",
      action: `Changed role for user ${targetUser.name || targetUser.email}: ${oldRole} → ${normalizedNewRole}`,
      targetType: "User",
      targetId: targetUser._id,
      targetLabel: targetUser.email,
      metadata: {
        oldRole,
        newRole: normalizedNewRole,
      },
    });

    res.json({
      message: `User role updated to ${normalizedNewRole}`,
      user: {
        _id: targetUser._id,
        name: targetUser.name,
        email: targetUser.email,
        role: targetUser.role,
      },
    });
  } catch (error) {
    console.error("Error assigning user role:", error);
    res.status(500).json({ message: "Server error assigning user role" });
  }
};
