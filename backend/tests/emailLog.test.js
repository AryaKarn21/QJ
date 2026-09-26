jest.mock("../models/EmailLog");
jest.mock("../utils/sendMail", () => {
  const sendMail = jest.fn();
  sendMail.retryFailedEmail = jest.fn();
  return sendMail;
});

const EmailLog = require("../models/EmailLog");
const { retryFailedEmail } = require("../utils/sendMail");
const { getEmailLogs, retryEmailLog } = require("../controllers/emailLogController");

function mockRes() {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("emailLogController — retryEmailLog", () => {
  it("retries a failed email log successfully", async () => {
    retryFailedEmail.mockResolvedValue({ messageId: "retry-1" });

    const req = { params: { id: "log1" } };
    const res = mockRes();

    await retryEmailLog(req, res);

    expect(retryFailedEmail).toHaveBeenCalledWith("log1");
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it("returns 404 when the email log doesn't exist", async () => {
    const err = new Error("Email log not found");
    err.code = "EMAIL_LOG_NOT_FOUND";
    retryFailedEmail.mockRejectedValue(err);

    const req = { params: { id: "missing" } };
    const res = mockRes();

    await retryEmailLog(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("returns 409 when the email log isn't currently in a failed state (idempotency guard)", async () => {
    const err = new Error("Email is not in a failed state (current status: sent)");
    err.code = "EMAIL_NOT_FAILED";
    retryFailedEmail.mockRejectedValue(err);

    const req = { params: { id: "log1" } };
    const res = mockRes();

    await retryEmailLog(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
  });
});

describe("emailLogController — getEmailLogs", () => {
  it("paginates and applies status/type/search filters", async () => {
    EmailLog.find.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([{ recipientEmail: "a@example.com", status: "failed" }]),
    });
    EmailLog.countDocuments.mockResolvedValue(1);

    const req = { query: { status: "failed", type: "interview_scheduled", page: "1", limit: "20" } };
    const res = mockRes();

    await getEmailLogs(req, res);

    expect(EmailLog.find).toHaveBeenCalledWith(expect.objectContaining({ status: "failed", type: "interview_scheduled" }));
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ totalLogs: 1, currentPage: 1 })
    );
  });
});
