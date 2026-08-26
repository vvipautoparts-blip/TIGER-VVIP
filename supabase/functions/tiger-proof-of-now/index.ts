import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const MAX_BODY_BYTES = 8 * 1024;
const MAX_IDENTITY_BYTES = 16 * 1024;
const IDENTITY_TIMEOUT_MS = 5000;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const HEX_64_PATTERN = /^[0-9a-f]{64}$/i;
const TOKEN_PATTERN = /^[a-z][a-z0-9_]{0,63}$/;
const POLICY_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,95}$/;
const OBJECT_TYPES = new Set(["listing", "intent_offer"]);
const ISSUE_KEYS = new Set(["action", "object_type", "object_id", "purpose", "policy_version"]);
const CONSUME_KEYS = new Set(["action", "challenge_id", "nonce", "capture_receipt_id"]);

type VerifiedIdentity = {
  authenticated: true;
  subject: string;
};

type IssueRequest = {
  action: "issue";
  object_type: "listing" | "intent_offer";
  object_id: string;
  purpose: string;
  policy_version: string;
};

type ConsumeRequest = {
  action: "consume";
  challenge_id: string;
  nonce: string;
  capture_receipt_id: string;
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function parseAllowedOrigins() {
  return new Set(
    String(Deno.env.get("TIGER_PROOF_ALLOWED_ORIGINS") || "")
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
    "Referrer-Policy": "no-referrer",
    "Vary": "Origin",
    "X-Content-Type-Options": "nosniff",
  };
  if (origin && parseAllowedOrigins().has(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
  }
  return headers;
}

function jsonResponse(status: number, payload: Record<string, unknown>, origin: string | null) {
  return new Response(JSON.stringify(payload), { status, headers: corsHeaders(origin) });
}

function originAllowed(origin: string | null) {
  if (!origin) return true;
  return parseAllowedOrigins().has(origin);
}

function safeVerifierUrl(raw: string) {
  const url = new URL(raw);
  const allowHttp = String(Deno.env.get("TIGER_PROOF_ALLOW_HTTP_IDENTITY_VERIFIER") || "false").toLowerCase() === "true";
  const local = url.hostname === "127.0.0.1" || url.hostname === "localhost" || url.hostname === "::1";
  if (url.protocol !== "https:" && !(allowHttp && local)) {
    throw new Error("IDENTITY_VERIFIER_SCHEME_DENIED");
  }
  return url.toString();
}

async function readBoundedText(response: Response, maxBytes: number) {
  const declared = Number(response.headers.get("content-length") || 0);
  if (Number.isFinite(declared) && declared > maxBytes) throw new Error("RESPONSE_TOO_LARGE");
  const text = await response.text();
  if (new TextEncoder().encode(text).byteLength > maxBytes) throw new Error("RESPONSE_TOO_LARGE");
  return text;
}

async function verifyIdentity(authorization: string): Promise<VerifiedIdentity> {
  const verifier = String(Deno.env.get("TIGER_PROOF_IDENTITY_VERIFIER_URL") || "").trim();
  if (!verifier) throw new Error("IDENTITY_VERIFIER_NOT_CONFIGURED");

  const response = await fetch(safeVerifierUrl(verifier), {
    method: "GET",
    headers: {
      "Accept": "application/json",
      "Authorization": authorization,
      "X-Tiger-Verification-Purpose": "proof-of-now",
    },
    signal: AbortSignal.timeout(IDENTITY_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error("IDENTITY_VERIFICATION_FAILED");

  const text = await readBoundedText(response, MAX_IDENTITY_BYTES);
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new Error("IDENTITY_RESPONSE_INVALID");
  }
  if (!isPlainObject(value) || value.authenticated !== true) throw new Error("IDENTITY_NOT_AUTHENTICATED");

  const subject = typeof value.subject === "string" ? value.subject.trim() : "";
  if (!subject || subject.length > 256) throw new Error("IDENTITY_SUBJECT_INVALID");
  return { authenticated: true, subject };
}

function createServerClient() {
  const url = String(Deno.env.get("SUPABASE_URL") || "").trim();
  const serviceRole = String(Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "").trim();
  if (!url || !serviceRole) throw new Error("PROOF_STORE_NOT_CONFIGURED");
  return createClient(url, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function challengeTtlSeconds() {
  const raw = String(Deno.env.get("TIGER_PROOF_CHALLENGE_TTL_SECONDS") || "300").trim();
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 60 || value > 600) throw new Error("PROOF_TTL_CONFIGURATION_INVALID");
  return value;
}

function validateIssue(value: Record<string, unknown>): { ok: true; value: IssueRequest } | { ok: false; code: string } {
  if (Object.keys(value).some((key) => !ISSUE_KEYS.has(key))) return { ok: false, code: "UNKNOWN_FIELD" };
  if (value.action !== "issue") return { ok: false, code: "ACTION_INVALID" };

  const objectType = typeof value.object_type === "string" ? value.object_type.trim().toLowerCase() : "";
  const objectId = typeof value.object_id === "string" ? value.object_id.trim().toLowerCase() : "";
  const purpose = typeof value.purpose === "string" ? value.purpose.trim().toLowerCase() : "";
  const policyVersion = typeof value.policy_version === "string" ? value.policy_version.trim() : "";

  if (!OBJECT_TYPES.has(objectType)) return { ok: false, code: "OBJECT_TYPE_INVALID" };
  if (!UUID_PATTERN.test(objectId)) return { ok: false, code: "OBJECT_ID_INVALID" };
  if (!TOKEN_PATTERN.test(purpose)) return { ok: false, code: "PURPOSE_INVALID" };
  if (!POLICY_PATTERN.test(policyVersion)) return { ok: false, code: "POLICY_VERSION_INVALID" };

  return {
    ok: true,
    value: {
      action: "issue",
      object_type: objectType as "listing" | "intent_offer",
      object_id: objectId,
      purpose,
      policy_version: policyVersion,
    },
  };
}

function validateConsume(value: Record<string, unknown>): { ok: true; value: ConsumeRequest } | { ok: false; code: string } {
  if (Object.keys(value).some((key) => !CONSUME_KEYS.has(key))) return { ok: false, code: "UNKNOWN_FIELD" };
  if (value.action !== "consume") return { ok: false, code: "ACTION_INVALID" };

  const challengeId = typeof value.challenge_id === "string" ? value.challenge_id.trim().toLowerCase() : "";
  const nonce = typeof value.nonce === "string" ? value.nonce.trim().toLowerCase() : "";
  const captureReceiptId = typeof value.capture_receipt_id === "string" ? value.capture_receipt_id.trim().toLowerCase() : "";

  if (!UUID_PATTERN.test(challengeId)) return { ok: false, code: "CHALLENGE_ID_INVALID" };
  if (!HEX_64_PATTERN.test(nonce)) return { ok: false, code: "NONCE_INVALID" };
  if (!UUID_PATTERN.test(captureReceiptId)) return { ok: false, code: "CAPTURE_RECEIPT_ID_INVALID" };

  return {
    ok: true,
    value: { action: "consume", challenge_id: challengeId, nonce, capture_receipt_id: captureReceiptId },
  };
}

function randomNonceHex() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function dbFailureCode(error: { message?: string } | null) {
  const message = String(error?.message || "");
  if (message.includes("PROOF_OBJECT_NOT_ELIGIBLE")) return { status: 403, code: "OBJECT_NOT_ELIGIBLE" };
  if (message.includes("PROOF_TTL_INVALID")) return { status: 503, code: "PROOF_CONFIGURATION_INVALID" };
  if (message.includes("duplicate key")) return { status: 409, code: "CHALLENGE_COLLISION" };
  return { status: 503, code: "PROOF_STORE_UNAVAILABLE" };
}

serve(async (request) => {
  const origin = request.headers.get("origin");
  if (!originAllowed(origin)) return jsonResponse(403, { success: false, code: "ORIGIN_DENIED" }, null);
  if (request.method === "OPTIONS") return new Response("", { status: 204, headers: corsHeaders(origin) });
  if (request.method !== "POST") return jsonResponse(405, { success: false, code: "METHOD_NOT_ALLOWED" }, origin);

  const contentType = String(request.headers.get("content-type") || "").toLowerCase();
  if (!contentType.startsWith("application/json")) {
    return jsonResponse(415, { success: false, code: "CONTENT_TYPE_REQUIRED" }, origin);
  }

  const declaredBytes = Number(request.headers.get("content-length") || 0);
  if (Number.isFinite(declaredBytes) && declaredBytes > MAX_BODY_BYTES) {
    return jsonResponse(413, { success: false, code: "REQUEST_TOO_LARGE" }, origin);
  }

  const authorization = String(request.headers.get("authorization") || "").trim();
  if (!/^Bearer\s+\S+$/i.test(authorization)) {
    return jsonResponse(401, { success: false, code: "AUTHENTICATION_REQUIRED" }, origin);
  }

  try {
    const raw = await request.text();
    if (new TextEncoder().encode(raw).byteLength > MAX_BODY_BYTES) {
      return jsonResponse(413, { success: false, code: "REQUEST_TOO_LARGE" }, origin);
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return jsonResponse(400, { success: false, code: "INVALID_JSON" }, origin);
    }
    if (!isPlainObject(parsed)) return jsonResponse(400, { success: false, code: "INVALID_REQUEST" }, origin);

    const identity = await verifyIdentity(authorization);
    const server = createServerClient();

    if (parsed.action === "issue") {
      const validated = validateIssue(parsed);
      if (!validated.ok) return jsonResponse(400, { success: false, code: validated.code }, origin);

      const nonce = randomNonceHex();
      const nonceDigest = await sha256Hex(nonce);
      const challengeId = crypto.randomUUID();
      const ttl = challengeTtlSeconds();
      const { data, error } = await server.rpc("vvip_synapse_proof_issue", {
        p_challenge_id: challengeId,
        p_actor_subject: identity.subject,
        p_object_type: validated.value.object_type,
        p_object_id: validated.value.object_id,
        p_purpose: validated.value.purpose,
        p_policy_version: validated.value.policy_version,
        p_nonce_digest: nonceDigest,
        p_ttl_seconds: ttl,
      });
      if (error || !isPlainObject(data) || data.ok !== true) {
        const failure = dbFailureCode(error);
        return jsonResponse(failure.status, { success: false, code: failure.code }, origin);
      }

      return jsonResponse(201, {
        success: true,
        state: "not_verified",
        challenge: {
          challenge_id: challengeId,
          nonce,
          expires_at: data.expires_at,
          object_type: data.object_type,
          object_id: data.object_id,
          purpose: data.purpose,
          policy_version: data.policy_version,
        },
      }, origin);
    }

    if (parsed.action === "consume") {
      const validated = validateConsume(parsed);
      if (!validated.ok) return jsonResponse(400, { success: false, code: validated.code }, origin);

      const nonceDigest = await sha256Hex(validated.value.nonce);
      const { data, error } = await server.rpc("vvip_synapse_proof_consume", {
        p_challenge_id: validated.value.challenge_id,
        p_actor_subject: identity.subject,
        p_nonce_digest: nonceDigest,
        p_capture_receipt_id: validated.value.capture_receipt_id,
      });
      if (error || !isPlainObject(data)) {
        const failure = dbFailureCode(error);
        return jsonResponse(failure.status, { success: false, code: failure.code }, origin);
      }

      const status = String(data.status || "");
      if (status === "ACCEPTED" && data.ok === true) {
        return jsonResponse(200, {
          success: true,
          state: "fresh",
          evidence: {
            evidence_id: data.evidence_id,
            challenge_id: data.challenge_id,
            receipt_id: data.receipt_id,
            object_type: data.object_type,
            object_id: data.object_id,
            purpose: data.purpose,
            policy_version: data.policy_version,
            accepted_at: data.accepted_at,
          },
        }, origin);
      }
      if (status === "EXPIRED") {
        return jsonResponse(410, { success: false, state: "expired", code: "CHALLENGE_EXPIRED" }, origin);
      }
      return jsonResponse(409, { success: false, state: "failed", code: "PROOF_NOT_ACCEPTED" }, origin);
    }

    return jsonResponse(400, { success: false, code: "ACTION_INVALID" }, origin);
  } catch (error) {
    const code = error instanceof Error ? error.message : "PROOF_SERVICE_ERROR";
    if (code.startsWith("IDENTITY_") || code === "RESPONSE_TOO_LARGE") {
      return jsonResponse(401, { success: false, code: "IDENTITY_VERIFICATION_FAILED" }, origin);
    }
    if (code === "PROOF_TTL_CONFIGURATION_INVALID") {
      return jsonResponse(503, { success: false, code }, origin);
    }
    return jsonResponse(503, { success: false, code: "PROOF_SERVICE_UNAVAILABLE" }, origin);
  }
});
