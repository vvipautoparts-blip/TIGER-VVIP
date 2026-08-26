"use strict";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const HEX_64_PATTERN = /^[0-9a-f]{64}$/i;
const OBJECT_TYPES = new Set(["listing", "intent_offer"]);
const TOKEN_PATTERN = /^[a-z][a-z0-9_]{0,63}$/;
const POLICY_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,95}$/;

const PROOF_STATES = Object.freeze({
  FRESH: "fresh",
  EXPIRED: "expired",
  FAILED: "failed",
  NOT_VERIFIED: "not_verified",
});

function requiredString(value, code) {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text) throw new Error(code);
  return text;
}

function normalizeUuid(value, code) {
  const text = requiredString(value, code).toLowerCase();
  if (!UUID_PATTERN.test(text)) throw new Error(code);
  return text;
}

function normalizeHex64(value, code) {
  const text = requiredString(value, code).toLowerCase();
  if (!HEX_64_PATTERN.test(text)) throw new Error(code);
  return text;
}

function buildIssueRequest(input = {}) {
  const objectType = requiredString(input.objectType, "PROOF_OBJECT_TYPE_REQUIRED").toLowerCase();
  if (!OBJECT_TYPES.has(objectType)) throw new Error("PROOF_OBJECT_TYPE_INVALID");

  const purpose = requiredString(input.purpose, "PROOF_PURPOSE_REQUIRED").toLowerCase();
  if (!TOKEN_PATTERN.test(purpose)) throw new Error("PROOF_PURPOSE_INVALID");

  const policyVersion = requiredString(input.policyVersion, "PROOF_POLICY_VERSION_REQUIRED");
  if (!POLICY_PATTERN.test(policyVersion)) throw new Error("PROOF_POLICY_VERSION_INVALID");

  return Object.freeze({
    action: "issue",
    object_type: objectType,
    object_id: normalizeUuid(input.objectId, "PROOF_OBJECT_ID_INVALID"),
    purpose,
    policy_version: policyVersion,
  });
}

function buildPrepareCaptureRequest(input = {}) {
  return Object.freeze({
    action: "prepare_capture",
    challenge_id: normalizeUuid(input.challengeId, "PROOF_CHALLENGE_ID_INVALID"),
  });
}

function buildConsumeRequest(input = {}) {
  return Object.freeze({
    action: "consume",
    challenge_id: normalizeUuid(input.challengeId, "PROOF_CHALLENGE_ID_INVALID"),
    nonce: normalizeHex64(input.nonce, "PROOF_NONCE_INVALID"),
    capture_receipt_id: normalizeUuid(input.captureReceiptId, "PROOF_CAPTURE_RECEIPT_ID_INVALID"),
  });
}

const COPY = Object.freeze({
  en: Object.freeze({
    fresh: "Fresh capture completed for this challenge. This does not establish ownership, condition, or authenticity.",
    expired: "This Proof-of-Now challenge expired before an accepted capture was completed.",
    failed: "Proof-of-Now checks did not complete successfully. No verification claim is made.",
    not_verified: "No current Proof-of-Now evidence is available for this item.",
  }),
  ar: Object.freeze({
    fresh: "اكتمل التقاط حديث لهذا التحدي. لا يثبت ذلك الملكية أو حالة العنصر أو أصالته.",
    expired: "انتهت صلاحية تحدي إثبات الحاضر قبل اكتمال التقاط مقبول.",
    failed: "لم تكتمل فحوص إثبات الحاضر بنجاح، لذلك لا تُعرض أي دعوى تحقق.",
    not_verified: "لا يتوفر حاليًا دليل صالح لإثبات الحاضر لهذا العنصر.",
  }),
});

function proofStateCopy(state, locale = "en") {
  if (!Object.values(PROOF_STATES).includes(state)) throw new Error("PROOF_STATE_INVALID");
  const language = locale === "ar" ? "ar" : "en";
  return COPY[language][state];
}

module.exports = Object.freeze({
  PROOF_STATES,
  buildIssueRequest,
  buildPrepareCaptureRequest,
  buildConsumeRequest,
  proofStateCopy,
});
