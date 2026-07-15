# PR36 Decisions

Date: 2026-07-15. Authority: approved PR36 scope. Baseline: `3611bfd0183398e639e50b761d92aeddf367ee4a`.

| ID | Binding decision | Audit consequence |
|---|---|---|
| D01 | Seven local still photos only. | No video/GIF path; aligns with PR34 cap. |
| D02 | Declared MIME and magic bytes must agree for JPEG/PNG/WebP. | Names/extensions are ignored; SVG, GIF, HEIF, video, unknown and mismatch fail closed. |
| D03 | Operations are transactional. | Confirm atomically swaps derivatives; cancel restores the exact prior snapshot and disposes every provisional resource/reference. |
| D04 | Original `File` references die after processing. | Only processed in-memory blobs, bounded metadata, and temporary owned preview URLs remain. |
| D05 | Integer geometry and post-encode checks enforce exact 4:3, ≤1600×1200, no upscale. | Encoder or dimension uncertainty rejects output. |
| D06 | Use verified WebP 0.82, else verified JPEG 0.86. | Browser claims alone are insufficient. |
| D07 | Browser primitives are injected. | Pure Node tests cover policy, geometry, scheduling, lifecycle; browser smoke covers real primitives. |
| D08 | Worker is optional. | Safe probe required; runtime/capability failure may fall back once while current. Security/validation failures never retry. |
| D09 | Concurrency 2; deadlines 20/120 seconds; debounce 250 ms. | Hung and stale work aborts and is disposed. |
| D10 | Session centrally owns URLs. | Revoke exactly once on replace, cancel, remove, reset, timeout, pagehide, dispose; never serialize. |
| D11 | PR32 retains sanitized display metadata only. | Legacy names and any byte/blob/data/object URL/credential/processing field are discarded. |
| D12 | PR34 remains unchanged and metadata-only. | PR36 is editing/session behavior, not persistence or publishing. |
| D13 | Only `index.html` and `private-profile-p03.html` receive includes. | They already load PR31; redirect/history pages remain unchanged. |
| D14 | New media runtime is network- and persistence-free. | QA rejects fetch/XHR/beacon/WebSocket, storage/cookie/filesystem/Cache API, remote, logging, upload, publish. |
| D15 | Arabic-first accessibility is release-blocking. | RTL keyboard order/edit, focus, live status, 44 px targets, reduced motion, and 320 px layout require evidence. |
| D16 | One final PR36 commit only. | Allowed only after four reviews, regressions, manual smoke, exact freeze, and truthful PASS; never pushed/merged. |
| D17 | Suspect/historical files are preserved. | No tracked deletion; only controller-owned temporary runtime resources may be disposed. |
| D18 | Pre-decode header inspection is bounded to 256 KiB. | This is sufficient for the approved JPEG frame/dimension ambiguity checks while keeping reads bounded; the earlier 16-byte planning phrase is stale and superseded. |

Errors use stable codes and calm Arabic-first copy without filenames or content. There is no automatic retry for security, validation, scope, processing, timeout, cancellation, or test failure. No universal memory or poor-network-speed claim is permitted. PASS requires fresh observed exits, exact scope evidence, four resolved reviews, and recorded browser smoke.


## Controller V5 scope reconciliation

- Scope was reconciled only with explicit PR36 paths.
- No production, SQL, Supabase, Clerk, dependency, workflow, backup, or migration path was authorized.
- No tracked deletion was authorized.


## Controller V5 scope reconciliation

- Scope was reconciled only with explicit PR36 paths.
- No production, SQL, Supabase, Clerk, dependency, workflow, backup, or migration path was authorized.
- No tracked deletion was authorized.


## Controller V5 scope reconciliation

- Scope was reconciled only with explicit PR36 paths.
- No production, SQL, Supabase, Clerk, dependency, workflow, backup, or migration path was authorized.
- No tracked deletion was authorized.
