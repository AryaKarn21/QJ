// Re-exports all functions from the centralized emailService so existing
// references across controllers, models, crons, and test suites continue
// to work seamlessly without breakage.
const emailService = require("./emailService");

module.exports = emailService;
