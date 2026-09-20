jest.mock("../models/Job");
jest.mock("../models/Application");
jest.mock("../models/User");

const Application = require("../models/Application");
const { getAppliedJobs } = require("../controllers/jobseekerController");

function mockRes() {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("jobseekerController.getAppliedJobs", () => {
  it("safely handles applications where job was deleted (null job) without throwing 500", async () => {
    const fakeJob = {
      _id: "job1",
      title: "Frontend Developer",
      location: "Kathmandu",
      jobtype: "Full-time",
      toObject: () => ({
        _id: "job1",
        title: "Frontend Developer",
        location: "Kathmandu",
        jobtype: "Full-time",
      }),
    };

    const applications = [
      {
        _id: "app1",
        job: fakeJob,
        status: "Pending",
        createdAt: new Date("2026-02-01"),
      },
      {
        _id: "app2",
        job: null, // Job was deleted!
        status: "Reviewed",
        createdAt: new Date("2026-01-15"),
      },
    ];

    const chain = {
      populate: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      sort: jest.fn().mockResolvedValue(applications),
    };

    Application.find.mockReturnValue(chain);
    Application.deleteMany = jest.fn().mockReturnValue(Promise.resolve({ deletedCount: 1 }));

    const req = { user: { _id: "jobseeker123" } };
    const res = mockRes();

    await getAppliedJobs(req, res);

    expect(res.status).not.toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          _id: "job1",
          title: "Frontend Developer",
          applicationId: "app1",
          applicationStatus: "Pending",
        }),
      ])
    );

    // Orphaned application app2 should have been triggered for deletion
    expect(Application.deleteMany).toHaveBeenCalledWith({
      _id: { $in: ["app2"] },
    });
  });
});
