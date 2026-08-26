import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const MAX_BODY_BYTES = 2 * 1024;
const MAX_IDENTITY_BYTES = 16 * 1024;
const IDENTITY_TIMEOUT_MS = 5000;
const PROOF_CAPTURE_BUCKET = "proof-capture-staging";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const REQUEST_KEYS = new Set(["challenge_id"]);

type VerifiedIdentity = { authenticated: true; subject: string };

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function allowedOrigins() {
  return new Set(
    String(Deno.env.get("TIGER_PROOF_ALLOWED_ORIGINS") || "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
  );
}

function headers(origin: string | null) {
  const result: Record<string, string> = {
    "Access-Control-Allow-Headers": "authorization, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "600",
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8",
    "Referrer-Policy": "no-referrer",
    "Vary": "Origin",
    "X-Content-Type-Options": "nosniff",
  };
  if (origin && allowedOrigins().has(origin)) result["Access-Control-Allow-Origin"] = origin;
  return result;
}

function response(status: number, payload: Record<string, unknown>, origin: string | null) {
  return new Response(JSON.stringify(payload), { status, headers: headers(origin) });
}

function safeVerifierUrl(raw: string) {
  const url = new URL(raw);
  const allowHttp = String(Deno.env.get("TIGER_PROOF_ALLOW_HTTP_IDENTITY_VERIFIER") || "false").toLowerCase() === "true";
  const local = url.hostname === "127.0.0.1" || url.hostname === "localhost" || url.hostname === "::1";
  if (url.protocol !== "https:" && !(allowHttp && local)) throw new Error("IDENTITY_VERIFIER_SCHEME_DENIED");
  return url.toString();
}

async function verifyIdentity(authorization: string): Promise<VerifiedIdentity> {
  const verifier = String(Deno.env.get("TIGER_PROOF_IDENTITY_VERIFIER_URL") || "").trim();
  if (!verifier) throw new Error("IDENTITY_VERIFIER_NOT_CONFIGURED");
  const verifierResponse = await fetch(safeVerifierUrl(verifier), {
    method: "GET",
    headers: {
      "Accept": "application/json",
      "Authorization": authorization,
      "X-Tiger-Verification-Purpose": "proof-of-now-capture",
    },
    signal: AbortSignal.timeout(IDENTITY_TIMEOUT_MS),
  });
  if (!verifierResponse.ok) throw new Error("IDENTITY_VERIFICATION_FAILED");
  const text = await verifierResponse.text();
  if (new TextEncoder().encode(text).byteLength > MAX_IDENTITY_BYTES) throw new Error("IDENTITY_RESPONSE_TOO_LARGE");
  let value: unknown;
  try { value = JSON.parse(text); } catch { throw new Error("IDENTITY_RESPONSE_INVALID"); }
  if (!isPlainObject(value) || value.authenticated !== true) throw new Error("IDENTITY_NOT_AUTHENTICATED");
  const subject = typeof value.subject === "string" ? value.subject.trim() : "";
  if (!subject || subject.length > 256) throw new Error("IDENTITY_SUBJECT_INVALID");
  return { authenticated: true, subject };
}

function serverClient() {
  const url = String(Deno.env.get("SUPABASE_URL") || "").trim();
  const serviceRole = String(Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "").trim();
  if (!url || !serviceRole) throw new Error("PROOF_STORE_NOT_CONFIGURED");
  return createClient(url, serviceRole, { auth: { persistSession: false, autoRefreshToken: false } });
}

function randomCapabilityHex() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

serve(async (request) => {
  const origin = request.headers.get("origin");
  if (origin && !allowedOrigins().has(origin)) return response(403, { success: false, code: "ORIGIN_DENIED" }, null);
  if (request.method === "OPTIONS") return new Response("", { status: 204, headers: headers(origin) });
  if (request.method !== "POST") return response(405, { success: false, code: "METHOD_NOT_ALLOWED" }, origin);

  const authorization = String(request.headers.get("authorization") || "").trim();
  if (!/^Bearer\s+\S+$/i.test(authorization)) return response(401, { success: false, code: "AUTHENTICATION_REQUIRED" }, origin);
  if (!String(request.headers.get("content-type") || "").toLowerCase().startsWith("application/json")) {
    return response(415, { success: false, code: "CONTENT_TYPE_REQUIRED" }, origin);
  }

  try {
    const raw = await request.text();
    if (new TextEncoder().encode(raw).byteLength > MAX_BODY_BYTES) return response(413, { success: false, code: "REQUEST_TOO_LARGE" }, origin);
    let body: unknown;
    try { body = JSON.parse(raw); } catch { return response(400, { success: false, code: "INVALID_JSON" }, origin); }
    if (!isPlainObject(body) || Object.keys(body).some((key) => !REQUEST_KEYS.has(key))) {
      return response(400, { success: false, code: "INVALID_REQUEST" }, origin);
    }
    const challengeId = typeof body.challenge_id === "string" ? body.challenge_id.trim().toLowerCase() : "";
    if (!UUID_PATTERN.test(challengeId)) return response(400, { success: false, code: "CHALLENGE_ID_INVALID" }, origin);

    const identity = await verifyIdentity(authorization);
    const server = serverClient();
    const receiptId = crypto.randomUUID();
    const finalizationToken = randomCapabilityHex();
    const tokenDigest = await sha256Hex(finalizationToken);

    const { data, error } = await server.rpc("vvip_synapse_proof_capture_prepare", {
      p_receipt_id: receiptId,
      p_challenge_id: challengeId,
      p_actor_subject: identity.subject,
      p_token_digest: tokenDigest,
    });
    if (error || !isPlainObject(data) || data.ok !== true || typeof data.source_storage_path !== "string") {
      return response(403, { success: false, code: "CAPTURE_NOT_ALLOWED" }, origin);
    }

    const sourcePath = data.source_storage_path;
    const { data: upload, error: uploadError } = await server.storage
      .from(PROOF_CAPTURE_BUCKET)
      .createSignedUploadUrl(sourcePath, { upsert: false });
    if (uploadError || !upload || typeof upload.token !== "string") {
      return response(503, { success: false, code: "SIGNED_UPLOAD_UNAVAILABLE" }, origin);
    }

    return response(201, {
      success: true,
      state: "not_verified",
      capture: {
        capture_receipt_id: receiptId,
        finalization_token: finalizationToken,
        expires_at: data.expires_at,
        upload: {
          bucket: PROOF_CAPTURE_BUCKET,
          path: sourcePath,
          token: upload.token,
        },
      },
    }, origin);
  } catch {
    return response(503, { success: false, code: "PROOF_CAPTURE_PREPARE_UNAVAILABLE" }, origin);
  }
});
