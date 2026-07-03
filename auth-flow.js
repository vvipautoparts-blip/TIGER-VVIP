(function () {
  const STORAGE_LANG_KEY = "autoparts_lang";
  const STORAGE_USER_KEY = "autoparts_user_snapshot";
  const STORAGE_SESSIONS_KEY = "autoparts_device_sessions";
  const STORAGE_OTP_STATE_KEY = "autoparts_auth_flow_otp_state";
  const STORAGE_2FA_PROFILE_KEY = "autoparts_2fa_profile";
  const STORAGE_2FA_LOCKOUT_KEY = "autoparts_2fa_lockout";
  const STORAGE_TRUSTED_DEVICES_KEY = "autoparts_trusted_devices";

  const OTP_TTL_MS = 5 * 60 * 1000;
  const OTP_RESEND_COOLDOWN_MS = 60 * 1000;
  const OTP_MAX_ATTEMPTS = 5;
  const RECOVERY_LOCKOUT_THRESHOLD = 5;
  const RECOVERY_LOCKOUT_MS = 10 * 60 * 1000;
  const TRUSTED_DEVICE_TTL_DAYS_DEFAULT = 30;

  const stepsByMode = {
    signup: 9,
    recovery: 5
  };

  const modeSignupBtn = document.getElementById("mode-signup");
  const modeRecoveryBtn = document.getElementById("mode-recovery");
  const stepLabel = document.getElementById("flow-step-label");
  const progressFill = document.getElementById("flow-progress-fill");
  const backBtn = document.getElementById("flow-back");
  const nextBtn = document.getElementById("flow-next");
  const form = document.getElementById("auth-flow-form");
  const status = document.getElementById("auth-flow-status");
  const flowSubtitle = document.getElementById("flow-subtitle");
  const finishSignupBtn = document.getElementById("flow-finish-signup");
  const finishRecoveryBtn = document.getElementById("flow-finish-recovery");
  const signupOtpResendBtn = document.getElementById("signup-otp-resend");
  const recoveryOtpResendBtn = document.getElementById("recovery-otp-resend");
  const signupOtpMeta = document.getElementById("signup-otp-meta");
  const recoveryOtpMeta = document.getElementById("recovery-otp-meta");
  const signupTrustedDevice = document.getElementById("signup-trusted-device");
  const signupTrustedExpiry = document.getElementById("signup-trusted-expiry");
  const signupGenerateBackupBtn = document.getElementById("signup-generate-backup");
  const signupRevokeTrustedBtn = document.getElementById("signup-revoke-trusted");
  const signupViewSecurityBtn = document.getElementById("signup-view-security");
  const signupCopySecurityBtn = document.getElementById("signup-copy-security");
  const signupExportSecurityBtn = document.getElementById("signup-export-security");
  const signupBackupCodesBox = document.getElementById("signup-backup-codes");
  const signupTrustedDevicesBox = document.getElementById("signup-trusted-devices");
  const signupSecuritySummary = document.getElementById("signup-security-summary");
  const securityReportModal = document.getElementById("security-report-modal");
  const securityReportPreview = document.getElementById("security-report-preview");
  const securityReportCloseBtn = document.getElementById("security-report-close");
  const securityReportCopyBtn = document.getElementById("security-report-copy");
  const securityReportExportBtn = document.getElementById("security-report-export");
  const recoveryBackupCodeInput = document.getElementById("recovery-backup-code");
  const recoveryStep3Note = document.getElementById("recovery-step3-note");

  const runtimeConfig = window.FIREBASE_CONFIG || {};
  const firebaseConfig = {
    apiKey: runtimeConfig.apiKey || "",
    authDomain: runtimeConfig.authDomain || "",
    projectId: runtimeConfig.projectId || "",
    storageBucket: runtimeConfig.storageBucket || "",
    messagingSenderId: runtimeConfig.messagingSenderId || "",
    appId: runtimeConfig.appId || ""
  };

  function hasFirebaseConfig() {
    return Boolean(firebaseConfig.apiKey && firebaseConfig.appId);
  }

  if (window.firebase && hasFirebaseConfig()) {
    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }
  }

  const auth = window.firebase && hasFirebaseConfig() ? firebase.auth() : null;

  function normalizeLang(value) {
    return String(value || "").toLowerCase().indexOf("en") === 0 ? "en" : "ar";
  }

  const params = new URLSearchParams(window.location.search);
  let mode = params.get("mode") === "recovery" ? "recovery" : "signup";
  let currentStep = 1;
  const lang = normalizeLang(params.get("lang") || localStorage.getItem(STORAGE_LANG_KEY) || document.documentElement.lang || "ar");

  localStorage.setItem(STORAGE_LANG_KEY, lang);
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";

  const COPY = {
    ar: {
      signup: "إنشاء حساب",
      recovery: "استرجاع الحساب",
      step: "الخطوة ",
      next: "التالي",
      finish: "إنهاء",
      back: "السابق",
      subtitle: "منظومة مصادقة كاملة خطوة بخطوة.",
      required: "يرجى إكمال الحقول المطلوبة.",
      invalidOtp: "الرمز يجب أن يكون 6 أرقام.",
      passwordMismatch: "كلمتا المرور غير متطابقتين.",
      minPassword: "كلمة المرور يجب أن تكون 8 أحرف على الأقل.",
      interestsRequired: "اختر اهتمامًا واحدًا على الأقل.",
      consentRequired: "يجب الموافقة على الشروط.",
      done: "تم الحفظ بنجاح.",
      sending: "جاري التنفيذ...",
      firebaseMissing: "إعداد Firebase غير مكتمل.",
      signupSuccess: "تم إنشاء الحساب وإرسال رسالة التحقق.",
      signupFailed: "تعذر إنشاء الحساب.",
      recoveryEmailSent: "تم إرسال رابط الاستعادة إلى البريد.",
      recoveryFallback: "تم حفظ الطلب محليًا. أكمل الاسترجاع عبر الدعم أو reset-password.",
      emailRequired: "لاسترجاع البريد يجب إدخال بريد إلكتروني صالح.",
      phoneRequired: "رقم هاتف صالح مطلوب لهذه الخطوة.",
      otpSendFailed: "تعذر إرسال رمز التحقق.",
      otpSent: "تم إرسال رمز التحقق.",
      otpDevCode: "رمز التطوير:",
      otpExpired: "انتهت صلاحية الرمز. أعد الإرسال.",
      otpAttemptsExceeded: "تم تجاوز عدد المحاولات. أعد إرسال رمز جديد.",
      otpInvalid: "رمز التحقق غير صحيح.",
      otpVerified: "تم التحقق من الرمز بنجاح.",
      otpNeedDispatch: "أرسل رمز التحقق أولاً قبل المتابعة.",
      otpAlreadyVerified: "التحقق مكتمل لهذه الخطوة.",
      resendIn: "إعادة الإرسال بعد",
      codeExpiresIn: "ينتهي بعد",
      trustedInfo: "استخدم جهازًا موثوقًا بعد تسجيل الدخول لإتمام هذه الطريقة.",
      backupNeedGenerate: "أنشئ أكواد احتياطية أولًا في خطوة الحماية.",
      backupCodeInvalid: "الكود الاحتياطي غير صالح أو تم استخدامه.",
      backupCodeUsed: "تم قبول الكود الاحتياطي.",
      trustedDeviceMissing: "هذا الجهاز غير موثوق. استخدم SMS أو كود احتياطي.",
      trustedDeviceAccepted: "تم قبول الجهاز الموثوق.",
      trustedDevicesRevoked: "تم إبطال جميع الأجهزة الموثوقة.",
      trustedDeviceRemoved: "تم حذف الجهاز الموثوق.",
      recoveryLocked: "تم قفل المحاولة مؤقتًا. حاول بعد",
      backupCodesGenerated: "تم توليد أكواد احتياطية جديدة.",
      backupCodesHint: "احفظ الأكواد في مكان آمن. كل كود يستخدم مرة واحدة.",
      securitySummary: "الأكواد المتبقية:",
      trustedDevicesSummary: "الأجهزة الموثوقة النشطة:",
      trustedDevicesNone: "لا توجد أجهزة موثوقة حالياً.",
      removeDevice: "حذف",
      deviceExpires: "ينتهي",
      securityReportExported: "تم تصدير التقرير الأمني بنجاح.",
      securityReportCopied: "تم نسخ التقرير الأمني إلى الحافظة.",
      securityReportCopyFailed: "تعذر نسخ التقرير الأمني.",
      securityReportPreviewOpen: "تم فتح معاينة التقرير الأمني."
    },
    en: {
      signup: "Sign up",
      recovery: "Recovery",
      step: "Step ",
      next: "Next",
      finish: "Finish",
      back: "Back",
      subtitle: "A complete step-by-step authentication system.",
      required: "Please complete required fields.",
      invalidOtp: "OTP must be 6 digits.",
      passwordMismatch: "Passwords do not match.",
      minPassword: "Password must be at least 8 characters.",
      interestsRequired: "Select at least one interest.",
      consentRequired: "You must accept terms.",
      done: "Saved successfully.",
      sending: "Processing...",
      firebaseMissing: "Firebase config is incomplete.",
      signupSuccess: "Account created and verification email sent.",
      signupFailed: "Failed to create account.",
      recoveryEmailSent: "Recovery email link sent successfully.",
      recoveryFallback: "Request saved locally. Continue using support or reset-password.",
      emailRequired: "A valid email is required for email recovery.",
      phoneRequired: "A valid phone number is required for this step.",
      otpSendFailed: "Failed to send OTP.",
      otpSent: "OTP sent successfully.",
      otpDevCode: "Development code:",
      otpExpired: "OTP expired. Please resend.",
      otpAttemptsExceeded: "Maximum attempts reached. Resend a new OTP.",
      otpInvalid: "Invalid OTP code.",
      otpVerified: "OTP verified successfully.",
      otpNeedDispatch: "Send OTP first before continuing.",
      otpAlreadyVerified: "Verification already completed.",
      resendIn: "Resend in",
      codeExpiresIn: "Expires in",
      trustedInfo: "Use a trusted device after sign-in to complete this method.",
      backupNeedGenerate: "Generate backup codes first in the security step.",
      backupCodeInvalid: "Backup code is invalid or already used.",
      backupCodeUsed: "Backup code accepted.",
      trustedDeviceMissing: "This device is not trusted. Use SMS or backup code.",
      trustedDeviceAccepted: "Trusted device accepted.",
      trustedDevicesRevoked: "All trusted devices were revoked.",
      trustedDeviceRemoved: "Trusted device removed.",
      recoveryLocked: "Recovery is temporarily locked. Try again in",
      backupCodesGenerated: "New backup codes generated.",
      backupCodesHint: "Store these codes safely. Each code can be used once.",
      securitySummary: "Remaining backup codes:",
      trustedDevicesSummary: "Active trusted devices:",
      trustedDevicesNone: "No trusted devices yet.",
      removeDevice: "Remove",
      deviceExpires: "Expires",
      securityReportExported: "Security report exported successfully.",
      securityReportCopied: "Security report copied to clipboard.",
      securityReportCopyFailed: "Failed to copy security report.",
      securityReportPreviewOpen: "Security report preview opened."
    }
  };

  function t(key) {
    return COPY[lang][key] || "";
  }

  function normalizePhone(value) {
    return String(value || "").replace(/[^\d+]/g, "").trim();
  }

  function isLikelyPhone(value) {
    return /^\+?\d{8,15}$/.test(normalizePhone(value));
  }

  function formatDuration(seconds) {
    const safe = Math.max(0, Number(seconds) || 0);
    const mins = Math.floor(safe / 60);
    const secs = safe % 60;
    return mins > 0 ? (mins + ":" + String(secs).padStart(2, "0")) : ("0:" + String(secs).padStart(2, "0"));
  }

  function maskPhone(value) {
    const phone = normalizePhone(value);
    if (!phone) return "";
    if (phone.length <= 4) return phone;
    return phone.slice(0, 3) + "****" + phone.slice(-2);
  }

  function readRuntimeValue(key) {
    const lsValue = localStorage.getItem(key);
    if (lsValue) return String(lsValue).trim();
    const runtime = window.RUNTIME_CONFIG || {};
    const runtimeValue = runtime[key];
    return runtimeValue ? String(runtimeValue).trim() : "";
  }

  function resolvePhoneVerificationEndpoint() {
    const explicit = readRuntimeValue("TIGER_PHONE_VERIFICATION_URL");
    if (explicit) return explicit;

    const supabaseUrl = readRuntimeValue("TIGER_SUPABASE_URL");
    if (!supabaseUrl) return "";
    return supabaseUrl.replace(/\/$/, "") + "/functions/v1/phone-verification";
  }

  function getOtpStateBucket() {
    try {
      const raw = JSON.parse(localStorage.getItem(STORAGE_OTP_STATE_KEY) || "{}");
      return raw && typeof raw === "object" ? raw : {};
    } catch (_error) {
      return {};
    }
  }

  function getOtpState(modeKey) {
    const bucket = getOtpStateBucket();
    const state = bucket[modeKey];
    return state && typeof state === "object" ? state : null;
  }

  function setOtpState(modeKey, payload) {
    const bucket = getOtpStateBucket();
    bucket[modeKey] = payload;
    localStorage.setItem(STORAGE_OTP_STATE_KEY, JSON.stringify(bucket));
  }

  function clearOtpState(modeKey) {
    const bucket = getOtpStateBucket();
    if (!bucket[modeKey]) return;
    delete bucket[modeKey];
    localStorage.setItem(STORAGE_OTP_STATE_KEY, JSON.stringify(bucket));
  }

  function setOtpMeta(modeKey, message) {
    const node = modeKey === "signup" ? signupOtpMeta : recoveryOtpMeta;
    if (node) {
      node.textContent = message || "";
    }
  }

  function randomSixDigits() {
    const arr = new Uint32Array(1);
    window.crypto.getRandomValues(arr);
    const value = arr[0] % 1000000;
    return String(value).padStart(6, "0");
  }

  async function sha256Hex(input) {
    const encoded = new TextEncoder().encode(String(input || ""));
    const digest = await window.crypto.subtle.digest("SHA-256", encoded);
    return Array.from(new Uint8Array(digest)).map(function (b) {
      return b.toString(16).padStart(2, "0");
    }).join("");
  }

  async function hashOtp(identity, code, nonce) {
    return sha256Hex([String(identity || ""), String(code || ""), String(nonce || "")].join("|"));
  }

  function getRecoveryLockout() {
    try {
      const raw = JSON.parse(localStorage.getItem(STORAGE_2FA_LOCKOUT_KEY) || "{}");
      return raw && typeof raw === "object" ? raw : {};
    } catch (_error) {
      return {};
    }
  }

  function setRecoveryLockout(payload) {
    localStorage.setItem(STORAGE_2FA_LOCKOUT_KEY, JSON.stringify(payload || {}));
  }

  function isRecoveryLocked() {
    const lockout = getRecoveryLockout();
    const now = Date.now();
    const lockedUntil = Number(lockout.lockedUntil || 0);
    if (lockedUntil > now) {
      const secs = Math.ceil((lockedUntil - now) / 1000);
      setStatus(t("recoveryLocked") + " " + formatDuration(secs), "error");
      return true;
    }

    if (lockedUntil && lockedUntil <= now) {
      setRecoveryLockout({ failedCount: 0, lockedUntil: 0 });
    }

    return false;
  }

  function registerRecoveryFailure() {
    const now = Date.now();
    const lockout = getRecoveryLockout();
    const failedCount = Number(lockout.failedCount || 0) + 1;
    const shouldLock = failedCount >= RECOVERY_LOCKOUT_THRESHOLD;
    const payload = {
      failedCount: shouldLock ? 0 : failedCount,
      lockedUntil: shouldLock ? now + RECOVERY_LOCKOUT_MS : 0
    };
    setRecoveryLockout(payload);

    if (shouldLock) {
      setStatus(t("recoveryLocked") + " " + formatDuration(Math.ceil(RECOVERY_LOCKOUT_MS / 1000)), "error");
    }
  }

  function clearRecoveryFailures() {
    setRecoveryLockout({ failedCount: 0, lockedUntil: 0 });
  }

  function getDeviceFingerprintSeed() {
    return [
      navigator.userAgent || "",
      navigator.language || "",
      (navigator.platform || ""),
      (screen.width || 0) + "x" + (screen.height || 0)
    ].join("|");
  }

  async function getCurrentDeviceId() {
    return sha256Hex(getDeviceFingerprintSeed());
  }

  function getTrustedDevices() {
    try {
      const raw = JSON.parse(localStorage.getItem(STORAGE_TRUSTED_DEVICES_KEY) || "[]");
      return Array.isArray(raw) ? raw : [];
    } catch (_error) {
      return [];
    }
  }

  function setTrustedDevices(devices) {
    localStorage.setItem(STORAGE_TRUSTED_DEVICES_KEY, JSON.stringify(Array.isArray(devices) ? devices : []));
  }

  function getTrustedExpiryDays() {
    const raw = signupTrustedExpiry && signupTrustedExpiry.value
      ? signupTrustedExpiry.value
      : String(TRUSTED_DEVICE_TTL_DAYS_DEFAULT);
    const days = Number(raw);
    return Number.isFinite(days) && days > 0 ? days : TRUSTED_DEVICE_TTL_DAYS_DEFAULT;
  }

  function purgeExpiredTrustedDevices() {
    const now = Date.now();
    const devices = getTrustedDevices();
    const active = devices.filter(function (device) {
      return Number(device && device.expiresAt || 0) > now;
    });
    if (active.length !== devices.length) {
      setTrustedDevices(active);
    }
    return active;
  }

  function refreshSecuritySummary() {
    if (!signupSecuritySummary) return;
    const profile = get2faProfile();
    const backupCount = Array.isArray(profile.backupCodeHashes) ? profile.backupCodeHashes.length : 0;
    const trustedCount = purgeExpiredTrustedDevices().length;
    signupSecuritySummary.textContent = t("securitySummary") + " " + backupCount + " | " + t("trustedDevicesSummary") + " " + trustedCount;
  }

  function formatTrustedExpiry(epochMs) {
    const value = Number(epochMs || 0);
    if (!value) return "-";
    return new Date(value).toLocaleDateString(lang === "ar" ? "ar" : "en", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    });
  }

  function maskUserAgent(raw) {
    const ua = String(raw || "");
    if (!ua) return "Unknown";
    if (ua.length <= 48) return ua;
    return ua.slice(0, 48) + "...";
  }

  function renderTrustedDevicesList() {
    if (!signupTrustedDevicesBox) return;

    const devices = purgeExpiredTrustedDevices();
    signupTrustedDevicesBox.innerHTML = "";

    if (!devices.length) {
      signupTrustedDevicesBox.textContent = t("trustedDevicesNone");
      return;
    }

    devices.forEach(function (device) {
      const row = document.createElement("div");
      row.className = "flow-trusted-device-row";

      const meta = document.createElement("div");
      meta.className = "flow-trusted-device-meta";
      meta.textContent = maskUserAgent(device && device.ua) + " | " + t("deviceExpires") + ": " + formatTrustedExpiry(device && device.expiresAt);

      const removeBtn = document.createElement("button");
      removeBtn.type = "button";
      removeBtn.className = "flow-device-remove";
      removeBtn.textContent = t("removeDevice");
      removeBtn.dataset.deviceId = String(device && device.id || "");

      row.appendChild(meta);
      row.appendChild(removeBtn);
      signupTrustedDevicesBox.appendChild(row);
    });
  }

  function refreshSecurityWidgets() {
    refreshSecuritySummary();
    renderTrustedDevicesList();
  }

  function removeTrustedDevice(deviceId) {
    const target = String(deviceId || "");
    if (!target) return;

    const devices = getTrustedDevices().filter(function (device) {
      return String(device && device.id || "") !== target;
    });
    setTrustedDevices(devices);

    const profile = get2faProfile();
    if (!devices.length) {
      set2faProfile({
        enabled: true,
        backupCodeHashes: Array.isArray(profile.backupCodeHashes) ? profile.backupCodeHashes : [],
        trustedEnabled: false,
        trustedDeviceTtlDays: Number(profile.trustedDeviceTtlDays || getTrustedExpiryDays()),
        createdAt: profile.createdAt || new Date().toISOString()
      });
      if (signupTrustedDevice) {
        signupTrustedDevice.checked = false;
      }
    }

    refreshSecurityWidgets();
    setStatus(t("trustedDeviceRemoved"), "warning");
  }

  function buildSecurityReport() {
    const profile = get2faProfile();
    const lockout = getRecoveryLockout();
    const trustedDevices = purgeExpiredTrustedDevices();
    const backupCount = Array.isArray(profile.backupCodeHashes) ? profile.backupCodeHashes.length : 0;

    return {
      generatedAt: new Date().toISOString(),
      language: lang,
      twoFactor: {
        enabled: Boolean(profile.enabled),
        trustedEnabled: Boolean(profile.trustedEnabled),
        trustedDeviceTtlDays: Number(profile.trustedDeviceTtlDays || TRUSTED_DEVICE_TTL_DAYS_DEFAULT),
        backupCodesRemaining: backupCount
      },
      recoveryLockout: {
        failedCount: Number(lockout.failedCount || 0),
        lockedUntil: Number(lockout.lockedUntil || 0),
        isLocked: Number(lockout.lockedUntil || 0) > Date.now()
      },
      trustedDevices: trustedDevices.map(function (device) {
        return {
          id: String(device && device.id || ""),
          userAgent: String(device && device.ua || ""),
          registeredAt: String(device && device.at || ""),
          expiresAt: Number(device && device.expiresAt || 0)
        };
      })
    };
  }

  function exportSecurityReport() {
    const report = buildSecurityReport();
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const ts = new Date().toISOString().replace(/[.:]/g, "-");
    link.href = url;
    link.download = "tiger-vvip-security-report-" + ts + ".json";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setStatus(t("securityReportExported"), "success");
  }

  function getSecurityReportText() {
    return JSON.stringify(buildSecurityReport(), null, 2);
  }

  function escapeHtml(text) {
    return String(text || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function highlightJson(jsonText) {
    return String(jsonText || "").replace(/("(?:\\.|[^"\\])*")(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/g, function (match, str, keySuffix, boolOrNull) {
      if (str) {
        const safeString = escapeHtml(str);
        return keySuffix
          ? '<span class="json-key">' + safeString + '</span>' + keySuffix
          : '<span class="json-string">' + safeString + '</span>';
      }
      if (boolOrNull) {
        if (boolOrNull === "null") {
          return '<span class="json-null">' + boolOrNull + '</span>';
        }
        return '<span class="json-boolean">' + boolOrNull + '</span>';
      }
      return '<span class="json-number">' + match + '</span>';
    });
  }

  function openSecurityReportModal() {
    if (!securityReportModal || !securityReportPreview) {
      return;
    }
    securityReportPreview.innerHTML = highlightJson(getSecurityReportText());
    securityReportModal.hidden = false;
    setStatus(t("securityReportPreviewOpen"), "info");
  }

  function closeSecurityReportModal() {
    if (!securityReportModal) {
      return;
    }
    securityReportModal.hidden = true;
  }

  function fallbackCopyText(text) {
    const temp = document.createElement("textarea");
    temp.value = text;
    temp.setAttribute("readonly", "readonly");
    temp.style.position = "fixed";
    temp.style.opacity = "0";
    temp.style.pointerEvents = "none";
    document.body.appendChild(temp);
    temp.focus();
    temp.select();
    let ok = false;
    try {
      ok = document.execCommand("copy");
    } catch (_error) {
      ok = false;
    }
    document.body.removeChild(temp);
    return ok;
  }

  async function copySecurityReport() {
    const reportText = getSecurityReportText();

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(reportText);
        setStatus(t("securityReportCopied"), "success");
        return;
      }
    } catch (_error) {
      // Fall through to legacy copy method.
    }

    const copied = fallbackCopyText(reportText);
    if (copied) {
      setStatus(t("securityReportCopied"), "success");
    } else {
      setStatus(t("securityReportCopyFailed"), "error");
    }
  }

  function get2faProfile() {
    try {
      const raw = JSON.parse(localStorage.getItem(STORAGE_2FA_PROFILE_KEY) || "{}");
      return raw && typeof raw === "object" ? raw : {};
    } catch (_error) {
      return {};
    }
  }

  function set2faProfile(profile) {
    localStorage.setItem(STORAGE_2FA_PROFILE_KEY, JSON.stringify(profile || {}));
  }

  function randomBackupCode() {
    const charset = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const array = new Uint32Array(8);
    window.crypto.getRandomValues(array);
    let output = "";
    for (let i = 0; i < array.length; i += 1) {
      output += charset[array[i] % charset.length];
    }
    return output.slice(0, 4) + "-" + output.slice(4);
  }

  function normalizeBackupCode(value) {
    return String(value || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
  }

  function renderBackupCodes(codes) {
    if (!signupBackupCodesBox) return;
    signupBackupCodesBox.innerHTML = "";
    const list = Array.isArray(codes) ? codes : [];
    if (!list.length) {
      signupBackupCodesBox.textContent = t("backupCodesHint");
      return;
    }

    list.forEach(function (code) {
      const item = document.createElement("div");
      item.className = "flow-backup-item";
      item.textContent = code;
      signupBackupCodesBox.appendChild(item);
    });
  }

  async function generateAndStoreBackupCodes() {
    const plainCodes = [];
    for (let i = 0; i < 8; i += 1) {
      plainCodes.push(randomBackupCode());
    }

    const hashPairs = await Promise.all(plainCodes.map(async function (code) {
      const normalized = normalizeBackupCode(code);
      return sha256Hex(normalized);
    }));

    const profile = get2faProfile();
    set2faProfile({
      enabled: true,
      backupCodeHashes: hashPairs,
      trustedEnabled: Boolean(signupTrustedDevice && signupTrustedDevice.checked),
      trustedDeviceTtlDays: getTrustedExpiryDays(),
      createdAt: profile.createdAt || new Date().toISOString()
    });

    await registerTrustedDeviceFromSignup();

    renderBackupCodes(plainCodes);
    refreshSecurityWidgets();
    setStatus(t("backupCodesGenerated"), "success");
    return true;
  }

  async function verifyBackupCode(rawCode) {
    const normalized = normalizeBackupCode(rawCode);
    if (normalized.length !== 8) {
      setStatus(t("backupCodeInvalid"), "error");
      return false;
    }

    const profile = get2faProfile();
    const hashes = Array.isArray(profile.backupCodeHashes) ? profile.backupCodeHashes : [];
    if (!hashes.length) {
      setStatus(t("backupNeedGenerate"), "error");
      return false;
    }

    const incomingHash = await sha256Hex(normalized);
    const index = hashes.indexOf(incomingHash);
    if (index < 0) {
      setStatus(t("backupCodeInvalid"), "error");
      return false;
    }

    const nextHashes = hashes.slice();
    nextHashes.splice(index, 1);
    set2faProfile({
      enabled: true,
      backupCodeHashes: nextHashes,
      trustedEnabled: Boolean(profile.trustedEnabled),
      trustedDeviceTtlDays: Number(profile.trustedDeviceTtlDays || TRUSTED_DEVICE_TTL_DAYS_DEFAULT),
      createdAt: profile.createdAt || new Date().toISOString()
    });
    refreshSecurityWidgets();
    setStatus(t("backupCodeUsed"), "success");
    return true;
  }

  async function verifyTrustedDevice() {
    const profile = get2faProfile();
    if (!profile.trustedEnabled) {
      setStatus(t("trustedDeviceMissing"), "error");
      return false;
    }

    const deviceId = await getCurrentDeviceId();
    const devices = purgeExpiredTrustedDevices();
    const exists = devices.some(function (device) {
      return String(device && device.id || "") === deviceId;
    });

    if (!exists) {
      setStatus(t("trustedDeviceMissing"), "error");
      return false;
    }

    setStatus(t("trustedDeviceAccepted"), "success");
    return true;
  }

  async function registerTrustedDeviceFromSignup() {
    const profile = get2faProfile();
    const ttlDays = getTrustedExpiryDays();

    if (!signupTrustedDevice || !signupTrustedDevice.checked) {
      set2faProfile({
        enabled: true,
        backupCodeHashes: Array.isArray(profile.backupCodeHashes) ? profile.backupCodeHashes : [],
        trustedEnabled: false,
        trustedDeviceTtlDays: ttlDays,
        createdAt: profile.createdAt || new Date().toISOString()
      });
      refreshSecurityWidgets();
      return;
    }

    set2faProfile({
      enabled: true,
      backupCodeHashes: Array.isArray(profile.backupCodeHashes) ? profile.backupCodeHashes : [],
      trustedEnabled: true,
      trustedDeviceTtlDays: ttlDays,
      createdAt: profile.createdAt || new Date().toISOString()
    });

    const deviceId = await getCurrentDeviceId();
    const now = Date.now();
    const devices = purgeExpiredTrustedDevices();
    const exists = devices.some(function (device) {
      return String(device && device.id || "") === deviceId;
    });
    if (!exists) {
      devices.unshift({
        id: deviceId,
        at: new Date().toISOString(),
        expiresAt: now + (ttlDays * 24 * 60 * 60 * 1000),
        ua: navigator.userAgent || ""
      });
      setTrustedDevices(devices.slice(0, 10));
    }
    refreshSecurityWidgets();
  }

  function revokeTrustedDevices() {
    setTrustedDevices([]);
    const profile = get2faProfile();
    set2faProfile({
      enabled: true,
      backupCodeHashes: Array.isArray(profile.backupCodeHashes) ? profile.backupCodeHashes : [],
      trustedEnabled: false,
      trustedDeviceTtlDays: Number(profile.trustedDeviceTtlDays || getTrustedExpiryDays()),
      createdAt: profile.createdAt || new Date().toISOString()
    });
    if (signupTrustedDevice) {
      signupTrustedDevice.checked = false;
    }
    refreshSecurityWidgets();
    setStatus(t("trustedDevicesRevoked"), "warning");
  }

  async function sendOtpToPhone(phone, code, channel) {
    const endpoint = resolvePhoneVerificationEndpoint();
    if (!endpoint) {
      return { ok: true, simulated: true };
    }

    const anonKey = readRuntimeValue("TIGER_SUPABASE_ANON_KEY");
    const headers = {
      "Content-Type": "application/json"
    };

    if (anonKey) {
      headers.apikey = anonKey;
      headers.Authorization = "Bearer " + anonKey;
    }

    const response = await fetch(endpoint, {
      method: "POST",
      headers: headers,
      body: JSON.stringify({
        phone: normalizePhone(phone),
        code: String(code || "").trim(),
        channel: channel || "internal"
      })
    });

    if (!response.ok) {
      throw new Error("OTP_DELIVERY_FAILED_" + response.status);
    }

    return { ok: true, simulated: false };
  }

  function updateOtpUiMeta() {
    ["signup", "recovery"].forEach(function (modeKey) {
      const state = getOtpState(modeKey);
      const now = Date.now();
      const btn = modeKey === "signup" ? signupOtpResendBtn : recoveryOtpResendBtn;

      if (!state) {
        if (btn) btn.disabled = false;
        setOtpMeta(modeKey, "");
        return;
      }

      if (state.verified) {
        if (btn) btn.disabled = true;
        setOtpMeta(modeKey, t("otpAlreadyVerified"));
        return;
      }

      const expiresIn = Math.ceil((Number(state.expiresAt) - now) / 1000);
      if (expiresIn <= 0) {
        if (btn) btn.disabled = false;
        setOtpMeta(modeKey, t("otpExpired"));
        return;
      }

      const resendIn = Math.ceil((Number(state.resendAt) - now) / 1000);
      if (btn) {
        btn.disabled = resendIn > 0;
      }

      if (resendIn > 0) {
        setOtpMeta(modeKey, t("resendIn") + " " + formatDuration(resendIn));
      } else {
        setOtpMeta(modeKey, t("codeExpiresIn") + " " + formatDuration(expiresIn));
      }
    });
  }

  async function issueOtpForMode(modeKey, identityValue, channel) {
    const identity = normalizePhone(identityValue);
    if (!isLikelyPhone(identity)) {
      setStatus(t("phoneRequired"), "error");
      return false;
    }

    const existing = getOtpState(modeKey);
    const now = Date.now();
    if (existing && Number(existing.resendAt) > now && !existing.verified) {
      updateOtpUiMeta();
      return false;
    }

    const code = randomSixDigits();
    const nonce = String(now) + "-" + String(Math.random()).slice(2);
    const codeHash = await hashOtp(identity, code, nonce);

    try {
      const delivery = await sendOtpToPhone(identity, code, channel);

      const nextState = {
        identity: identity,
        channel: channel || "internal",
        codeHash: codeHash,
        nonce: nonce,
        issuedAt: now,
        expiresAt: now + OTP_TTL_MS,
        resendAt: now + OTP_RESEND_COOLDOWN_MS,
        attemptsLeft: OTP_MAX_ATTEMPTS,
        verified: false,
        devCode: delivery.simulated ? code : ""
      };

      setOtpState(modeKey, nextState);
      updateOtpUiMeta();

      const baseMessage = t("otpSent") + " " + maskPhone(identity);
      if (delivery.simulated) {
        setStatus(baseMessage + " | " + t("otpDevCode") + " " + code, "warning");
      } else {
        setStatus(baseMessage, "success");
      }
      return true;
    } catch (_error) {
      setStatus(t("otpSendFailed"), "error");
      return false;
    }
  }

  async function verifyOtpForMode(modeKey, rawCode, identityValue) {
    const state = getOtpState(modeKey);
    if (!state) {
      setStatus(t("otpNeedDispatch"), "error");
      return false;
    }

    if (state.verified) {
      return true;
    }

    const now = Date.now();
    if (Number(state.expiresAt) <= now) {
      setStatus(t("otpExpired"), "error");
      updateOtpUiMeta();
      return false;
    }

    if (Number(state.attemptsLeft) <= 0) {
      setStatus(t("otpAttemptsExceeded"), "error");
      updateOtpUiMeta();
      return false;
    }

    const identity = normalizePhone(identityValue);
    if (identity !== String(state.identity || "")) {
      setStatus(t("phoneRequired"), "error");
      return false;
    }

    const inputCode = String(rawCode || "").trim();
    const inputHash = await hashOtp(identity, inputCode, String(state.nonce || ""));
    if (inputHash !== String(state.codeHash || "")) {
      const attemptsLeft = Math.max(0, Number(state.attemptsLeft || 0) - 1);
      setOtpState(modeKey, {
        identity: state.identity,
        channel: state.channel,
        codeHash: state.codeHash,
        nonce: state.nonce,
        issuedAt: state.issuedAt,
        expiresAt: state.expiresAt,
        resendAt: state.resendAt,
        attemptsLeft: attemptsLeft,
        verified: false,
        devCode: state.devCode || ""
      });
      updateOtpUiMeta();
      setStatus(t("otpInvalid"), "error");
      return false;
    }

    setOtpState(modeKey, {
      identity: state.identity,
      channel: state.channel,
      codeHash: state.codeHash,
      nonce: state.nonce,
      issuedAt: state.issuedAt,
      expiresAt: state.expiresAt,
      resendAt: state.resendAt,
      attemptsLeft: state.attemptsLeft,
      verified: true,
      verifiedAt: now,
      devCode: ""
    });
    updateOtpUiMeta();
    setStatus(t("otpVerified"), "success");
    return true;
  }

  function setMode(nextMode) {
    mode = nextMode;
    currentStep = 1;
    render();
  }

  function panelSelector(m, s) {
    return '.flow-panel[data-mode="' + m + '"][data-step="' + s + '"]';
  }

  function updateRecoveryStepUi() {
    const channel = getRecoveryChannel();
    const smsMode = channel === "sms";
    const backupMode = channel === "backup";

    const recoveryOtpInput = document.getElementById("recovery-otp");
    if (recoveryOtpInput) {
      recoveryOtpInput.hidden = !smsMode;
      recoveryOtpInput.value = smsMode ? recoveryOtpInput.value : "";
    }

    if (recoveryOtpResendBtn) {
      recoveryOtpResendBtn.hidden = !smsMode;
    }
    if (recoveryOtpMeta) {
      recoveryOtpMeta.hidden = !smsMode;
    }

    if (recoveryBackupCodeInput) {
      recoveryBackupCodeInput.hidden = !backupMode;
      if (!backupMode) {
        recoveryBackupCodeInput.value = "";
      }
    }

    if (recoveryStep3Note) {
      if (channel === "email") {
        recoveryStep3Note.hidden = false;
        recoveryStep3Note.textContent = t("recoveryEmailSent");
      } else if (channel === "trusted") {
        recoveryStep3Note.hidden = false;
        recoveryStep3Note.textContent = t("trustedInfo");
      } else if (backupMode) {
        recoveryStep3Note.hidden = false;
        recoveryStep3Note.textContent = t("backupCodesHint");
      } else {
        recoveryStep3Note.hidden = true;
        recoveryStep3Note.textContent = "";
      }
    }
  }

  function render() {
    const max = stepsByMode[mode];
    stepLabel.textContent = t("step") + currentStep + " / " + max;
    progressFill.style.width = Math.round((currentStep / max) * 100) + "%";

    Array.from(document.querySelectorAll(".flow-panel")).forEach(function (panel) {
      const panelMode = panel.getAttribute("data-mode");
      const panelStep = Number(panel.getAttribute("data-step"));
      panel.hidden = !(panelMode === mode && panelStep === currentStep);
    });

    modeSignupBtn.classList.toggle("active", mode === "signup");
    modeRecoveryBtn.classList.toggle("active", mode === "recovery");
    flowSubtitle.textContent = t("subtitle");

    backBtn.disabled = currentStep === 1;
    nextBtn.textContent = currentStep === max ? t("finish") : t("next");
    updateRecoveryStepUi();
    updateOtpUiMeta();
    refreshSecurityWidgets();
  }

  function setStatus(message, tone) {
    status.textContent = message || "";
    status.className = "status-message" + (tone ? " " + tone : "");
  }

  function pushSessionEntry(entry) {
    try {
      const existing = JSON.parse(localStorage.getItem(STORAGE_SESSIONS_KEY) || "[]");
      const list = Array.isArray(existing) ? existing : [];
      list.unshift(entry);
      localStorage.setItem(STORAGE_SESSIONS_KEY, JSON.stringify(list.slice(0, 20)));
    } catch (_error) {
      localStorage.setItem(STORAGE_SESSIONS_KEY, JSON.stringify([entry]));
    }
  }

  function getRecoveryIdentity() {
    return String((document.getElementById("recovery-identity") || {}).value || "").trim();
  }

  function getRecoveryChannel() {
    const checked = document.querySelector('input[name="recovery-channel"]:checked');
    return checked ? String(checked.value || "sms") : "sms";
  }

  function isValidEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
  }

  async function executeRecoveryDispatch() {
    const identity = getRecoveryIdentity();
    const channel = getRecoveryChannel();
    if (!identity) {
      setStatus(t("required"), "error");
      return false;
    }

    if (isRecoveryLocked()) {
      return false;
    }

    if (channel === "sms") {
      return issueOtpForMode("recovery", identity, "internal");
    }

    if (channel === "trusted") {
      setStatus(t("trustedInfo"), "info");
      return true;
    }

    if (channel === "backup") {
      const profile = get2faProfile();
      const hashes = Array.isArray(profile.backupCodeHashes) ? profile.backupCodeHashes : [];
      if (!hashes.length) {
        setStatus(t("backupNeedGenerate"), "error");
        return false;
      }
      setStatus(t("backupCodesHint"), "info");
      return true;
    }

    if (channel === "email") {
      if (!isValidEmail(identity)) {
        setStatus(t("emailRequired"), "error");
        return false;
      }

      if (!auth) {
        setStatus(t("firebaseMissing"), "error");
        return false;
      }

      try {
        await auth.sendPasswordResetEmail(identity);
        setStatus(t("recoveryEmailSent"), "success");
        clearOtpState("recovery");
        clearRecoveryFailures();
        updateOtpUiMeta();
        return true;
      } catch (_error) {
        setStatus(t("recoveryFallback"), "warning");
        return true;
      }
    }

    setStatus(t("recoveryFallback"), "warning");
    return true;
  }

  async function createFirebaseAccount() {
    if (!auth) {
      setStatus(t("firebaseMissing"), "error");
      return false;
    }

    const fullName = String((document.getElementById("signup-fullname") || {}).value || "").trim();
    const username = String((document.getElementById("signup-username") || {}).value || "").trim();
    const email = String((document.getElementById("signup-email") || {}).value || "").trim();
    const password = String((document.getElementById("signup-password") || {}).value || "");
    const avatar = String((document.getElementById("signup-avatar") || {}).value || "").trim();

    try {
      const credential = await auth.createUserWithEmailAndPassword(email, password);
      const user = credential && credential.user;
      if (!user) return false;

      await user.updateProfile({
        displayName: fullName || username || "VVIP User",
        photoURL: avatar || null
      });

      await user.sendEmailVerification({
        url: window.location.origin + "/index.html"
      });

      pushSessionEntry({
        at: new Date().toISOString(),
        ua: navigator.userAgent,
        lang: lang,
        email: email,
        type: "signup"
      });

      const snapshot = {
        uid: user.uid,
        displayName: fullName || user.displayName || "VVIP User",
        email: user.email || email,
        handle: username || (email.split("@")[0] || "vvip.user"),
        photoURL: user.photoURL || avatar
      };
      localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(snapshot));
      return true;
    } catch (_error) {
      return false;
    }
  }

  function validateCurrentStep() {
    const max = stepsByMode[mode];
    if (currentStep > max) return true;

    if (mode === "signup") {
      if (currentStep === 1) {
        return Boolean(String((document.getElementById("signup-fullname") || {}).value || "").trim());
      }
      if (currentStep === 2) {
        const email = String((document.getElementById("signup-email") || {}).value || "").trim();
        const phone = String((document.getElementById("signup-phone") || {}).value || "").trim();
        return Boolean(email && isLikelyPhone(phone));
      }
      if (currentStep === 3) {
        const otp = String((document.getElementById("signup-otp") || {}).value || "").trim();
        if (!/^\d{6}$/.test(otp)) {
          setStatus(t("invalidOtp"), "error");
          return false;
        }
        return true;
      }
      if (currentStep === 4) {
        const p1 = String((document.getElementById("signup-password") || {}).value || "");
        const p2 = String((document.getElementById("signup-password-confirm") || {}).value || "");
        if (p1.length < 8) {
          setStatus(t("minPassword"), "error");
          return false;
        }
        if (p1 !== p2) {
          setStatus(t("passwordMismatch"), "error");
          return false;
        }
        return true;
      }
      if (currentStep === 5) {
        return Boolean(String((document.getElementById("signup-username") || {}).value || "").trim());
      }
      if (currentStep === 6) {
        const checked = Array.from(document.querySelectorAll('input[name="interest"]:checked'));
        if (!checked.length) {
          setStatus(t("interestsRequired"), "error");
          return false;
        }
        return true;
      }
      if (currentStep === 7) {
        if (!(document.getElementById("signup-consent") || {}).checked) {
          setStatus(t("consentRequired"), "error");
          return false;
        }
        return true;
      }
      if (currentStep === 8) {
        const profile = get2faProfile();
        const hashes = Array.isArray(profile.backupCodeHashes) ? profile.backupCodeHashes : [];
        if (!hashes.length) {
          setStatus(t("backupNeedGenerate"), "error");
          return false;
        }
        return true;
      }
      return true;
    }

    if (mode === "recovery") {
      if (currentStep === 1) {
        return Boolean(String((document.getElementById("recovery-identity") || {}).value || "").trim());
      }
      if (currentStep === 3) {
        const channel = getRecoveryChannel();
        if (channel === "email" || channel === "trusted") {
          return true;
        }
        if (channel === "backup") {
          const backupCode = normalizeBackupCode((recoveryBackupCodeInput || {}).value || "");
          if (backupCode.length !== 8) {
            setStatus(t("backupCodeInvalid"), "error");
            return false;
          }
          return true;
        }
        const otp = String((document.getElementById("recovery-otp") || {}).value || "").trim();
        if (!/^\d{6}$/.test(otp)) {
          setStatus(t("invalidOtp"), "error");
          return false;
        }
      }
      if (currentStep === 4) {
        const p1 = String((document.getElementById("recovery-password") || {}).value || "");
        const p2 = String((document.getElementById("recovery-password-confirm") || {}).value || "");
        if (p1.length < 8) {
          setStatus(t("minPassword"), "error");
          return false;
        }
        if (p1 !== p2) {
          setStatus(t("passwordMismatch"), "error");
          return false;
        }
      }
      return true;
    }

    return true;
  }

  async function moveNext() {
    setStatus("", "");
    if (!validateCurrentStep()) return;

    if (mode === "signup" && currentStep === 2) {
      const signupPhone = String((document.getElementById("signup-phone") || {}).value || "").trim();
      const sent = await issueOtpForMode("signup", signupPhone, "internal");
      if (!sent) return;
    }

    if (mode === "signup" && currentStep === 3) {
      const signupOtp = String((document.getElementById("signup-otp") || {}).value || "").trim();
      const signupPhoneVerify = String((document.getElementById("signup-phone") || {}).value || "").trim();
      const verified = await verifyOtpForMode("signup", signupOtp, signupPhoneVerify);
      if (!verified) return;
    }

    if (mode === "signup" && currentStep === 8) {
      await registerTrustedDeviceFromSignup();
    }

    if (mode === "recovery" && currentStep === 2) {
      const dispatched = await executeRecoveryDispatch();
      if (!dispatched) return;
    }

    if (mode === "recovery" && currentStep === 3) {
      const channel = getRecoveryChannel();
      if (isRecoveryLocked()) {
        return;
      }

      if (channel === "sms") {
        const recoveryOtp = String((document.getElementById("recovery-otp") || {}).value || "").trim();
        const recoveryIdentity = getRecoveryIdentity();
        const verifiedRecovery = await verifyOtpForMode("recovery", recoveryOtp, recoveryIdentity);
        if (!verifiedRecovery) {
          registerRecoveryFailure();
          return;
        }
        clearRecoveryFailures();
      }

      if (channel === "backup") {
        const verifiedBackup = await verifyBackupCode((recoveryBackupCodeInput || {}).value || "");
        if (!verifiedBackup) {
          registerRecoveryFailure();
          return;
        }
        clearRecoveryFailures();
      }

      if (channel === "trusted") {
        const verifiedTrusted = await verifyTrustedDevice();
        if (!verifiedTrusted) {
          registerRecoveryFailure();
          return;
        }
        clearRecoveryFailures();
      }

      if (channel === "email") {
        clearRecoveryFailures();
      }
    }

    if (currentStep < stepsByMode[mode]) {
      currentStep += 1;
      render();
      return;
    }

    setStatus(t("done"), "success");
  }

  modeSignupBtn.addEventListener("click", function () { setMode("signup"); });
  modeRecoveryBtn.addEventListener("click", function () { setMode("recovery"); });

  backBtn.addEventListener("click", function () {
    if (currentStep > 1) {
      currentStep -= 1;
      setStatus("", "");
      render();
    }
  });

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    if (!validateCurrentStep()) {
      if (!status.textContent) setStatus(t("required"), "error");
      return;
    }
    moveNext();
  });

  if (finishSignupBtn) {
    finishSignupBtn.addEventListener("click", async function () {
      const signupOtpState = getOtpState("signup");
      if (!signupOtpState || !signupOtpState.verified) {
        setStatus(t("otpNeedDispatch"), "error");
        return;
      }

      const profile = get2faProfile();
      const hashes = Array.isArray(profile.backupCodeHashes) ? profile.backupCodeHashes : [];
      if (!hashes.length) {
        setStatus(t("backupNeedGenerate"), "error");
        return;
      }

      const originalLabel = finishSignupBtn.textContent;
      finishSignupBtn.disabled = true;
      finishSignupBtn.textContent = t("sending");

      const username = String((document.getElementById("signup-username") || {}).value || "").trim() || "vvip.user";
      const fullName = String((document.getElementById("signup-fullname") || {}).value || "").trim() || "VVIP User";
      const email = String((document.getElementById("signup-email") || {}).value || "").trim();

      const created = await createFirebaseAccount();
      if (!created) {
        const fallbackSnapshot = {
          uid: "flow-" + Date.now(),
          displayName: fullName,
          email: email,
          handle: username,
          photoURL: String((document.getElementById("signup-avatar") || {}).value || "").trim()
        };
        localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(fallbackSnapshot));
        setStatus(t("signupFailed"), "warning");
      } else {
        setStatus(t("signupSuccess"), "success");
      }

      finishSignupBtn.textContent = originalLabel;
      finishSignupBtn.disabled = false;
      window.location.href = "public-profile.html";
    });
  }

  if (finishRecoveryBtn) {
    finishRecoveryBtn.addEventListener("click", function () {
      window.location.href = "index.html";
    });
  }

  if (signupOtpResendBtn) {
    signupOtpResendBtn.addEventListener("click", async function () {
      const signupPhone = String((document.getElementById("signup-phone") || {}).value || "").trim();
      await issueOtpForMode("signup", signupPhone, "internal");
    });
  }

  if (recoveryOtpResendBtn) {
    recoveryOtpResendBtn.addEventListener("click", async function () {
      if (getRecoveryChannel() !== "sms") {
        setStatus(t("phoneRequired"), "error");
        return;
      }
      await issueOtpForMode("recovery", getRecoveryIdentity(), "internal");
    });
  }

  if (signupGenerateBackupBtn) {
    signupGenerateBackupBtn.addEventListener("click", async function () {
      await generateAndStoreBackupCodes();
    });
  }

  if (signupRevokeTrustedBtn) {
    signupRevokeTrustedBtn.addEventListener("click", function () {
      revokeTrustedDevices();
    });
  }

  if (signupTrustedDevice) {
    signupTrustedDevice.addEventListener("change", async function () {
      await registerTrustedDeviceFromSignup();
    });
  }

  if (signupTrustedExpiry) {
    signupTrustedExpiry.addEventListener("change", async function () {
      await registerTrustedDeviceFromSignup();
    });
  }

  if (signupExportSecurityBtn) {
    signupExportSecurityBtn.addEventListener("click", function () {
      exportSecurityReport();
    });
  }

  if (signupViewSecurityBtn) {
    signupViewSecurityBtn.addEventListener("click", function () {
      openSecurityReportModal();
    });
  }

  if (signupCopySecurityBtn) {
    signupCopySecurityBtn.addEventListener("click", function () {
      copySecurityReport();
    });
  }

  if (securityReportCloseBtn) {
    securityReportCloseBtn.addEventListener("click", function () {
      closeSecurityReportModal();
    });
  }

  if (securityReportCopyBtn) {
    securityReportCopyBtn.addEventListener("click", function () {
      copySecurityReport();
    });
  }

  if (securityReportExportBtn) {
    securityReportExportBtn.addEventListener("click", function () {
      exportSecurityReport();
    });
  }

  if (securityReportModal) {
    securityReportModal.addEventListener("click", function (event) {
      if (event.target === securityReportModal) {
        closeSecurityReportModal();
      }
    });
  }

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && securityReportModal && !securityReportModal.hidden) {
      closeSecurityReportModal();
    }
  });

  if (signupTrustedDevicesBox) {
    signupTrustedDevicesBox.addEventListener("click", function (event) {
      const target = event.target;
      if (!target || !target.classList || !target.classList.contains("flow-device-remove")) {
        return;
      }
      removeTrustedDevice(target.dataset.deviceId || "");
    });
  }

  Array.from(document.querySelectorAll('input[name="recovery-channel"]')).forEach(function (radio) {
    radio.addEventListener("change", function () {
      updateRecoveryStepUi();
      setStatus("", "");
    });
  });

  ["signup-otp", "recovery-otp"].forEach(function (id) {
    const node = document.getElementById(id);
    if (!node) return;
    node.addEventListener("input", function () {
      node.value = String(node.value || "").replace(/\D/g, "").slice(0, 6);
    });
  });

  if (recoveryBackupCodeInput) {
    recoveryBackupCodeInput.addEventListener("input", function () {
      const normalized = normalizeBackupCode(recoveryBackupCodeInput.value || "");
      recoveryBackupCodeInput.value = normalized.length > 4
        ? normalized.slice(0, 4) + "-" + normalized.slice(4)
        : normalized;
    });
  }

  setInterval(updateOtpUiMeta, 1000);
  renderBackupCodes([]);
  refreshSecurityWidgets();

  render();
})();