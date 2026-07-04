// VVIP TIGER - Real Supabase Login Bridge

(function () {
  const REDIRECT_AFTER_LOGIN = "private-profile.html";

  function showMessage(message) {
    alert(message);
  }

  function findAccountInput() {
    const inputs = Array.from(document.querySelectorAll("input"));

    return inputs.find((input) => {
      const text = [
        input.type,
        input.id,
        input.name,
        input.placeholder,
        input.getAttribute("aria-label")
      ].join(" ").toLowerCase();

      return (
        text.includes("email") ||
        text.includes("mail") ||
        text.includes("phone") ||
        text.includes("البريد") ||
        text.includes("الهاتف")
      );
    });
  }

  function findPasswordInput() {
    return document.querySelector('input[type="password"]');
  }

  function findLoginButton() {
    const buttons = Array.from(
      document.querySelectorAll('button, input[type="submit"], [role="button"]')
    );

    return buttons.find((button) => {
      const text = (
        button.innerText ||
        button.value ||
        button.getAttribute("aria-label") ||
        ""
      ).toLowerCase();

      if (text.includes("facebook") || text.includes("google")) return false;

      return (
        text.includes("تسجيل الدخول") ||
        text.includes("دخول") ||
        text.includes("login") ||
        text.includes("sign in")
      );
    });
  }

  let isLoggingIn = false;

  async function handleRealLogin(event) {
    if (event) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }

    if (isLoggingIn) return;

    const accountInput = findAccountInput();
    const passwordInput = findPasswordInput();
    const loginButton = findLoginButton();

    if (!window.vvipSupabase) {
      showMessage("خطأ: Supabase غير متصل. أعد تحميل الصفحة.");
      return;
    }

    if (!accountInput || !passwordInput) {
      showMessage("لم أجد حقول البريد وكلمة المرور في الصفحة.");
      return;
    }

    const account = accountInput.value.trim();
    const password = passwordInput.value;

    if (!account || !password) {
      showMessage("يرجى إدخال البريد الإلكتروني وكلمة المرور.");
      return;
    }

    if (!account.includes("@")) {
      showMessage("حاليًا تسجيل الدخول الحقيقي يعمل بالبريد الإلكتروني فقط. رقم الهاتف نربطه لاحقًا عبر OTP.");
      return;
    }

    isLoggingIn = true;

    const oldButtonText = loginButton ? loginButton.innerText : "";

    if (loginButton) {
      loginButton.disabled = true;
      loginButton.innerText = "جاري تسجيل الدخول...";
    }

    try {
      const { data, error } = await window.vvipSupabase.auth.signInWithPassword({
        email: account,
        password: password
      });

      if (error) {
        showMessage("فشل تسجيل الدخول: " + error.message);
        return;
      }

      console.log("VVIP login success:", data.user.email);
      window.location.href = REDIRECT_AFTER_LOGIN;
    } catch (err) {
      console.error("VVIP login failed:", err);
      showMessage("حدث خطأ أثناء تسجيل الدخول.");
    } finally {
      isLoggingIn = false;

      if (loginButton) {
        loginButton.disabled = false;
        loginButton.innerText = oldButtonText || "تسجيل الدخول";
      }
    }
  }

  document.addEventListener(
    "click",
    function (event) {
      const loginButton = findLoginButton();

      if (!loginButton) return;

      if (event.target === loginButton || loginButton.contains(event.target)) {
        handleRealLogin(event);
      }
    },
    true
  );

  document.addEventListener(
    "submit",
    function (event) {
      const form = event.target;

      if (!form || !form.querySelector) return;

      const hasPassword = form.querySelector('input[type="password"]');
      const hasAccount = findAccountInput();

      if (hasPassword && hasAccount) {
        handleRealLogin(event);
      }
    },
    true
  );

  console.log("VVIP Supabase auth bridge ready");
})();
