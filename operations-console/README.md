# VVIP TIGER Operations Console Preview

Open `index.html` through a local static server. The console is an Arabic-first, mock-data-only UX preview.

It uses browser `sessionStorage` only to remember the selected preview role and scope. It has no network calls and imports no application authentication, Supabase, or Clerk Admin runtime.

> CLIENT-SIDE ROLE PREVIEW IS NOT A SECURITY BOUNDARY. REAL AUTHORIZATION MUST BE ENFORCED BY BACKEND/RLS IN A LATER AUTHORIZED SECURITY PHASE.