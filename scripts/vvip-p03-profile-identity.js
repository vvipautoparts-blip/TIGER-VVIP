(function (window) {
  "use strict";

  const SAFE_MESSAGES = Object.freeze({
    session_missing: "يرجى تسجيل الدخول للمتابعة.",
    token_unavailable: "تعذر تجهيز جلسة الحساب حاليًا.",
    bridge_unavailable: "تعذر تحديث بيانات الحساب حاليًا.",
    rpc_failed: "تعذر تحديث بيانات الحساب حاليًا.",
    profile_unavailable: "ملف العضوية يحتاج مزامنة قصيرة.",
    network_unavailable: "تعذر تحديث بيانات الحساب حاليًا."
  });

  function normalizeEmail(user) {
    const value = user &&
      user.primaryEmailAddress &&
      user.primaryEmailAddress.emailAddress;

    const normalized = String(value || "").trim().toLowerCase();

    return normalized || null;
  }

  function failure(status) {
    return {
      ok: false,
      status: status,
      profile: null,
      safeMessage: SAFE_MESSAGES[status] ||
        SAFE_MESSAGES.profile_unavailable
    };
  }

  async function resolveOwnProfile(context) {
    const user = context && context.user || null;
    const session = context && context.session || null;

    if (!session || typeof session.getToken !== "function") {
      return failure("session_missing");
    }

    if (
      !window.supabase ||
      typeof window.supabase.createClient !== "function" ||
      !window.VVIP_SUPABASE_URL ||
      !window.VVIP_SUPABASE_ANON_KEY
    ) {
      return failure("bridge_unavailable");
    }

    let token = null;

    try {
      token = await session.getToken();

      if (!token) {
        return failure("token_unavailable");
      }

      const client = window.supabase.createClient(
        window.VVIP_SUPABASE_URL,
        window.VVIP_SUPABASE_ANON_KEY,
        {
          accessToken: async function () {
            return token;
          },
          global: {
            headers: {
              Authorization: "Bearer " + token
            }
          },
          auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false
          }
        }
      );

      const result = await client.rpc("vvip_resolve_own_profile", {
        p_email: normalizeEmail(user)
      });

      if (result && result.error) {
        return failure("rpc_failed");
      }

      const payload = result && result.data;

      if (
        payload &&
        payload.ok === true &&
        payload.profile
      ) {
        return {
          ok: true,
          status: payload.status || "profile_loaded",
          profile: payload.profile,
          safeMessage: null
        };
      }

      return failure(
        payload && payload.status
          ? String(payload.status)
          : "profile_unavailable"
      );
    } catch (error) {
      return failure("network_unavailable");
    } finally {
      token = null;
    }
  }

  window.VVIPProfileIdentity = Object.freeze({
    resolveOwnProfile: resolveOwnProfile
  });
}(window));
