import { normalizeNexusIntent } from "./living-sector-object.js";

const SECTOR_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;

function failure(code) {
  return Object.freeze({ ok: false, code });
}

function normalizeSectorId(value) {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return SECTOR_ID.test(normalized) ? normalized : null;
}

function hasRpcClient(client) {
  return Boolean(client && typeof client.rpc === "function");
}

async function createNexusPost(client, input) {
  if (!hasRpcClient(client)) return failure("SOCIAL_RUNTIME_UNAVAILABLE");
  if (!input || typeof input !== "object" || Array.isArray(input)) return failure("SOCIAL_INVALID_POST");

  const sectorId = normalizeSectorId(input.sectorId);
  if (!sectorId) return failure("NEXUS_SECTOR_REQUIRED");
  const intent = normalizeNexusIntent(input.intent);
  if (!intent) return failure("NEXUS_INTENT_REQUIRED");

  let response;
  try {
    response = await client.rpc("vvip_social_post_create", {
      p_body: input.body,
      p_audience: input.audience,
      p_sector_key: sectorId,
      p_intent_class: intent
    });
  } catch (_) {
    return failure("SOCIAL_PERSISTENCE_FAILED");
  }

  if (!response || response.error || response.data === null || response.data === undefined) {
    return failure("SOCIAL_PERSISTENCE_FAILED");
  }

  return Object.freeze({ ok: true, value: response.data });
}

export function wrapNexusSocialRuntime(baseRuntime, client) {
  if (!baseRuntime || typeof baseRuntime !== "object" || !baseRuntime.posts) {
    throw new TypeError("NEXUS_SOCIAL_RUNTIME_REQUIRED");
  }

  const posts = Object.freeze({
    ...baseRuntime.posts,
    create: (input) => createNexusPost(client, input)
  });

  return Object.freeze({
    ...baseRuntime,
    posts
  });
}
