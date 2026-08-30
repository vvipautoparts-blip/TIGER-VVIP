# Scope Lock

Current slice may modify only repository evidence/tooling/workflow surfaces necessary for:

- real container SBOM validation;
- Cryptographic Genome;
- Release Passport 2.0;
- vulnerability and attestation supply gates;
- Seoul Sovereign Sealed Build.

Explicitly outside scope: Production runtime deployment, Supabase live mutation, Lambda deployment, CloudFormation execution, CloudFront/WAF/ACM mutation, Dark Bootstrap, canary, and Production endpoint configuration.
