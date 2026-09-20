// Unit tests for userController.registerUser (POST /api/users/register),
// specifically the behavior around a verification-email delivery failure.
//
// This used to delete the just-created account and return 500 whenever
// sendMail() threw — meaning a misconfigured/expired SMTP credential on
// the server made EVERY registration fail for EVERY user, with the
// account never actually existing afterward. The account must now
// survive an email failure so the client can still land on the
// OTP-verification screen and use the existing, independent "Resend OTP"
// retry path.
//
// Jobseeker/Employer are Mongoose discriminators of User
// (User.discriminator("jobseeker"/"employer", ...)) — automocking User
// would break `new Jobseeker(...)`/`new Employer(...)` since the
// discriminator machinery itself depends on the real User model. Instead
// the real models are required (schema registration only — no DB
// connection needed), and just the specific calls that would hit Mongo
// are spied on.
jest.mock("../utils/sendMail");
jest.mock("../utils/sendNotifications", () => ({ notifyAllAdmins: jest.fn().mockResolvedValue(undefined) }));
jest.mock("../utils/auditLogger", () => ({ recordAudit: jest.fn().mockResolvedValue(undefined) }));
jest.mock("../services/media.service", () => ({ persistUpload: jest.fn() }));

const User = require("../models/User");
const Jobseeker = require("../models/Jobseeker");
const sendMail = require("../utils/sendMail");

const { registerUser } = require("../controllers/userController");

function mockRes() {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
}

function baseReq(overrides = {}) {
  return {
    body: {
      name: "Jane Doe",
      email: "jane@example.com",
      password: "password123",
      role: "jobseeker",
      ...overrides,
    },
    files: {},
  };
}

beforeEach(() => {
  jest.restoreAllMocks();
  jest.clearAllMocks();
  jest.spyOn(User, "findOne").mockResolvedValue(null); // no existing account with this email
  jest.spyOn(User, "findByIdAndDelete").mockResolvedValue(undefined);
  jest.spyOn(Jobseeker.prototype, "save").mockResolvedValue(undefined);
});

describe("registerUser — verification email failure", () => {
  it("keeps the account and returns 201 with emailDeliveryFailed when sendMail throws", async () => {
    sendMail.mockRejectedValue(new Error("SMTP auth failed"));

    const req = baseReq();
    const res = mockRes();
    await registerUser(req, res);

    expect(User.findByIdAndDelete).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
    const payload = res.json.mock.calls[0][0];
    expect(payload.emailDeliveryFailed).toBe(true);
    expect(payload.message).toMatch(/Resend/);
  });

  it("returns a plain success message with emailDeliveryFailed:false when sendMail succeeds", async () => {
    sendMail.mockResolvedValue(undefined);

    const req = baseReq();
    const res = mockRes();
    await registerUser(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    const payload = res.json.mock.calls[0][0];
    expect(payload.emailDeliveryFailed).toBe(false);
    expect(payload.message).toBe("User registered successfully!");
  });

  it("still returns 409 for a duplicate email before ever calling sendMail", async () => {
    User.findOne.mockResolvedValue({ _id: "existing", email: "jane@example.com" });

    const req = baseReq();
    const res = mockRes();
    await registerUser(req, res);

    expect(sendMail).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(409);
  });
});
