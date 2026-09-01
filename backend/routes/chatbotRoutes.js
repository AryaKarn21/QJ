const express = require("express");
const router = express.Router();
const { chatbotLimiter } = require("../middleware/rateLimiters");
const { ask, getSuggestions } = require("../controllers/chatbotController");

// Deliberately no `authenticate` — the help assistant must work for
// logged-out visitors too (e.g. someone deciding whether to sign up).
// chatbotLimiter guards against abuse in place of an auth wall.
router.post("/ask", chatbotLimiter, ask);
router.get("/suggestions", getSuggestions);

module.exports = router;
