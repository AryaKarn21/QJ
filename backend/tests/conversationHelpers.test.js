// Unit tests for the messaging-permission rule (backend/utils/conversationHelpers.js)
// — Priority 7's decision: "Connections + existing conversations." A new
// conversation requires an accepted Connection; an existing one is always
// grandfathered in; a block stops messaging either way.
const mongoose = require("mongoose");

jest.mock("../models/Conversation");
jest.mock("../models/Connection");

const Conversation = require("../models/Conversation");
const Connection = require("../models/Connection");
const { checkMessagePermission, findOrCreateConversation } = require("../utils/conversationHelpers");

const validId = () => new mongoose.Types.ObjectId().toString();

function mockConnectionQuery(resolvedValue) {
  return { select: () => ({ lean: () => Promise.resolve(resolvedValue) }) };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("checkMessagePermission", () => {
  it("blocks starting a new conversation between two people who aren't connected", async () => {
    Connection.findOne.mockReturnValue(mockConnectionQuery(null));

    const result = await checkMessagePermission(validId(), validId(), { conversationExists: false });

    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/connected/i);
  });

  it("allows starting a new conversation between accepted connections", async () => {
    Connection.findOne.mockReturnValue(mockConnectionQuery({ status: "accepted" }));

    const result = await checkMessagePermission(validId(), validId(), { conversationExists: false });

    expect(result.allowed).toBe(true);
  });

  it("grandfathers in an existing conversation even with no connection at all", async () => {
    Connection.findOne.mockReturnValue(mockConnectionQuery(null));

    const result = await checkMessagePermission(validId(), validId(), { conversationExists: true });

    expect(result.allowed).toBe(true);
  });

  it("blocks messaging in an EXISTING conversation once either side has blocked the other", async () => {
    Connection.findOne.mockReturnValue(mockConnectionQuery({ status: "blocked" }));

    const result = await checkMessagePermission(validId(), validId(), { conversationExists: true });

    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/can't message/i);
  });

  it("blocks starting a new conversation when blocked, with the blocked-specific message (not the not-connected one)", async () => {
    Connection.findOne.mockReturnValue(mockConnectionQuery({ status: "blocked" }));

    const result = await checkMessagePermission(validId(), validId(), { conversationExists: false });

    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/can't message/i);
  });
});

describe("findOrCreateConversation", () => {
  it("returns the existing conversation without any connection check when one already exists", async () => {
    const existing = { _id: validId(), participants: [] };
    Conversation.findOne.mockResolvedValue(existing);
    Connection.findOne.mockReturnValue(mockConnectionQuery(null)); // not connected at all

    const result = await findOrCreateConversation(validId(), validId());

    expect(result).toBe(existing);
    expect(Conversation.create).not.toHaveBeenCalled();
  });

  it("creates a new conversation for accepted connections", async () => {
    Conversation.findOne.mockResolvedValue(null);
    Connection.findOne.mockReturnValue(mockConnectionQuery({ status: "accepted" }));
    Conversation.create.mockResolvedValue({ _id: validId() });

    await findOrCreateConversation(validId(), validId());

    expect(Conversation.create).toHaveBeenCalled();
  });

  it("throws MESSAGE_NOT_ALLOWED instead of silently creating a conversation for non-connections", async () => {
    Conversation.findOne.mockResolvedValue(null);
    Connection.findOne.mockReturnValue(mockConnectionQuery(null));

    await expect(findOrCreateConversation(validId(), validId())).rejects.toMatchObject({
      code: "MESSAGE_NOT_ALLOWED",
    });
    expect(Conversation.create).not.toHaveBeenCalled();
  });
});
