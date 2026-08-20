import { redactPreview, sendPush, type PushRequest } from "./adapter.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const base: PushRequest = {
  endpointCapability: "fake:accepted:device-0001",
  notificationId: "00000000-0000-4000-8000-000000000401",
  category: "social_reaction",
  sensitivity: "low",
  preview: { title: "Reaction", body: "Someone reacted" },
  ttlSeconds: 300,
  importance: "normal",
  collapseKey: "social_reaction:post:1",
  objectType: "post",
  objectId: "1",
};

Deno.test("Gate 4 fake adapter returns accepted deterministically", async () => {
  const result = await sendPush(base, "fake", "fake");
  assert(result.class === "accepted", "fake accepted endpoint must normalize to accepted");
});

Deno.test("Gate 4 fake adapter normalizes an invalid endpoint terminally", async () => {
  const result = await sendPush(
    { ...base, endpointCapability: "fake:invalid:device-0002" },
    "fake",
    "local",
  );
  assert(result.class === "endpoint_invalid", "invalid endpoint must normalize to endpoint_invalid");
});

Deno.test("Gate 4 adapter refuses expired TTL before provider transport", async () => {
  const result = await sendPush({ ...base, ttlSeconds: 0 }, "fake", "fake");
  assert(result.class === "permanent_failure", "expired TTL must never be accepted");
  assert(result.errorClass === "expired_before_provider", "TTL failure must be explicit");
});

Deno.test("Gate 4 social_message preview is always generic and redacted", () => {
  const preview = redactPreview(
    "social_message",
    "private",
    { title: "Alice", body: "SECRET MESSAGE BODY MUST NOT LEAK" },
  );
  assert(preview.title === "VVIP TIGER", "message preview title must be generic");
  assert(preview.body === "You have a new message", "message body must be generic");
  assert(!preview.body.includes("SECRET"), "durable message body must never reach push preview");
});

Deno.test("Gate 4 private and security previews are redacted", () => {
  const privatePreview = redactPreview("social_comment", "private", { title: "Private", body: "hidden" });
  const securityPreview = redactPreview("security_account", "security", { title: "OTP", body: "123456" });
  assert(privatePreview.body === "You have a new notification", "private preview must be generic");
  assert(!securityPreview.body.includes("123456"), "security secret must be redacted");
});
