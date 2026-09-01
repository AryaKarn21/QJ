const express = require("express");
const router = express.Router({ mergeParams: true });
const { authenticate, authorizeRoles } = require("../middleware/authMiddleware");
const {
  getEmployees,
  getEmployeeCount,
  getEmployee,
  addEmployee,
  updateEmployee,
  removeEmployee,
  searchUsersToAdd,
} = require("../controllers/companyMemberController");

// ── Public endpoints ──────────────────────────────────────────────────────────

// GET /api/companies/:companyId/employees/count
// IMPORTANT: "count" and "search-users" must be registered BEFORE "/:memberId"
// or Express will treat them as a memberId param value.
router.get("/count", getEmployeeCount);

// GET /api/companies/:companyId/employees
router.get("/", getEmployees);

// ── Employer-only endpoints ───────────────────────────────────────────────────

// GET /api/companies/:companyId/employees/search-users?q=...
router.get(
  "/search-users",
  authenticate,
  authorizeRoles("employer"),
  searchUsersToAdd
);

// POST /api/companies/:companyId/employees
router.post("/", authenticate, authorizeRoles("employer"), addEmployee);

// PUT /api/companies/:companyId/employees/:memberId
router.put("/:memberId", authenticate, authorizeRoles("employer"), updateEmployee);

// DELETE /api/companies/:companyId/employees/:memberId
router.delete("/:memberId", authenticate, authorizeRoles("employer"), removeEmployee);

// GET /api/companies/:companyId/employees/:memberId  (must be last)
router.get("/:memberId", getEmployee);

module.exports = router;