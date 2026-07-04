import { chromium } from 'playwright';
import fs from 'node:fs';

const URL = 'http://127.0.0.1:8080/public-profile.html';
const selector = 'button, a, [role="button"], input[type="button"], input[type="submit"]';

const browser = await chromium.launch({ headless: true });

async function collectTotal() {
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true
  });
  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(900);
  const total = await page.locator(selector).count();
  await page.close().catch(() => {});
  return total;
}

const total = await collectTotal();
const results = [];
let consoleErrors = 0;
let pageErrors = 0;

for (let i = 0; i < total; i++) {
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true
  });

  const localConsoleErrors = [];
  const localPageErrors = [];

  page.on('console', msg => {
    if (msg.type() === 'error') localConsoleErrors.push(msg.text());
  });

  page.on('pageerror', err => {
    localPageErrors.push(err.message);
  });

  try {
    await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(700);

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
      await page.close().catch(() => {});
      continue;
    }

    if (info.disabled) {
      results.push({ ...info, status: 'SKIPPED disabled' });
      await page.close().catch(() => {});
      continue;
    }

    const beforeUrl = page.url();
    const beforeErrors = localConsoleErrors.length + localPageErrors.length;

    await item.scrollIntoViewIfNeeded({ timeout: 2500 });
    await page.waitForTimeout(150);
    await item.click({ timeout: 3000 });
    await page.waitForTimeout(700).catch(() => {});

    const afterUrl = page.isClosed() ? 'PAGE_CLOSED' : page.url();
    const afterErrors = localConsoleErrors.length + localPageErrors.length;

    let feedback = [];
    if (!page.isClosed()) {
      feedback = await page.locator(
        '[role="alert"], .toast, .snackbar, [class*="toast"], [class*="Toast"], [class*="snackbar"], [class*="notice"], [class*="modal"], #vvip-action-toast-root'
      ).allInnerTexts().catch(() => []);
    }

    let status = 'CLICKED no visible feedback';

    if (afterErrors > beforeErrors) status = 'ERROR after click';
    else if (afterUrl === 'PAGE_CLOSED') status = 'OK page closed/handled';
    else if (afterUrl !== beforeUrl) status = 'OK navigation';
    else if (feedback.join(' ').trim()) status = 'OK feedback/toast';

    results.push({
      ...info,
      status,
      feedback: feedback.join(' | ').slice(0, 180),
      afterUrl
    });

  } catch (err) {
    results.push({
      index: i + 1,
      text: 'UNKNOWN',
      status: 'FAILED click',
      error: String(err.message).replace(/\s+/g, ' ').slice(0, 220)
    });
  }

  consoleErrors += localConsoleErrors.length;
  pageErrors += localPageErrors.length;

  await page.close().catch(() => {});
}

await browser.close();

const summary = {
  totalButtonsLinks: total,
  consoleErrors,
  pageErrors,
  failedClicks: results.filter(r => r.status === 'FAILED click').length,
  errorsAfterClick: results.filter(r => r.status === 'ERROR after click').length,
  clickedNoVisibleFeedback: results.filter(r => r.status === 'CLICKED no visible feedback').length,
  okNavigation: results.filter(r => r.status === 'OK navigation').length,
  okFeedbackToast: results.filter(r => r.status === 'OK feedback/toast').length,
  skippedHidden: results.filter(r => r.status === 'SKIPPED hidden').length
};

let report = '# VVIP TIGER Mobile Public Audit\n\n## Summary\n\n';

for (const [key, value] of Object.entries(summary)) {
  report += `- ${key}: ${value}\n`;
}

report += '\n## Details\n\n';
report += '| # | Text | Status | Notes |\n';
report += '|---|---|---|---|\n';

for (const r of results) {
  report += `| ${r.index || ''} | ${(r.text || 'NO TEXT').replace(/\|/g, '/')} | ${r.status || ''} | ${String(r.error || r.feedback || r.href || '').replace(/\|/g, '/')} |\n`;
}

fs.writeFileSync('reports/vvip-mobile-public-audit.md', report, 'utf8');
console.log(report);
