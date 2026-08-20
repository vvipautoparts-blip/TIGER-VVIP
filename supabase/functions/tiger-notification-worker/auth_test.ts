import {
  signWorkerChallenge,
  TigerNotificationWorkerAuthError,
  verifyWorkerChallenge,
} from "./auth.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const SECRET = "gate4-test-secret-0123456789-abcdefghijklmnopqrstuvwxyz";
const NOW = 1787210000;
const NONCE = "0123456789abcdef0123456789abcdef";

async function requestFor(timestamp: number, nonce = NONCE, signatureOverride?: string): Promise<Request> {
  const signature = signatureOverride ?? await signWorkerChallenge(SECRET, timestamp, nonce);
  return new Request("https://local.invalid/functions/v1/tiger-notification-worker", {
    method: "POST",
    headers: {
      "x-tiger-worker-signature": signature,
      "x-tiger-worker-timestamp": String(timestamp),
      "x-tiger-worker-nonce": nonce,
    },
  });
}

Deno.test("Gate 4 valid HMAC worker challenge is accepted with its nonce", async () => {
  const challenge = await verifyWorkerChallenge(await requestFor(NOW), SECRET, NOW);
  assert(challenge.timestamp === NOW, "valid timestamp must be preserved");
  assert(challenge.nonce === NONCE, "valid nonce must be preserved for durable replay consumption");
});

Deno.test("Gate 4 expired HMAC challenge is denied", async () => {
  let code = "";
  try {
    await verifyWorkerChallenge(await requestFor(NOW - 61), SECRET, NOW);
  } catch (error) {
    code = error instanceof TigerNotificationWorkerAuthError ? error.code : "unexpected";
  }
  assert(code === "WORKER_AUTH_EXPIRED", "expired challenge must fail closed");
});

Deno.test("Gate 4 tampered HMAC signature is denied", async () => {
  const valid = await signWorkerChallenge(SECRET, NOW, NONCE);
  const tampered = `${valid.slice(0, -1)}${valid.endsWith("0") ? "1" : "0"}`;
  let code = "";
  try {
    await verifyWorkerChallenge(await requestFor(NOW, NONCE, tampered), SECRET, NOW);
  } catch (error) {
    code = error instanceof TigerNotificationWorkerAuthError ? error.code : "unexpected";
  }
  assert(code === "WORKER_AUTH_FAILED", "tampered signature must fail closed");
});

Deno.test("Gate 4 malformed nonce is denied before database replay consumption", async () => {
  const badNonce = "not-a-valid-nonce";
  const signature = await signWorkerChallenge(SECRET, NOW, badNonce);
  let code = "";
  try {
    await verifyWorkerChallenge(await requestFor(NOW, badNonce, signature), SECRET, NOW);
  } catch (error) {
    code = error instanceof TigerNotificationWorkerAuthError ? error.code : "unexpected";
  }
  assert(code === "WORKER_AUTH_INVALID", "malformed nonce must be invalid");
});
