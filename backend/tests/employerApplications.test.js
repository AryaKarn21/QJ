// Unit tests for employerController.getAllApplicantsForEmployer — the
// Applications module's list endpoint (GET /api/employer/my-jobs/applications).
//
// Covers the two behavior changes made alongside the Applications module
// redesign:
//  1. An employer with zero jobs now gets 200 + an empty list, not a 404
//     (a 404 here was being treated as a real error by nothing in
//     particular, but is objectively wrong: "no applications yet" is a
//     normal state, not a failure — same convention getEmployerJobs
//     already documents for itself).
//  2. The response is now a flat `applications` array (not grouped by
//     job) with a `statusCounts` summary, replacing the old nested
//     job->applicants shape that had exactly one consumer.
jest.mock("../models/Job");
jest.mock("../models/Application");
jest.mock("../models/User");

const Job = require("../models/Job");
const Application = require("../models/Application");

const { getAllApplicantsForEmployer } = require("../controllers/employerController");

function mockRes() {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("getAllApplicantsForEmployer", () => {
  it("returns 200 with an empty list when the employer has no jobs (not 404)", async () => {
    Job.find.mockReturnValue({ select: jest.fn().mockResolvedValue([]) });
    const req = { user: { id: "employer1" }, query: {} };
    const res = mockRes();

    await getAllApplicantsForEmployer(req, res);

    expect(res.status).not.toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        applications: [],
        totalApplications: 0,
        totalPages: 0,
      })
    );
  });

  it("returns a flat applications array with statusCounts when the employer has jobs", async () => {
    Job.find.mockReturnValue({
      select: jest.fn().mockResolvedValue([{ _id: "job1", title: "QA Engineer" }]),
    });

    const fakeApplication = {
      _id: "app1",
      applicant: { _id: "u1", name: "Jane Doe" },
      job: { _id: "job1", title: "QA Engineer" },
      coverLetter: "I would love this role.",
      resume: "https://res.cloudinary.com/demo/raw/upload/v1/qj/resumes/u1/abc.pdf",
      howDidYouHear: "LinkedIn",
      status: "Pending",
      interview: undefined,
      createdAt: new Date("2026-01-01"),
    };

    const chain = {
      populate: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue([fakeApplication]),
    };
    Application.find.mockReturnValue(chain);
    Application.countDocuments.mockResolvedValue(1);
    Application.aggregate.mockResolvedValue([{ _id: "Pending", count: 1 }]);

    const req = { user: { id: "employer1" }, query: {} };
    const res = mockRes();

    await getAllApplicantsForEmployer(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        applications: [
          expect.objectContaining({
            applicationId: "app1",
            resume: fakeApplication.resume,
            status: "Pending",
          }),
        ],
        totalApplications: 1,
        statusCounts: expect.objectContaining({ Pending: 1, Reviewed: 0, Accepted: 0, Rejected: 0 }),
      })
    );
  });
});
