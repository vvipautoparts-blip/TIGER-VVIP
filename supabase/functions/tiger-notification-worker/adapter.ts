export type NotificationSensitivity = "low" | "private" | "sensitive" | "security";

export type PushPreview = {
  title: string;
  body: string;
};

export type PushRequest = {
  endpointCapability: string;
  notificationId: string;
  category: string;
  sensitivity?: NotificationSensitivity;
  preview: PushPreview;
  ttlSeconds: number;
  importance: string;
  collapseKey: string | null;
  objectType: string | null;
  objectId: string | null;
};

export type ProviderResult =
  | { class: "accepted"; providerMessageRef: string | null }
  | { class: "retryable"; errorClass: string }
  | { class: "rate_limited"; errorClass: string; retryAfterSeconds: number }
  | { class: "endpoint_invalid"; errorClass: string }
  | { class: "permanent_failure"; errorClass: string };

const GENERIC_NOTIFICATION: PushPreview = {
  title: "VVIP TIGER",
  body: "You have a new notification",
};

const GENERIC_MESSAGE: PushPreview = {
  title: "VVIP TIGER",
  body: "You have a new message",
};

const GENERIC_SECURITY: PushPreview = {
  title: "VVIP TIGER Security",
  body: "A security notification is available",
};

function boundedText(value: string, max: number): string {
  const normalized = value.trim();
  if (!normalized || normalized.length > max) {
    throw new Error("TIGER_NOTIFICATION_ADAPTER_TEXT_INVALID");
  }
  return normalized;
}

export function redactPreview(
  category: string,
  sensitivity: NotificationSensitivity | undefined,
  preview: PushPreview,
): PushPreview {
  if (category === "social_message") return { ...GENERIC_MESSAGE };
  if (sensitivity === "security") return { ...GENERIC_SECURITY };
  if (sensitivity === "private" || sensitivity === "sensitive") {
    return { ...GENERIC_NOTIFICATION };
  }
  return {
    title: boundedText(preview.title, 120),
    body: boundedText(preview.body, 240),
  };
}

function validateRequest(request: PushRequest): PushRequest {
  if (!/^[0-9a-f-]{36}$/i.test(request.notificationId)) {
    throw new Error("TIGER_NOTIFICATION_ADAPTER_NOTIFICATION_ID_INVALID");
  }
  if (!Number.isSafeInteger(request.ttlSeconds) || request.ttlSeconds < 0 || request.ttlSeconds > 604800) {
    throw new Error("TIGER_NOTIFICATION_ADAPTER_TTL_INVALID");
  }
  if (!request.endpointCapability || request.endpointCapability.length < 16 || request.endpointCapability.length > 4096) {
    throw new Error("TIGER_NOTIFICATION_ADAPTER_ENDPOINT_INVALID");
  }
  if (request.collapseKey !== null && (request.collapseKey.length < 1 || request.collapseKey.length > 120)) {
    throw new Error("TIGER_NOTIFICATION_ADAPTER_COLLAPSE_INVALID");
  }
  return {
    ...request,
    preview: redactPreview(request.category, request.sensitivity, request.preview),
  };
}

function deterministicFakeResult(request: PushRequest): ProviderResult {
  const capability = request.endpointCapability;
  if (request.ttlSeconds <= 0) {
    return { class: "permanent_failure", errorClass: "expired_before_provider" };
  }
  if (capability.startsWith("fake:invalid:")) {
    return { class: "endpoint_invalid", errorClass: "fake_endpoint_invalid" };
  }
  if (capability.startsWith("fake:retryable:")) {
    return { class: "retryable", errorClass: "fake_retryable" };
  }
  if (capability.startsWith("fake:rate-limited:")) {
    return { class: "rate_limited", errorClass: "fake_rate_limited", retryAfterSeconds: 60 };
  }
  if (capability.startsWith("fake:permanent:")) {
    return { class: "permanent_failure", errorClass: "fake_permanent_failure" };
  }
  return { class: "accepted", providerMessageRef: `fake:${request.notificationId}` };
}

export async function sendPush(
  rawRequest: PushRequest,
  provider: string,
  mode: "fake" | "local" = "fake",
): Promise<ProviderResult> {
  const request = validateRequest(rawRequest);
  if (mode !== "fake" && mode !== "local") {
    throw new Error("TIGER_NOTIFICATION_PROVIDER_MODE_INVALID");
  }

  // Gate 4 repository implementation intentionally has no Production provider adapter.
  // Provider activation is a later environment-specific gate; fake/local is deterministic.
  if (!['fake', 'webpush', 'apns', 'fcm'].includes(provider)) {
    return { class: "permanent_failure", errorClass: "provider_unsupported" };
  }
  return deterministicFakeResult(request);
}
