// Khalti ePayment (v2) integration. Docs: https://docs.khalti.com/khalti-epayment/
const SECRET_KEY = process.env.KHALTI_SECRET_KEY;
const GATEWAY_URL = process.env.KHALTI_GATEWAY_URL;
const LOOKUP_URL = process.env.KHALTI_LOOKUP_URL;

async function initiatePayment({
  amountPaisa,
  referenceId,
  returnUrl,
  websiteUrl,
  purchaseOrderName,
  customerInfo,
}) {
  const response = await fetch(GATEWAY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `key ${SECRET_KEY}` },
    body: JSON.stringify({
      return_url: returnUrl,
      website_url: websiteUrl,
      amount: amountPaisa,
      purchase_order_id: referenceId,
      purchase_order_name: purchaseOrderName,
      customer_info: customerInfo,
    }),
  });

  const body = await response.json();
  if (!response.ok) {
    throw new Error((body && (body.detail || JSON.stringify(body))) || `Khalti initiate failed with HTTP ${response.status}`);
  }
  return body; // { pidx, payment_url, expires_at, expires_in }
}

async function lookupPayment(pidx) {
  const response = await fetch(LOOKUP_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `key ${SECRET_KEY}` },
    body: JSON.stringify({ pidx }),
  });

  const body = await response.json();
  if (!response.ok) {
    throw new Error((body && (body.detail || JSON.stringify(body))) || `Khalti lookup failed with HTTP ${response.status}`);
  }
  return body;
}

module.exports = { initiatePayment, lookupPayment };