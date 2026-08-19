import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import {
  AlphaAction,
  Gravity,
  ImageMagick,
  initializeImageMagick,
  MagickColor,
  MagickFormat,
} from "npm:@imagemagick/magick-wasm@0.0.42";

const MAGICK_SPECIFIER = "npm:@imagemagick/magick-wasm@0.0.42";
const wasmBytes = await Deno.readFile(
  new URL("magick.wasm", import.meta.resolve(MAGICK_SPECIFIER)),
);
await initializeImageMagick(wasmBytes);

const BUCKET = "social-private-media";
const MAX_SOURCE_BYTES = 15 * 1024 * 1024;
const MAX_CANONICAL_BYTES = 5 * 1024 * 1024;
const MAX_SOURCE_WIDTH = 8192;
const MAX_SOURCE_HEIGHT = 8192;
const MAX_SOURCE_PIXELS = 16_000_000;
const CANONICAL_WIDTH = 1600;
const CANONICAL_HEIGHT = 1200;
const CANONICAL_QUALITY = 85;
const CLEANUP_BATCH = 32;
const VERIFIER_VERSION = "tiger-media-finalizer/2026.08.20-v2";

const NO_STORE_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
  "Pragma": "no-cache",
};

type AdminClient = ReturnType<typeof createClient>;

type ClaimRow = {
  event_id: string;
  media_id: string;
  bucket_id: string;
  quarantine_storage_path: string;
  upload_lease_expires_at: string;
  attempt_count: number;
};

type CleanupRow = {
  media_id: string;
  quarantine_storage_path: string;
};

type MediaFacts = {
  mime: "image/jpeg" | "image/webp";
  width: number;
  height: number;
};

class TigerMediaError extends Error {
  constructor(readonly code: string) {
    super(code);
    this.name = "TigerMediaError";
  }
}

function jsonResponse(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), { status, headers: NO_STORE_HEADERS });
}

function requiredEnv(name: string): string {
  const value = Deno.env.get(name)?.trim();
  if (!value) throw new TigerMediaError(`SERVER_CONFIG_MISSING:${name}`);
  return value;
}

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)]
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
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

function ascii(bytes: Uint8Array, start: number, length: number): string {
  if (start < 0 || length < 0 || start + length > bytes.byteLength) {
    throw new TigerMediaError("SOCIAL_MEDIA_CONTAINER_TRUNCATED");
  }
  let output = "";
  for (let i = start; i < start + length; i += 1) output += String.fromCharCode(bytes[i]);
  return output;
}

function readU24LE(bytes: Uint8Array, offset: number): number {
  if (offset + 3 > bytes.byteLength) throw new TigerMediaError("SOCIAL_MEDIA_CONTAINER_TRUNCATED");
  return bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16);
}

function readU32LE(bytes: Uint8Array, offset: number): number {
  if (offset + 4 > bytes.byteLength) throw new TigerMediaError("SOCIAL_MEDIA_CONTAINER_TRUNCATED");
  return (
    bytes[offset] +
    bytes[offset + 1] * 0x100 +
    bytes[offset + 2] * 0x10000 +
    bytes[offset + 3] * 0x1000000
  );
}

function assertSourceGeometry(width: number, height: number): void {
  if (
    !Number.isSafeInteger(width) ||
    !Number.isSafeInteger(height) ||
    width < 320 ||
    height < 240 ||
    width > MAX_SOURCE_WIDTH ||
    height > MAX_SOURCE_HEIGHT ||
    width * height > MAX_SOURCE_PIXELS
  ) {
    throw new TigerMediaError("SOCIAL_MEDIA_SOURCE_GEOMETRY_INVALID");
  }
}

function detectJpeg(bytes: Uint8Array): MediaFacts {
  if (
    bytes.byteLength < 4 ||
    bytes[0] !== 0xff ||
    bytes[1] !== 0xd8 ||
    bytes[2] !== 0xff
  ) {
    throw new TigerMediaError("SOCIAL_MEDIA_MAGIC_INVALID");
  }

  const sofMarkers = new Set([
    0xc0, 0xc1, 0xc2, 0xc3,
    0xc5, 0xc6, 0xc7,
    0xc9, 0xca, 0xcb,
    0xcd, 0xce, 0xcf,
  ]);
  let offset = 2;
  while (offset + 3 < bytes.byteLength) {
    if (bytes[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    while (offset < bytes.byteLength && bytes[offset] === 0xff) offset += 1;
    if (offset >= bytes.byteLength) break;
    const marker = bytes[offset++];

    if (marker === 0xd9 || marker === 0xda) break;
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
    if (offset + 2 > bytes.byteLength) throw new TigerMediaError("SOCIAL_MEDIA_JPEG_TRUNCATED");

    const segmentLength = (bytes[offset] << 8) | bytes[offset + 1];
    if (segmentLength < 2 || offset + segmentLength > bytes.byteLength) {
      throw new TigerMediaError("SOCIAL_MEDIA_JPEG_SEGMENT_INVALID");
    }
    if (sofMarkers.has(marker)) {
      if (segmentLength < 7) throw new TigerMediaError("SOCIAL_MEDIA_JPEG_SOF_INVALID");
      const height = (bytes[offset + 3] << 8) | bytes[offset + 4];
      const width = (bytes[offset + 5] << 8) | bytes[offset + 6];
      assertSourceGeometry(width, height);
      return { mime: "image/jpeg", width, height };
    }
    offset += segmentLength;
  }
  throw new TigerMediaError("SOCIAL_MEDIA_JPEG_DIMENSIONS_MISSING");
}

function detectWebp(bytes: Uint8Array): MediaFacts {
  if (
    bytes.byteLength < 20 ||
    ascii(bytes, 0, 4) !== "RIFF" ||
    ascii(bytes, 8, 4) !== "WEBP"
  ) {
    throw new TigerMediaError("SOCIAL_MEDIA_MAGIC_INVALID");
  }

  const declaredSize = readU32LE(bytes, 4) + 8;
  if (declaredSize !== bytes.byteLength) {
    throw new TigerMediaError("SOCIAL_MEDIA_WEBP_CONTAINER_SIZE_INVALID");
  }

  let offset = 12;
  let dimensions: { width: number; height: number } | null = null;
  while (offset + 8 <= bytes.byteLength) {
    const chunkType = ascii(bytes, offset, 4);
    const chunkSize = readU32LE(bytes, offset + 4);
    const dataStart = offset + 8;
    const dataEnd = dataStart + chunkSize;
    if (dataEnd > bytes.byteLength) throw new TigerMediaError("SOCIAL_MEDIA_WEBP_CHUNK_INVALID");

    if (chunkType === "ANIM" || chunkType === "ANMF") {
      throw new TigerMediaError("SOCIAL_MEDIA_ANIMATED_WEBP_REJECTED");
    }

    if (chunkType === "VP8X") {
      if (chunkSize < 10) throw new TigerMediaError("SOCIAL_MEDIA_WEBP_VP8X_INVALID");
      const flags = bytes[dataStart];
      if ((flags & 0x02) !== 0) throw new TigerMediaError("SOCIAL_MEDIA_ANIMATED_WEBP_REJECTED");
      dimensions = {
        width: 1 + readU24LE(bytes, dataStart + 4),
        height: 1 + readU24LE(bytes, dataStart + 7),
      };
    } else if (chunkType === "VP8 ") {
      if (
        chunkSize < 10 ||
        bytes[dataStart + 3] !== 0x9d ||
        bytes[dataStart + 4] !== 0x01 ||
        bytes[dataStart + 5] !== 0x2a
      ) {
        throw new TigerMediaError("SOCIAL_MEDIA_WEBP_VP8_INVALID");
      }
      dimensions = {
        width: ((bytes[dataStart + 7] << 8) | bytes[dataStart + 6]) & 0x3fff,
        height: ((bytes[dataStart + 9] << 8) | bytes[dataStart + 8]) & 0x3fff,
      };
    } else if (chunkType === "VP8L") {
      if (chunkSize < 5 || bytes[dataStart] !== 0x2f) {
        throw new TigerMediaError("SOCIAL_MEDIA_WEBP_VP8L_INVALID");
      }
      const b1 = bytes[dataStart + 1];
      const b2 = bytes[dataStart + 2];
      const b3 = bytes[dataStart + 3];
      const b4 = bytes[dataStart + 4];
      dimensions = {
        width: 1 + (((b2 & 0x3f) << 8) | b1),
        height: 1 + (((b4 & 0x0f) << 10) | (b3 << 2) | ((b2 & 0xc0) >> 6)),
      };
    }

    offset = dataEnd + (chunkSize & 1);
  }

  if (!dimensions) throw new TigerMediaError("SOCIAL_MEDIA_WEBP_DIMENSIONS_MISSING");
  assertSourceGeometry(dimensions.width, dimensions.height);
  return { mime: "image/webp", ...dimensions };
}

function detectMedia(bytes: Uint8Array): MediaFacts {
  if (bytes.byteLength >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return detectJpeg(bytes);
  }
  if (
    bytes.byteLength >= 12 &&
    ascii(bytes, 0, 4) === "RIFF" &&
    ascii(bytes, 8, 4) === "WEBP"
  ) {
    return detectWebp(bytes);
  }
  throw new TigerMediaError("SOCIAL_MEDIA_MAGIC_INVALID");
}

function canonicalize(sourceBytes: Uint8Array, sourceFacts: MediaFacts): Uint8Array {
  return ImageMagick.read(sourceBytes, (image): Uint8Array => {
    image.autoOrient();

    // Re-check the decoded image even though dimensions were parsed before decode.
    const width = image.width;
    const height = image.height;
    if (width * height > MAX_SOURCE_PIXELS || width <= 0 || height <= 0) {
      throw new TigerMediaError("SOCIAL_MEDIA_DECODED_GEOMETRY_INVALID");
    }

    // Orientation may swap width/height, but material divergence from the parsed
    // dimensions is rejected before any canonical output is trusted.
    const sameGeometry =
      (width === sourceFacts.width && height === sourceFacts.height) ||
      (width === sourceFacts.height && height === sourceFacts.width);
    if (!sameGeometry) throw new TigerMediaError("SOCIAL_MEDIA_DECODED_GEOMETRY_MISMATCH");

    for (const profileName of [...image.profileNames]) image.removeProfile(profileName);
    image.strip();

    image.backgroundColor = new MagickColor("#ffffff");
    if (image.hasAlpha) image.alpha(AlphaAction.Remove);

    const targetRatio = CANONICAL_WIDTH / CANONICAL_HEIGHT;
    const currentRatio = image.width / image.height;
    if (currentRatio > targetRatio) {
      image.crop(Math.floor(image.height * targetRatio), image.height, Gravity.Center);
    } else if (currentRatio < targetRatio) {
      image.crop(image.width, Math.floor(image.width / targetRatio), Gravity.Center);
    }
    image.resetPage();
    image.resize(CANONICAL_WIDTH, CANONICAL_HEIGHT);
    if (image.width !== CANONICAL_WIDTH || image.height !== CANONICAL_HEIGHT) {
      throw new TigerMediaError("SOCIAL_MEDIA_CANONICAL_GEOMETRY_INVALID");
    }

    image.quality = CANONICAL_QUALITY;
    return image.write(MagickFormat.Jpeg, (data) => Uint8Array.from(data));
  });
}

function normalizeRpcRow<T>(data: unknown): T | null {
  if (Array.isArray(data)) return (data[0] ?? null) as T | null;
  return (data ?? null) as T | null;
}

function safeErrorCode(error: unknown): string {
  const raw = error instanceof TigerMediaError
    ? error.code
    : error instanceof Error
    ? error.message
    : "SOCIAL_MEDIA_WORKER_FAILURE";
  return raw.toUpperCase().replace(/[^A-Z0-9_:-]/g, "_").slice(0, 120) || "SOCIAL_MEDIA_WORKER_FAILURE";
}

async function purgeQuarantine(admin: AdminClient): Promise<void> {
  const { data, error } = await admin.rpc("vvip_social_media_claim_quarantine_cleanup", {
    max_rows: CLEANUP_BATCH,
  });
  if (error) throw new TigerMediaError(`QUARANTINE_CLEANUP_CLAIM_FAILED:${error.message}`);

  for (const row of (data ?? []) as CleanupRow[]) {
    if (!row?.media_id || !row?.quarantine_storage_path) continue;
    const { error: removeError } = await admin.storage.from(BUCKET).remove([
      row.quarantine_storage_path,
    ]);
    if (removeError) {
      console.error("TIGER_QUARANTINE_PURGE_RETRY", row.media_id, removeError.message);
      continue;
    }
    const { error: ackError } = await admin.rpc("vvip_social_media_mark_quarantine_purged", {
      target_media: row.media_id,
      expected_quarantine_path: row.quarantine_storage_path,
    });
    if (ackError) console.error("TIGER_QUARANTINE_PURGE_ACK_RETRY", row.media_id, ackError.message);
  }
}

async function ensureCanonicalObject(
  admin: AdminClient,
  canonicalPath: string,
  canonicalBytes: Uint8Array,
  canonicalSha256: string,
): Promise<void> {
  const { error: uploadError } = await admin.storage.from(BUCKET).upload(
    canonicalPath,
    canonicalBytes,
    {
      contentType: "image/jpeg",
      cacheControl: "31536000",
      upsert: false,
    },
  );
  if (!uploadError) return;

  // A prior attempt may have uploaded the deterministic path but lost the DB
  // response. Never overwrite it: verify the existing bytes instead.
  const { data: existing, error: downloadError } = await admin.storage.from(BUCKET).download(canonicalPath);
  if (downloadError || !existing) {
    throw new TigerMediaError(`CANONICAL_UPLOAD_FAILED:${uploadError.message}`);
  }
  const existingBytes = new Uint8Array(await existing.arrayBuffer());
  const existingSha = await sha256Hex(existingBytes);
  if (existingSha !== canonicalSha256 || existingBytes.byteLength !== canonicalBytes.byteLength) {
    throw new TigerMediaError("CANONICAL_PATH_COLLISION");
  }
}

async function compensateCanonicalUpload(admin: AdminClient, canonicalPath: string): Promise<void> {
  const { error } = await admin.storage.from(BUCKET).remove([canonicalPath]);
  if (error) {
    console.error("CANONICAL_PROMOTION_ROLLBACK_ORPHAN", canonicalPath, error.message);
  }
}

async function processOne(admin: AdminClient): Promise<{ processed: boolean; media_id?: string }> {
  const { data: claimData, error: claimError } = await admin.rpc("vvip_social_media_webhook_claim");
  if (claimError) throw new TigerMediaError(`WEBHOOK_CLAIM_FAILED:${claimError.message}`);
  const claim = normalizeRpcRow<ClaimRow>(claimData);
  if (!claim) return { processed: false };

  let canonicalPath: string | null = null;
  let canonicalUploaded = false;
  let committed = false;

  try {
    if (claim.bucket_id !== BUCKET || !claim.quarantine_storage_path.startsWith("quarantine/")) {
      throw new TigerMediaError("SOCIAL_MEDIA_CLAIM_PATH_INVALID");
    }

    const { data: sourceBlob, error: sourceError } = await admin.storage
      .from(BUCKET)
      .download(claim.quarantine_storage_path);
    if (sourceError || !sourceBlob) throw new TigerMediaError("SOCIAL_MEDIA_SOURCE_DOWNLOAD_FAILED");

    const sourceBytes = new Uint8Array(await sourceBlob.arrayBuffer());
    if (sourceBytes.byteLength < 1 || sourceBytes.byteLength > MAX_SOURCE_BYTES) {
      throw new TigerMediaError("SOCIAL_MEDIA_SIZE_INVALID");
    }

    // Magic bytes + container dimensions are validated before ImageMagick.read.
    const sourceFacts = detectMedia(sourceBytes);
    const sourceSha256 = await sha256Hex(sourceBytes);
    const canonicalBytes = canonicalize(sourceBytes, sourceFacts);
    if (canonicalBytes.byteLength < 1 || canonicalBytes.byteLength > MAX_CANONICAL_BYTES) {
      throw new TigerMediaError("SOCIAL_MEDIA_CANONICAL_SIZE_INVALID");
    }
    const canonicalSha256 = await sha256Hex(canonicalBytes);
    canonicalPath = `canonical/media/${canonicalSha256.slice(0, 2)}/${claim.media_id}.jpg`;

    await ensureCanonicalObject(admin, canonicalPath, canonicalBytes, canonicalSha256);
    canonicalUploaded = true;

    const { data: finalizedPath, error: finalizeError } = await admin.rpc(
      "vvip_social_media_finalize_event",
      {
        target_event: claim.event_id,
        target_media: claim.media_id,
        source_digest: sourceSha256,
        source_mime: sourceFacts.mime,
        source_size: sourceBytes.byteLength,
        source_image_width: sourceFacts.width,
        source_image_height: sourceFacts.height,
        canonical_path: canonicalPath,
        canonical_digest: canonicalSha256,
        canonical_size: canonicalBytes.byteLength,
        canonical_mime: "image/jpeg",
        canonical_image_width: CANONICAL_WIDTH,
        canonical_image_height: CANONICAL_HEIGHT,
        verifier_id: "supabase-edge-magick-wasm",
        verifier_build_version: VERIFIER_VERSION,
      },
    );
    if (finalizeError || finalizedPath !== canonicalPath) {
      throw new TigerMediaError(`CANONICAL_DB_FINALIZE_FAILED:${finalizeError?.message ?? "PATH_MISMATCH"}`);
    }
    committed = true;

    // Legacy vvip_social_media_webhook_complete is intentionally not called:
    // vvip_social_media_finalize_event completes READY + passport + event atomically.
    const { error: sourceRemoveError } = await admin.storage.from(BUCKET).remove([
      claim.quarantine_storage_path,
    ]);
    if (!sourceRemoveError) {
      const { error: purgeAckError } = await admin.rpc("vvip_social_media_mark_quarantine_purged", {
        target_media: claim.media_id,
        expected_quarantine_path: claim.quarantine_storage_path,
      });
      if (purgeAckError) console.error("TIGER_READY_SOURCE_PURGE_ACK_RETRY", claim.media_id, purgeAckError.message);
    } else {
      console.error("TIGER_READY_SOURCE_PURGE_RETRY", claim.media_id, sourceRemoveError.message);
    }

    return { processed: true, media_id: claim.media_id };
  } catch (error) {
    const code = safeErrorCode(error);
    if (canonicalUploaded && canonicalPath && !committed) {
      await compensateCanonicalUpload(admin, canonicalPath);
    }
    if (!committed) {
      const { error: failureError } = await admin.rpc("vvip_social_media_webhook_fail", {
        target_event: claim.event_id,
        error_code: code,
      });
      if (failureError) console.error("TIGER_WEBHOOK_FAILURE_RECORD_FAILED", claim.event_id, failureError.message);
    }
    throw new TigerMediaError(code);
  }
}

serve(async (request: Request) => {
  if (request.method !== "POST") {
    return jsonResponse(405, { ok: false, code: "METHOD_NOT_ALLOWED" });
  }

  try {
    const suppliedSecret = request.headers.get("x-tiger-worker-secret") ?? "";
    const expectedSecret = requiredEnv("TIGER_MEDIA_WORKER_SECRET");
    if (!suppliedSecret || !(await constantTimeEqual(suppliedSecret, expectedSecret))) {
      return jsonResponse(401, { ok: false, code: "WORKER_AUTH_FAILED" });
    }

    const supabaseUrl = requiredEnv("SUPABASE_URL");
    const serviceRoleKey = requiredEnv("SUPABASE_SERVICE_ROLE_KEY");
    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    await purgeQuarantine(admin);
    const result = await processOne(admin);
    return jsonResponse(200, { ok: true, ...result });
  } catch (error) {
    const code = safeErrorCode(error);
    console.error("TIGER_MEDIA_FINALIZER_ERROR", code);
    return jsonResponse(500, { ok: false, code });
  }
});
