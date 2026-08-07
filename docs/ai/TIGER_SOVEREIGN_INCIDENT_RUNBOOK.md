# TIGER SOVEREIGN — AI Incident Runbook

Status: operational runbook; production activation requires environment-specific contacts and alert destinations.

## P0/P1 sequence

### 1. CONTAIN
- Activate global/per-agent/per-tool kill switches as applicable.
- Keep essential non-AI VVIP TIGER functions available.
- Stop new L3/L4 AI execution and new approval consumption where incident scope requires it.
- Do not delete logs, audit events, provider responses or affected artifacts.

### 2. ROTATE
- If credential exposure is suspected, rotate the affected provider/server/signing/database credential through the authoritative console/runbook.
- Do not paste replacement secrets into GitHub, browser logs, chat transcripts or model context.
- Record rotation identifiers/timestamps, not secret values.

### 3. PRESERVE
- Preserve Black Box correlation IDs, approval IDs, tool IDs, model/prompt versions, timestamps, error codes, relevant deployment identifiers and immutable repository SHAs.
- Export only sanitized evidence needed for investigation.

### 4. INVESTIGATE
- Establish first known bad / last known good.
- Determine affected identities, countries, resources, agents, tools and provider/model versions.
- Check authorization-denial spikes, replay/idempotency anomalies, unexpected tool attempts, cost spikes, prompt injection indicators and data-scope violations.
- Verify whether core non-AI marketplace functions were affected.

### 5. RECOVER
- Recovery requires a documented fix, fresh regression/security tests, evidence that compromised credentials are rotated where applicable, and explicit owner authorization for re-enable or production-sensitive promotion.
- Restore initially in Shadow/read-only mode where possible.
- Use HALF_OPEN provider circuit state for bounded recovery probes.

### 6. VERIFY
- Re-run Quality Gate, security/eval suite and environment smoke appropriate to the incident.
- Verify monitoring, alerts, budget/rate ceilings, kill switches and audit continuity.
- Confirm no unresolved P0/P1 finding remains.
- Only then permit controlled restoration of the affected AI capability.

## Prohibited incident shortcuts

- Do not erase evidence to make a scanner green.
- Do not bypass owner approval for L4 because the incident is urgent.
- Do not disable RLS, secret scanning, audit or approval binding as a workaround.
- Do not broaden model/tool authority during recovery.
- Do not claim RECOVERED until fresh verification evidence exists.

## Post-incident

Document root cause, blast radius, evidence, exact fix, verification, prevention action, prompt/model/tool/policy version changes and any owner decisions. Update threat/eval cases when the incident exposes a new failure mode.
