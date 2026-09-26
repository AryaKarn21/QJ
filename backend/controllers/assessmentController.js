const crypto = require("crypto");
const Assessment = require("../models/Assessment");
const AssessmentAttempt = require("../models/AssessmentAttempt");
const Application = require("../models/Application");
const Job = require("../models/Job");
const sendNotification = require("../utils/sendNotifications");
const { sendAssessmentRequestEmail } = require("../services/interviewEmailService");

const FRONTEND_URL = (process.env.FRONTEND_URL || "http://localhost:5173").replace(/\/$/, "");

/**
 * Verifies the requesting employer owns the job an assessment (or
 * assessment-to-be) belongs to — same populate-and-compare shape
 * employerController.js's updateApplication uses for application
 * ownership, applied here to job ownership.
 */
const assertEmployerOwnsJob = async (jobId, employerId) => {
  const job = await Job.findById(jobId).select("employer title");
  if (!job) {
    const err = new Error("Job not found");
    err.status = 404;
    throw err;
  }
  if (String(job.employer) !== String(employerId)) {
    const err = new Error("Not authorized to manage this job's assessments");
    err.status = 403;
    throw err;
  }
  return job;
};

/** Strips grading-only fields so a candidate response never leaks answers. */
const toCandidateSafeAssessment = (assessment) => ({
  _id: assessment._id,
  title: assessment.title,
  description: assessment.description,
  instructions: assessment.instructions,
  duration: assessment.duration,
  passingScore: assessment.passingScore,
  maxAttempts: assessment.maxAttempts,
  questions: assessment.questions.map((q) => ({
    _id: q._id,
    type: q.type,
    questionText: q.questionText,
    options: q.options,
    codingLanguage: q.codingLanguage,
    points: q.points,
  })),
});

// ============================================================
// POST /api/assessments — employer creates a reusable assessment
// definition for one of their own jobs.
// ============================================================
const createAssessment = async (req, res) => {
  try {
    const { jobId, title, description, instructions, questions, duration, startDate, deadline, passingScore, maxAttempts } = req.body;

    if (!jobId || !title || !Array.isArray(questions) || questions.length === 0 || !duration || !deadline) {
      return res.status(400).json({ message: "jobId, title, at least one question, duration, and deadline are required" });
    }

    await assertEmployerOwnsJob(jobId, req.user.id);

    for (const q of questions) {
      if (!q.type || !q.questionText) {
        return res.status(400).json({ message: "Every question needs a type and questionText" });
      }
      if (["mcq", "multiple_select"].includes(q.type)) {
        if (!Array.isArray(q.options) || q.options.length < 2) {
          return res.status(400).json({ message: `Question "${q.questionText}" needs at least 2 options` });
        }
        const correctIndexes = q.correctOptionIndexes;
        if (
          !Array.isArray(correctIndexes) ||
          correctIndexes.length === 0 ||
          !correctIndexes.every((i) => Number.isInteger(i) && i >= 0 && i < q.options.length)
        ) {
          return res.status(400).json({
            message: `Question "${q.questionText}" needs at least one valid correct option marked`,
          });
        }
      }
    }

    const assessment = await Assessment.create({
      job: jobId,
      employer: req.user.id,
      title,
      description,
      instructions,
      questions,
      duration,
      startDate,
      deadline,
      passingScore,
      maxAttempts,
    });

    res.status(201).json(assessment);
  } catch (error) {
    console.error("Error creating assessment:", error);
    res.status(error.status || 500).json({ message: error.status ? error.message : "Server error" });
  }
};

// ============================================================
// GET /api/assessments/:id — employer-only full view (with grading key),
// for editing/reviewing. Ownership enforced via the assessment's own
// `employer` field — no need to re-walk through Job.
// ============================================================
const getAssessmentById = async (req, res) => {
  try {
    const assessment = await Assessment.findById(req.params.id);
    if (!assessment) return res.status(404).json({ message: "Assessment not found" });
    if (String(assessment.employer) !== String(req.user.id)) {
      return res.status(403).json({ message: "Not authorized to view this assessment" });
    }
    res.json(assessment);
  } catch (error) {
    console.error("Error fetching assessment:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ============================================================
// GET /api/assessments?jobId=&isActive=... — employer lists their
// assessments, optionally scoped to one job (so an existing assessment
// can be reused across candidates instead of recreated every time) and/or
// filtered by isActive.
// ============================================================
const listAssessments = async (req, res) => {
  try {
    const filter = { employer: req.user.id };
    if (req.query.jobId) filter.job = req.query.jobId;
    if (req.query.isActive === "true") filter.isActive = true;
    if (req.query.isActive === "false") filter.isActive = false;
    const assessments = await Assessment.find(filter).sort({ createdAt: -1 }).select("-questions.correctOptionIndexes");
    res.json(assessments);
  } catch (error) {
    console.error("Error listing assessments:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ============================================================
// Abandoned-attempt recovery: if a candidate started an attempt and never
// submitted, `application.assessment.status` would otherwise stay stuck
// at "in_progress" forever, blocking any future startAttempt call. Run on
// every read (cheap) — if the attempt has clearly run out its clock
// (duration elapsed) or the assignment's deadline has passed, auto-close
// it as "submitted" (unanswered/incomplete) so a fresh attempt can start
// if attempts remain.
// ============================================================
const expireStaleAttemptIfNeeded = async (application, assessment) => {
  if (application.assessment?.status !== "in_progress") return;

  const attempt = await AssessmentAttempt.findOne({
    application: application._id,
    assessment: assessment._id,
    status: "in_progress",
  }).sort({ attemptNumber: -1 });
  if (!attempt) {
    // No in-progress attempt actually exists — state drifted somehow;
    // reset so the candidate isn't stuck.
    application.assessment.status = "assigned";
    await application.save();
    return;
  }

  const now = new Date();
  const durationDeadline = new Date(attempt.startedAt.getTime() + (assessment.duration || 0) * 60000);
  const pastDeadline = application.assessment.deadline && now > new Date(application.assessment.deadline);
  const pastDuration = now > durationDeadline;

  if (pastDeadline || pastDuration) {
    attempt.status = "submitted";
    attempt.submittedAt = now;
    attempt.timeTakenSeconds = Math.max(0, Math.round((now - attempt.startedAt) / 1000));
    attempt.autoEvaluated = false;
    await attempt.save();

    application.assessment.status = "submitted";
    await application.save();
  }
};

// ============================================================
// POST /api/assessments/:id/assign — employer assigns an assessment to a
// specific candidate's application. Generates the secure access token,
// updates Application.assessment + status + statusHistory, and sends the
// in-app notification + email with the secure link.
// ============================================================
const assignAssessment = async (req, res) => {
  try {
    const { applicationId, deadline, customMessage } = req.body;
    if (!applicationId) return res.status(400).json({ message: "applicationId is required" });

    const assessment = await Assessment.findById(req.params.id);
    if (!assessment) return res.status(404).json({ message: "Assessment not found" });
    if (String(assessment.employer) !== String(req.user.id)) {
      return res.status(403).json({ message: "Not authorized to assign this assessment" });
    }
    if (assessment.isActive === false) {
      return res.status(400).json({ message: "This assessment is inactive and cannot be assigned" });
    }

    const application = await Application.findById(applicationId)
      .populate({ path: "job", populate: { path: "employer", select: "name" } })
      .populate("applicant", "name email");
    if (!application) return res.status(404).json({ message: "Application not found" });

    const jobEmployerId = application.job?.employer?._id?.toString() || application.job?.employer?.toString();
    if (jobEmployerId !== req.user.id) {
      return res.status(403).json({ message: "Not authorized to assign an assessment for this application" });
    }
    if (String(application.job._id) !== String(assessment.job)) {
      return res.status(400).json({ message: "This assessment was not created for this application's job" });
    }

    const accessToken = crypto.randomBytes(24).toString("hex");
    const effectiveDeadline = deadline ? new Date(deadline) : assessment.deadline;

    application.assessment = {
      assessment: assessment._id,
      accessToken,
      assignedAt: new Date(),
      deadline: effectiveDeadline,
      status: "assigned",
      attemptsUsed: 0,
      emailStatus: "pending",
    };
    application.status = "Assessment Assigned";
    application.statusHistory.push({
      status: "Assessment Assigned",
      changedBy: req.user.id,
      note: customMessage || "",
    });
    await application.save();

    const companyName = application.job.employer?.name || "the employer";
    const assessmentLink = `${FRONTEND_URL}/assessment/${application._id}/${accessToken}`;

    await sendNotification({
      recipient: application.applicant._id,
      type: "assessment_assigned",
      message: `You've been invited to complete a technical assessment for "${application.job.title}"`,
      relatedJob: application.job._id,
      relatedApplication: application._id,
      link: `/assessment/${application._id}/${accessToken}`,
    });

    let emailResult = { success: false };
    if (application.applicant?.email) {
      emailResult = await sendAssessmentRequestEmail({
        recipient: application.applicant.email,
        candidateName: application.applicant.name || "Candidate",
        companyName,
        jobTitle: application.job.title,
        assessmentLink,
        assessmentDeadline: effectiveDeadline ? effectiveDeadline.toDateString() : "",
        customMessage: customMessage || "",
        applicationId: application._id,
      });
    }

    application.assessment.emailStatus = emailResult.success ? "sent" : "failed";
    application.assessment.emailSentAt = emailResult.success ? new Date() : undefined;
    application.assessment.emailError = emailResult.success ? "" : emailResult.error || "No candidate email on file";
    await application.save();

    res.status(201).json({
      message: "Assessment assigned",
      emailSent: emailResult.success,
      application,
    });
  } catch (error) {
    console.error("Error assigning assessment:", error);
    res.status(error.status || 500).json({ message: error.status ? error.message : "Server error" });
  }
};

/**
 * Shared access check for every candidate-facing assessment route — the
 * "secure token or authenticated route" requirement from the spec is
 * implemented as BOTH: the candidate must be logged in as the actual
 * applicant on this application AND present the token that was emailed to
 * them. Neither alone is sufficient (a leaked token still can't be used by
 * someone else's account; a logged-in candidate still can't guess their
 * way into another candidate's assessment without the token).
 */
const verifyCandidateAccess = async (applicationId, token, userId) => {
  const application = await Application.findById(applicationId).select("+assessment.accessToken");
  if (!application) {
    const err = new Error("Application not found");
    err.status = 404;
    throw err;
  }
  if (String(application.applicant) !== String(userId)) {
    const err = new Error("Not authorized to access this assessment");
    err.status = 403;
    throw err;
  }
  if (!application.assessment?.assessment || application.assessment.accessToken !== token) {
    const err = new Error("Invalid or expired assessment link");
    err.status = 404;
    throw err;
  }
  return application;
};

// ============================================================
// GET /api/assessments/access/:applicationId/:token — candidate loads the
// assessment (questions only, no grading key) plus their attempt state.
// ============================================================
const getAssessmentForCandidate = async (req, res) => {
  try {
    const { applicationId, token } = req.params;
    const application = await verifyCandidateAccess(applicationId, token, req.user.id);

    const assessment = await Assessment.findById(application.assessment.assessment);
    if (!assessment) return res.status(404).json({ message: "Assessment not found" });

    await expireStaleAttemptIfNeeded(application, assessment);

    const now = new Date();
    const expired = application.assessment.deadline && now > new Date(application.assessment.deadline);
    const notYetOpen = Boolean(assessment.startDate && now < new Date(assessment.startDate));
    const attemptsRemaining = Math.max(0, assessment.maxAttempts - application.assessment.attemptsUsed);

    res.json({
      assessment: toCandidateSafeAssessment(assessment),
      assignment: {
        status: application.assessment.status,
        deadline: application.assessment.deadline,
        attemptsUsed: application.assessment.attemptsUsed,
        attemptsRemaining,
        expired,
        notYetOpen,
        latestScore: application.assessment.latestScore,
        latestPassed: application.assessment.latestPassed,
      },
      canStart: !expired && !notYetOpen && attemptsRemaining > 0 && application.assessment.status !== "in_progress",
    });
  } catch (error) {
    console.error("Error loading assessment for candidate:", error);
    res.status(error.status || 500).json({ message: error.status ? error.message : "Server error" });
  }
};

// ============================================================
// POST /api/assessments/access/:applicationId/:token/start — candidate
// starts a new attempt (needed as a distinct step so `duration` can be
// timed from a real startedAt, not from whenever they first opened the
// link).
// ============================================================
const startAttempt = async (req, res) => {
  try {
    const { applicationId, token } = req.params;
    const application = await verifyCandidateAccess(applicationId, token, req.user.id);

    const assessment = await Assessment.findById(application.assessment.assessment);
    if (!assessment) return res.status(404).json({ message: "Assessment not found" });

    const now = new Date();
    if (assessment.startDate && now < new Date(assessment.startDate)) {
      return res.status(400).json({ message: "This assessment is not open yet" });
    }
    if (application.assessment.deadline && now > new Date(application.assessment.deadline)) {
      return res.status(400).json({ message: "The deadline to start this assessment has passed" });
    }
    if (application.assessment.attemptsUsed >= assessment.maxAttempts) {
      return res.status(400).json({ message: "No attempts remaining for this assessment" });
    }
    if (application.assessment.status === "in_progress") {
      return res.status(400).json({ message: "An attempt is already in progress" });
    }

    const attemptNumber = application.assessment.attemptsUsed + 1;
    const attempt = await AssessmentAttempt.create({
      assessment: assessment._id,
      application: application._id,
      candidate: req.user.id,
      attemptNumber,
      status: "in_progress",
      maxScore: assessment.getMaxScore(),
      startedAt: now,
    });

    application.assessment.status = "in_progress";
    application.assessment.attemptsUsed = attemptNumber;
    await application.save();

    res.status(201).json({ attemptId: attempt._id, startedAt: attempt.startedAt, durationMinutes: assessment.duration });
  } catch (error) {
    console.error("Error starting assessment attempt:", error);
    res.status(error.status || 500).json({ message: error.status ? error.message : "Server error" });
  }
};

// ============================================================
// POST /api/assessments/:id/submit — candidate submits answers for their
// in-progress attempt. Body: { applicationId, token, attemptId, answers }.
// Auto-grades mcq/multiple_select; anything else is left for the employer
// to grade manually via gradeAttempt.
// ============================================================
const submitAssessment = async (req, res) => {
  try {
    const { applicationId, token, attemptId, answers } = req.body;
    if (!applicationId || !token || !attemptId || !Array.isArray(answers)) {
      return res.status(400).json({ message: "applicationId, token, attemptId, and answers are required" });
    }

    const application = await verifyCandidateAccess(applicationId, token, req.user.id);
    const assessment = await Assessment.findById(req.params.id);
    if (!assessment) return res.status(404).json({ message: "Assessment not found" });
    if (String(assessment._id) !== String(application.assessment.assessment)) {
      return res.status(400).json({ message: "This assessment is not the one assigned to this application" });
    }

    const attempt = await AssessmentAttempt.findById(attemptId);
    if (!attempt || String(attempt.application) !== String(application._id)) {
      return res.status(404).json({ message: "Attempt not found" });
    }
    if (attempt.status !== "in_progress") {
      return res.status(400).json({ message: "This attempt has already been submitted" });
    }

    const questionsById = new Map(assessment.questions.map((q) => [String(q._id), q]));
    let score = 0;
    let needsManualGrading = false;

    const gradedAnswers = answers.map((a) => {
      const question = questionsById.get(String(a.question));
      const base = {
        question: a.question,
        selectedOptionIndexes: a.selectedOptionIndexes || [],
        textAnswer: a.textAnswer || "",
        fileUrl: a.fileUrl || "",
      };
      if (!question) return base;

      if (question.type === "mcq" || question.type === "multiple_select") {
        const correct = [...(question.correctOptionIndexes || [])].sort();
        const given = [...(base.selectedOptionIndexes || [])].sort();
        const isCorrect = correct.length === given.length && correct.every((v, i) => v === given[i]);
        base.pointsAwarded = isCorrect ? question.points : 0;
        score += base.pointsAwarded;
      } else {
        needsManualGrading = true;
      }
      return base;
    });

    const maxScore = assessment.getMaxScore();
    attempt.answers = gradedAnswers;
    attempt.submittedAt = new Date();
    attempt.timeTakenSeconds = Math.max(0, Math.round((attempt.submittedAt - attempt.startedAt) / 1000));
    attempt.maxScore = maxScore;
    attempt.autoEvaluated = !needsManualGrading;

    if (!needsManualGrading) {
      attempt.status = "evaluated";
      attempt.score = score;
      attempt.passed = maxScore > 0 ? score >= assessment.passingScore : true;
    } else {
      attempt.status = "submitted";
      attempt.score = score; // partial — auto-graded portion only, until manually completed
    }
    await attempt.save();

    application.assessment.status = attempt.status === "evaluated" ? "evaluated" : "submitted";
    application.assessment.latestScore = attempt.score;
    application.assessment.latestMaxScore = attempt.maxScore;
    application.assessment.latestPassed = attempt.passed;
    await application.save();

    // Notify the employer — the applicant is already populated by
    // verifyCandidateAccess's parent lookup chain only for the applicant
    // side, so re-fetch the job/employer here for the notification target.
    const job = await Job.findById(application.job).select("employer title");
    if (job?.employer) {
      await sendNotification({
        recipient: job.employer,
        type: "assessment_submitted",
        message: `A technical assessment was submitted for "${job.title}"`,
        relatedJob: job._id,
        relatedApplication: application._id,
        link: `/employer/jobs/${job._id}/applicants`,
      });
    }

    res.json({
      message: "Assessment submitted",
      status: attempt.status,
      score: attempt.score,
      maxScore: attempt.maxScore,
      passed: attempt.passed,
      needsManualGrading,
    });
  } catch (error) {
    console.error("Error submitting assessment:", error);
    res.status(error.status || 500).json({ message: error.status ? error.message : "Server error" });
  }
};

// ============================================================
// GET /api/assessments/:id/results/:applicationId — employer reviews
// every attempt (score, answers, submission, time taken, evaluation
// status) for one candidate's application.
// ============================================================
const getAssessmentResults = async (req, res) => {
  try {
    const { id, applicationId } = req.params;
    const assessment = await Assessment.findById(id);
    if (!assessment) return res.status(404).json({ message: "Assessment not found" });
    if (String(assessment.employer) !== String(req.user.id)) {
      return res.status(403).json({ message: "Not authorized to view these results" });
    }

    const attempts = await AssessmentAttempt.find({ assessment: id, application: applicationId })
      .populate("candidate", "name email")
      .sort({ attemptNumber: 1 });

    res.json({ assessment, attempts });
  } catch (error) {
    console.error("Error fetching assessment results:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ============================================================
// PATCH /api/assessments/attempts/:attemptId/grade — employer manually
// scores the non-auto-gradable questions (coding/short/long/file) in an
// attempt. Body: { grades: [{ question, pointsAwarded }] }.
// ============================================================
const gradeAttempt = async (req, res) => {
  try {
    const { grades } = req.body;
    if (!Array.isArray(grades)) return res.status(400).json({ message: "grades array is required" });

    const attempt = await AssessmentAttempt.findById(req.params.attemptId);
    if (!attempt) return res.status(404).json({ message: "Attempt not found" });

    const assessment = await Assessment.findById(attempt.assessment);
    if (!assessment) return res.status(404).json({ message: "Assessment not found" });
    if (String(assessment.employer) !== String(req.user.id)) {
      return res.status(403).json({ message: "Not authorized to grade this attempt" });
    }
    if (attempt.status === "in_progress") {
      return res.status(400).json({ message: "This attempt has not been submitted yet" });
    }

    const gradeByQuestion = new Map(grades.map((g) => [String(g.question), g.pointsAwarded]));
    attempt.answers = attempt.answers.map((a) => {
      if (gradeByQuestion.has(String(a.question))) {
        a.pointsAwarded = gradeByQuestion.get(String(a.question));
        a.gradedBy = req.user.id;
      }
      return a;
    });

    attempt.score = attempt.answers.reduce((sum, a) => sum + (a.pointsAwarded || 0), 0);
    attempt.status = "evaluated";
    attempt.passed = attempt.maxScore > 0 ? attempt.score >= assessment.passingScore : true;
    await attempt.save();

    const application = await Application.findById(attempt.application);
    if (application) {
      application.assessment.status = "evaluated";
      application.assessment.latestScore = attempt.score;
      application.assessment.latestPassed = attempt.passed;
      await application.save();
    }

    res.json({ message: "Attempt graded", attempt });
  } catch (error) {
    console.error("Error grading assessment attempt:", error);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  createAssessment,
  getAssessmentById,
  listAssessments,
  assignAssessment,
  getAssessmentForCandidate,
  startAttempt,
  submitAssessment,
  getAssessmentResults,
  gradeAttempt,
};
