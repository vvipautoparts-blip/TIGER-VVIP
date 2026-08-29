# TIGER SGF Runtime Zero-Default Convergence Plan

> **Execution gate:** reconcile this branch against exact protected `main` after PR #346 is safely closed/merged. Do not mix these changes into PR #346. Use TDD RED -> minimal implementation -> exact-head verification.

**Goal:** Remove executable `defaultCountryCode`, JOD-prefill, and Jordan-specific UI fallbacks from current Marketplace/Composer runtime while preserving explicit ISO country/currency support and server-side market authorization.

**Owner authority:** `docs/owner-control/TIGER_SOVEREIGN_GENOME_FABRIC_2026_CURRENT_OWNER_AUTHORITY.md`

**Foundation:** `docs/superpowers/plans/2026-08-29-tiger-sgf-foundation.md`

## Confirmed current conflicts

Fresh audit on `main` SHA `32c84604bd278ef18e113a6545496ec27e8545df` found:

1. `scripts/fusion/progressive-composer.js`
   - `currency` input placeholder = `JOD`;
   - market resolution uses `VVIP_ACTIVE_MARKET_COUNTRY || runtime.config.defaultCountryCode`.

2. `scripts/runtime/vvip-marketplace-repository.js`
   - `normalizeDraft` uses explicit input **or `config.defaultCountryCode`**.

3. `scripts/vvip-production-marketplace.js`
   - public feed uses `state.runtime.config.defaultCountryCode`;
   - creation form derives country from `config.defaultCountryCode`;
   - currency is prefilled `value="JOD"`;
   - contact example uses `+962...`.

4. Tests encode `defaultCountryCode: "JO"` as an accepted fallback.

## Runtime constitutional rule

User locale, IP, hosting region, database/CDN region, old runtime configuration, and UI placeholders do not authorize a sovereign market.

Listing mutation requires explicit market and currency values in the request, followed by server-side SGF market/capability validation.

Public discovery may be global/unfiltered or explicitly user-filtered; it must not silently become a Jordan feed because of runtime defaults.

Missing explicit mutation market/currency:

`DENY / FAIL_CLOSED`

Never:

`USE config.defaultCountryCode`

---

## Task 1 — RED source contract

**Create:** `tests/sgf-runtime-zero-default.test.cjs`

The source contract must read the three current runtime files and fail while any of these patterns remain:

```text
defaultCountryCode
value="JOD"
placeholder="JOD"
+962...
```

The test must not ban legitimate explicit values such as a user-created listing with `currencyCode: "JOD"` or `activeMarketCountry: "JO"`. JOD/JO remain valid explicit ISO market/currency values once a Jordan market is authorized; they are forbidden only as global/runtime defaults.

Expected RED on pre-SGF runtime.

---

## Task 2 — Repository mutation requires explicit market

**Modify:**
- `tests/vvip-marketplace-repository.test.cjs`
- `scripts/runtime/vvip-marketplace-repository.js`

### RED tests

Replace the misleading test that currently says “without hard-coded country” while supplying `{ defaultCountryCode: "JO" }`.

New positive case:

```js
const value = repo.normalizeDraft({
  sector: 'automotive',
  title: 'قطعة أصلية',
  location: 'Amman',
  priceMinor: 1250,
  currencyCode: 'jod',
  activeMarketCountry: 'jo'
}, {});

assert.equal(value.active_market_country, 'JO');
assert.equal(value.currency_code, 'JOD');
```

New negative case:

```js
assert.throws(() => repo.normalizeDraft({
  sector: 'automotive',
  title: 'عنوان',
  location: 'مكان',
  priceMinor: 1,
  currencyCode: 'JOD'
}, { defaultCountryCode: 'JO' }), { code: 'LISTING_COUNTRY_INVALID' });
```

This proves a legacy config value cannot supply mutation authority.

### Implementation

Change country normalization from:

```js
source.activeMarketCountry || source.active_market_country || config.defaultCountryCode
```

to explicit input only:

```js
source.activeMarketCountry || source.active_market_country
```

Do not infer currency from country. Currency remains explicit input and ISO-validated.

Update all mutation-focused tests to provide explicit `activeMarketCountry` where a valid listing is intended.

Provider/media configuration may remain in `config`; sovereign market identity may not.

---

## Task 3 — Progressive Composer removes sovereign defaults

**Modify:**
- `scripts/fusion/progressive-composer.js`
- applicable focused tests after rebase

### RED behavior/source assertions

Require:

- no `placeholder="JOD"`;
- no `runtime.config.defaultCountryCode`;
- listing submission requires an explicit current market input/context;
- missing market returns `LISTING_COUNTRY_INVALID` before repository mutation;
- explicit `JO`/`US`/`SD` values are syntactically accepted as ISO2 only; server policy still determines authorization.

### Implementation

Currency field:

```html
<input name="currency" maxlength="3" ... placeholder="ISO">
```

Do not prefill any currency.

For the initial zero-default convergence, the composer must obtain market identity only from an explicit UI/context value whose absence fails closed. It must not use `defaultCountryCode`.

A later SGF Passport integration will replace client context as the authoritative capability proof; the browser remains an untrusted presentation layer.

---

## Task 4 — Production Marketplace UI removes Jordan defaults

**Modify:**
- `scripts/vvip-production-marketplace.js`
- applicable focused UI/publication tests

### Creation form

Replace:

```html
<input name="currency" value="JOD" ...>
<input name="country" value="${country}" ...>
<input ... placeholder="+962...">
```

with explicit empty fields:

```html
<input name="currency" maxlength="3" required placeholder="ISO">
<input name="country" maxlength="2" required placeholder="ISO2">
<input name="phone" ... placeholder="+...">
```

No country is derived from runtime config.

### Public feed

Do not pass `state.runtime.config.defaultCountryCode` as an implicit filter.

Initial behavior:

- no selected country filter => request the existing global public feed without a country filter;
- explicit user-selected country filter => pass exactly that country code;
- market eligibility continues to be enforced by the public feed/server policy, not by client defaults.

Do not convert the global feed into a local market merely because a browser/runtime was deployed from a region.

---

## Task 5 — Update stale tests without touching PR #346 before rebase

Potentially affected tests discovered by repository search:

- `tests/vvip-marketplace-repository.test.cjs`
- `tests/experience-convergence-publication.test.cjs`
- `tests/publication-review-current-contract.test.cjs`
- `tests/tiger-sealed-media-browser-envelope.test.cjs`

Important sequencing:

`tests/publication-review-current-contract.test.cjs` is changed by PR #346. Do not edit its SGF expectations until #346 is safely closed/merged and the SGF branch is rebased/reconciled onto the exact new `main`.

After rebase, replace only stale expectations that treat `defaultCountryCode`/JOD prefill as current authority. Preserve destructive-SQL safety and unrelated publication contracts from #346.

---

## Task 6 — Add explicit market/currency boundary tests

Add/retain negative cases proving:

- missing mutation country => reject;
- `config.defaultCountryCode = 'JO'` cannot rescue missing country;
- missing currency => reject;
- invalid ISO2 country => reject;
- invalid ISO3 currency => reject;
- `JO + JOD` explicit values remain syntactically valid inputs (authorization is separate);
- `US + USD` explicit values remain syntactically valid inputs;
- `SD + SDG` explicit values remain syntactically valid inputs where ISO support exists;
- no country is inferred from phone number, locale, IP, or region;
- public feed with no country filter remains unfiltered/global rather than using a fallback country.

Do not hardcode an assumption that any of those markets are ACTIVE. Syntax is not authorization.

---

## Task 7 — SGF server authority seam

The zero-default runtime convergence must leave a clean seam for the later Market Genome/Passport verifier.

Browser/user input can identify the requested market, but server-side execution remains:

```text
requested market
+ requested capability
+ valid Market Genome
+ valid Market Activation Passport
+ exact release binding
+ server policy
= authorized execution
```

Until Passport runtime exists, existing server country activation/RLS controls remain mandatory and must not be weakened.

No client variable such as `VVIP_ACTIVE_MARKET_COUNTRY` is sovereign authorization by itself.

---

## Task 8 — Verification after #346 rebase

Run on exact reconciled SGF head:

```bash
git diff --check main...HEAD
node --test tests/sgf-sovereignty-authority.test.cjs \
  tests/sgf-zero-default-current-contract.test.cjs \
  tests/sgf-runtime-zero-default.test.cjs \
  tests/fusion-current-authority.test.cjs \
  tests/vvip-marketplace-repository.test.cjs
node --test --test-reporter=dot tests/*.test.cjs
bash scripts/quality-gate.sh
```

Then require GitHub exact-head Quality/Release/Security checks to actually execute and pass.

Runner-unavailable jobs with `runner_id=0` / `steps=[]` remain `BLOCKED_INFRA`, never GREEN.

## Non-goals

- no Production activation;
- no market becomes ACTIVE;
- no payment provider activation;
- no legal/tax configuration claim;
- no rewriting historical migrations;
- no currency-specific feature removal: JOD/USD/SDG/EUR/etc. remain valid explicit ISO currencies where a market contract permits them;
- no client-side Passport invention that could replace server authorization.
