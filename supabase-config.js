const SUPABASE_URL = window.SUPABASE_URL || "https://your-project.supabase.co";
const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY || "your-anon-key";
const IS_PLACEHOLDER_SUPABASE_CONFIG = SUPABASE_URL.includes("your-project") || SUPABASE_ANON_KEY === "your-anon-key";

console.log("📡 supabase-config.js loading...", { IS_PLACEHOLDER_SUPABASE_CONFIG });

function createUnavailableResult() {
  return {
    data: null,
    error: { message: "Supabase library is unavailable." },
  };
}

function createUnavailableQueryBuilder() {
  const result = createUnavailableResult();
  const builder = {
    select() { return builder; },
    insert() { return builder; },
    update() { return builder; },
    upsert() { return builder; },
    delete() { return builder; },
    eq() { return builder; },
    order() { return builder; },
    limit() { return builder; },
    gte() { return builder; },
    lt() { return builder; },
    or() { return builder; },
    maybeSingle() { return Promise.resolve(result); },
    single() { return Promise.resolve(result); },
    then(resolve, reject) { return Promise.resolve(result).then(resolve, reject); },
    catch(reject) { return Promise.resolve(result).catch(reject); },
  };
  return builder;
}

function createUnavailableSupabaseClient() {
  return {
    auth: {
      signInWithPassword: async () => createUnavailableResult(),
      signUp: async () => createUnavailableResult(),
      signInWithOAuth: async () => createUnavailableResult(),
      signOut: async () => createUnavailableResult(),
      getUser: async () => ({ data: { user: null }, error: { message: "Supabase library is unavailable." } }),
      updateUser: async () => createUnavailableResult(),
      resetPasswordForEmail: async () => createUnavailableResult(),
    },
    from() {
      return createUnavailableQueryBuilder();
    },
  };
}

if (IS_PLACEHOLDER_SUPABASE_CONFIG) {
  console.warn("Supabase keys are still placeholders. Set window.SUPABASE_URL and window.SUPABASE_ANON_KEY before loading supabase-config.js.");
}

const supabaseClient = window.supabase?.createClient
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : createUnavailableSupabaseClient();

if (!window.supabase?.createClient) {
  console.warn("Supabase browser library failed to load. The app will stay interactive, but database-backed actions are disabled until the library is available.");
}

window.supabaseClient = supabaseClient;
window.__SUPABASE_CONFIG__ = {
  url: SUPABASE_URL,
  hasRealKeys: !IS_PLACEHOLDER_SUPABASE_CONFIG,
  hasLibrary: Boolean(window.supabase?.createClient),
};

console.log("✓ supabase-config.js loaded", window.__SUPABASE_CONFIG__);

let __hardRefreshScheduled = false;

function schedulePostMutationHardRefresh() {
  if (typeof window === "undefined" || __hardRefreshScheduled) return;
  __hardRefreshScheduled = true;

  setTimeout(async () => {
    try {
      if ("serviceWorker" in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map((registration) => registration.unregister()));
      }

      if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((key) => caches.delete(key)));
      }
    } catch (error) {
      console.warn("Post-mutation cache cleanup failed", error);
    } finally {
      const url = new URL(window.location.href);
      url.searchParams.set("refresh", String(Date.now()));
      window.location.replace(url.toString());
    }
  }, 120);
}

async function runMutationWithHardRefresh(task, isSuccess = (result) => !result?.error) {
  const result = await task();
  if (isSuccess(result)) {
    schedulePostMutationHardRefresh();
  }
  return result;
}

async function signIn(email, password) {
  return await supabaseClient.auth.signInWithPassword({ email, password });
}

async function signUp(email, password) {
  return await supabaseClient.auth.signUp({ email, password });
}

async function signInWithOAuth(provider) {
  return await supabaseClient.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: window.location.origin,
    },
  });
}

async function signOut() {
  return await supabaseClient.auth.signOut();
}

async function getCurrentUser() {
  const { data } = await supabaseClient.auth.getUser();
  return data.user;
}

async function createProfile(profile) {
  return await runMutationWithHardRefresh(() => supabaseClient.from("profiles").insert([profile]));
}

async function fetchProfile(userId) {
  return await supabaseClient.from("profiles").select("*").eq("id", userId).single();
}

async function fetchProfileByPhone(phone) {
  return await supabaseClient.from("profiles").select("id, phone, email").eq("phone", phone).maybeSingle();
}

async function fetchProfileByEmail(email) {
  return await supabaseClient.from("profiles").select("id, email").eq("email", email).maybeSingle();
}

async function fetchPendingApprovals() {
  return await supabaseClient
    .from("profiles")
    .select("id, full_name, phone, role, account_type, created_at, is_approved")
    .eq("is_approved", false)
    .order("created_at", { ascending: false });
}

async function approveUserProfile(userId) {
  return await runMutationWithHardRefresh(() => supabaseClient.from("profiles").update({ is_approved: true }).eq("id", userId));
}

async function updateUserApprovalState(userId, payload) {
  return await runMutationWithHardRefresh(() => supabaseClient.from("profiles").update(payload).eq("id", userId));
}

async function assignSupervisor(userId, superiorId) {
  return await runMutationWithHardRefresh(() => supabaseClient.from("profiles").update({ superior_id: superiorId }).eq("id", userId));
}

async function fetchSuppliers() {
  return await supabaseClient.from("suppliers").select("*");
}

async function fetchBuyers() {
  return await supabaseClient.from("buyers").select("*").order("created_at", { ascending: false });
}

async function createBuyer(buyer) {
  return await runMutationWithHardRefresh(() => supabaseClient.from("buyers").insert([buyer]));
}

async function fetchAccountTypes() {
  return await supabaseClient.from("account_types").select("label, category").eq("active", true).order("category", { ascending: true }).order("label", { ascending: true });
}

async function fetchParts(filters = {}) {
  let query = supabaseClient.from("parts").select("*").order("created_at", { ascending: false });

  if (filters.brand) query = query.eq("brand", filters.brand);
  if (filters.model) query = query.eq("model", filters.model);
  if (filters.year) query = query.eq("year", Number(filters.year));
  if (filters.body_type) query = query.eq("body_type", filters.body_type);
  if (filters.category) query = query.eq("category", filters.category);
  if (filters.status) query = query.eq("status", filters.status);
  if (filters.dealer_id) query = query.eq("dealer_id", filters.dealer_id);

  if (filters.query) {
    const escaped = String(filters.query).trim();
    if (escaped) {
      query = query.or(`name.ilike.%${escaped}%,name_en.ilike.%${escaped}%,part_reference.ilike.%${escaped}%,description.ilike.%${escaped}%,brand.ilike.%${escaped}%,model.ilike.%${escaped}%`);
    }
  }

  return await query;
}

async function createPart(part) {
  return await runMutationWithHardRefresh(() => supabaseClient.from("parts").insert([part]));
}

async function updatePart(partId, payload) {
  const existing = await supabaseClient.from("parts").select("*").eq("id", partId).maybeSingle();
  const updated = await supabaseClient.from("parts").update(payload).eq("id", partId).select("*").maybeSingle();
  const result = {
    previous: existing.data || null,
    current: updated.data || null,
    error: existing.error || updated.error || null,
  };
  if (!result.error) {
    schedulePostMutationHardRefresh();
  }
  return result;
}

async function fetchReviewRequests(filters = null) {
  let query = supabaseClient
    .from("review_requests")
    .select("id, part_id, requester_id, request_type, request_message, status, created_at, updated_at")
    .order("created_at", { ascending: false });

  if (typeof filters === "string" && filters) {
    query = query.eq("status", filters);
  }

  if (filters && typeof filters === "object") {
    if (filters.status) {
      query = query.eq("status", filters.status);
    }
    if (filters.requester_id) {
      query = query.eq("requester_id", filters.requester_id);
    }
  }

  return await query;
}

async function createReviewRequest(request) {
  return await runMutationWithHardRefresh(() => supabaseClient.from("review_requests").insert([request]));
}

async function updateReviewRequestStatus(reviewRequestId, status) {
  return await runMutationWithHardRefresh(() =>
    supabaseClient
      .from("review_requests")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", reviewRequestId)
  );
}

async function createAdminReply(reply) {
  return await runMutationWithHardRefresh(() => supabaseClient.from("admin_replies").insert([reply]));
}

async function fetchAdminReplies(reviewRequestId) {
  return await supabaseClient
    .from("admin_replies")
    .select("id, review_request_id, admin_id, reply_message, created_at")
    .eq("review_request_id", reviewRequestId)
    .order("created_at", { ascending: false });
}

async function createPartUpdateLog(log) {
  return await runMutationWithHardRefresh(() => supabaseClient.from("part_update_logs").insert([log]));
}

async function fetchProfileMeta(userId) {
  return await supabaseClient.from("profile_meta").select("*").eq("user_id", userId).maybeSingle();
}

async function upsertProfileMeta(payload) {
  return await runMutationWithHardRefresh(() => supabaseClient.from("profile_meta").upsert([payload], { onConflict: "user_id" }));
}

async function fetchServiceCenterServices(filters = {}) {
  let query = supabaseClient.from("service_center_services").select("*").order("created_at", { ascending: false });
  if (filters.owner_id) query = query.eq("owner_id", filters.owner_id);
  if (filters.status) query = query.eq("status", filters.status);
  if (filters.public_only) query = query.eq("is_public", true);
  return await query;
}

async function createServiceCenterService(payload) {
  return await runMutationWithHardRefresh(() => supabaseClient.from("service_center_services").insert([payload]));
}

async function fetchGalleryImages(filters = {}) {
  let query = supabaseClient.from("gallery_images").select("*").order("created_at", { ascending: false });
  if (filters.owner_id) query = query.eq("owner_id", filters.owner_id);
  if (filters.status) query = query.eq("status", filters.status);
  if (filters.public_only) query = query.eq("is_public", true);
  return await query;
}

async function createGalleryImage(payload) {
  return await runMutationWithHardRefresh(() => supabaseClient.from("gallery_images").insert([payload]));
}

async function fetchApprovalRequests(filters = {}) {
  let query = supabaseClient.from("approval_requests").select("*").order("created_at", { ascending: false });
  if (filters.status) query = query.eq("status", filters.status);
  if (filters.requester_id) query = query.eq("requester_id", filters.requester_id);
  if (filters.target_type) query = query.eq("target_type", filters.target_type);
  return await query;
}

async function createApprovalRequest(payload) {
  return await runMutationWithHardRefresh(() => supabaseClient.from("approval_requests").insert([payload]));
}

async function updateApprovalRequest(requestId, payload) {
  return await runMutationWithHardRefresh(() =>
    supabaseClient
      .from("approval_requests")
      .update({ ...payload, reviewed_at: new Date().toISOString() })
      .eq("id", requestId)
  );
}

async function createSupplier(supplier) {
  return await runMutationWithHardRefresh(() => supabaseClient.from("suppliers").insert([supplier]));
}

async function fetchOrders(userId = null) {
  let query = supabaseClient.from("orders").select("*").order("created_at", { ascending: false });
  if (userId) {
    query = query.eq("user_id", userId);
  }
  return await query;
}

async function createOrder(order) {
  return await runMutationWithHardRefresh(() => supabaseClient.from("orders").insert([order]));
}

async function updateOrderStatus(orderId, status, completedBy = null) {
  const payload = {
    status,
  };

  if (status.toLowerCase() === "completed") {
    payload.completed_at = new Date().toISOString();
    payload.commission_amount = 0.75;
    if (completedBy) {
      payload.completed_by = completedBy;
    }
  }

  return await runMutationWithHardRefresh(() => supabaseClient.from("orders").update(payload).eq("id", orderId));
}

async function createCommissionEntry(entry) {
  return await runMutationWithHardRefresh(() => supabaseClient.from("commissions").upsert([entry], { onConflict: "order_id" }));
}

async function resetCommissionsAfter30Days() {
  const threshold = new Date();
  threshold.setDate(threshold.getDate() - 30);
  return await runMutationWithHardRefresh(() =>
    supabaseClient
      .from("commissions")
      .update({ status: "reset" })
      .eq("status", "earned")
      .lt("earned_at", threshold.toISOString())
  );
}

async function markCommissionsPaid(userId) {
  return await runMutationWithHardRefresh(() =>
    supabaseClient
      .from("commissions")
      .update({ status: "paid", paid_at: new Date().toISOString() })
      .eq("user_id", userId)
      .eq("status", "earned")
  );
}

async function createSalaryPayment(payment) {
  return await runMutationWithHardRefresh(() => supabaseClient.from("salary_payments").insert([payment]));
}

async function fetchSalaryPayments(userId = null) {
  let query = supabaseClient
    .from("salary_payments")
    .select("*")
    .order("payment_date", { ascending: false });
  if (userId) {
    query = query.eq("user_id", userId);
  }
  return await query;
}

async function fetchLastSalaryPayment(userId) {
  return await supabaseClient
    .from("salary_payments")
    .select("*")
    .eq("user_id", userId)
    .order("payment_date", { ascending: false })
    .limit(1)
    .maybeSingle();
}

async function fetchGlobalCommissionDashboard() {
  const commissions = await supabaseClient
    .from("commissions")
    .select("id, user_id, amount, status, earned_at");

  const payments = await supabaseClient
    .from("salary_payments")
    .select("id, user_id, total_amount, payment_date, period_start, period_end")
    .order("payment_date", { ascending: false });

  return { commissions, payments };
}

async function createOtpCode(phone, code, purpose = "registration", expiresMinutes = 10) {
  const expiresAt = new Date(Date.now() + expiresMinutes * 60000).toISOString();
  return await runMutationWithHardRefresh(() =>
    supabaseClient.from("otp_codes").insert([
      {
        phone,
        code,
        purpose,
        expires_at: expiresAt,
        consumed: false,
      },
    ])
  );
}

async function verifyOtpCode(phone, code, purpose = "registration") {
  const { data, error } = await supabaseClient
    .from("otp_codes")
    .select("*")
    .eq("phone", phone)
    .eq("code", code)
    .eq("purpose", purpose)
    .eq("consumed", false)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return { valid: false, error };
  }

  const isExpired = new Date(data.expires_at).getTime() < Date.now();
  if (isExpired) {
    return { valid: false, error: { message: "OTP expired" } };
  }

  await runMutationWithHardRefresh(() => supabaseClient.from("otp_codes").update({ consumed: true }).eq("id", data.id));
  return { valid: true, data };
}

async function upsertUserSession(userId, deviceId, deviceInfo = "web") {
  return await runMutationWithHardRefresh(() =>
    supabaseClient.from("user_sessions").upsert(
      [
        {
          user_id: userId,
          device_id: deviceId,
          device_info: deviceInfo,
          is_active: true,
        },
      ],
      { onConflict: "user_id,device_id" }
    )
  );
}

async function fetchActiveSessionsCount(userId) {
  const { data, error } = await supabaseClient
    .from("user_sessions")
    .select("id")
    .eq("user_id", userId)
    .eq("is_active", true);
  return { count: (data || []).length, error };
}

async function deactivateAllSessions(userId) {
  return await runMutationWithHardRefresh(() => supabaseClient.from("user_sessions").update({ is_active: false }).eq("user_id", userId));
}

async function fetchCommissions(userId = null, days = 30) {
  let query = supabaseClient.from("commissions").select("*").order("earned_at", { ascending: false });
  if (userId) {
    query = query.eq("user_id", userId);
  }
  if (days) {
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - days);
    query = query.gte("earned_at", fromDate.toISOString());
  }
  return await query;
}

async function fetchCommissionSummary(userId, days = 30) {
  const { data, error } = await fetchCommissions(userId, days);
  if (error) {
    return { data: [], error };
  }

  const completed = data || [];
  const amount = completed.reduce((total, item) => total + Number(item.amount || 0), 0);
  return {
    data: {
      completedCount: completed.length,
      totalAmount: amount,
      averageAmount: completed.length ? amount / completed.length : 0,
      records: completed,
    },
    error: null,
  };
}
