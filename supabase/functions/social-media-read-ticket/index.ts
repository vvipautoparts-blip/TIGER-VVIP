import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const BUCKET = "social-private-media";
const MAX_BODY_BYTES = 2048;
const SIGNED_READ_SECONDS = 60;
const NO_STORE_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
  "Pragma": "no-cache",
};

const PUBLIC_READ_CODES = new Set([
  "REQUEST_BODY_REQUIRED",
  "REQUEST_BODY_TOO_LARGE",
  "REQUEST_JSON_INVALID",
  "REQUEST_JSON_OBJECT_REQUIRED",
  "MEDIA_ID_INVALID",
  "READ_DENIED",
  "READ_GRANT_INVALID",
  "READ_GRANT_CONSUME_FAILED",
  "READ_GRANT_BINDING_INVALID",
  "SIGNED_READ_FAILED",
]);

type ReadGrantRow = {
  media_id: string;
  canonical_storage_path: string;
  read_token: string;
  expires_at: string;
};

type ConsumedReadRow = {
  media_id: string;
  canonical_storage_path: string;
};

function jsonResponse(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), { status, headers: NO_STORE_HEADERS });
}

function requiredEnv(name: string): string {
  const value = Deno.env.get(name)?.trim();
  if (!value) {
    console.error("TIGER_READ_SERVER_CONFIG_MISSING", name);
    throw new Error("READ_SERVICE_UNAVAILABLE");
  }
  return value;
}

function assertUuid(value: unknown, code: string): asserts value is string {
  if (
    typeof value !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
  ) {
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

function publicReadError(error: unknown): { code: string; status: number } {
  const raw = error instanceof Error ? error.message : "PRIVATE_READ_FAILED";
  if (raw.startsWith("REQUEST_FIELD_NOT_ALLOWED:")) {
    return { code: "REQUEST_FIELD_NOT_ALLOWED", status: 400 };
  }
  if (raw === "READ_DENIED") return { code: raw, status: 403 };
  if (raw === "READ_SERVICE_UNAVAILABLE" || raw === "SIGNED_READ_FAILED") {
    return { code: raw, status: 503 };
  }
  if (raw === "REQUEST_BODY_TOO_LARGE") return { code: raw, status: 413 };
  if (PUBLIC_READ_CODES.has(raw)) return { code: raw, status: 400 };

  console.error("TIGER_PRIVATE_READ_UNEXPECTED_ERROR", raw.slice(0, 240));
  return { code: "PRIVATE_READ_FAILED", status: 500 };
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
    for (const field of Object.keys(body)) {
      if (field !== "media_id") throw new Error(`REQUEST_FIELD_NOT_ALLOWED:${field}`);
    }
    assertUuid(body.media_id, "MEDIA_ID_INVALID");
    const mediaId = body.media_id;

    const supabaseUrl = requiredEnv("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")?.trim() || requiredEnv("SUPABASE_PUBLISHABLE_KEY");
    const serviceRoleKey = requiredEnv("SUPABASE_SERVICE_ROLE_KEY");

    // Visibility is authorized using the caller's actual JWT/RLS context.
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: grantData, error: grantError } = await userClient.rpc(
      "vvip_social_media_request_read",
      { target_media: mediaId },
    );
    if (grantError) {
      console.error("TIGER_PRIVATE_READ_GRANT_ERROR", grantError.message);
      throw new Error("READ_DENIED");
    }

    const grant = (Array.isArray(grantData) ? grantData[0] : grantData) as ReadGrantRow | null;
    if (!grant?.read_token || grant.media_id !== mediaId || !grant.canonical_storage_path) {
      throw new Error("READ_GRANT_INVALID");
    }

    // The raw one-time token never leaves this server boundary. Service authority
    // consumes it atomically, rechecking current post visibility before signing.
    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: consumedData, error: consumeError } = await admin.rpc(
      "vvip_social_media_consume_read",
      { target_media: mediaId, grant_token: grant.read_token },
    );
    if (consumeError) {
      console.error("TIGER_PRIVATE_READ_CONSUME_ERROR", consumeError.message);
      throw new Error("READ_GRANT_CONSUME_FAILED");
    }

    const consumed = (Array.isArray(consumedData) ? consumedData[0] : consumedData) as ConsumedReadRow | null;
    if (
      !consumed ||
      consumed.media_id !== mediaId ||
      consumed.canonical_storage_path !== grant.canonical_storage_path ||
      !consumed.canonical_storage_path.startsWith("canonical/media/") ||
      !consumed.canonical_storage_path.endsWith(".jpg")
    ) {
      throw new Error("READ_GRANT_BINDING_INVALID");
    }

    const { data: signed, error: signedError } = await admin.storage
      .from(BUCKET)
      .createSignedUrl(consumed.canonical_storage_path, SIGNED_READ_SECONDS);
    if (signedError || !signed?.signedUrl) {
      console.error("TIGER_SIGNED_READ_ERROR", signedError?.message ?? "EMPTY");
      throw new Error("SIGNED_READ_FAILED");
    }

    return jsonResponse(200, {
      ok: true,
      media_id: mediaId,
      signed_url: signed.signedUrl,
      expires_in_seconds: SIGNED_READ_SECONDS,
    });
  } catch (error) {
    const publicError = publicReadError(error);
    return jsonResponse(publicError.status, { ok: false, code: publicError.code });
  }
});
