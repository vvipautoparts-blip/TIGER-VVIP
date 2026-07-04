(function () {
  function normalizeAuthHost() {
    if (window.location.hostname === "127.0.0.1") {
      const nextUrl = new URL(window.location.href);
      nextUrl.hostname = "localhost";
      window.location.replace(nextUrl.toString());
      return true;
    }
    return false;
  }

  if (normalizeAuthHost()) {
    return;
  }

  const runtimeConfig = window.FIREBASE_CONFIG || {};
  const firebaseConfig = {
    apiKey: runtimeConfig.apiKey || "YOUR_API_KEY",
    authDomain: runtimeConfig.authDomain || "auto-parts-aa00a.firebaseapp.com",
    projectId: runtimeConfig.projectId || "auto-parts-aa00a",
    storageBucket: runtimeConfig.storageBucket || "auto-parts-aa00a.appspot.com",
    messagingSenderId: runtimeConfig.messagingSenderId || "709675029751",
    appId: runtimeConfig.appId || "YOUR_APP_ID"
  };

  function isPlaceholder(value) {
    return String(value || "").startsWith("YOUR_");
  }

  function getMissingConfigFields(config) {
    const missing = [];
    if (!config.apiKey || isPlaceholder(config.apiKey)) missing.push("apiKey");
    if (!config.appId || isPlaceholder(config.appId)) missing.push("appId");
    if (!config.projectId || isPlaceholder(config.projectId)) missing.push("projectId");
    if (!config.authDomain || isPlaceholder(config.authDomain)) missing.push("authDomain");
    if (!config.messagingSenderId || isPlaceholder(config.messagingSenderId)) missing.push("messagingSenderId");
    return missing;
  }

  const missingFields = getMissingConfigFields(firebaseConfig);

  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }

  const auth = firebase.auth();
  const googleProvider = new firebase.auth.GoogleAuthProvider();
  googleProvider.addScope("email");
  googleProvider.addScope("profile");

  const facebookProvider = new firebase.auth.FacebookAuthProvider();
  facebookProvider.addScope("email");

  const googleBtn = document.getElementById("google-btn");
  const facebookBtn = document.getElementById("facebook-btn");
  const logoutBtn = document.getElementById("logout-btn");
  const authMessage = document.getElementById("auth-message");
  const profileActions = document.getElementById("profile-actions");
  const continuePublicBtn = document.getElementById("continue-public-btn");
  const avatarPrivateBtn = document.getElementById("avatar-private-btn");
  const avatarFallback = document.getElementById("avatar-fallback");
  const verificationModal = document.getElementById("verification-modal");
  const verificationEmail = document.getElementById("verification-email");
  const closeVerification = document.getElementById("close-verification");
  const logoutConfirmModal = document.getElementById("logout-confirm-modal");
  const confirmLogoutBtn = document.getElementById("confirm-logout-btn");
  const cancelLogoutBtn = document.getElementById("cancel-logout-btn");
  const emailLoginBtn = document.getElementById("email-login-btn");
  const loginEmailInput = document.getElementById("login-email");
  const loginPasswordInput = document.getElementById("login-password");
  const toastRoot = document.getElementById("app-toast-root");
  const ROLE_STORAGE_KEY = "autoparts_role";
  const USER_STORAGE_KEY = "autoparts_user_snapshot";
  const STORAGE_LANG_KEY = "autoparts_lang";
  const OAUTH_POPUP_TIMEOUT_MS = 10000;
  const OAUTH_LOADING_MAX_MS = 15000;
  let lastOAuthAttemptAt = 0;
  let authLang = normalizeLang(localStorage.getItem(STORAGE_LANG_KEY) || document.documentElement.lang || "ar");

  const AUTH_TEXT = {
    title: { ar: "تسجيل الدخول - VVIP TIGER", en: "Login - VVIP TIGER" },
    brandSubtitle: { ar: "بحث أسرع. موردون أوثق. تجربة دخول آمنة.", en: "Faster search. Better suppliers. Secure sign-in experience." },
    cardTitle: { ar: "تسجيل الدخول", en: "Sign in" },
    cardSubtitle: { ar: "بدون كلمات مرور. اختر مزودك للمتابعة.", en: "No passwords needed. Choose a provider to continue." },
    navIndex: { ar: "الدخول", en: "Login" },
    navPublic: { ar: "الصفحة العامة", en: "Public page" },
    navPrivate: { ar: "البروفايل الخاص", en: "Private profile" },
    navReset: { ar: "استعادة كلمة المرور", en: "Reset password" },
    continueLabel: { ar: "متابعة باستخدام", en: "Continue with" },
    continuePublic: { ar: "متابعة إلى البروفايل العام", en: "Continue to public profile" },
    resetLink: { ar: "نسيت كلمة المرور؟ إعادة تعيين بالإيميل", en: "Forgot your password? Reset via email" },
    logout: { ar: "تسجيل الخروج", en: "Log out" },
    avatarAria: { ar: "الانتقال إلى البروفايل الخاص", en: "Go to private profile" },
    verifyTitle: { ar: "التحقق من البريد الإلكتروني", en: "Verify your email" },
    verifyMessagePrefix: { ar: "أرسلنا رابط تحقق إلى ", en: "We sent a verification link to " },
    verifyNote: { ar: "افتح بريدك ثم أكد الحساب للمتابعة.", en: "Open your inbox and confirm your account to continue." },
    verifyClose: { ar: "فهمت", en: "Got it" },
    logoutConfirmTitle: { ar: "هل تريد تسجيل الخروج من حسابك؟", en: "Do you want to log out from your account?" },
    logoutConfirmNote: { ar: "سيتم إنهاء الجلسة الحالية والعودة إلى وضع التصفح العام.", en: "Your current session will end and you will return to public browsing mode." },
    cancel: { ar: "إلغاء", en: "Cancel" },
    switchLanguageGroupAria: { ar: "اختيار اللغة", en: "Language selection" },
    firebaseConfigMissing: { ar: "إعداد Firebase غير مكتمل. القيم الناقصة: ", en: "Firebase setup is incomplete. Missing values: " },
    firebaseConfigHint: { ar: "إعداد Firebase غير مكتمل. رجاء إضافة FIREBASE_CONFIG أو تحديث auth.js", en: "Firebase setup is incomplete. Please add FIREBASE_CONFIG or update auth.js" },
    signInFailed: { ar: "تعذر إتمام تسجيل الدخول.", en: "Unable to complete sign-in." },
    verificationSent: { ar: "تم إرسال رسالة التحقق إلى بريدك الإلكتروني.", en: "A verification email has been sent to your inbox." },
    signInSuccess: { ar: "تم تسجيل الدخول بنجاح.", en: "Signed in successfully." },
    signInSuccessViaPrefix: { ar: "تم تسجيل الدخول بنجاح عبر ", en: "Signed in successfully with " },
    signInFailedPrefix: { ar: "فشل تسجيل الدخول: ", en: "Sign-in failed: " },
    signInFailedToast: { ar: "فشل تسجيل الدخول.", en: "Sign-in failed." },
    unknownError: { ar: "خطأ غير معروف", en: "Unknown error" },
    logoutSuccess: { ar: "تم تسجيل الخروج.", en: "Logged out successfully." },
    logoutFail: { ar: "تعذر تسجيل الخروج.", en: "Unable to log out." },
    firebaseSetupToast: { ar: "إعداد Firebase غير مكتمل.", en: "Firebase setup is incomplete." },
    googleAria: { ar: "تسجيل الدخول عبر Google", en: "Google sign in" },
    facebookAria: { ar: "تسجيل الدخول عبر Facebook", en: "Facebook sign in" }
  };

 function tx(pair) {
  if (!pair) return "";
  return authLang === "en" ? (pair.en || pair.ar || "") : (pair.ar || pair.en || "");
}

  function normalizeLang(value) {
    return String(value || "").toLowerCase().indexOf("en") === 0 ? "en" : "ar";
  }

  function getAuthSupportHint(code) {
    if (code === "auth/operation-not-allowed") {
      return authLang === "en"
        ? "Enable Email/Password in Firebase Console → Authentication → Sign-in method."
        : "فعّل Email/Password من Firebase Console → Authentication → Sign-in method.";
    }
    if (code === "auth/unauthorized-domain") {
      return authLang === "en"
        ? "Add localhost to Firebase Console → Authentication → Settings → Authorized domains."
        : "أضف localhost إلى Firebase Console → Authentication → Settings → Authorized domains.";
    }
    return "";
  }

  function signInWithPopupTimeout(provider) {
    return Promise.race([
      auth.signInWithPopup(provider),
      new Promise(function (_resolve, reject) {
        window.setTimeout(function () {
          reject({
            code: "auth/popup-timeout",
            message: "OAuth popup timed out"
          });
        }, OAUTH_POPUP_TIMEOUT_MS);
      })
    ]);
  }

  function setText(selector, value) {
    const node = document.querySelector(selector);
    if (node) node.textContent = value;
  }

  function applyAuthLocalization() {
    document.title = tx(AUTH_TEXT.title);
    setText(".login-subtitle", tx(AUTH_TEXT.brandSubtitle));
    setText(".card-title", tx(AUTH_TEXT.cardTitle));
    setText(".card-subtitle", tx(AUTH_TEXT.cardSubtitle));

    const navIndex = document.querySelector('[data-page-target="index"]');
    if (navIndex) navIndex.textContent = tx(AUTH_TEXT.navIndex);
    const navPublic = document.querySelector('[data-page-target="public-profile"]');
    if (navPublic) navPublic.textContent = tx(AUTH_TEXT.navPublic);
    const navPrivate = document.querySelector('[data-page-target="private-profile"]');
    if (navPrivate) navPrivate.textContent = tx(AUTH_TEXT.navPrivate);
    const navReset = document.querySelector('[data-page-target="reset-password"]');
    if (navReset) navReset.textContent = tx(AUTH_TEXT.navReset);

    const langGroup = document.querySelector(".entry-lang-switch");
    if (langGroup) langGroup.setAttribute("aria-label", tx(AUTH_TEXT.switchLanguageGroupAria));

    const googleLabel = document.querySelector("#google-btn .auth-label");
    if (googleLabel) googleLabel.textContent = tx(AUTH_TEXT.continueLabel);
    const facebookLabel = document.querySelector("#facebook-btn .auth-label");
    if (facebookLabel) facebookLabel.textContent = tx(AUTH_TEXT.continueLabel);

    if (googleBtn) googleBtn.setAttribute("aria-label", tx(AUTH_TEXT.googleAria));
    if (facebookBtn) facebookBtn.setAttribute("aria-label", tx(AUTH_TEXT.facebookAria));

    if (continuePublicBtn) continuePublicBtn.textContent = tx(AUTH_TEXT.continuePublic);
    if (avatarPrivateBtn) avatarPrivateBtn.setAttribute("aria-label", tx(AUTH_TEXT.avatarAria));
    setText(".reset-link", tx(AUTH_TEXT.resetLink));
    if (logoutBtn) logoutBtn.textContent = tx(AUTH_TEXT.logout);

    setText("#verification-modal .verification-title", tx(AUTH_TEXT.verifyTitle));
    setText("#verification-modal .verification-note", tx(AUTH_TEXT.verifyNote));
    const verificationMessage = document.querySelector("#verification-modal .verification-message");
    if (verificationMessage && verificationMessage.firstChild && verificationMessage.firstChild.nodeType === Node.TEXT_NODE) {
      verificationMessage.firstChild.nodeValue = tx(AUTH_TEXT.verifyMessagePrefix);
    }
    if (closeVerification) closeVerification.textContent = tx(AUTH_TEXT.verifyClose);

    setText("#logout-confirm-modal .verification-title", tx(AUTH_TEXT.logoutConfirmTitle));
    setText("#logout-confirm-modal .verification-note", tx(AUTH_TEXT.logoutConfirmNote));
    if (confirmLogoutBtn) confirmLogoutBtn.textContent = tx(AUTH_TEXT.logout);
    if (cancelLogoutBtn) cancelLogoutBtn.textContent = tx(AUTH_TEXT.cancel);
  }

  function applyEntryLanguage(lang) {
    const activeLang = normalizeLang(lang);
    authLang = activeLang;
    document.documentElement.lang = activeLang;
    document.documentElement.dir = activeLang === "ar" ? "rtl" : "ltr";
    applyAuthLocalization();

    const langButtons = Array.from(document.querySelectorAll("[data-auth-lang]"));
    langButtons.forEach(function (button) {
      const btnLang = normalizeLang(button.getAttribute("data-auth-lang"));
      const isActive = btnLang === activeLang;
      button.classList.toggle("active", isActive);
      button.setAttribute("aria-pressed", isActive ? "true" : "false");
    });
  }

  function initEntryLanguageSelector() {
    const langButtons = Array.from(document.querySelectorAll("[data-auth-lang]"));
    const storedLang = normalizeLang(localStorage.getItem(STORAGE_LANG_KEY) || document.documentElement.lang || "ar");
    localStorage.setItem(STORAGE_LANG_KEY, storedLang);
    applyEntryLanguage(storedLang);

    if (!langButtons.length) return;

    langButtons.forEach(function (button) {
      button.addEventListener("click", function () {
        const nextLang = normalizeLang(button.getAttribute("data-auth-lang"));
        localStorage.setItem(STORAGE_LANG_KEY, nextLang);
        applyEntryLanguage(nextLang);
      });
    });
  }

  function showToast(message, tone) {
    if (!toastRoot || !message) return;
    const toast = document.createElement("div");
    toast.className = "app-toast" + (tone ? " is-" + tone : "");
    toast.textContent = message;
    toastRoot.appendChild(toast);
    window.setTimeout(function () {
      toast.classList.add("is-leaving");
      window.setTimeout(function () {
        toast.remove();
      }, 220);
    }, 2400);
  }

  initEntryLanguageSelector();

  function setButtonLoading(button, isLoading) {
    if (!button) return;
    button.classList.toggle("is-loading", isLoading);
    button.disabled = Boolean(isLoading);
    button.setAttribute("aria-busy", isLoading ? "true" : "false");
    if (isLoading) {
      button.setAttribute("data-loading-start", String(Date.now()));
    } else {
      button.removeAttribute("data-loading-start");
    }
  }

  function releaseStaleOAuthButtons() {
    [googleBtn, facebookBtn].forEach(function (button) {
      if (!button || !button.disabled) return;
      const startedAt = Number(button.getAttribute("data-loading-start") || "0");
      const fallbackStartedAt = lastOAuthAttemptAt;
      const effectiveStartedAt = startedAt || fallbackStartedAt;
      if (!effectiveStartedAt) return;
      if (Date.now() - effectiveStartedAt > OAUTH_LOADING_MAX_MS) {
        setButtonLoading(button, false);
      }
    });
  }

  window.setInterval(releaseStaleOAuthButtons, 1200);
  window.addEventListener("focus", releaseStaleOAuthButtons);
  document.addEventListener("visibilitychange", function () {
    if (!document.hidden) {
      releaseStaleOAuthButtons();
    }
  });

  function openLogoutConfirm() {
    if (!logoutConfirmModal) return;
    logoutConfirmModal.style.display = "flex";
  }

  function closeLogoutConfirm() {
    if (!logoutConfirmModal) return;
    logoutConfirmModal.style.display = "none";
  }

  function setMessage(text, type) {
    if (!authMessage) return;
    authMessage.textContent = text;
    authMessage.className = "status-message" + (type ? " " + type : "");
  }

  function showVerification(email) {
    const verificationMessage = document.querySelector("#verification-modal .verification-message");
    if (verificationMessage && verificationMessage.firstChild && verificationMessage.firstChild.nodeType === Node.TEXT_NODE) {
      verificationMessage.firstChild.nodeValue = tx(AUTH_TEXT.verifyMessagePrefix);
    }
    if (verificationEmail) verificationEmail.textContent = email || "";
    if (verificationModal) verificationModal.style.display = "flex";
  }

  async function handleProviderSignIn(provider, providerName) {
    if (missingFields.length) {
      setMessage(tx(AUTH_TEXT.firebaseConfigMissing) + missingFields.join(", "), "error");
      showToast(tx(AUTH_TEXT.firebaseSetupToast), "error");
      return;
    }

    const sourceButton = providerName === "Google" ? googleBtn : facebookBtn;
    lastOAuthAttemptAt = Date.now();
    setButtonLoading(sourceButton, true);

    try {
      let result;
      try {
        result = await signInWithPopupTimeout(provider);
      } catch (popupError) {
        const code = String(popupError && popupError.code ? popupError.code : "");
        console.error('🚨 OAuth popup error:', { code, message: popupError && popupError.message });
        
        if (code === "auth/popup-blocked" || code === "auth/cancelled-popup-request") {
          await auth.signInWithRedirect(provider);
          return;
        }

        if (code === "auth/popup-timeout") {
          const timeoutMsg = authLang === "en"
            ? "Google/Facebook sign-in popup did not complete. Please try again."
            : "نافذة تسجيل الدخول عبر Google/Facebook لم تكتمل. حاول مرة أخرى.";
          setMessage(timeoutMsg, "error");
          showToast(timeoutMsg, "error");
          return;
        }
        
        if (code === "auth/unauthorized-domain") {
          const msg = tx(AUTH_TEXT.firebaseConfigMissing) + "Unauthorized domain. Check Firebase Console.";
          setMessage(msg, "error");
          showToast(msg, "error");
          console.error('📌 Solution: Add tigerautoparts.shop to Authorized domains in Firebase Console');
          return;
        }
        
        throw popupError;
      }

      const user = result.user;

      if (!user) {
        setMessage(tx(AUTH_TEXT.signInFailed), "error");
        showToast(tx(AUTH_TEXT.signInFailed), "error");
        return;
      }

      if (!user.emailVerified) {
        await user.sendEmailVerification({
          url: window.location.origin + "/index.html"
        });
        showVerification(user.email);
        await auth.signOut();
        setMessage(tx(AUTH_TEXT.verificationSent), "info");
        showToast(tx(AUTH_TEXT.verificationSent), "info");
        return;
      }

      setMessage(tx(AUTH_TEXT.signInSuccessViaPrefix) + providerName + ".", "success");
      showToast(tx(AUTH_TEXT.signInSuccess), "success");
    } catch (error) {
      setMessage(tx(AUTH_TEXT.signInFailedPrefix) + (error && error.message ? error.message : tx(AUTH_TEXT.unknownError)), "error");
      showToast(tx(AUTH_TEXT.signInFailedToast), "error");
    } finally {
      setButtonLoading(sourceButton, false);
    }
  }

  if (googleBtn) {
    googleBtn.addEventListener("click", function () {
      handleProviderSignIn(googleProvider, "Google");
    });
  }

  if (facebookBtn) {
    facebookBtn.addEventListener("click", function () {
      handleProviderSignIn(facebookProvider, "Facebook");
    });
  }

  // Email / Password login
  async function handleEmailLogin(triggerEvent) {
    if (triggerEvent && triggerEvent.isTrusted === false) {
      return;
    }
    if (!emailLoginBtn || !loginEmailInput || !loginPasswordInput) return;
    const email = String(loginEmailInput.value || "").trim();
    const password = String(loginPasswordInput.value || "");
    if (!email || !password) {
      setMessage(authLang === "en" ? "Please enter email and password." : "يرجى إدخال البريد الإلكتروني وكلمة المرور.", "error");
      return;
    }
    setButtonLoading(emailLoginBtn, true);
    try {
      const result = await auth.signInWithEmailAndPassword(email, password);
      const user = result.user;
      if (user && !user.emailVerified) {
        await user.sendEmailVerification({ url: window.location.origin + "/index.html" });
        showVerification(user.email);
        await auth.signOut();
        return;
      }
      showToast(tx(AUTH_TEXT.signInSuccess), "success");
      window.location.href = "public-profile.html";
    } catch (err) {
      const code = String(err && err.code ? err.code : "");
      let msg = authLang === "en" ? "Sign-in failed." : "فشل تسجيل الدخول.";
      
      console.error('🚨 Email login error:', { code, message: err && err.message });
      
      if (code === "auth/operation-not-allowed") {
        msg = authLang === "en" 
          ? "❌ Email/Password login is not enabled. Please try Google or Facebook."
          : "❌ تسجيل الدخول عبر البريد الإلكتروني غير مفعّل. حاول جوجل أو فيسبوك.";
        console.error('📌 Solution: Enable Email/Password in Firebase Console → Authentication → Sign-in method');
      } else if (code === "auth/user-not-found") {
        msg = authLang === "en" ? "Email not found. Please create a new account." : "البريد الإلكتروني غير موجود. أنشئ حساب جديد.";
      } else if (code === "auth/wrong-password" || code === "auth/invalid-credential") {
        msg = authLang === "en" ? "Incorrect email or password." : "البريد الإلكتروني أو كلمة المرور غير صحيحة.";
      } else if (code === "auth/too-many-requests") {
        msg = authLang === "en" ? "Too many attempts. Try again later." : "محاولات كثيرة. حاول لاحقاً.";
      } else if (code === "auth/invalid-email") {
        msg = authLang === "en" ? "Invalid email format." : "صيغة البريد الإلكتروني غير صحيحة.";
      } else if (code === "auth/weak-password") {
        msg = authLang === "en" ? "Password is too weak. Use at least 6 characters." : "كلمة المرور ضعيفة جداً. استخدم 6 أحرف على الأقل.";
      }

      const supportHint = getAuthSupportHint(code);
      if (supportHint) {
        msg = msg + " " + supportHint;
      }
      
      setMessage(msg, "error");
      showToast(msg, "error");
    } finally {
      setButtonLoading(emailLoginBtn, false);
    }
  }

  if (emailLoginBtn) {
    emailLoginBtn.addEventListener("click", function (event) {
      handleEmailLogin(event);
    });
  }
  if (loginPasswordInput) {
    loginPasswordInput.addEventListener("keydown", function (e) {
      if (e.key === "Enter") handleEmailLogin(e);
    });
  }
  if (loginEmailInput) {
    loginEmailInput.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && loginPasswordInput) loginPasswordInput.focus();
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener("click", function () {
      openLogoutConfirm();
    });
  }

  if (confirmLogoutBtn) {
    confirmLogoutBtn.addEventListener("click", async function () {
      setButtonLoading(confirmLogoutBtn, true);
      try {
        await auth.signOut();
        setMessage(tx(AUTH_TEXT.logoutSuccess), "info");
        showToast(tx(AUTH_TEXT.logoutSuccess), "info");
        closeLogoutConfirm();
      } catch (error) {
        setMessage(tx(AUTH_TEXT.logoutFail), "error");
        showToast(tx(AUTH_TEXT.logoutFail), "error");
      } finally {
        setButtonLoading(confirmLogoutBtn, false);
      }
    });
  }

  if (cancelLogoutBtn) {
    cancelLogoutBtn.addEventListener("click", closeLogoutConfirm);
  }

  if (logoutConfirmModal) {
    logoutConfirmModal.addEventListener("click", function (event) {
      if (event.target === logoutConfirmModal) {
        closeLogoutConfirm();
      }
    });
  }

  if (continuePublicBtn) {
    continuePublicBtn.addEventListener("click", function () {
      window.location.href = "public-profile.html";
    });
  }

  if (avatarPrivateBtn) {
    avatarPrivateBtn.addEventListener("click", function () {
      window.location.href = "private-profile.html";
    });
  }

  if (closeVerification) {
    closeVerification.addEventListener("click", function () {
      if (verificationModal) verificationModal.style.display = "none";
    });
  }

  auth.onAuthStateChanged(function (user) {
    if (!logoutBtn) return;
    logoutBtn.style.display = user ? "block" : "none";

    if (avatarPrivateBtn && avatarFallback) {
      const displayName = user && user.displayName ? String(user.displayName).trim() : "";
      const email = user && user.email ? String(user.email).trim() : "";
      const firstSource = displayName || email || "User";
      avatarFallback.textContent = firstSource.charAt(0).toUpperCase();

      if (user && user.photoURL) {
        avatarPrivateBtn.style.backgroundImage = "url('" + user.photoURL + "')";
        avatarPrivateBtn.classList.add("has-photo");
        avatarFallback.style.display = "none";
      } else {
        avatarPrivateBtn.style.backgroundImage = "none";
        avatarPrivateBtn.classList.remove("has-photo");
        avatarFallback.style.display = "inline";
      }
    }

    if (user) {
      const displayName = user.displayName || "AutoParts User";
      const email = user.email || "";
      const handleSeed = (email.split("@")[0] || displayName).replace(/\s+/g, ".").toLowerCase();
      localStorage.setItem(
        USER_STORAGE_KEY,
        JSON.stringify({
          uid: user.uid,
          displayName: displayName,
          email: email,
          handle: handleSeed,
          photoURL: user.photoURL || ""
        })
      );

      if (!localStorage.getItem(ROLE_STORAGE_KEY)) {
        localStorage.setItem(ROLE_STORAGE_KEY, "company_parts");
      }
    } else {
      localStorage.removeItem(USER_STORAGE_KEY);
    }
  });

  if (missingFields.length) {
    setMessage(tx(AUTH_TEXT.firebaseConfigHint), "error");
  }
})();
