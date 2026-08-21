# TIGER P0-C Discovery & Social Search Convergence Design

**Status:** OWNER-APPROVED / CURRENT for P0-C implementation

**Source base:** `feat/tiger-one-living-surface-impl-20260818` at exact SHA `05f7a5848d54dacba0a45a67edcc43e20465b2e9`

**Execution branch:** `feat/tiger-p0-discovery-convergence-20260821`

**Issue:** #298 — People/post discovery + social search closure

## 1. Goal

Close P0-C with a real authenticated Social Search surface for People and Posts without creating a second privacy authority. Search is discovery only: PostgreSQL remains the final authorization authority on every request and every cursor page.

## 2. Non-negotiable boundaries

- No `main` mutation, merge, Production deployment, Staging/Production database apply, external search-provider activation, provider credentials, payment surface, or real-user mutation.
- No browser-supplied Clerk subject may select or scope search authority.
- No direct browser read of Social profile projection, Social posts, block tables, relationship tables, search-budget tables, or any future search index.
- Search results MUST be a subset of data the current actor is already authorized to read.
- Blocked, unauthorized private, deactivated, and deleted entities are absent from results, not visually hidden after retrieval.
- A search index may generate candidates only; it can never authorize a result.
- Existing `vvip_social_can_view_post`, block authority, lifecycle authority, and safe public profile projection remain authoritative and are reused rather than duplicated.
- Existing Gate5/P0-D opaque cursor helpers remain the cursor codec; P0-C introduces search-specific cursor context, not a parallel codec.
- Runtime failures are opaque; no SQL/provider/internal detail is serialized into the UI.

## 3. Search contract

### 3.1 Query normalization

The browser and database accept only string queries and normalize them deterministically:

1. Unicode NFKC.
2. Remove Arabic tatweel and Arabic diacritics.
3. Normalize Arabic alef variants and common ya/hamza variants using the existing F04-compatible rules.
4. Normalize Arabic/Persian digits to ASCII digits.
5. Lowercase Latin text.
6. Convert non-letter/non-number runs to one ASCII space.
7. Trim and collapse whitespace.

The public Social query is bounded to **2..160 normalized characters**. Empty, one-character, or over-limit normalized input is invalid and must not call persistence.

The implementation may share or duplicate only the pure normalization rules from F04; F04 listing eligibility/ranking is not Social authorization authority.

### 3.2 Page bounds

- Default page size: `20`.
- Valid page size: `1..50`.
- Cursor: `null` or opaque URL-safe token, `8..2048` characters.

### 3.3 People RPC

Canonical RPC: `vvip_social_search_people(p_query text, p_cursor text DEFAULT NULL, p_limit integer DEFAULT 20)`.

It must:

- derive the authenticated actor internally with the existing canonical actor helper;
- require the actor profile to be active;
- search only `vvip_social_profile_projection` rows whose `profile_state='active'`;
- exclude the actor from People results;
- exclude either-direction blocked pairs using current block authority;
- return only browser-safe fields: `profile_id`, `display_name`, `avatar_url`, `business_name`, `location`, `specialization`;
- never return `subject` or private/account fields;
- rank deterministically by exact normalized display-name match, then display-name prefix, then contained match, then `display_name`, then `profile_id`;
- use keyset pagination over the complete ranking tuple;
- re-evaluate active/block rules on every page.

### 3.4 Post RPC

Canonical RPC: `vvip_social_search_posts(p_query text, p_cursor text DEFAULT NULL, p_limit integer DEFAULT 20)`.

It must:

- derive the authenticated actor internally;
- require the actor profile to be active;
- consider matching Social posts, but emit only rows for which `vvip_social_can_view_post(post_id, actor)` is true at request time;
- preserve current safe author presentation: active author gets profile UUID/display/avatar; unavailable author gets the existing neutral tombstone and no linkable profile UUID;
- return only `post_id`, safe author presentation, `body`, `audience`, `created_at`, `updated_at`;
- rank deterministically by normalized body prefix before contained match, then `created_at DESC`, then `post_id DESC`;
- use keyset pagination over the complete ranking tuple;
- re-evaluate privacy/block/lifecycle rules on every page.

## 4. Cursor identity contract

P0-C cursors use existing `vvip_gate5_cursor_encode/decode` and carry no Clerk subject. Each cursor includes:

- `v = 3`;
- `kind = social_search_people` or `social_search_posts`;
- `actor_profile_id`;
- `query_digest` derived with PostgreSQL `digest(normalized_query, 'sha256')` and encoded as hex;
- the complete keyset tuple for that result type.

A cursor fails closed if malformed, wrong version/kind, bound to another active profile, bound to another normalized query, or missing keyset fields. Context mismatch must never silently restart from page one.

## 5. Rate limit and abuse budget

Search-specific rate limiting is enforced server-side before result enumeration.

- Durable authority table: `vvip_social_search_budget`.
- Browser roles receive no table privileges.
- Window: rolling/fixed one-minute server window per active actor profile.
- Budget: maximum **30 search RPC calls per 60-second window**, shared across People and Post search.
- The helper executes inside the trusted RPC path and atomically increments the current window count.
- Exceeding budget raises the opaque contract `SOCIAL_SEARCH_RATE_LIMITED`.
- The browser maps this to `{ ok:false, code:'SOCIAL_RATE_LIMITED', retryAfterMs:5000 }` without exposing database detail.
- Client-side debounce/cooldown is UX optimization only and never security authority.

## 6. Runtime adapter contract

`scripts/social/runtime-adapters.js` gains a frozen `search` adapter:

- `search.people(query, { cursor, limit })`
- `search.posts(query, { cursor, limit })`

Both validate/normalize inputs before persistence, call only the dedicated RPC, never call `.from(...)` for discovery, preserve opaque cursor strings, and map:

- `SOCIAL_SEARCH_RATE_LIMITED` or HTTP 429 -> `SOCIAL_RATE_LIMITED` + bounded `retryAfterMs`;
- Gate5 cursor invalid/context mismatch -> `SOCIAL_SEARCH_STALE_CURSOR`;
- inactive/auth-required -> `SOCIAL_SEARCH_SESSION_STALE`;
- thrown/5xx -> `SOCIAL_SEARCH_RETRYABLE`;
- all other persistence detail -> `SOCIAL_PERSISTENCE_FAILED`.

## 7. UX contract

A real Search destination replaces the currently inert header glyph.

- Header Search is a semantic button and opens/navigates to `#search`.
- Search is an authenticated Social destination, not Marketplace search.
- One search input drives two independent sections: People and Posts.
- States are explicit and accessible: idle, loading, content, empty, partial, rate-limited, stale-session/cursor, and generic retryable error.
- People and Post requests are independent: if one succeeds and the other fails, successful results remain visible and the surface announces a partial result state.
- A newer query invalidates older pending presentation; late responses from an old query must not overwrite the new query.
- No result uses `innerHTML` with user-controlled values; user text is rendered through `textContent`/DOM text nodes.
- Result controls use `profile_id`/`post_id`, never Clerk subjects.
- Search begins only after a valid normalized query. Input uses a bounded 250 ms debounce, while Enter can submit immediately.
- Search results remain keyboard reachable and status changes use polite live regions.

## 8. Observability and failure semantics

The UI/controller exposes deterministic state transitions and accepts an optional local `onStateChange` observer callback for testable telemetry without exporting secrets or query contents by default. Events may include state kind, result counts, and opaque error code; raw database errors and identity subjects are forbidden.

## 9. TDD and evidence requirements

The implementation sequence is mandatory:

1. Commit this spec and implementation plan only.
2. Commit RED tests/contracts before production implementation.
3. Observe RED on the exact RED SHA for the intended missing P0-C implementation.
4. Add the minimal migration/runtime/controller/HTML/CSS/release wiring to satisfy the tests.
5. Run focused JS contracts and Social DB behavioral rehearsal.
6. Run full `VVIP Quality Gate`, `TIGER Social DB Rehearsal`, `TIGER CleanGuard`, `Zero-Residue Full History`, Project Control, and applicable LC security rehearsals on one exact final SHA.
7. Keep the PR Draft and unmerged.

Required behavioral evidence includes:

- normalization and bounds;
- People safe projection/no-subject leakage;
- People active/block exclusion;
- Post `public/friends/only_me` authorization and block exclusion;
- deactivated/deleted behavior;
- same-query/same-actor cursor continuation;
- actor/query cursor mismatch denial;
- no duplicates across pages;
- deterministic rank ordering;
- shared search rate budget and opaque 429/runtime mapping;
- partial-result UX and stale-response suppression;
- no direct browser Social discovery-table reads;
- no `main`, Production, provider, credential, or payment mutation.

## 10. Definition of done

P0-C is `VERIFIED` only when the exact Draft PR head has all required tests/workflows GREEN and the evidence is recorded with the full SHA. A committed implementation without matching exact-head evidence is only `IMPLEMENTED / IN_PROGRESS`.