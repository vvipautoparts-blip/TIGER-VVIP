## Pull Request — VVIP TIGER

### هدف التغيير / Change goal

<!-- Why is this change needed? Link issue or task ID if any. -->

### نطاق المهمة / Task scope

<!-- What is in scope and explicitly out of scope? -->

### الملفات المتغيرة / Changed files

<!-- List paths or summarize by area (auth, feed, project-control, governance, …). -->

### الاختبارات / Tests

<!-- Commands run, e.g. bash scripts/quality-gate.sh, ./scripts/qa-smoke.sh -->

- [ ] `bash scripts/quality-gate.sh`
- [ ] Other (document):

### نتيجة Cursor quality gate / Cursor quality gate

<!-- VVIP_QUALITY_GATE=PASS or FAIL + summary -->

### نتيجة BLACKBOX / BLACKBOX review

<!-- REVIEW_DECISION=PASS or BLOCK; link or paste summary; P0–P3 findings -->

### نتيجة GitHub Actions / GitHub Actions

<!-- VVIP Quality Gate workflow + any other required checks -->

### المخاطر / Risks

<!-- Rollout, auth, data, UX, performance -->

### أثر Supabase/Firebase / Supabase & Firebase impact

<!-- None / describe migrations, RLS, edge functions, Firebase hosting or config -->

### خطة التراجع / Rollback plan

<!-- Revert commit, disable feature flag, migration rollback strategy (owner-only for prod DB) -->

### تأكيد عدم وجود أسرار / Secrets confirmation

- [ ] No secrets, tokens, or production credentials added to tracked files
- [ ] No `service_role` or private keys in diff

---

### Checklist (canonical app)

- [ ] Bilingual / RTL behavior preserved where applicable (`AGENTS.md`)
- [ ] Auth or profile changes traced in `index.html` / `auth-clerk-index.js` and related scripts
- [ ] Manual smoke on `http://localhost:800` if UI or auth touched
