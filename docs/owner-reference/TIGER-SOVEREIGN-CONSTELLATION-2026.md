# OWNER REFERENCE — TIGER SOVEREIGN CONSTELLATION 2026

Status: **FINAL OWNER-APPROVED ARCHITECTURE REFERENCE**
Effective date: 2026-08-28
Detailed authority: `docs/superpowers/specs/2026-08-28-tiger-sovereign-constellation-2026.md`

## Owner decision

`TIGER SOVEREIGN CONSTELLATION 2026` is the single current architecture authority for the TIGER Sealed Media Cell global deployment path.

### Canonical architecture

- **Global Orbit:** CloudFront global ingress, HTTP/2 + HTTP/3, IPv6, custom TIGER domain, modern TLS, global price class.
- **First active Sovereign Data Cell:** Seoul `ap-northeast-2`, colocated with the live Supabase DB and Storage authority.
- **Command/Security Anchor:** Frankfurt `eu-central-1` for governance/security aggregation and future European Sovereign Cell authority where service semantics support it.
- **CloudFront edge control:** `us-east-1` only for CloudFront-scoped WAF, ACM viewer certificate, and explicitly required global-edge control resources.
- **Zero Trust:** CloudFront OAC + Lambda Function URL `AWS_IAM` + exact body hash + Clerk JWT verification + one-time capability + owner binding + replay/lease controls.
- **Supply chain:** immutable OCI digest, build once, continuous container scanning, real CycloneDX 1.7 container SBOM, provenance/SBOM attestations, Cryptographic Genome, Release Passport 2.0.
- **Deployment:** Dark Bootstrap for the first legitimate release; deterministic shadow verification and adaptive progressive canary only after a real stable baseline exists.
- **Recovery:** fail-closed rollback + Phoenix disaster-recovery rehearsal.
- **Governance target:** AWS multi-account landing zone, Identity Center, no routine IAM users, no standing GitHub AWS credentials, no daily root usage.

## Superseded and forbidden as fallback

The following are not current execution authorities and must not be resurrected silently:

1. Media runtime bootstrap in `us-east-1`.
2. Frankfurt-only Media Finalizer runtime while the authoritative Supabase data plane remains in Seoul.
3. Combined ECR/Lambda/CloudFront/WAF single-stack deployment authority.
4. Dummy/fabricated stable versions for first-release canary appearance.
5. Public or unauthenticated direct Lambda Function URL fallback.
6. AWS Access Key / Secret Access Key credentials stored in GitHub.
7. Mutable image tags as deployment authority.
8. Unsupported SLSA maturity claims.
9. Silent ignore of security advisor findings or failed release gates.

## Mandatory release locks

Production eligibility requires all five locks:

1. **Source Lock** — exact protected `main` SHA/tree and repository gates.
2. **Supply Lock** — immutable OCI, real SBOM, scan, attestations, Genome.
3. **Infrastructure Lock** — reviewed IaC, Guard/lint, bounded IAM, reviewed change sets.
4. **Runtime Lock** — live Supabase contract, CloudFront/WAF/OAC/auth/runtime/abuse/alarm evidence.
5. **Recovery Lock** — known prior authority and tested rollback/recovery evidence appropriate to the release stage.

Four out of five is not Production-ready.

## Current truth at adoption

- No Media ECR repository was created by the abandoned `us-east-1` bootstrap instructions.
- No Media CloudFormation Production stack was created by those instructions.
- Existing GitHub OIDC provider is present.
- Existing `TIGER-VVIP-GitHub-ProductionDeploy` role was live-verified with zero attached and zero inline policies.
- Prior Sealed Build failed before AWS authentication because required AWS variables were empty.
- Live Supabase is in Seoul `ap-northeast-2` and the new Media Finalizer DB convergence is not yet applied live.
- Therefore Production E2E is **NOT YET PROVEN**.

## Owner governance rule

This reference is authoritative until the owner explicitly approves a newer architecture revision. Any conflicting old document, old branch, historical workflow, or prior chat instruction is historical evidence only and is not a fallback.

No Production readiness claim may be made without actual live runtime evidence.
