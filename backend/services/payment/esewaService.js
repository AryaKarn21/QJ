const crypto = require("crypto");

// eSewa ePay v2 integration. Docs: https://developer.esewa.com.np/pages/Epay
const MERCHANT_CODE = process.env.ESEWA_MERCHANT_CODE;
const SECRET_KEY = process.env.ESEWA_SECRET_KEY;
const GATEWAY_URL = process.env.ESEWA_GATEWAY_URL;
const STATUS_CHECK_URL = process.env.ESEWA_STATUS_CHECK_URL;

function sign(message) {
  return crypto.createHmac("sha256", SECRET_KEY).update(message).digest("base64");
}

function buildSignedMessage({ total_amount, transaction_uuid, product_code }) {
  return `total_amount=${total_amount},transaction_uuid=${transaction_uuid},product_code=${product_code}`;
}

function buildFormPayload({ amount, referenceId, successUrl, failureUrl }) {
  const payload = {
    amount: String(amount),
    tax_amount: "0",
    total_amount: String(amount),
    transaction_uuid: referenceId,
    product_code: MERCHANT_CODE,
    product_service_charge: "0",
    product_delivery_charge: "0",
    success_url: successUrl,
    failure_url: failureUrl,
    signed_field_names: "total_amount,transaction_uuid,product_code",
  };

  payload.signature = sign(
    buildSignedMessage({
      total_amount: payload.total_amount,
      transaction_uuid: payload.transaction_uuid,
      product_code: payload.product_code,
    })
  );

  return { gatewayUrl: GATEWAY_URL, fields: payload };
}

function decodeAndVerifySignature(base64Data) {
  let decoded;
  try {
    decoded = JSON.parse(Buffer.from(base64Data, "base64").toString("utf-8"));
  } catch {
    return null;
  }

  const expectedSignature = sign(
    buildSignedMessage({
      total_amount: decoded.total_amount,
      transaction_uuid: decoded.transaction_uuid,
      product_code: decoded.product_code,
    })
  );

  if (expectedSignature !== decoded.signature) return null;
  return decoded;
}

async function verifyTransactionStatus({ referenceId, amount }) {
  const url = `${STATUS_CHECK_URL}?product_code=${encodeURIComponent(
    MERCHANT_CODE
  )}&total_amount=${encodeURIComponent(amount)}&transaction_uuid=${encodeURIComponent(
    referenceId
  )}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`eSewa status check failed with HTTP ${response.status}`);
  }
  return response.json();
}

module.exports = { buildFormPayload, decodeAndVerifySignature, verifyTransactionStatus };