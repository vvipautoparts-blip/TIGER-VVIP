"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const html = fs.readFileSync("index.html", "utf8");
const css = fs.readFileSync(
  "styles/vvip-p09-final-auth.css",
  "utf8"
);

test("صفحة الدخول تحتوي بطاقة واحدة فقط", () => {
  assert.equal(
    (html.match(/class="auth-gate__card"/g) || []).length,
    1
  );

  assert.equal(
    (html.match(/id="clerk-sign-in"/g) || []).length,
    1
  );
});

test("الدائرة والشعار بالحجم النهائي المعتمد", () => {
  assert.match(
    css,
    /width:\s*clamp\(145px,\s*45vw,\s*185px\)/
  );

  assert.match(
    css,
    /font-size:\s*clamp\(2\.45rem,\s*11vw,\s*3\.3rem\)/
  );
});

test("العبارات الزائدة محذوفة من البنية", () => {
  assert.doesNotMatch(html, /CLERK SECURE ACCESS/);
  assert.doesNotMatch(
    html,
    /بوابتك الآمنة إلى المنصة الموحدة/
  );
  assert.doesNotMatch(html, /auth-gate__assurance/);
});

test("Clerk الحقيقي محفوظ", () => {
  assert.match(
    html,
    /@clerk\/ui@1\/dist\/ui\.browser\.js/
  );

  assert.match(
    html,
    /@clerk\/clerk-js@6\/dist\/clerk\.browser\.js/
  );
});
