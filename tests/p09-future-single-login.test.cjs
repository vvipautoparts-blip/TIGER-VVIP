"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const html = fs.readFileSync("index.html", "utf8");
const css = fs.existsSync("styles/vvip-p09-future-auth.css")
  ? fs.readFileSync("styles/vvip-p09-future-auth.css", "utf8")
  : "";

test("صفحة الدخول تحتوي بطاقة مرئية واحدة فقط", () => {
  assert.equal(
    (html.match(/class="auth-gate__card"/g) || []).length,
    1
  );

  assert.doesNotMatch(
    html,
    /auth-gate__brand/,
    "يجب حذف قسم الهوية المنفصل"
  );

  assert.match(
    html,
    /class="auth-gate__identity"/
  );

  assert.match(
    html,
    /id="clerk-sign-in"/
  );
});

test("هوية VVIP ومكوّن Clerk موجودان داخل البطاقة دون عبارة إضافية", () => {
  const cardStart = html.indexOf('<article class="auth-gate__card"');
  const cardEnd = html.indexOf("</article>", cardStart);
  const card = html.slice(cardStart, cardEnd);

  assert.match(card, /VVIP TIGER/);
  assert.doesNotMatch(
    card,
    /بوابتك الآمنة إلى المنصة الموحدة/,
    "Final owner decision removes the extra tagline"
  );
  assert.match(card, /id="clerk-sign-in"/);
});

test("التصميم المستقبلي متجاوب وخفيف", () => {
  assert.match(html, /vvip-p09-future-auth\.css/);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(css, /@media \(max-width: 640px\)/);
  assert.match(css, /backdrop-filter/);
});
