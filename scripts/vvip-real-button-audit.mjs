import { chromium } from 'playwright';
import fs from 'node:fs';

const URL = 'http://127.0.0.1:8080/public-profile.html';
const selector = 'button, a, [role="button"], input[type="button"], input[type="submit"]';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 950 } });

const consoleErrors = [];
const pageErrors = [];

page.on('console', msg => {
  if (msg.type() === 'error') consoleErrors.push(msg.text());
});
page.on('pageerror', err => pageErrors.push(err.message));

await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 15000 });
await page.waitForTimeout(1000);

const total = await page.locator(selector).count();
const results = [];

for (let i = 0; i < total; i++) {
  try {
    await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(400);

    const item = page.locator(selector).nth(i);

    const info = await item.evaluate((el, index) => {
      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      return {
        index: index + 1,
        tag: el.tagName.toLowerCase(),
        text: (
          el.innerText ||
          el.value ||
          el.getAttribute('aria-label') ||
          el.getAttribute('title') ||
          el.id ||
          el.getAttribute('href') ||
          ''
        ).trim().replace(/\s+/g, ' '),
        href: el.href || el.getAttribute('href') || '',
        visible: style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0,
        disabled: !!el.disabled || el.getAttribute('aria-disabled') === 'true'
      };
    }, i);

    if (!info.visible) {
      results.push({ ...info, status: 'SKIPPED hidden' });
      continue;
    }

    if (info.disabled) {
      results.push({ ...info, status: 'SKIPPED disabled' });
      continue;
    }

    const beforeUrl = page.url();
    const beforeErrors = consoleErrors.length + pageErrors.length;

    await item.scrollIntoViewIfNeeded({ timeout: 2000 });
    await page.waitForTimeout(100);
    await item.click({ timeout: 2500 });
    await page.waitForTimeout(500);

    const afterUrl = page.url();
    const afterErrors = consoleErrors.length + pageErrors.length;

    const feedback = await page.locator(
      '[role="alert"], .toast, .snackbar, [class*="toast"], [class*="Toast"], [class*="snackbar"], [class*="notice"], [class*="modal"]'
    ).allInnerTexts().catch(() => []);

    let status = 'CLICKED no visible feedback';

    if (afterErrors > beforeErrors) status = 'ERROR after click';
    else if (afterUrl !== beforeUrl) status = 'OK navigation';
    else if (feedback.join(' ').trim()) status = 'OK feedback/toast';

    results.push({
      ...info,
      status,
      feedback: feedback.join(' | ').slice(0, 160),
      afterUrl
    });

  } catch (err) {
    results.push({
      index: i + 1,
      tag: '',
      text: '',
      status: 'FAILED click',
      error: String(err.message).replace(/\s+/g, ' ').slice(0, 180)
    });
  }
}

await browser.close();

const summary = {
  totalButtonsLinks: total,
  consoleErrors: consoleErrors.length,
  pageErrors: pageErrors.length,
  failedClicks: results.filter(r => r.status === 'FAILED click').length,
  errorsAfterClick: results.filter(r => r.status === 'ERROR after click').length,
  clickedNoVisibleFeedback: results.filter(r => r.status === 'CLICKED no visible feedback').length,
  okNavigation: results.filter(r => r.status === 'OK navigation').length,
  okFeedbackToast: results.filter(r => r.status === 'OK feedback/toast').length
};

let report = '# VVIP TIGER Real Button Audit\n\n## Summary\n\n';
for (const [key, value] of Object.entries(summary)) {
  report += `- ${key}: ${value}\n`;
}

report += '\n## Details\n\n';
report += '| # | Text | Status | Notes |\n';
report += '|---|---|---|---|\n';

for (const r of results) {
  report += `| ${r.index} | ${(r.text || 'NO TEXT').replace(/\|/g, '/')} | ${r.status} | ${String(r.error || r.feedback || r.href || '').replace(/\|/g, '/')} |\n`;
}

if (consoleErrors.length || pageErrors.length) {
  report += '\n## Errors\n\n';
  [...consoleErrors, ...pageErrors].forEach((e, i) => {
    report += `${i + 1}. ${e}\n`;
  });
}

fs.writeFileSync('reports/vvip-real-button-audit.md', report, 'utf8');
console.log(report);
