import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { sendPush, type ProviderResult, type PushRequest } from "./adapter.ts";
import { TigerNotificationWorkerAuthError, verifyWorkerChallenge } from "./auth.ts";

const MAX_BATCH = 16;
const WORKER_ID = "tiger-notification-worker/2026.08.20-v1";

const NO_STORE_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
  "Pragma": "no-cache",
};

type ClaimRow = {
  dispatch_id: string;
  generation: number;
  endpoint_capability: string;
  provider: string;
  notification_id: string;
  category: string;
  preview: { title: string; body: string };
  object_type: string | null;
  object_id: string | null;
  ttl_seconds: number;
  importance: string;
  collapse_key: string | null;
};

class TigerNotificationWorkerError extends Error {
  constructor(readonly code: string) {
    super(code);
    this.name = "TigerNotificationWorkerError";
  }
}

function requiredEnv(name: string): string {
  const value = Deno.env.get(name)?.trim();
  if (!value) throw new TigerNotificationWorkerError(`SERVER_CONFIG_MISSING:${name}`);
  return value;
}

function jsonResponse(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), { status, headers: NO_STORE_HEADERS });
}

function providerMode(): "fake" | "local" {
  const value = (Deno.env.get("TIGER_NOTIFICATION_PROVIDER_MODE") ?? "fake").trim().toLowerCase();
  if (value !== "fake" && value !== "local") {
    throw new TigerNotificationWorkerError("PRODUCTION_PROVIDER_NOT_ACTIVATED");
  }
  return value;
}

function toPushRequest(row: ClaimRow): PushRequest {
  return {
    endpointCapability: row.endpoint_capability,
    notificationId: row.notification_id,
    category: row.category,
    preview: row.preview,
    ttlSeconds: row.ttl_seconds,
    importance: row.importance,
    collapseKey: row.collapse_key,
    objectType: row.object_type,
    objectId: row.object_id,
  };
}

function settlementArgs(row: ClaimRow, result: ProviderResult) {
  return {
    p_dispatch_id: row.dispatch_id,
    p_expected_generation: row.generation,
    p_result_class: result.class,
    p_provider_message_ref: result.class === "accepted" ? result.providerMessageRef : null,
    p_error_class: result.class === "accepted" ? null : result.errorClass,
    p_retry_after_seconds: result.class === "rate_limited" ? result.retryAfterSeconds : null,
  };
}

serve(async (request: Request) => {
  if (request.method !== "POST") {
    return jsonResponse(405, { ok: false, code: "METHOD_NOT_ALLOWED" });
  }

  try {
    const notificationWorkerSecret = requiredEnv("TIGER_NOTIFICATION_WORKER_SECRET");
    const challenge = await verifyWorkerChallenge(request, notificationWorkerSecret);

    const supabaseUrl = requiredEnv("SUPABASE_URL");
    const serviceRoleKey = requiredEnv("SUPABASE_SERVICE_ROLE_KEY");
    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // HMAC proof is not sufficient by itself: consume the nonce durably before any claim.
    const { data: nonceAccepted, error: nonceError } = await admin.rpc(
      "vvip_notification_consume_worker_challenge",
      {
        challenge_nonce: challenge.nonce,
        challenge_timestamp: challenge.timestamp,
      },
    );
    if (nonceError || nonceAccepted !== true) {
      return jsonResponse(401, { ok: false, code: "WORKER_AUTH_REPLAY_OR_EXPIRED" });
    }

    const { data: claims, error: claimError } = await admin.rpc(
      "vvip_notification_claim_dispatches",
      { p_limit: MAX_BATCH, p_worker: WORKER_ID },
    );
    if (claimError) throw new TigerNotificationWorkerError("DISPATCH_CLAIM_FAILED");

    const rows = Array.isArray(claims) ? claims as ClaimRow[] : [];
    const mode = providerMode();
    let settled = 0;
    let settlementFailures = 0;

    for (const row of rows) {
      let result: ProviderResult;
      try {
        result = await sendPush(toPushRequest(row), row.provider, mode);
      } catch {
        result = { class: "retryable", errorClass: "adapter_execution_failed" };
      }

      const { error: settleError } = await admin.rpc(
        "vvip_notification_settle_dispatch",
        settlementArgs(row, result),
      );
      if (settleError) {
        settlementFailures += 1;
      } else {
        settled += 1;
      }
    }

    return jsonResponse(200, {
      ok: true,
      claimed: rows.length,
      settled,
      settlement_failures: settlementFailures,
    });
  } catch (error) {
    if (error instanceof TigerNotificationWorkerAuthError) {
      return jsonResponse(401, { ok: false, code: error.code });
    }
    const code = error instanceof TigerNotificationWorkerError ? error.code : "WORKER_INTERNAL_ERROR";
    return jsonResponse(500, { ok: false, code });
  }
});
