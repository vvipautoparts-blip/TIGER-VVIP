# UX-R01 Security Boundary

> CLIENT-SIDE ROLE PREVIEW IS NOT A SECURITY BOUNDARY. REAL AUTHORIZATION MUST BE ENFORCED BY BACKEND/RLS IN A LATER AUTHORIZED SECURITY PHASE.

UX-R01 is static visual work only. Hiding a navigation item or rendering Access Denied does not protect production data. The preview intentionally contains no real authentication, users, tickets, messages, audit data, IP addresses, credentials, payments, subscriptions, accounting, RLS, SQL, migrations, storage, Clerk dashboard changes, server roles, Edge Functions, or network connectivity.

Production authorization needs a separately authorized backend security phase with server-side policy enforcement, RLS where applicable, trusted identity claims, audit integrity, scope validation, and P08 prerequisites. UX-R01 does not change P08 status and must not be used as evidence of backend authorization.