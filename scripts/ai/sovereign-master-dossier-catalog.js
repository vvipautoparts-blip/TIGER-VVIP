'use strict';

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

const SECTIONS = deepFreeze([
  { id: '00_Executive_Truth', title: 'Executive Truth', purpose: 'Release-bound truth summary and constitutional status.' },
  { id: '01_Architecture_Data_Paths', title: 'Architecture, Data and API Paths', purpose: 'Server boundaries, database contracts, RLS and interface inventory.' },
  { id: '02_UI_UX_User_Journeys', title: 'UI/UX and User Journeys', purpose: 'Owner control, TIGER AI workspaces, PR36 media and accessibility journeys.' },
  { id: '03_Automated_Ops_Load_Security', title: 'Automated Ops, Load and Security', purpose: 'CI, security, red-team, load targets and measured evidence.' },
  { id: '04_Operations_DR_Production_Activation', title: 'Operations, DR and Production Activation', purpose: 'Recovery, rollback and protected owner activation gates.' },
  { id: '05_Evidence_Graph', title: 'Evidence Graph', purpose: 'Release DNA, proof, attestation and evidence lineage.' },
  { id: '06_Gap_Register', title: 'Gap Register', purpose: 'Derived incomplete, stale and blocked claims.' },
  { id: '07_Release_Passport', title: 'Release Passport', purpose: 'Structural and attested release-passport implementation versus actual issuance.' },
]);

const CLAIMS = deepFreeze([
  {
    id: 'EXEC-CONSTITUTIONAL-PROOF-RULE', sectionId: '00_Executive_Truth', title: 'Proof constitutional rule',
    claimType: 'GOVERNANCE', defaultTruthState: 'VERIFIED',
    statement: 'The dossier may not convert absent evidence into a VERIFIED claim or a platform-wide 100% production-readiness claim.',
    sourcePaths: [],
  },
  {
    id: 'EXEC-PRODUCTION-READINESS', sectionId: '00_Executive_Truth', title: 'Platform production readiness',
    claimType: 'RUNTIME', defaultTruthState: 'BLOCKED',
    statement: 'Platform-wide production readiness remains unproven until all canonical real-evidence gates and protected owner decisions are satisfied for one exact Release DNA.',
    sourcePaths: [],
  },
  {
    id: 'ARCH-AI-EDGE-FUNCTION', sectionId: '01_Architecture_Data_Paths', title: 'Current AI server boundary',
    claimType: 'REPOSITORY_IMPLEMENTATION', defaultTruthState: 'VERIFIED',
    statement: 'The repository implements the TIGER AI server boundary as the Supabase Edge Function tiger-sovereign-ai.',
    sourcePaths: ['supabase/functions/tiger-sovereign-ai/index.ts'],
  },
  {
    id: 'DATA-AI-APPROVAL-REQUESTS', sectionId: '01_Architecture_Data_Paths', title: 'AI approval request persistence contract',
    claimType: 'REPOSITORY_IMPLEMENTATION', defaultTruthState: 'VERIFIED',
    statement: 'The trust-fabric migration defines public.ai_approval_requests with payload-digest binding, expiry, decision and one-time consumption fields plus guarded state transitions.',
    sourcePaths: ['supabase/migrations/20260807094000_tiger_sovereign_trust_fabric.sql'],
  },
  {
    id: 'DATA-AI-AUDIT-EVENTS', sectionId: '01_Architecture_Data_Paths', title: 'AI append-only audit contract',
    claimType: 'REPOSITORY_IMPLEMENTATION', defaultTruthState: 'VERIFIED',
    statement: 'The trust-fabric migration defines public.ai_audit_events with correlation, actor, agent, action, decision, reason, approval linkage and chained event hashes.',
    sourcePaths: ['supabase/migrations/20260807094000_tiger_sovereign_trust_fabric.sql'],
  },
  {
    id: 'DATA-AI-RLS-BROWSER-DENY', sectionId: '01_Architecture_Data_Paths', title: 'AI trust-fabric browser authority denial',
    claimType: 'REPOSITORY_IMPLEMENTATION', defaultTruthState: 'VERIFIED',
    statement: 'The trust-fabric migration enables RLS, revokes direct browser-role table authority and reserves privileged approval/audit RPC execution for the trusted server boundary.',
    sourcePaths: ['supabase/migrations/20260807094000_tiger_sovereign_trust_fabric.sql'],
  },
  {
    id: 'DATA-AI-TRUST-FABRIC-APPLY', sectionId: '01_Architecture_Data_Paths', title: 'Trust-fabric environment application',
    claimType: 'RUNTIME', defaultTruthState: 'PENDING',
    statement: 'Repository migration definitions are not evidence that the trust fabric has been applied and runtime-probed in staging or production.',
    sourcePaths: [],
  },
  {
    id: 'API-V1-AI-EXECUTE', sectionId: '01_Architecture_Data_Paths', title: 'Canonical /v1/ai/execute route',
    claimType: 'DESIGN', defaultTruthState: 'DESIGNED',
    statement: 'A canonical /v1/ai/execute interface is part of the desired enterprise API surface but is not labeled implemented until code and runtime evidence establish it.',
    sourcePaths: [],
  },
  {
    id: 'API-V1-AI-APPROVAL-REQUESTS', sectionId: '01_Architecture_Data_Paths', title: 'Canonical /v1/ai/approval-requests route',
    claimType: 'DESIGN', defaultTruthState: 'DESIGNED',
    statement: 'A canonical /v1/ai/approval-requests interface is designed but remains separate from the existing database RPC contract until implemented and proven.',
    sourcePaths: [],
  },
  {
    id: 'API-V1-AI-AUDIT-EVENTS', sectionId: '01_Architecture_Data_Paths', title: 'Canonical /v1/ai/audit-events route',
    claimType: 'DESIGN', defaultTruthState: 'DESIGNED',
    statement: 'A canonical /v1/ai/audit-events interface is designed but is not treated as an existing deployed route without implementation and runtime evidence.',
    sourcePaths: [],
  },
  {
    id: 'UI-OWNER-CONTROL', sectionId: '02_UI_UX_User_Journeys', title: 'Owner Control surface',
    claimType: 'REPOSITORY_IMPLEMENTATION', defaultTruthState: 'VERIFIED',
    statement: 'The repository contains owner-control.html with the owner-control surface and TIGER AI owner-console integration hooks.',
    sourcePaths: ['owner-control.html', 'scripts/ai/vvip-ai-owner-console.js'],
  },
  {
    id: 'UI-TIGER-AI-FOUR-AGENTS', sectionId: '02_UI_UX_User_Journeys', title: 'Four-agent owner workspace definition',
    claimType: 'REPOSITORY_IMPLEMENTATION', defaultTruthState: 'VERIFIED',
    statement: 'The repository owner console and AI command-center policy define the four approved TIGER AI agent roles without adding unrestricted autonomous agents.',
    sourcePaths: ['scripts/ai/vvip-ai-owner-console.js', 'scripts/ai/vvip-ai-command-center.js'],
  },
  {
    id: 'UI-PR36-AUTOMATED-CONTRACT', sectionId: '02_UI_UX_User_Journeys', title: 'PR36 automated media integration contract',
    claimType: 'REPOSITORY_IMPLEMENTATION', defaultTruthState: 'VERIFIED',
    statement: 'The repository contains automated PR36 integration tests for the media-processing subsystem.',
    sourcePaths: ['tests/pr36/integration.test.mjs'],
  },
  {
    id: 'UI-PR36-MANUAL-REAL-IMAGE', sectionId: '02_UI_UX_User_Journeys', title: 'PR36 real-image end-to-end acceptance',
    claimType: 'MANUAL_ACCEPTANCE', defaultTruthState: 'PENDING',
    statement: 'A real JPG flow choose -> read -> process -> preview -> upload -> storage -> display requires separate manual evidence and is not closed by automated CI.',
    sourcePaths: [],
  },
  {
    id: 'UI-RTL-LTR-BROWSER-ACCEPTANCE', sectionId: '02_UI_UX_User_Journeys', title: 'RTL/LTR browser acceptance',
    claimType: 'MANUAL_ACCEPTANCE', defaultTruthState: 'PENDING',
    statement: 'Repository RTL/LTR code does not substitute for manual multi-browser visual acceptance.',
    sourcePaths: [],
  },
  {
    id: 'UI-ACCESSIBILITY-ACCEPTANCE', sectionId: '02_UI_UX_User_Journeys', title: 'Accessibility acceptance',
    claimType: 'MANUAL_ACCEPTANCE', defaultTruthState: 'PENDING',
    statement: 'Automated accessibility structure tests exist, but final accessibility acceptance requires real evidence before being marked VERIFIED.',
    sourcePaths: [],
  },
  {
    id: 'OPS-AUTOMATED-QUALITY-GATE', sectionId: '03_Automated_Ops_Load_Security', title: 'Repository quality-gate workflow',
    claimType: 'REPOSITORY_IMPLEMENTATION', defaultTruthState: 'VERIFIED',
    statement: 'The repository defines the VVIP Quality Gate workflow and fail-closed security/test stages.',
    sourcePaths: ['.github/workflows/vvip-quality-gate.yml', 'scripts/quality-gate.sh'],
  },
  {
    id: 'OPS-AI-RED-TEAM-CONTRACT', sectionId: '03_Automated_Ops_Load_Security', title: 'AI adversarial security test contracts',
    claimType: 'REPOSITORY_IMPLEMENTATION', defaultTruthState: 'VERIFIED',
    statement: 'The repository contains security-kernel and security-operations automated contracts for adversarial AI controls; this is not equivalent to a live production red-team exercise.',
    sourcePaths: ['tests/ai-sovereign-security-kernel.test.cjs', 'tests/ai-sovereign-security-ops.test.cjs'],
  },
  {
    id: 'OPS-K6-LARGE-SCALE-SUITE', sectionId: '03_Automated_Ops_Load_Security', title: 'Large-scale k6 load suite',
    claimType: 'DESIGN', defaultTruthState: 'DESIGNED',
    statement: 'A production-representative k6 load/spike/soak suite is required; it must be implemented and run against an approved non-production environment before results can be VERIFIED.',
    sourcePaths: [],
  },
  {
    id: 'OPS-LOAD-P95-150MS-TARGET', sectionId: '03_Automated_Ops_Load_Security', title: 'p95 latency target below 150 ms',
    claimType: 'MEASUREMENT', defaultTruthState: 'PENDING',
    statement: 'p95 latency below 150 ms is a target, not a measured fact; trusted load-test measurement evidence is required.',
    sourcePaths: [],
  },
  {
    id: 'OPS-STAGING-SECURITY-RUNTIME', sectionId: '03_Automated_Ops_Load_Security', title: 'Staging security runtime verification',
    claimType: 'RUNTIME', defaultTruthState: 'PENDING',
    statement: 'Runtime identity, RLS, rate/budget/kill-switch, prompt-injection and live adversarial behavior require staging evidence.',
    sourcePaths: [],
  },
  {
    id: 'OPS-DR-RESTORE-DRILL', sectionId: '04_Operations_DR_Production_Activation', title: 'Backup and restore drill',
    claimType: 'MANUAL_ACCEPTANCE', defaultTruthState: 'PENDING',
    statement: 'Documented backup policy is insufficient; an isolated restore drill with timestamps and integrity checks must be evidenced.',
    sourcePaths: [],
  },
  {
    id: 'OPS-ROLLBACK-DRILL', sectionId: '04_Operations_DR_Production_Activation', title: 'Rollback drill',
    claimType: 'MANUAL_ACCEPTANCE', defaultTruthState: 'PENDING',
    statement: 'Rollback readiness remains pending until the release candidate is exercised in a controlled non-production rollback drill.',
    sourcePaths: [],
  },
  {
    id: 'OPS-OWNER-TRIPLE-APPROVAL', sectionId: '04_Operations_DR_Production_Activation', title: 'Separate owner authority actions',
    claimType: 'REPOSITORY_IMPLEMENTATION', defaultTruthState: 'VERIFIED',
    statement: 'The cryptographic proof layer defines Merge Release, Promote Database and Activate Production as three separate protected owner actions with fixed target environments.',
    sourcePaths: ['scripts/ai/sovereign-proof-attestation.js'],
  },
  {
    id: 'OPS-OWNER-REAL-DECISIONS', sectionId: '04_Operations_DR_Production_Activation', title: 'Actual owner release decisions',
    claimType: 'RUNTIME', defaultTruthState: 'BLOCKED',
    statement: 'No documentation engine may synthesize the owner merge, database-promotion or production-activation decisions; real protected receipts are required.',
    sourcePaths: [],
  },
  {
    id: 'EVIDENCE-RELEASE-DNA', sectionId: '05_Evidence_Graph', title: 'Release DNA implementation',
    claimType: 'REPOSITORY_IMPLEMENTATION', defaultTruthState: 'VERIFIED',
    statement: 'The repository implements deterministic Release DNA and release-bound Evidence Capsules.',
    sourcePaths: ['scripts/ai/sovereign-proof-system.js'],
  },
  {
    id: 'EVIDENCE-CHANGE-IMPACT', sectionId: '05_Evidence_Graph', title: 'Release change-impact implementation',
    claimType: 'REPOSITORY_IMPLEMENTATION', defaultTruthState: 'VERIFIED',
    statement: 'The repository implements fail-closed release change-impact planning without automatic evidence carry-forward.',
    sourcePaths: ['scripts/ai/sovereign-proof-change-impact.js'],
  },
  {
    id: 'EVIDENCE-CRYPTO-ATTESTATION', sectionId: '05_Evidence_Graph', title: 'Cryptographic proof attestation',
    claimType: 'REPOSITORY_IMPLEMENTATION', defaultTruthState: 'VERIFIED',
    statement: 'The repository implements Ed25519 evidence and owner-decision verification with purpose-separated public keys.',
    sourcePaths: ['scripts/ai/sovereign-proof-attestation.js', 'scripts/ai/sovereign-proof-attested-readiness.js'],
  },
  {
    id: 'EVIDENCE-PERSISTENT-GRAPH', sectionId: '05_Evidence_Graph', title: 'Persistent requirement-to-release evidence graph',
    claimType: 'DESIGN', defaultTruthState: 'DESIGNED',
    statement: 'The long-term evidence graph Requirement -> Code -> Test -> Threat -> Gate -> Evidence -> Decision/Incident -> Release remains a designed persistence layer until implemented and proven.',
    sourcePaths: [],
  },
  {
    id: 'GAPS-DERIVED-REGISTER', sectionId: '06_Gap_Register', title: 'Derived gap register',
    claimType: 'GOVERNANCE', defaultTruthState: 'VERIFIED',
    statement: 'The Master Dossier gap register is derived from non-VERIFIED claims rather than maintained as a second independent truth list.',
    sourcePaths: [],
  },
  {
    id: 'PASSPORT-STRUCTURAL-IMPLEMENTATION', sectionId: '07_Release_Passport', title: 'Structural Golden Release Passport implementation',
    claimType: 'REPOSITORY_IMPLEMENTATION', defaultTruthState: 'VERIFIED',
    statement: 'The repository implements a structural Golden Release Passport that cannot be created at 44/45 or from stale/simulated evidence.',
    sourcePaths: ['scripts/ai/sovereign-proof-system.js'],
  },
  {
    id: 'PASSPORT-ATTESTED-IMPLEMENTATION', sectionId: '07_Release_Passport', title: 'Attested Golden Release Passport implementation',
    claimType: 'REPOSITORY_IMPLEMENTATION', defaultTruthState: 'VERIFIED',
    statement: 'The repository implements an attested passport requiring cryptographic coverage of all 45 canonical gates.',
    sourcePaths: ['scripts/ai/sovereign-proof-attested-readiness.js'],
  },
  {
    id: 'PASSPORT-PRODUCTION-ISSUED', sectionId: '07_Release_Passport', title: 'Actual production Golden Release Passport',
    claimType: 'RUNTIME', defaultTruthState: 'BLOCKED',
    statement: 'No actual production Golden Release Passport is claimed until the exact release has complete real evidence and protected owner decisions.',
    sourcePaths: [],
  },
]);

function instantiateClaims(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).length !== 1 || !Object.prototype.hasOwnProperty.call(input, 'releaseDNA')) {
    throw new Error('DOSSIER_CATALOG_INPUT_INVALID');
  }
  const dossier = require('./sovereign-master-dossier');
  return deepFreeze(CLAIMS.map((definition) => {
    const sources = definition.sourcePaths.map((sourcePath) => dossier.createRepositorySourceFact({
      releaseDNA: input.releaseDNA,
      path: sourcePath,
    }));
    return dossier.createClaim({
      releaseDNA: input.releaseDNA,
      id: definition.id,
      sectionId: definition.sectionId,
      title: definition.title,
      claimType: definition.claimType,
      truthState: definition.defaultTruthState,
      statement: definition.statement,
      sources,
    });
  }));
}

module.exports = Object.freeze({
  SECTIONS,
  CLAIMS,
  instantiateClaims,
});
