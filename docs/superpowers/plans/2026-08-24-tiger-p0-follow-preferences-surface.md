# TIGER P0 Follow and Feed Preferences Implementation Plan

**Goal:** Close the current Social P0 follow, mute, snooze, and feed-ranking controls through profile-UUID-only browser contracts and durable PostgreSQL authority.

**Invariants:** Clerk subjects never cross the browser RPC boundary; follow remains directional and distinct from friendship; preferences only reduce or reorder posts already authorized by the feed RPC; blocked or inactive targets cannot receive new follow/preference writes; unblock/unfollow remain lifecycle-safe; raw follow/preference tables remain unavailable to browser roles; Production and Staging remain untouched.

## 1. RED contracts

- Add runtime tests for UUID-only relationship-control, follow/unfollow, preference-list, and fixed-action preference RPCs.
- Add Profile controller tests for server-confirmed follow, mute, snooze, and ranking actions.
- Add feed read-model tests that require durable preferences and fail closed when preference retrieval fails.
- Add migration/proof/workflow static contracts before implementation.

## 2. Forward PostgreSQL convergence

- Add an RPC-only `vvip_social_feed_preferences` table.
- Revoke the legacy subject-input follow RPCs from browser execution.
- Add safe profile-UUID relationship-control, follow, unfollow, list-preferences, and fixed-action preference RPCs.
- Replace block mutation so it clears friendship, both follow directions, and both preference directions atomically.
- Keep unfollow lifecycle-safe by resolving only through an actor-owned follow row.

## 3. Runtime and surface

- Add `follows` and `feedPreferences` adapters with strict UUID/action validation.
- Hydrate feed preferences before presenting every authorized page.
- Add Profile controls for follow/unfollow, mute/unmute, 24-hour snooze/end-snooze, and rank mode.
- Require bounded non-sensitive auth intents and reload trusted state after each confirmed mutation.

## 4. Evidence and release wiring

- Add a transaction-scoped SQL proof whose false branches raise a real PostgreSQL error.
- Require one final PASS marker and reject every Follow FAIL marker in Social DB Rehearsal.
- Add the migration, runtime, UI, proof, and tests to exact-head workflow paths and public release allowlists.
- Run focused tests and the full VVIP Quality Gate.
- Classify and content-address the final migration bytes.
- Publish the exact local tree to the existing draft PR branch and require VVIP Quality plus Social DB Rehearsal GREEN on the same SHA.
