import { chromium } from 'playwright';
import fs from 'node:fs';

const URL = 'http://127.0.0.1:8080/public-profile.html';
const selector = 'button, a, [role="button"], input[type="button"], input[type="submit"]';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });

const consoleErrors = [];
const pageErrors = [];

page.on('console', msg => {
  if (msg.type() === 'error') consoleErrors.push(msg.text());
});

page.on('pageerror', err => {
  pageErrors.push(err.message);
});

async function openPage() {
  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(800);
}

await openPage();

const total = await page.locator(selector).count();
const results = [];

for (let i = 0; i < total; i++) {
  await openPage();

  const loc = page.locator(selector).nth(i);

  const info = await loc.evaluate((el, index) => {
    const r = el.getBoundingClientRect();
    const s = window.getComputedStyle(el);

    return {
      index: index + 1,
      tag: el.tagName.toLowerCase(),
      label: (
        el.innerText ||
        el.value ||
        el.getAttribute('aria-label') ||
        el.getAttribute('title') ||
        el.id ||
        el.getAttribute('href') ||
        ''
      ).trim().replace(/\s+/g, ' '),
      href: el.href || el.getAttribute('href') || '',
      visible: s.display !== 'none' && s.visibility !== 'hidden' && r.width > 0 && r.height > 0,
      disabled: !!el.disabled || el.getAttribute('aria-disabled') === 'true'
    };
  }, i).catch(e => ({
    index: i + 1,
    label: 'MISSING',
    status: 'MISSING',
    error: String(e.message)
  }));

  if (info.status) {
    results.push(info);
    continue;
  }

  if (!info.visible) {
    results.push({ ...info, status: 'SKIPPED hidden' });
    continue;
  }

  if (info.disabled) {
    results.push({ ...info, status: 'SKIPPED disabled' });
    continue;
  }

  const beforeUrl = page.url();
  const beforeErr = consoleErrors.length + pageErrors.length;

  try {
    await loc.scrollIntoViewIfNeeded({ timeout: 2000 });
    await page.waitForTimeout(100);
    await loc.click({ timeout: 2500 });
    await page.waitForTimeout(600);

    const feedbackTexts = await page.locator(
      '[role="alert"], .toast, .snackbar, [class*="toast"], [class*="Toast"], [class*="snackbar"]'
    ).allInnerTexts().catch(() => []);

    const afterUrl = page.url();
    const afterErr = consoleErrors.length + pageErrors.length;

    let status = 'CLICKED no visible feedback';

    if (afterErr > beforeErr) status = 'ERROR after click';
    else if (afterUrl !== beforeUrl) status = 'OK navigation';
    else if (feedbackTexts.join(' ').trim()) status = 'OK feedback/toast';

    results.push({
      ...info,
      status,
      afterUrl,
      feedback: feedbackTexts.join(' | ').slice(0, 200)
    });
  } catch (e) {
    results.push({
      ...info,
      status: 'FAILED click',
      error: String(e.message).replace(/\s+/g, ' ').slice(0, 220)
    });
  }
}

await browser.close();

const summary = {
  total,
  consoleErrors: consoleErrors.length,
  pageErrors: pageErrors.length,
  failedClicks: results.filter(r => r.status === 'FAILED click').length,
  errorsAfterClick: results.filter(r => r.status === 'ERROR after click').length,
  noFeedback: results.filter(r => r.status === 'CLICKED no visible feedback').length,
  okNavigation: results.filter(r => r.status === 'OK navigation').length,
  okFeedback: results.filter(r => r.status === 'OK feedback/toast').length
};

let md = '# VVIP TIGER Button Audit Report\n\n## Summary\n\n';

for (const [k, v] of Object.entries(summary)) {
  md += `- ${k}: ${v}\n`;
}

md += '\n## Details\n\n';
md += '| # | Label | Status | Notes |\n';
md += '|---|---|---|---|\n';

for (const r of results) {
  md += `| ${r.index} | ${(r.label || 'NO LABEL').replace(/\|/g, '/')} | ${r.status} | ${String(r.error || r.feedback || r.href || '').replace(/\|/g, '/')} |\n`;
}

if (consoleErrors.length || pageErrors.length) {
  md += '\n## Errors\n\n';
  [...consoleErrors, ...pageErrors].forEach((e, i) => {
    md += `${i + 1}. ${e}\n`;
  });
}

fs.writeFileSync('reports/vvip-button-audit-report.md', md, 'utf8');

console.log(md);
