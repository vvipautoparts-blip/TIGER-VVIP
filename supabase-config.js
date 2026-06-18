const SUPABASE_URL = "https://your-project.supabase.co";
const SUPABASE_ANON_KEY = "your-anon-key";

const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function signIn(email, password) {
  return await supabase.auth.signInWithPassword({ email, password });
}

async function signUp(email, password) {
  return await supabase.auth.signUp({ email, password });
}

async function signInWithOAuth(provider) {
  return await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: window.location.origin,
    },
  });
}

async function signOut() {
  return await supabase.auth.signOut();
}

async function getCurrentUser() {
  const { data } = await supabase.auth.getUser();
  return data.user;
}

async function createProfile(profile) {
  return await supabase.from("profiles").insert([profile]);
}

async function fetchProfile(userId) {
  return await supabase.from("profiles").select("*").eq("id", userId).single();
}

async function fetchSuppliers() {
  return await supabase.from("suppliers").select("*");
}

async function createSupplier(supplier) {
  return await supabase.from("suppliers").insert([supplier]);
}

async function fetchOrders(userId = null, role = null) {
  let query = supabase.from("orders").select("*");
  if (userId && role !== "admin") {
    query = query.eq("user_id", userId);
  }
  return await query;
}

async function createOrder(order) {
  return await supabase.from("orders").insert([order]);
}

async function updateOrderStatus(orderId, status) {
  return await supabase.from("orders").update({ status }).eq("id", orderId);
}
