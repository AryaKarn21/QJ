const Permission = require("../models/Permission");
const Role = require("../models/Role");

const PERMISSION_MODULES = [
  {
    module: "dashboard",
    label: "Dashboard",
    permissions: [
      { key: "dashboard.view", action: "view", description: "View admin dashboard and statistics" },
    ],
  },
  {
    module: "users",
    label: "Users",
    permissions: [
      { key: "users.view", action: "view", description: "View users list and profiles" },
      { key: "users.create", action: "create", description: "Create new user accounts" },
      { key: "users.edit", action: "edit", description: "Edit user details and status" },
      { key: "users.delete", action: "delete", description: "Delete or deactivate users" },
    ],
  },
  {
    module: "jobs",
    label: "Jobs",
    permissions: [
      { key: "jobs.view", action: "view", description: "View jobs list and details" },
      { key: "jobs.create", action: "create", description: "Post new jobs" },
      { key: "jobs.edit", action: "edit", description: "Edit job postings" },
      { key: "jobs.delete", action: "delete", description: "Delete job postings" },
      { key: "jobs.publish", action: "publish", description: "Publish or unpublish jobs" },
      { key: "jobs.moderate", action: "moderate", description: "Approve, reject, or feature jobs" },
    ],
  },
  {
    module: "applications",
    label: "Applications",
    permissions: [
      { key: "applications.view", action: "view", description: "View job applications" },
      { key: "applications.manage", action: "manage", description: "Manage application processes" },
      { key: "applications.update_status", action: "update_status", description: "Update application statuses" },
    ],
  },
  {
    module: "community",
    label: "Community",
    permissions: [
      { key: "community.view", action: "view", description: "View community posts and comments" },
      { key: "community.create", action: "create", description: "Create community posts" },
      { key: "community.edit", action: "edit", description: "Edit community posts" },
      { key: "community.delete", action: "delete", description: "Delete posts or comments" },
      { key: "community.moderate", action: "moderate", description: "Moderate community content and reports" },
      { key: "community.manage_reports", action: "manage_reports", description: "Manage flagged content" },
    ],
  },
  {
    module: "blogs",
    label: "Blogs",
    permissions: [
      { key: "blogs.view", action: "view", description: "View blog articles" },
      { key: "blogs.create", action: "create", description: "Create blog articles" },
      { key: "blogs.edit", action: "edit", description: "Edit blog articles" },
      { key: "blogs.delete", action: "delete", description: "Delete blog articles" },
      { key: "blogs.publish", action: "publish", description: "Publish or unpublish blogs" },
      { key: "blogs.moderate", action: "moderate", description: "Moderate all blog posts" },
    ],
  },
  {
    module: "cms",
    label: "CMS",
    permissions: [
      { key: "cms.view", action: "view", description: "View CMS content and pages" },
      { key: "cms.create", action: "create", description: "Create CMS pages and content" },
      { key: "cms.edit", action: "edit", description: "Edit CMS pages, homepage, and microcopy" },
      { key: "cms.delete", action: "delete", description: "Delete CMS content" },
      { key: "cms.publish", action: "publish", description: "Publish CMS pages and homepage" },
    ],
  },
  {
    module: "policies",
    label: "Legal / Policies",
    permissions: [
      { key: "policies.view", action: "view", description: "View legal policies" },
      { key: "policies.create", action: "create", description: "Create new legal policies" },
      { key: "policies.edit", action: "edit", description: "Edit policy content" },
      { key: "policies.delete", action: "delete", description: "Delete legal policies" },
      { key: "policies.publish", action: "publish", description: "Publish or unpublish policies" },
      { key: "policies.restore_versions", action: "restore_versions", description: "Restore prior policy revisions" },
    ],
  },
  {
    module: "resume_templates",
    label: "Resume Templates",
    permissions: [
      { key: "resume_templates.view", action: "view", description: "View resume templates" },
      { key: "resume_templates.create", action: "create", description: "Create resume templates" },
      { key: "resume_templates.edit", action: "edit", description: "Edit resume templates" },
      { key: "resume_templates.delete", action: "delete", description: "Delete resume templates" },
      { key: "resume_templates.publish", action: "publish", description: "Publish resume templates" },
    ],
  },
  {
    module: "notifications",
    label: "Notifications",
    permissions: [
      { key: "notifications.view", action: "view", description: "View notifications and alerts" },
      { key: "notifications.manage", action: "manage", description: "Manage notifications and send broadcasts" },
    ],
  },
  {
    module: "email",
    label: "Email",
    permissions: [
      { key: "email.view", action: "view", description: "View email delivery logs" },
      { key: "email.manage", action: "manage", description: "Manage email configurations" },
      { key: "email.retry", action: "retry", description: "Retry failed transactional emails" },
    ],
  },
  {
    module: "interviews",
    label: "Interviews",
    permissions: [
      { key: "interviews.view", action: "view", description: "View interview schedules" },
      { key: "interviews.manage", action: "manage", description: "Manage interviews and video calls" },
    ],
  },
  {
    module: "assessments",
    label: "Assessments",
    permissions: [
      { key: "assessments.view", action: "view", description: "View assessments and scores" },
      { key: "assessments.manage", action: "manage", description: "Manage assessment questions and tests" },
    ],
  },
  {
    module: "analytics",
    label: "Analytics",
    permissions: [
      { key: "analytics.view", action: "view", description: "View analytics and reports" },
    ],
  },
  {
    module: "support",
    label: "Support",
    permissions: [
      { key: "support.view", action: "view", description: "View support tickets" },
      { key: "support.manage", action: "manage", description: "Resolve and manage support tickets" },
    ],
  },
  {
    module: "security",
    label: "Security",
    permissions: [
      { key: "security.view", action: "view", description: "View security events and locked accounts" },
      { key: "security.manage", action: "manage", description: "Unlock accounts and manage security settings" },
    ],
  },
  {
    module: "audit_logs",
    label: "Audit Logs",
    permissions: [
      { key: "audit_logs.view", action: "view", description: "View system audit trail" },
    ],
  },
  {
    module: "settings",
    label: "Settings",
    permissions: [
      { key: "settings.view", action: "view", description: "View platform settings" },
      { key: "settings.manage", action: "manage", description: "Modify system settings" },
    ],
  },
  {
    module: "roles",
    label: "Roles & Permissions",
    permissions: [
      { key: "roles.view", action: "view", description: "View roles and permissions" },
      { key: "roles.create", action: "create", description: "Create custom roles" },
      { key: "roles.edit", action: "edit", description: "Edit roles and permission assignments" },
      { key: "roles.delete", action: "delete", description: "Delete custom roles" },
      { key: "permissions.manage", action: "manage", description: "Manage permission matrix" },
    ],
  },
];

// Flat list of all permission keys
const ALL_PERMISSION_KEYS = PERMISSION_MODULES.flatMap((m) =>
  m.permissions.map((p) => p.key)
);

// Standard default role configurations
const DEFAULT_SYSTEM_ROLES = [
  {
    name: "superadmin",
    displayName: "Super Admin",
    description: "Has unrestricted full access to every module, setting, and security control.",
    isSystem: true,
    status: "active",
    permissions: ALL_PERMISSION_KEYS,
  },
  {
    name: "admin",
    displayName: "Admin",
    description: "Standard platform administration across users, jobs, applications, and content.",
    isSystem: true,
    status: "active",
    permissions: [
      "dashboard.view",
      "users.view",
      "users.create",
      "users.edit",
      "jobs.view",
      "jobs.create",
      "jobs.edit",
      "jobs.moderate",
      "applications.view",
      "applications.manage",
      "applications.update_status",
      "community.view",
      "community.moderate",
      "community.manage_reports",
      "blogs.view",
      "blogs.create",
      "blogs.edit",
      "blogs.publish",
      "blogs.moderate",
      "cms.view",
      "cms.create",
      "cms.edit",
      "cms.publish",
      "policies.view",
      "policies.create",
      "policies.edit",
      "policies.publish",
      "resume_templates.view",
      "notifications.view",
      "notifications.manage",
      "email.view",
      "analytics.view",
      "support.view",
      "support.manage",
    ],
  },
  {
    name: "content-manager",
    displayName: "Content Manager",
    description: "Manages blogs, CMS pages, website copy, and legal policies without access to user data or security.",
    isSystem: true,
    status: "active",
    permissions: [
      "dashboard.view",
      "blogs.view",
      "blogs.create",
      "blogs.edit",
      "blogs.publish",
      "cms.view",
      "cms.create",
      "cms.edit",
      "cms.publish",
      "policies.view",
      "policies.create",
      "policies.edit",
      "policies.publish",
      "policies.restore_versions",
      "resume_templates.view",
    ],
  },
  {
    name: "moderator",
    displayName: "Moderator",
    description: "Reviews community discussions, flagged content, user reports, and blog posts.",
    isSystem: true,
    status: "active",
    permissions: [
      "dashboard.view",
      "community.view",
      "community.moderate",
      "community.manage_reports",
      "community.delete",
      "jobs.view",
      "jobs.moderate",
      "blogs.view",
      "blogs.moderate",
    ],
  },
  {
    name: "support",
    displayName: "Support Agent",
    description: "Handles user support tickets, view-only customer profiles, and application logs.",
    isSystem: true,
    status: "active",
    permissions: [
      "dashboard.view",
      "support.view",
      "support.manage",
      "users.view",
      "applications.view",
    ],
  },
  {
    name: "recruiter",
    displayName: "Recruiter",
    description: "Creates and manages job postings, reviews candidate applications, and schedules interviews.",
    isSystem: true,
    status: "active",
    permissions: [
      "dashboard.view",
      "jobs.view",
      "jobs.create",
      "jobs.edit",
      "applications.view",
      "applications.manage",
      "applications.update_status",
      "interviews.view",
      "interviews.manage",
    ],
  },
];

/**
 * Initializes and syncs permissions and default roles in MongoDB.
 * Safe to run multiple times (idempotent upsert).
 */
async function initializeRbac() {
  try {
    // 1. Upsert all permissions
    for (const group of PERMISSION_MODULES) {
      for (const p of group.permissions) {
        await Permission.updateOne(
          { key: p.key },
          {
            $set: {
              key: p.key,
              module: group.module,
              action: p.action,
              description: p.description,
            },
          },
          { upsert: true }
        );
      }
    }

    // 2. Upsert default system roles
    for (const r of DEFAULT_SYSTEM_ROLES) {
      const existing = await Role.findOne({ name: r.name });
      if (!existing) {
        await Role.create(r);
      } else if (r.name === "superadmin") {
        // Guarantee superadmin always retains all permissions
        existing.permissions = ALL_PERMISSION_KEYS;
        existing.isSystem = true;
        await existing.save();
      }
    }
  } catch (err) {
    console.error("RBAC initialization warning:", err.message);
  }
}

module.exports = {
  PERMISSION_MODULES,
  ALL_PERMISSION_KEYS,
  DEFAULT_SYSTEM_ROLES,
  initializeRbac,
};
