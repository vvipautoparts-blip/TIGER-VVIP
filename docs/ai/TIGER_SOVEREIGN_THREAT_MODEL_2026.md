# TIGER SOVEREIGN — Agentic Threat Model 2026

Status: normative security model for AI runtime design and review.

This model maps current agentic-AI risk classes to TIGER SOVEREIGN controls. It supplements the VVIP TIGER application threat model; it does not replace ordinary web, API, database, identity, supply-chain, privacy or infrastructure security review.

## Trust boundaries

1. **Owner identity boundary** — only protected server verification can establish owner authority.
2. **Model boundary** — model output is untrusted structured data, not executable authority.
3. **Retrieved-content boundary** — listings, documents, logs, issues, messages and external data are untrusted inputs.
4. **Agent handoff boundary** — a receiving agent retains its own capability ceiling and same-or-narrower scope.
5. **Tool boundary** — only server-registered tools with exact schemas may execute.
6. **Approval boundary** — L4 approval is owner-, action-, payload-, scope-, expiry- and one-time-consumption-bound.
7. **Data boundary** — field projection and jurisdiction/user/resource scope occur before model context creation.
8. **Provider boundary** — provider credentials stay server-side; provider outage or compromise must degrade AI independently of core marketplace functions.

## Threat classes and controls

### GOAL_HIJACKING
**Attack:** user/retrieved content attempts to redefine the objective, policy or authority chain.
**Controls:** Constitution precedence; untrusted-data labeling; strict request fields; structured model output; no tool execution in inference gateway; adversarial evals.

### TOOL_MISUSE
**Attack:** model invents or abuses shell/database/financial/destructive tools or smuggles arguments.
**Controls:** registry-only tools; exact schemas; dangerous-key rejection; agent scope; idempotency; timeout; L4 approval; permanent absence of delete/money/owner-mutation capabilities.

### IDENTITY_PRIVILEGE_ABUSE
**Attack:** forged owner claims, client authority flags, role escalation or approval replay.
**Controls:** server identity verifier; rejection of ownerApproved/role/service authority fields; immutable capability ceilings; exact one-time approval consumption; runtime level ceiling.

### MEMORY_CONTEXT_POISONING
**Attack:** persistent or retrieved context contains adversarial instructions or corrupt facts.
**Controls:** no unrestricted memory in current phase; evidence source IDs/freshness; allowlisted context; untrusted-data instruction; prompt versioning; retention/governance gate before persistent memory.

### INSECURE_INTER_AGENT_COMMUNICATION
**Attack:** a handoff expands jurisdiction, role, tool authority or instructions.
**Controls:** Boardroom same-or-narrower scope; recipient constitutional max level; bounded handoffs/depth; cycle detection; correlation IDs; evidence required for material conclusions.

### CASCADING_FAILURES
**Attack:** provider/tool/agent failure produces retry storms, recursive handoffs, duplicate mutations or runaway cost.
**Controls:** max hops/tools/tokens/time/cost; idempotency; circuit breaker; bounded retries; kill switches; incident state machine; core platform independence.

### TRUST_EXPLOITATION
**Attack:** users or staff over-trust confident but unsupported recommendations or simulated outcomes.
**Controls:** evidence/confidence/freshness semantics; INSUFFICIENT_EVIDENCE; TIGER Mirror stateClass=SIMULATED; Decision Passport; Shadow AI; no unsupported execution claims.

### ROGUE_AGENT_BEHAVIOR
**Attack:** agent persistently deviates from policy or attempts self-expansion.
**Controls:** immutable server policy; capability absence; audit/usage ledgers; Trust Score may reduce autonomy automatically but cannot increase it without owner approval; per-agent kill switch.

## Additional mandatory controls

- Secret scanning and no secret-bearing browser context.
- RLS/least privilege on persistent trust fabric.
- Prompt/model versions recorded in audit and usage events.
- Provider/model changes treated as reviewed configuration changes.
- Country/data-residency and legal-entity scopes enforced before data retrieval.
- Security, privacy, legal, backup/restore, monitoring and manual staging gates remain required before production activation.

## Acceptance rule

No threat class is considered closed solely by documentation. Each production-relevant control requires executable tests and/or environment evidence appropriate to that boundary. `TIGER_SOVEREIGN_READINESS=100%` remains forbidden while any required environment, manual, legal, operational or owner gate is pending.
