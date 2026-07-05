(function () {
  const REDIRECT_AFTER_LOGIN = "private-profile.html";
  const SOCIAL_PLACEHOLDER_MESSAGE = "سيتم تفعيل تسجيل الدخول عبر Google/Facebook لاحقًا عبر Supabase OAuth. الآن الدخول بالبريد وكلمة المرور فقط.";
  const SESSION_REDIRECT_DELAY_MS = 250;
  const LOADING_TEXT = "جاري تسجيل الدخول...";

  let isSubmitting = false;

  function getSupabaseClient() {
    if (window.vvipSupabase) return window.vvipSupabase;
    if (window.supabaseClient) {
      window.vvipSupabase = window.supabaseClient;
      return window.supabaseClient;
    }
    if (window.VVIP_SUPABASE) {
      window.vvipSupabase = window.VVIP_SUPABASE;
      return window.VVIP_SUPABASE;
    }

    const supabaseUrl = window.SUPABASE_URL || window.VVIP_SUPABASE_URL;
    const publishableKey = window.SUPABASE_PUBLISHABLE_KEY || window.VVIP_SUPABASE_ANON_KEY;

    if (window.supabase && typeof window.supabase.createClient === "function" && supabaseUrl && publishableKey) {
      const client = window.supabase.createClient(supabaseUrl, publishableKey);
      window.vvipSupabase = client;
      window.supabaseClient = client;
      window.VVIP_SUPABASE = client;
      return client;
    }

    return null;
  }

  function byId(id) {
    return document.getElementById(id);
  }

  function getFieldValue(id) {
    const field = byId(id);
    return field ? String(field.value || "").trim() : "";
  }

  function setMessage(message, tone) {
    const node = byId("auth-message");
    if (!node) return;
    node.className = "status-message" + (tone ? " " + tone : "");
    node.textContent = message || "";
  }

  function setBusy(isBusy) {
    const button = byId("email-login-btn");
    const emailField = byId("login-email");
    const passwordField = byId("login-password");

    if (button) {
      button.disabled = Boolean(isBusy);
      button.textContent = isBusy ? LOADING_TEXT : "تسجيل الدخول";
    }

    if (emailField) emailField.setAttribute("aria-busy", isBusy ? "true" : "false");
    if (passwordField) passwordField.setAttribute("aria-busy", isBusy ? "true" : "false");
  }

  function getFriendlyAuthError(error) {
    const code = String(error && error.code ? error.code : "").toLowerCase();

    if (code === "auth/invalid-login-credentials" || code === "auth/invalid-credentials" || code === "invalid_login" || code === "invalid_credentials") {
      return "البريد الإلكتروني أو كلمة المرور غير صحيحة.";
    }

    if (code === "auth/user-not-found") {
      return "لا يوجد حساب مسجّل بهذا البريد الإلكتروني.";
    }

    if (code === "auth/too-many-requests") {
      return "تم حظر المحاولات مؤقتًا. حاول مرة أخرى بعد قليل.";
    }

    if (code === "auth/invalid-email") {
      return "أدخل بريدًا إلكترونيًا صالحًا.";
    }

    if (code === "auth/email-not-confirmed" || code === "email_not_confirmed") {
      return "هذا الحساب يحتاج تأكيد البريد الإلكتروني أولًا.";
    }

    if (code === "auth/network-request-failed") {
      return "تعذر الوصول إلى Supabase. تحقق من الاتصال ثم أعد المحاولة.";
    }

    if (code === "auth/session-expired") {
      return "انتهت الجلسة. أعد تسجيل الدخول مرة أخرى.";
    }

    return error && error.message ? String(error.message) : "تعذر تسجيل الدخول. حاول مرة أخرى.";
  }

  async function handleLogin() {
    if (isSubmitting) return;

    const email = getFieldValue("login-email");
    const password = getFieldValue("login-password");
    const client = getSupabaseClient();

    if (!client) {
      setMessage("تعذر العثور على Supabase Client. أعد تحميل الصفحة.", "error");
      return;
    }

    if (!email || !password) {
      setMessage("يرجى إدخال البريد الإلكتروني وكلمة المرور.", "error");
      return;
    }

    if (!email.includes("@")) {
      setMessage("استخدم البريد الإلكتروني المسجل فقط.", "error");
      return;
    }

    isSubmitting = true;
    setMessage("", "");
    setBusy(true);

    try {
      const { data, error } = await client.auth.signInWithPassword({
        email: email,
        password: password
      });

      if (error) {
        setMessage(getFriendlyAuthError(error), "error");
        return;
      }

      if (!data || !data.user) {
        setMessage("تم تسجيل الدخول، لكن لم يتم استلام بيانات الجلسة.", "error");
        return;
      }

      setMessage("تم تسجيل الدخول بنجاح. يتم التحويل الآن...", "success");
      window.setTimeout(function () {
        window.location.href = REDIRECT_AFTER_LOGIN;
      }, SESSION_REDIRECT_DELAY_MS);
    } catch (error) {
      console.error("Supabase login failed:", error);
      setMessage("حدث خطأ غير متوقع أثناء تسجيل الدخول.", "error");
    } finally {
      isSubmitting = false;
      setBusy(false);
    }
  }

  function showSocialPlaceholderMessage() {
    setMessage(SOCIAL_PLACEHOLDER_MESSAGE, "info");
  }

  function bindEnterKey(input) {
    if (!input) return;
    input.addEventListener("keydown", function (event) {
      if (event.key !== "Enter") return;
      event.preventDefault();
      handleLogin();
    });
  }

  function init() {
    const loginButton = byId("email-login-btn");
    const googleButton = byId("google-btn");
    const facebookButton = byId("facebook-btn");
    const emailField = byId("login-email");
    const passwordField = byId("login-password");
    const client = getSupabaseClient();

    if (!loginButton || !emailField || !passwordField) {
      return;
    }

    if (!client) {
      setMessage("تعذر تحميل Supabase. تأكد من إعداد scripts/supabase-config.js ثم أعد تحميل الصفحة.", "error");
      return;
    }

    loginButton.addEventListener("click", function () {
      handleLogin();
    });

    bindEnterKey(passwordField);

    if (emailField) {
      emailField.addEventListener("keydown", function (event) {
        if (event.key !== "Enter") return;
        if (passwordField && String(passwordField.value || "").trim()) {
          event.preventDefault();
          handleLogin();
        }
      });
    }

    if (googleButton) {
      googleButton.addEventListener("click", function () {
        showSocialPlaceholderMessage();
      });
    }

    if (facebookButton) {
      facebookButton.addEventListener("click", function () {
        showSocialPlaceholderMessage();
      });
    }

    if (client.auth && typeof client.auth.getSession === "function") {
      client.auth.getSession().then(function (result) {
        if (result && result.data && result.data.session) {
          window.location.href = REDIRECT_AFTER_LOGIN;
        }
      }).catch(function () {
        return null;
      });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();