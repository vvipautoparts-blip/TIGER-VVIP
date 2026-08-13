import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const MAX_IDENTITY_BYTES = 16 * 1024;
const IDENTITY_TIMEOUT_MS = 5000;

type VerifiedIdentity = { authenticated: true; subject: string; sessionId: string };

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
function parseAllowedOrigins() {
  return new Set(String(Deno.env.get("TIGER_SOA_ALLOWED_ORIGINS") || "").split(",").map((value) => value.trim()).filter(Boolean));
}
function corsHeaders(origin: string | null) {
  const headers: Record<string,string> = {
    "Access-Control-Allow-Headers": "authorization, content-type",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Max-Age": "600",
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8",
    "Vary": "Origin",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
  };
  if (origin && parseAllowedOrigins().has(origin)) headers["Access-Control-Allow-Origin"] = origin;
  return headers;
}
function jsonResponse(status: number, payload: Record<string, unknown>, origin: string | null) {
  return new Response(JSON.stringify(payload), { status, headers: corsHeaders(origin) });
}
function originAllowed(origin: string | null) { return !origin || parseAllowedOrigins().has(origin); }
function safeVerifierUrl(raw: string) {
  const url = new URL(raw);
  const allowHttp = String(Deno.env.get("TIGER_SOA_ALLOW_HTTP_IDENTITY_VERIFIER") || "false").toLowerCase() === "true";
  const local = ["localhost","127.0.0.1","::1"].includes(url.hostname);
  if (url.username || url.password || url.hash) throw new Error("IDENTITY_VERIFIER_URL_DENIED");
  if (url.protocol !== "https:" && !(allowHttp && local && url.protocol === "http:")) throw new Error("IDENTITY_VERIFIER_SCHEME_DENIED");
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
  const verifier = String(Deno.env.get("TIGER_SOA_IDENTITY_VERIFIER_URL") || "").trim();
  if (!verifier) throw new Error("IDENTITY_VERIFIER_NOT_CONFIGURED");
  const response = await fetch(safeVerifierUrl(verifier), {
    method: "GET",
    headers: {
      "Accept": "application/json",
      "Authorization": authorization,
      "X-Tiger-Verification-Purpose": "sovereign-owner",
    },
    signal: AbortSignal.timeout(IDENTITY_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error("IDENTITY_VERIFICATION_FAILED");
  const raw = await readBoundedText(response, MAX_IDENTITY_BYTES);
  let value: unknown;
  try { value = JSON.parse(raw); } catch { throw new Error("IDENTITY_RESPONSE_INVALID"); }
  if (!isPlainObject(value) || value.authenticated !== true) throw new Error("IDENTITY_NOT_AUTHENTICATED");
  const subject = typeof value.subject === "string" ? value.subject.trim() : "";
  const sessionId = typeof value.sessionId === "string" ? value.sessionId.trim() : "";
  if (!subject || subject.length > 256 || !sessionId || sessionId.length > 256) throw new Error("IDENTITY_BINDING_INVALID");
  return { authenticated: true, subject, sessionId };
}
function createServerClient() {
  const url = String(Deno.env.get("SUPABASE_URL") || "").trim();
  const serviceRole = String(Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "").trim();
  if (!url || !serviceRole) throw new Error("SOA_STORE_NOT_CONFIGURED");
  return createClient(url, serviceRole, { auth: { persistSession: false, autoRefreshToken: false } });
}
function holdIsClear(holdState: string, holdUntil: string | null) {
  if (holdState !== "CLEAR") return false;
  if (!holdUntil) return true;
  const until = Date.parse(holdUntil);
  return Number.isFinite(until) && until <= Date.now();
}

serve(async (request) => {
  const origin = request.headers.get("origin");
  if (!originAllowed(origin)) return jsonResponse(403, { success:false, code:"ORIGIN_DENIED" }, null);
  if (request.method === "OPTIONS") return new Response("", { status:204, headers:corsHeaders(origin) });
  if (request.method !== "GET") return jsonResponse(405, { success:false, code:"METHOD_NOT_ALLOWED" }, origin);

  const authorization = String(request.headers.get("authorization") || "").trim();
  if (!/^Bearer\s+\S+$/i.test(authorization)) return jsonResponse(401, { success:false, code:"AUTHENTICATION_REQUIRED" }, origin);

  try {
    const identity = await verifyIdentity(authorization);
    const db = createServerClient();
    const { data: authority, error: authorityError } = await db
      .from("soa_owner_authority_bindings")
      .select("owner_authority_id,clerk_user_id,authority_status,authority_version")
      .eq("clerk_user_id", identity.subject)
      .maybeSingle();
    if (authorityError) throw new Error("OWNER_AUTHORITY_QUERY_FAILED");
    if (!authority) return jsonResponse(403, { source:"SOA_SERVER_VERIFIED", allowed:false, code:"ERR_OWNER_AUTHORITY_MISSING", clerkUserId:identity.subject, sessionId:identity.sessionId }, origin);

    const { data: security, error: securityError } = await db
      .from("soa_owner_security_state")
      .select("kill_switch,l4_enabled,strong_factor_enrollment_confirmed,security_hold_state,hold_until,recovery_state,security_version")
      .eq("owner_authority_id", authority.owner_authority_id)
      .maybeSingle();
    if (securityError || !security) throw new Error("OWNER_SECURITY_QUERY_FAILED");

    const { data: publicProfile, error: profileError } = await db
      .from("soa_owner_public_profiles")
      .select("public_display_name,public_title,public_country_code,public_avatar_url,verified_owner_badge,publication_status,public_version")
      .eq("owner_authority_id", authority.owner_authority_id)
      .maybeSingle();
    if (profileError) throw new Error("OWNER_PUBLIC_PROFILE_QUERY_FAILED");

    const recoveryOk = security.recovery_state === "NONE" || security.recovery_state === "COMPLETED";
    const allowed = authority.authority_status === "ACTIVE"
      && security.kill_switch === false
      && security.strong_factor_enrollment_confirmed === true
      && holdIsClear(security.security_hold_state, security.hold_until)
      && recoveryOk;

    return jsonResponse(allowed ? 200 : 403, {
      source: "SOA_SERVER_VERIFIED",
      allowed,
      code: allowed ? "OWNER_SERVER_CONFIRMED" : "ERR_OWNER_ACCESS_DENIED",
      clerkUserId: identity.subject,
      sessionId: identity.sessionId,
      authorityStatus: authority.authority_status,
      authorityVersion: authority.authority_version,
      killSwitch: security.kill_switch,
      l4Enabled: security.l4_enabled,
      recoveryState: security.recovery_state,
      holdState: security.security_hold_state,
      requiresReverification: false,
      publicProfile: publicProfile ? {
        publicDisplayName: publicProfile.public_display_name,
        publicTitle: publicProfile.public_title,
        publicCountryCode: publicProfile.public_country_code,
        publicAvatarUrl: publicProfile.public_avatar_url,
        verifiedOwnerBadge: publicProfile.verified_owner_badge === true,
        publicationStatus: publicProfile.publication_status,
        publicVersion: publicProfile.public_version,
      } : null,
    }, origin);
  } catch {
    return jsonResponse(503, { success:false, code:"OWNER_ACCESS_UNAVAILABLE" }, origin);
  }
});
