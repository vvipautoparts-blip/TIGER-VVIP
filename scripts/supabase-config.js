// VVIP TIGER - Supabase browser config
// Allowed here only: Project URL + publishable/anon public key
// Never put service_role, secret, or database password here

window.VVIP_SUPABASE_URL = "https://zelcngyyvbomuzokvuxo.supabase.co";
window.VVIP_SUPABASE_ANON_KEY = "sb_publishable_TSoq1AaQFTo00nTZMUDugA_Z3uUON-u";

window.vvipSupabase = supabase.createClient(
  window.VVIP_SUPABASE_URL,
  window.VVIP_SUPABASE_ANON_KEY
);
