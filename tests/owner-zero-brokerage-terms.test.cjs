"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const terms = fs.readFileSync(path.resolve(__dirname, "../terms-of-service.html"), "utf8");

test("terms make the external-commerce contact-handoff boundary unconditional", () => {
  assert.doesNotMatch(terms, /Unless a separately published service explicitly states otherwise/i);
  assert.doesNotMatch(terms, /ما لم تنص خدمة منشورة منفصلة على خلاف ذلك/u);
  assert.match(terms, /contact handoff/i);
  assert.match(terms, /does not.*buyer.*seller.*payment counterparty|never becomes.*payment counterparty/is);
  assert.match(terms, /لا.*طرف.*دفع.*المستخدم|لا تصبح.*طرف.*الدفع/us);
});

test("terms distinguish TIGER-owned advertising-service billing from the external deal", () => {
  assert.match(terms, /advertising|ad credits|paid visibility/i);
  assert.match(terms, /platform-owned service/i);
  assert.match(terms, /does not process.*advertised good|payment for the advertised good|external deal/i);
  assert.match(terms, /الإعلانات|خدمات.*المنصة/u);
});
