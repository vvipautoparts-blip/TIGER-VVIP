(function () {
  if (window.location.hostname === "127.0.0.1") {
    const nextUrl = new URL(window.location.href);
    nextUrl.hostname = "localhost";
    window.location.replace(nextUrl.toString());
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
  const form = document.getElementById("reset-form");
  const emailInput = document.getElementById("reset-email");
  const message = document.getElementById("reset-message");

  function setMessage(text, type) {
    if (!message) return;
    message.textContent = text;
    message.className = "status-message" + (type ? " " + type : "");
  }

  if (!form || !emailInput) return;

  form.addEventListener("submit", async function (event) {
    event.preventDefault();

    if (missingFields.length) {
      setMessage("إعداد Firebase غير مكتمل. القيم الناقصة: " + missingFields.join(", "), "error");
      return;
    }

    const email = String(emailInput.value || "").trim();

    if (!email) {
      setMessage("يرجى إدخال البريد الإلكتروني.", "error");
      return;
    }

    try {
      await auth.sendPasswordResetEmail(email, {
        url: window.location.origin + "/index.html"
      });
      setMessage("تم إرسال رابط إعادة التعيين إلى بريدك.", "success");
      form.reset();
    } catch (error) {
      setMessage("تعذر إرسال الرابط: " + (error && error.message ? error.message : "خطأ غير معروف"), "error");
    }
  });
})();
