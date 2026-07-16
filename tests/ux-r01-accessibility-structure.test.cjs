const assert = require('node:assert/strict');
const fs = require('node:fs');
const html = fs.readFileSync('operations-console/index.html','utf8');
const css = fs.readFileSync('operations-console/operations-console.css','utf8');
for (const required of ['lang="ar" dir="rtl"','skip-link','id="main-content"','aria-live="polite"','aria-label="التنقل الرئيسي"']) assert.ok(html.includes(required), `Missing ${required}`);
for (const required of ['@media (max-width:850px)','@media (max-width:560px)',':focus-visible','td::before']) assert.ok(css.includes(required), `Missing ${required}`);
console.log('ux-r01-accessibility-structure: PASS');