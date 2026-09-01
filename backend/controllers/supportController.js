const jwt = require("jsonwebtoken");
const SupportTicket = require("../models/SupportTicket");
const Notification = require("../models/Notification");
const User = require("../models/User");

// Best-effort: if a valid Bearer token is present, attach the user.
// This endpoint is intentionally public (no `authenticate` middleware)
// so people can contact support before creating an account — but we
// still link the ticket to their account if they happen to be logged in.
const tryGetUserFromToken = async (req) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;

  try {
    const decoded = jwt.verify(authHeader.split(" ")[1], process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("name email");
    return user || null;
  } catch {
    return null; // invalid/expired token — fall back to guest submission
  }
};

// Create a ticket — works for both guests and logged-in users
const createTicket = async (req, res) => {
  const { name, email, subject, message, category } = req.body;

  const loggedInUser = await tryGetUserFromToken(req);

  const finalName = loggedInUser?.name || name;
  const finalEmail = loggedInUser?.email || email;

  if (!finalName || !finalEmail || !subject || !message) {
    return res.status(400).json({
      message: "Name, email, subject, and message are all required.",
    });
  }

  try {
    const ticket = await SupportTicket.create({
      user: loggedInUser?._id,
      name: finalName,
      email: finalEmail,
      subject,
      message,
      category: category || "general",
    });

    res.status(201).json({
      message: "Your ticket has been submitted. We'll get back to you soon.",
      ticket,
    });
  } catch (error) {
    console.error("Error creating support ticket:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get the logged-in user's own tickets
const getMyTickets = async (req, res) => {
  try {
    const tickets = await SupportTicket.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json(tickets);
  } catch (error) {
    console.error("Error fetching my tickets:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Admin: list all tickets, paginated + filterable by status/category
const getAllTickets = async (req, res) => {
  const { page = 1, limit = 15, status, category, search } = req.query;

  try {
    const filter = {};
    if (status && status !== "all") filter.status = status;
    if (category && category !== "all") filter.category = category;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { subject: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [tickets, total] = await Promise.all([
      SupportTicket.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      SupportTicket.countDocuments(filter),
    ]);

    res.json({
      tickets,
      total,
      page: Number(page),
      totalPages: Math.max(1, Math.ceil(total / Number(limit))),
    });
  } catch (error) {
    console.error("Error fetching tickets:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Admin: reply to a ticket — sets adminReply, marks resolved, notifies the user if they have an account
const replyToTicket = async (req, res) => {
  const { id } = req.params;
  const { reply } = req.body;

  if (!reply || !reply.trim()) {
    return res.status(400).json({ message: "Reply message is required." });
  }

  try {
    const ticket = await SupportTicket.findById(id);
    if (!ticket) return res.status(404).json({ message: "Ticket not found." });

    ticket.adminReply = reply;
    ticket.repliedBy = req.user._id;
    ticket.repliedAt = new Date();
    ticket.status = "resolved";
    await ticket.save();

    if (ticket.user) {
      await Notification.create({
        recipient: ticket.user,
        type: "support_ticket_reply",
        message: `Support replied to your ticket "${ticket.subject}".`,
        relatedTicket: ticket._id,
        // Only a jobseeker-facing ticket page exists today (/user/support)
        // — an employer who filed a ticket has nowhere in-app to view the
        // reply yet, so this is a known partial fix, not a full one.
        link: "/user/support",
      });
    }

    res.json({ message: "Reply sent.", ticket });
  } catch (error) {
    console.error("Error replying to ticket:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Admin: update ticket status only (e.g. mark in_progress or closed without a reply)
const updateTicketStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const allowedStatuses = ["open", "in_progress", "resolved", "closed"];
  if (!allowedStatuses.includes(status)) {
    return res.status(400).json({ message: "Invalid status value." });
  }

  try {
    const ticket = await SupportTicket.findByIdAndUpdate(id, { status }, { new: true });
    if (!ticket) return res.status(404).json({ message: "Ticket not found." });
    res.json({ message: "Status updated.", ticket });
  } catch (error) {
    console.error("Error updating ticket status:", error);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  createTicket,
  getMyTickets,
  getAllTickets,
  replyToTicket,
  updateTicketStatus,
};