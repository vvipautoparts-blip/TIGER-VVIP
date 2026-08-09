import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const MAX_BODY_BYTES = 16 * 1024;
const OTP_TTL_SECONDS = 10 * 60;
const OTP_COOLDOWN_SECONDS = 60;
const OTP_MAX_ATTEMPTS = 5;
const OTP_ALLOWED_ORIGINS = "OTP_ALLOWED_ORIGINS";
const PURPOSE_PATTERN = /^[a-z0-9][a-z0-9_-]{0,63}$/;
const CHALLENGE_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type OtpRequest = {
  action?: "start" | "verify";
  phone?: string;
  purpose?: string;
  challenge_id?: string;
  code?: string;
  channel?: "whatsapp";
};

function parseAllowedOrigins() {
  return new Set(
    String(Deno.env.get(OTP_ALLOWED_ORIGINS) || "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
  );
}

function corsHeaders(origin: string | null) {
  const headers: Record<string, string> = {
    "Access-Control-Allow-Headers": "authorization, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "600",
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8",
    "Vary": "Origin",
    "X-Content-Type-Options": "nosniff",
  };
  if (origin && parseAllowedOrigins().has(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
  }
  return headers;
}

function originAllowed(origin: string | null) {
  return !origin || parseAllowedOrigins().has(origin);
}

function jsonResponse(status: number, payload: Record<string, unknown>, origin: string | null) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: corsHeaders(origin),
  });
}

function normalizePhone(phone: string) {
  const normalized = String(phone || "").replace(/[^\d]/g, "");
  return /^\d{8,15}$/.test(normalized) ? normalized : "";
}

function normalizePurpose(purpose: string) {
  const normalized = String(purpose || "").trim().toLowerCase();
  return PURPOSE_PATTERN.test(normalized) ? normalized : "";
}

function createServerClient() {
  const url = String(Deno.env.get("SUPABASE_URL") || "").trim();
  const serviceRole = String(Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "").trim();
  if (!url || !serviceRole) throw new Error("OTP_STORAGE_NOT_CONFIGURED");
  return createClient(url, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function readJsonBody(request: Request): Promise<unknown> {
  const declared = Number(request.headers.get("content-length") || 0);
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) {
    throw new Error("REQUEST_TOO_LARGE");
  }
  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > MAX_BODY_BYTES) {
    throw new Error("REQUEST_TOO_LARGE");
  }
  return JSON.parse(text);
}

function unbiasedSixDigitCode() {
  const modulus = 1_000_000;
  const range = 0x100000000;
  const limit = range - (range % modulus);
  const words = new Uint32Array(1);
  let value = 0;
  do {
    crypto.getRandomValues(words);
    value = words[0];
  } while (value >= limit);
  return String(value % modulus).padStart(6, "0");
}

async function importHmacKey() {
  const secret = String(Deno.env.get("OTP_HMAC_SECRET") || "");
  if (new TextEncoder().encode(secret).byteLength < 32) {
    throw new Error("OTP_HMAC_SECRET_NOT_CONFIGURED");
  }
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
}

function toHex(buffer: ArrayBuffer) {
  return Array.from(new Uint8Array(buffer))
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
}

async function hmacHex(message: string) {
  const key = await importHmacKey();
  const digest = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return toHex(digest);
}

async function phoneHash(phone: string) {
  return hmacHex(`phone|${phone}`);
}

async function codeDigest(challengeId: string, phone: string, purpose: string, code: string) {
  return hmacHex(`otp|${challengeId}|${phone}|${purpose}|${code}`);
}

async function sendViaMetaWhatsApp(phone: string, code: string) {
  const accessToken = String(Deno.env.get("WHATSAPP_ACCESS_TOKEN") || "");
  const phoneNumberId = String(Deno.env.get("WHATSAPP_PHONE_NUMBER_ID") || "");
  const templateName = String(Deno.env.get("WHATSAPP_TEMPLATE_NAME") || "");
  const templateLang = String(Deno.env.get("WHATSAPP_TEMPLATE_LANG") || "ar");
  if (!accessToken || !phoneNumberId || !templateName) {
    throw new Error("OTP_PROVIDER_NOT_CONFIGURED");
  }

  const endpoint = `https://graph.facebook.com/v21.0/${encodeURIComponent(phoneNumberId)}/messages`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: phone,
      type: "template",
      template: {
        name: templateName,
        language: { code: templateLang },
        components: [{
          type: "body",
          parameters: [{ type: "text", text: code }],
        }],
      },
    }),
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    throw new Error("OTP_PROVIDER_DELIVERY_FAILED");
  }
}

async function markDelivery(client: ReturnType<typeof createServerClient>, challengeId: string, delivered: boolean) {
  const { data, error } = await client.rpc("mark_phone_otp_delivery", {
    p_challenge_id: challengeId,
    p_delivered: delivered,
  });
  if (error || data !== true) throw new Error("OTP_DELIVERY_STATE_FAILED");
}

async function startChallenge(
  client: ReturnType<typeof createServerClient>,
  body: OtpRequest,
  origin: string | null,
) {
  if (Object.prototype.hasOwnProperty.call(body, "code")) {
    return jsonResponse(400, { success: false, code: "INVALID_REQUEST" }, origin);
  }

  const phone = normalizePhone(body.phone || "");
  const purpose = normalizePurpose(body.purpose || "");
  if (!phone || !purpose || (body.channel && body.channel !== "whatsapp")) {
    return jsonResponse(400, { success: false, code: "INVALID_REQUEST" }, origin);
  }

  const challengeId = crypto.randomUUID();
  const code = unbiasedSixDigitCode();
  const digest = await codeDigest(challengeId, phone, purpose, code);
  const hashedPhone = await phoneHash(phone);
  const now = Date.now();

  const { error } = await client.rpc("issue_phone_otp_challenge", {
    p_challenge_id: challengeId,
    p_phone_hash: hashedPhone,
    p_purpose: purpose,
    p_code_digest: digest,
    p_expires_at: new Date(now + OTP_TTL_SECONDS * 1000).toISOString(),
    p_cooldown_until: new Date(now + OTP_COOLDOWN_SECONDS * 1000).toISOString(),
    p_max_attempts: OTP_MAX_ATTEMPTS,
  });

  if (error) {
    const limited = /OTP_(?:COOLDOWN|RATE_LIMITED)/.test(String(error.message || ""));
    return jsonResponse(
      limited ? 429 : 503,
      { success: false, code: limited ? "REQUEST_NOT_ACCEPTED" : "SERVICE_UNAVAILABLE" },
      origin,
    );
  }

  try {
    await sendViaMetaWhatsApp(phone, code);
    await markDelivery(client, challengeId, true);
  } catch {
    try {
      await markDelivery(client, challengeId, false);
    } catch {
      // A pending challenge is intentionally unverifiable; fail closed.
    }
    return jsonResponse(503, { success: false, code: "DELIVERY_UNAVAILABLE" }, origin);
  }

  return jsonResponse(200, {
    success: true,
    challenge_id: challengeId,
    expires_in: OTP_TTL_SECONDS,
  }, origin);
}

async function verifyChallenge(
  client: ReturnType<typeof createServerClient>,
  body: OtpRequest,
  origin: string | null,
) {
  const phone = normalizePhone(body.phone || "");
  const purpose = normalizePurpose(body.purpose || "");
  const challengeId = String(body.challenge_id || "").trim();
  const code = String(body.code || "").trim();

  if (!phone || !purpose || !CHALLENGE_ID_PATTERN.test(challengeId) || !/^\d{6}$/.test(code)) {
    return jsonResponse(200, { success: false, code: "INVALID_OR_EXPIRED_CHALLENGE" }, origin);
  }

  const hashedPhone = await phoneHash(phone);
  const digest = await codeDigest(challengeId, phone, purpose, code);
  const { data, error } = await client.rpc("consume_phone_otp_challenge", {
    p_challenge_id: challengeId,
    p_phone_hash: hashedPhone,
    p_purpose: purpose,
    p_code_digest: digest,
  });

  if (error) {
    return jsonResponse(503, { success: false, code: "SERVICE_UNAVAILABLE" }, origin);
  }
  if (data !== "VERIFIED") {
    return jsonResponse(200, { success: false, code: "INVALID_OR_EXPIRED_CHALLENGE" }, origin);
  }
  return jsonResponse(200, { success: true, verified: true }, origin);
}

serve(async (request) => {
  const origin = request.headers.get("Origin");
  if (!originAllowed(origin)) {
    return jsonResponse(403, { success: false, code: "ORIGIN_DENIED" }, origin);
  }

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }
  if (request.method !== "POST") {
    return jsonResponse(405, { success: false, code: "METHOD_NOT_ALLOWED" }, origin);
  }

  try {
    const raw = await readJsonBody(request);
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      return jsonResponse(400, { success: false, code: "INVALID_REQUEST" }, origin);
    }
    const body = raw as OtpRequest;
    const action = String(body.action || "").toLowerCase();

    const client = createServerClient();
    if (action === "start") {
      return await startChallenge(client, body, origin);
    }
    if (action === "verify") {
      return await verifyChallenge(client, body, origin);
    }
    return jsonResponse(400, { success: false, code: "INVALID_REQUEST" }, origin);
  } catch {
    return jsonResponse(400, { success: false, code: "INVALID_REQUEST" }, origin);
  }
});
