(function () {
  "use strict";

  const dialog = document.querySelector(
    "[data-vvip-signout-dialog]"
  );

  if (!dialog) return;

  const confirmButton = dialog.querySelector(
    "[data-confirm-signout]"
  );

  const errorBox = dialog.querySelector(
    "[data-signout-error]"
  );

  let busy = false;
  let dialogOpen = false;
  let redirectScheduled = false;

  const REDIRECT_PAGE =
    "index.html?logged_out=1&switch_user=1";
  const SIGN_OUT_TIMEOUT_MS = 12000;
  const PRIVATE_AUTH_RETURN_URL =
    "index.html?return_to=private-profile-p03.html";

  function localPreviewAllowed() {
    const preview = new URLSearchParams(location.search).get("preview");
    const isLocalHost = location.hostname === "localhost" ||
      location.hostname === "127.0.0.1" ||
      location.hostname === "::1" ||
      location.hostname === "[::1]" ||
      location.hostname === "0.0.0.0";
    return isLocalHost && preview === "account";
  }

  function showError(message) {
    if (!errorBox) return;

    errorBox.textContent = message;
    errorBox.hidden = false;
  }

  function clearError() {
    if (!errorBox) return;

    errorBox.textContent = "";
    errorBox.hidden = true;
  }

  function openDialog() {
    if (dialogOpen || busy || redirectScheduled) return;

    clearError();

    dialog.hidden = false;
    dialogOpen = true;
    document.body.style.overflow = "hidden";

    window.history.pushState(
      {
        ...(window.history.state || {}),
        vvipOverlay: "signout"
      },
      ""
    );

    window.setTimeout(() => {
      confirmButton?.focus();
    }, 30);
  }

  function closeDialog(skipHistory) {
    if (!dialogOpen || busy) return;

    dialog.hidden = true;
    dialogOpen = false;
    document.body.style.overflow = "";

    if (
      !skipHistory &&
      window.history.state &&
      window.history.state.vvipOverlay ===
        "signout"
    ) {
      window.history.back();
    }
  }

  async function waitForClerk(timeout = 3000) {
    const startedAt = Date.now();

    while (Date.now() - startedAt < timeout) {
      if (window.Clerk) {
        if (
          typeof window.Clerk.load === "function" &&
          !window.Clerk.loaded
        ) {
          try {
            await Promise.race([
              window.Clerk.load(),
              new Promise((resolve) => {
                window.setTimeout(resolve, 800);
              })
            ]);
          } catch (error) {
            /* نستمر ضمن المهلة قبل إعلان الفشل. */
          }
        }

        if (
          window.Clerk.loaded &&
          typeof window.Clerk.signOut === "function"
        ) {
          return window.Clerk;
        }
      }

      await new Promise((resolve) => {
        window.setTimeout(resolve, 120);
      });
    }

    throw new Error("CLERK_NOT_READY");
  }

  function scheduleFallbackRedirect() {
    if (redirectScheduled) return;

    redirectScheduled = true;

    window.setTimeout(() => {
      removeAppTransientState();
      window.location.replace(REDIRECT_PAGE);
    }, 1200);
  }

  function signOutWithTimeout(clerk) {
    let timeoutId = 0;

    const timeoutPromise = new Promise((_, reject) => {
      timeoutId = window.setTimeout(() => {
        const error = new Error("CLERK_SIGN_OUT_TIMEOUT");
        error.code = "CLERK_SIGN_OUT_TIMEOUT";
        reject(error);
      }, SIGN_OUT_TIMEOUT_MS);
    });

    return Promise.race([
      clerk.signOut({
        redirectUrl: REDIRECT_PAGE
      }),
      timeoutPromise
    ]).finally(() => {
      window.clearTimeout(timeoutId);
    });
  }

  function removeAppTransientState() {
    const profileRemote =
      window.VVIP_P03_PROFILE_REMOTE_SYNC;

    if (
      profileRemote &&
      typeof profileRemote.resetAuthenticatedClient === "function"
    ) {
      profileRemote.resetAuthenticatedClient();
    }

    const exactKeys = new Set([
      "vvipP03ListingDraft",
      "vvip:p03:create-state:v3",
      "vvip:p03:create-return-step",
      "vvip:p03:profile-owner-context",
      "vvip:p03:profile-motion",
      "vvip:p03:preview-private-shares",
      "vvip_p03_avatar_src",
      "vvip_p03_cover_src"
    ]);

    /*
      نمسح بيانات المعاينة والمسودات المؤقتة فقط.
      لا نمسح بيانات الملف المرتبطة بمعرف المستخدم،
      ولا نحذف الصور المركزية أو IndexedDB لكل حساب.
    */
    for (
      let index = sessionStorage.length - 1;
      index >= 0;
      index -= 1
    ) {
      const key = sessionStorage.key(index);

      if (
        key &&
        (
          key.startsWith("vvip:p03:") ||
          exactKeys.has(key)
        )
      ) {
        sessionStorage.removeItem(key);
      }
    }

    exactKeys.forEach((key) => {
      localStorage.removeItem(key);
    });
  }

  function setBusy(value) {
    busy = value;

    document
      .querySelectorAll("[data-open-signout]")
      .forEach((button) => {
        button.disabled = value;
      });

    if (confirmButton) {
      confirmButton.disabled = value;
      confirmButton.textContent = value
        ? "جارٍ تسجيل الخروج…"
        : "تسجيل الخروج";
    }
  }

  async function completeSignOut() {
    if (busy || redirectScheduled) return;

    clearError();
    setBusy(true);

    let clerk;
    let pageHideHandler;

    try {
      clerk = await waitForClerk();

      /*
        لا نمرر sessionId:
        نريد شاشة دخول نظيفة تتيح اختيار مستخدم آخر.
      */
      pageHideHandler = () => {
        removeAppTransientState();
      };

      window.addEventListener(
        "pagehide",
        pageHideHandler,
        { once: true }
      );

      await signOutWithTimeout(clerk);

      /*
        احتياط عند منع التحويل التلقائي في المعاينة.
      */
      removeAppTransientState();
      window.location.replace(REDIRECT_PAGE);
    } catch (error) {
      if (pageHideHandler) {
        window.removeEventListener(
          "pagehide",
          pageHideHandler
        );
      }

      console.warn("VVIP_COMPLETE_SIGN_OUT_RECOVERY");

      showError(
        "تعذر إتمام تسجيل الخروج مركزيًا. سيتم تحويلك إلى صفحة الدخول خلال لحظات."
      );

      setBusy(false);
      scheduleFallbackRedirect();
    }
  }

  async function guardPrivatePage() {
    if (localPreviewAllowed()) return;
    if (redirectScheduled || document.visibilityState === "hidden") return;
    try {
      const clerk = await waitForClerk(1800);
      if (!clerk.user || !clerk.session) {
        window.location.replace(PRIVATE_AUTH_RETURN_URL);
      }
    } catch (error) {
      window.location.replace(PRIVATE_AUTH_RETURN_URL);
    }
  }

  document.addEventListener("click", (event) => {
    const openButton = event.target.closest(
      "[data-open-signout]"
    );

    if (openButton) {
      event.preventDefault();
      event.stopPropagation();
      openDialog();
      return;
    }

    const cancelButton = event.target.closest(
      "[data-cancel-signout]"
    );

    if (cancelButton) {
      event.preventDefault();
      closeDialog(false);
      return;
    }

    if (
      event.target === dialog &&
      dialogOpen
    ) {
      closeDialog(false);
    }
  });

  confirmButton?.addEventListener(
    "click",
    completeSignOut
  );

  window.addEventListener("popstate", () => {
    if (dialogOpen && !busy) {
      closeDialog(true);
    }
  });

  document.addEventListener("keydown", (event) => {
    if (
      event.key === "Escape" &&
      dialogOpen &&
      !busy
    ) {
      closeDialog(false);
    }
  });

  window.addEventListener("pageshow", () => {
    void guardPrivatePage();
  });

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      void guardPrivatePage();
    }
  });
})();
