import crypto from "node:crypto";

const PAYTECH_ENDPOINT = "https://paytech.sn/api/payment/request-payment";

function getCredentials() {
  const apiKey = process.env.PAYTECH_API_KEY;
  const apiSecret = process.env.PAYTECH_API_SECRET;
  if (!apiKey || !apiSecret) {
    throw new Error("PAYTECH_API_KEY / PAYTECH_API_SECRET manquants (voir .env.local)");
  }
  return { apiKey, apiSecret, env: process.env.PAYTECH_ENV === "test" ? "test" : "prod" };
}

// This client is scoped to one use case: a school paying its own iziecole
// subscription (école -> iziecole). It is NOT for tuition/parent payments —
// see docs/decisions.md, that flow was explicitly removed.

// ref_command is PayTech's merchant-defined unique reference. Encoding the
// subscription_payments id in it lets the IPN webhook find the row back
// with no separate lookup table — keep buildRefCommand/parseRefCommand in sync.
export function buildRefCommand(subscriptionPaymentId) {
  return `SUB-${subscriptionPaymentId}`;
}

export function parseRefCommand(refCommand) {
  const match = /^SUB-(.+)$/.exec(refCommand ?? "");
  return match ? match[1] : null;
}

// Opens a PayTech hosted-payment session for one subscription period (the
// school admin picks Wave / Orange Money / carte on PayTech's page) and
// returns where to send them. appUrl must be an absolute origin, e.g.
// process.env.NEXT_PUBLIC_APP_URL.
export async function createSubscriptionPaymentRequest({ subscriptionPayment, appUrl }) {
  const { apiKey, apiSecret, env } = getCredentials();

  const body = new URLSearchParams({
    item_name: `Abonnement iziecole — ${subscriptionPayment.period_label}`,
    item_price: String(subscriptionPayment.amount),
    currency: "XOF",
    ref_command: buildRefCommand(subscriptionPayment.id),
    command_name: `iziecole — ${subscriptionPayment.period_label}`,
    env,
    ipn_url: `${appUrl}/api/paytech/subscription-ipn`,
    success_url: `${appUrl}/settings?abonnement=succes`,
    cancel_url: `${appUrl}/settings?abonnement=annule`,
  });

  const response = await fetch(PAYTECH_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      API_KEY: apiKey,
      API_SECRET: apiSecret,
    },
    body,
  });

  const data = await response.json();
  if (!response.ok || data.success !== 1) {
    throw new Error(
      Array.isArray(data.errors) ? data.errors.join(", ") : "Échec de la création du paiement PayTech",
    );
  }

  return { token: data.token, redirectUrl: data.redirect_url };
}

// PayTech's IPN call isn't signed with a shared HMAC secret — instead it
// echoes back sha256(API_KEY) and sha256(API_SECRET) so the receiver can
// confirm the caller actually knows those credentials before trusting the
// payload. Reject anything that doesn't match.
export function verifyIpnAuthenticity(payload) {
  const { apiKey, apiSecret } = getCredentials();
  const expectedKeyHash = crypto.createHash("sha256").update(apiKey).digest("hex");
  const expectedSecretHash = crypto.createHash("sha256").update(apiSecret).digest("hex");

  return (
    payload.api_key_sha256 === expectedKeyHash && payload.api_secret_sha256 === expectedSecretHash
  );
}
