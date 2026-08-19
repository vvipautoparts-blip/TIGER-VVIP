import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

type UploadTicketRequest = {
  post_id: string;
  idempotency_key: string;
};

type ReservationRow = {
  media_id: string;
  ticket_id: string;
  bucket_id: string;
  quarantine_storage_path: string;
  upload_lease_expires_at: string;
};

const MAX_BODY_BYTES = 4096;
const TIGER_UPLOAD_LEASE_SECONDS = 300;
const EXPECTED_BUCKET = "social-private-media";
const BANNED_CLIENT_FACTS = [
  "mime_type",
  "content_type",
  "byte_size",
  "width",
  "height",
  "sha256",
  "filename",
] as const;

const NO_STORE_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
  "Pragma": "no-cache",
};

const PUBLIC_UPLOAD_CODES = new Set([
  "REQUEST_BODY_REQUIRED",
  "REQUEST_BODY_TOO_LARGE",
  "REQUEST_JSON_INVALID",
  "REQUEST_JSON_OBJECT_REQUIRED",
  "POST_ID_INVALID",
  "IDEMPOTENCY_KEY_INVALID",
  "RESERVATION_DENIED",
  "RESERVATION_EMPTY",
  "RESERVATION_MEDIA_INVALID",
  "RESERVATION_TICKET_INVALID",
  "RESERVATION_BUCKET_INVALID",
  "RESERVATION_PATH_INVALID",
  "TIGER_UPLOAD_LEASE_EXPIRED",
  "TIGER_UPLOAD_LEASE_INVALID",
  "SIGNED_UPLOAD_CAPABILITY_FAILED",
]);

function jsonResponse(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), { status, headers: NO_STORE_HEADERS });
}

function requiredEnv(name: string): string {
  const value = Deno.env.get(name)?.trim();
  if (!value) {
    console.error("TIGER_UPLOAD_SERVER_CONFIG_MISSING", name);
    throw new Error("UPLOAD_SERVICE_UNAVAILABLE");
  }
  return value;
}

function assertUuid(value: unknown, code: string): asserts value is string {
  if (typeof value !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
    throw new Error(code);
  }
}

async function readBoundedJson(request: Request): Promise<Record<string, unknown>> {
  const reader = request.body?.getReader();
  if (!reader) throw new Error("REQUEST_BODY_REQUIRED");

  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_BODY_BYTES) {
      await reader.cancel("body too large");
      throw new Error("REQUEST_BODY_TOO_LARGE");
    }
    chunks.push(value);
  }

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw new Error("REQUEST_JSON_INVALID");
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("REQUEST_JSON_OBJECT_REQUIRED");
  }
  return parsed as Record<string, unknown>;
}

function assertMetadataFree(body: Record<string, unknown>): void {
  for (const field of BANNED_CLIENT_FACTS) {
    if (Object.prototype.hasOwnProperty.call(body, field)) {
      throw new Error(`CLIENT_CANONICAL_FACT_REJECTED:${field}`);
    }
  }
  const allowed = new Set(["post_id", "idempotency_key"]);
  for (const field of Object.keys(body)) {
    if (!allowed.has(field)) throw new Error(`REQUEST_FIELD_NOT_ALLOWED:${field}`);
  }
}

function publicUploadError(error: unknown): { code: string; status: number } {
  const raw = error instanceof Error ? error.message : "UPLOAD_TICKET_FAILED";
  if (raw.startsWith("CLIENT_CANONICAL_FACT_REJECTED:")) {
    return { code: "CLIENT_CANONICAL_FACT_REJECTED", status: 400 };
  }
  if (raw.startsWith("REQUEST_FIELD_NOT_ALLOWED:")) {
    return { code: "REQUEST_FIELD_NOT_ALLOWED", status: 400 };
  }
  if (raw === "UPLOAD_SERVICE_UNAVAILABLE" || raw === "SIGNED_UPLOAD_CAPABILITY_FAILED") {
    return { code: raw, status: 503 };
  }
  if (raw === "RESERVATION_DENIED") return { code: raw, status: 403 };
  if (raw === "REQUEST_BODY_TOO_LARGE") return { code: raw, status: 413 };
  if (PUBLIC_UPLOAD_CODES.has(raw)) return { code: raw, status: 400 };

  console.error("TIGER_UPLOAD_UNEXPECTED_ERROR", raw.slice(0, 240));
  return { code: "UPLOAD_TICKET_FAILED", status: 500 };
}

serve(async (request: Request) => {
  if (request.method !== "POST") {
    return jsonResponse(405, { ok: false, code: "METHOD_NOT_ALLOWED" });
  }

  const authorization = request.headers.get("Authorization")?.trim();
  if (!authorization?.startsWith("Bearer ")) {
    return jsonResponse(401, { ok: false, code: "AUTHORIZATION_REQUIRED" });
  }

  try {
    const body = await readBoundedJson(request);
    assertMetadataFree(body);

    const postId = body.post_id;
    const idempotencyKey = body.idempotency_key;
    assertUuid(postId, "POST_ID_INVALID");
    if (typeof idempotencyKey !== "string" || idempotencyKey.trim().length < 16 || idempotencyKey.trim().length > 128) {
      throw new Error("IDEMPOTENCY_KEY_INVALID");
    }

    const supabaseUrl = requiredEnv("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")?.trim() || requiredEnv("SUPABASE_PUBLISHABLE_KEY");
    const serviceRoleKey = requiredEnv("SUPABASE_SERVICE_ROLE_KEY");

    // User-scoped client is the authorization authority for the reservation RPC.
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: reservationData, error: reservationError } = await userClient.rpc(
      "vvip_social_media_reserve_upload",
      {
        target_post: postId,
        request_idempotency_key: idempotencyKey.trim(),
      },
    );
    if (reservationError) {
      console.error("TIGER_UPLOAD_RESERVATION_ERROR", reservationError.message);
      throw new Error("RESERVATION_DENIED");
    }

    const reservation = (Array.isArray(reservationData) ? reservationData[0] : reservationData) as ReservationRow | null;
    if (!reservation) throw new Error("RESERVATION_EMPTY");
    assertUuid(reservation.media_id, "RESERVATION_MEDIA_INVALID");
    assertUuid(reservation.ticket_id, "RESERVATION_TICKET_INVALID");
    if (reservation.bucket_id !== EXPECTED_BUCKET) throw new Error("RESERVATION_BUCKET_INVALID");
    if (!reservation.quarantine_storage_path.startsWith("quarantine/") || !reservation.quarantine_storage_path.endsWith(".blob")) {
      throw new Error("RESERVATION_PATH_INVALID");
    }

    const leaseExpiresAt = Date.parse(reservation.upload_lease_expires_at);
    const now = Date.now();
    if (!Number.isFinite(leaseExpiresAt) || leaseExpiresAt <= now) {
      throw new Error("TIGER_UPLOAD_LEASE_EXPIRED");
    }
    // The provider's signed-upload token currently has its own TTL. TIGER never
    // represents that provider TTL as 300 seconds. The database acceptance lease
    // is the canonical authorization window and late upload events fail closed.
    if (leaseExpiresAt - now > (TIGER_UPLOAD_LEASE_SECONDS + 15) * 1000) {
      throw new Error("TIGER_UPLOAD_LEASE_INVALID");
    }

    // Service authority is used only to mint a capability for the exact path
    // already authorized/derived by PostgreSQL. The service credential is never
    // returned to the caller and cannot select a client-provided path.
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: signed, error: signedError } = await adminClient.storage
      .from(EXPECTED_BUCKET)
      .createSignedUploadUrl(reservation.quarantine_storage_path, { upsert: false });
    if (signedError || !signed?.signedUrl || !signed?.token) {
      console.error("TIGER_SIGNED_UPLOAD_CAPABILITY_ERROR", signedError?.message ?? "EMPTY");
      throw new Error("SIGNED_UPLOAD_CAPABILITY_FAILED");
    }

    return jsonResponse(201, {
      ok: true,
      media_id: reservation.media_id,
      ticket_id: reservation.ticket_id,
      quarantine_path: reservation.quarantine_storage_path,
      signed_upload_url: signed.signedUrl,
      upload_token: signed.token,
      upload_lease_expires_at: reservation.upload_lease_expires_at,
      tiger_upload_lease_seconds: TIGER_UPLOAD_LEASE_SECONDS,
      provider_ttl_is_authoritative: false,
    });
  } catch (error) {
    const publicError = publicUploadError(error);
    return jsonResponse(publicError.status, { ok: false, code: publicError.code });
  }
});
