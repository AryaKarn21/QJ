// Unit tests for authController.logout (backend/controllers/authController.js).
//
// passport@0.7's req.logout() requires a callback argument — calling it
// with none throws synchronously ("req#logout requires a callback
// function") instead of tearing down the session. These tests lock in the
// fixed behavior: logout always calls req.logout with a callback, and
// reports success/failure based on what that callback receives.
// authController.js registers the Google OAuth passport strategy as a
// module-load side effect, which throws if GOOGLE_CLIENT_ID isn't set
// (see the "CI/config-robustness" finding in the security review: this
// means the whole server fails to boot without it, not just Google
// login). Mocked here so this unit test — which only exercises logout()
// — doesn't depend on that env var being present.
jest.mock("passport-google-oauth20", () => ({ Strategy: jest.fn() }));
jest.mock("passport", () => ({
  use: jest.fn(),
  serializeUser: jest.fn(),
  deserializeUser: jest.fn(),
}));

const { logout } = require("../controllers/authController");

function mockRes() {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
}

describe("authController.logout", () => {
  it("responds with success when req.logout's callback receives no error", () => {
    const req = { logout: jest.fn((cb) => cb(null)) };
    const res = mockRes();

    logout(req, res);

    expect(req.logout).toHaveBeenCalledWith(expect.any(Function));
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ message: "Logged out successfully" });
  });

  it("responds with 500 when req.logout's callback receives an error", () => {
    const req = { logout: jest.fn((cb) => cb(new Error("session store down"))) };
    const res = mockRes();

    logout(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: "Failed to log out. Please try again." });
  });

  it("never calls req.logout() with zero arguments (the bug this fix addresses)", () => {
    const req = { logout: jest.fn((cb) => cb(null)) };
    const res = mockRes();

    logout(req, res);

    expect(req.logout.mock.calls[0].length).toBeGreaterThan(0);
  });
});
