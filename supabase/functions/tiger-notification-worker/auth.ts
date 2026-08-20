export const WORKER_AUTH_WINDOW_SECONDS = 60;

export type WorkerChallenge = {
  timestamp: number;
  nonce: string;
};

export class TigerNotificationWorkerAuthError extends Error {
  constructor(readonly code: string) {
    super(code);
    this.name = "TigerNotificationWorkerAuthError";
  }
}

function bytesToHex(bytes: Uint8Array): string {
  return [...bytes].map((value) => value.toString(16).padStart(2, "0")).join("");
}

async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  return bytesToHex(new Uint8Array(signature));
}

export async function constantTimeEqual(left: string, right: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const [leftHash, rightHash] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(left)),
    crypto.subtle.digest("SHA-256", encoder.encode(right)),
  ]);
  const a = new Uint8Array(leftHash);
  const b = new Uint8Array(rightHash);
  let diff = a.byteLength ^ b.byteLength;
  for (let index = 0; index < Math.max(a.byteLength, b.byteLength); index += 1) {
    diff |= (a[index] ?? 0) ^ (b[index] ?? 0);
  }
  return diff === 0;
}

export function workerChallengeMessage(timestamp: number, nonce: string): string {
  return `tiger-notification-worker-v1\n${timestamp}\n${nonce}\nPOST\n/functions/v1/tiger-notification-worker`;
}

export async function signWorkerChallenge(secret: string, timestamp: number, nonce: string): Promise<string> {
  if (secret.length < 32 || secret.length > 512) {
    throw new TigerNotificationWorkerAuthError("WORKER_SECRET_INVALID");
  }
  return hmacSha256Hex(secret, workerChallengeMessage(timestamp, nonce));
}

export async function verifyWorkerChallenge(
  request: Request,
  secret: string,
  nowSeconds = Math.floor(Date.now() / 1000),
): Promise<WorkerChallenge> {
  const signature = request.headers.get("x-tiger-worker-signature")?.trim().toLowerCase() ?? "";
  const timestampRaw = request.headers.get("x-tiger-worker-timestamp")?.trim() ?? "";
  const nonce = request.headers.get("x-tiger-worker-nonce")?.trim().toLowerCase() ?? "";

  if (!/^[0-9a-f]{64}$/.test(signature) || !/^[0-9]{10,11}$/.test(timestampRaw) || !/^[0-9a-f]{32}$/.test(nonce)) {
    throw new TigerNotificationWorkerAuthError("WORKER_AUTH_INVALID");
  }
  if (secret.length < 32 || secret.length > 512) {
    throw new TigerNotificationWorkerAuthError("WORKER_SECRET_INVALID");
  }

  const timestamp = Number(timestampRaw);
  if (!Number.isSafeInteger(timestamp) || Math.abs(nowSeconds - timestamp) > WORKER_AUTH_WINDOW_SECONDS) {
    throw new TigerNotificationWorkerAuthError("WORKER_AUTH_EXPIRED");
  }

  const expected = await hmacSha256Hex(secret, workerChallengeMessage(timestamp, nonce));
  if (!(await constantTimeEqual(signature, expected))) {
    throw new TigerNotificationWorkerAuthError("WORKER_AUTH_FAILED");
  }
  return { timestamp, nonce };
}
