import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const EXPECTED_BUCKET = "social-private-media";
const MAX_BODY_BYTES = 32 * 1024;
const NO_STORE_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
  "Pragma": "no-cache",
};

type StorageRecord = {
  id?: unknown;
  bucket_id?: unknown;
  name?: unknown;
};

type StorageWebhookPayload = {
  type?: unknown;
  table?: unknown;
  schema?: unknown;
  record?: StorageRecord | null;
  old_record?: unknown;
};

type AcceptedRow = {
  event_id: string;
  media_id: string;
};

function jsonResponse(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), { status, headers: NO_STORE_HEADERS });
}

function requiredEnv(name: string): string {
  const value = Deno.env.get(name)?.trim();
  if (!value) throw new Error(`SERVER_CONFIG_MISSING:${name}`);
  return value;
}

async function constantTimeEqual(left: string, right: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const [leftHash, rightHash] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(left)),
    crypto.subtle.digest("SHA-256", encoder.encode(right)),
  ]);
  const a = new Uint8Array(leftHash);
  const b = new Uint8Array(rightHash);
  let diff = a.byteLength ^ b.byteLength;
  for (let i = 0; i < Math.max(a.byteLength, b.byteLength); i += 1) {
    diff |= (a[i] ?? 0) ^ (b[i] ?? 0);
  }
  return diff === 0;
}

async function sha256Hex(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)]
    .map((item) => item.toString(16).padStart(2, "0"))
    .join("");
}

async function readBoundedJson(request: Request): Promise<StorageWebhookPayload> {
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

  const body = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(new TextDecoder().decode(body));
  } catch {
    throw new Error("REQUEST_JSON_INVALID");
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("REQUEST_JSON_OBJECT_REQUIRED");
  }
  return parsed as StorageWebhookPayload;
}

function requireString(value: unknown, code: string): string {
  if (typeof value !== "string" || value.length === 0) throw new Error(code);
  return value;
}

serve(async (request: Request) => {
  if (request.method !== "POST") {
    return jsonResponse(405, { ok: false, code: "METHOD_NOT_ALLOWED" });
  }

  try {
    // The webhook credential is deliberately distinct from the service-role key.
    // Compromise of the external ingress credential therefore cannot become a
    // general Supabase RLS-bypass credential. The service role is used only after
    // the request has crossed this scoped authentication boundary.
    const expectedWebhookSecret = requiredEnv("TIGER_STORAGE_WEBHOOK_SECRET");
    const suppliedWebhookSecret = request.headers.get("x-tiger-storage-webhook-secret")?.trim() ?? "";
    if (!suppliedWebhookSecret || !(await constantTimeEqual(suppliedWebhookSecret, expectedWebhookSecret))) {
      return jsonResponse(401, { ok: false, code: "STORAGE_WEBHOOK_AUTH_FAILED" });
    }

    const payload = await readBoundedJson(request);
    if (payload.type !== "INSERT") throw new Error("STORAGE_WEBHOOK_EVENT_TYPE_INVALID");
    if (payload.schema !== "storage") throw new Error("STORAGE_WEBHOOK_SCHEMA_INVALID");
    if (payload.table !== "objects") throw new Error("STORAGE_WEBHOOK_TABLE_INVALID");
    if (!payload.record || typeof payload.record !== "object") {
      throw new Error("STORAGE_WEBHOOK_RECORD_REQUIRED");
    }

    const record = payload.record;
    const storageEventId = requireString(record.id, "STORAGE_WEBHOOK_ID_INVALID");
    const bucketId = requireString(record.bucket_id, "STORAGE_WEBHOOK_BUCKET_INVALID");
    const objectPath = requireString(record.name, "STORAGE_WEBHOOK_PATH_INVALID");

    if (bucketId !== EXPECTED_BUCKET) throw new Error("STORAGE_WEBHOOK_BUCKET_INVALID");
    if (!objectPath.startsWith("quarantine/") || !objectPath.endsWith(".blob") || objectPath.length > 512) {
      throw new Error("STORAGE_WEBHOOK_PATH_INVALID");
    }
    if (!/^[0-9a-fA-F-]{36}$/.test(storageEventId)) {
      throw new Error("STORAGE_WEBHOOK_ID_INVALID");
    }

    // Hash only stable server-side storage identity facts. Retried webhook JSON can
    // contain non-authoritative metadata in a different serialization order.
    const payloadSha256 = await sha256Hex(
      `INSERT\u0000storage\u0000objects\u0000${storageEventId.toLowerCase()}\u0000${bucketId}\u0000${objectPath}`,
    );

    const supabaseUrl = requiredEnv("SUPABASE_URL");
    const serviceRoleKey = requiredEnv("SUPABASE_SERVICE_ROLE_KEY");
    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data, error } = await admin.rpc("vvip_social_media_webhook_accept_storage", {
      storage_event_id: storageEventId,
      event_payload_sha256: payloadSha256,
      event_bucket_id: bucketId,
      event_object_path: objectPath,
    });
    if (error) throw new Error(`STORAGE_WEBHOOK_ACCEPT_FAILED:${error.message}`);

    const row = (Array.isArray(data) ? data[0] : data) as AcceptedRow | null;
    if (!row?.event_id || !row?.media_id) throw new Error("STORAGE_WEBHOOK_ACCEPT_EMPTY");

    return jsonResponse(202, {
      ok: true,
      accepted: true,
      event_id: row.event_id,
      media_id: row.media_id,
    });
  } catch (error) {
    const code = (error instanceof Error ? error.message : "STORAGE_WEBHOOK_FAILED")
      .toUpperCase()
      .replace(/[^A-Z0-9_:-]/g, "_")
      .slice(0, 160);
    const status = code.includes("AUTH_FAILED") ? 401
      : code.includes("TOO_LARGE") ? 413
      : code.includes("SERVER_CONFIG") ? 503
      : 400;
    console.error("TIGER_STORAGE_WEBHOOK_INGRESS_ERROR", code);
    return jsonResponse(status, { ok: false, code });
  }
});
