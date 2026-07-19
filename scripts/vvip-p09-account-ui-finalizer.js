"use strict";

(() => {
  const LEGACY_PARTS = [
    "VVIP",
    "Tiger",
    "AutoParts",
    "AutoParts",
  ];

  const legacyPattern = new RegExp(
    LEGACY_PARTS
      .map((part) =>
        part.replace(
          /[.*+?^${}()|[\]\\]/g,
          "\\$&"
        )
      )
      .join("\\s*"),
    "gi"
  );

  function removeLegacyIdentity(value) {
    return String(value ?? "")
      .replace(legacyPattern, "")
      .replace(/\s{2,}/g, " ")
      .trim();
  }

  function sanitizeNode(root) {
    if (!root) {
      return;
    }

    const sanitizeElement = (element) => {
      if (!(element instanceof Element)) {
        return;
      }

      for (const attribute of [
        "aria-label",
        "title",
        "alt",
      ]) {
        if (!element.hasAttribute(attribute)) {
          continue;
        }

        const current =
          element.getAttribute(attribute) ?? "";

        const clean =
          removeLegacyIdentity(current);

        if (clean === current) {
          continue;
        }

        if (clean) {
          element.setAttribute(attribute, clean);
        } else {
          element.removeAttribute(attribute);
        }
      }
    };

    if (root instanceof Element) {
      sanitizeElement(root);
    }

    const walker = document.createTreeWalker(
      root,
      NodeFilter.SHOW_TEXT |
        NodeFilter.SHOW_ELEMENT
    );

    let node = walker.currentNode;

    while (node) {
      if (node.nodeType === Node.TEXT_NODE) {
        const current =
          node.nodeValue ?? "";

        const clean =
          removeLegacyIdentity(current);

        if (clean !== current) {
          node.nodeValue = clean;
        }
      } else if (
        node.nodeType === Node.ELEMENT_NODE
      ) {
        sanitizeElement(node);
      }

      node = walker.nextNode();
    }
  }

  function applyAccountIdentity() {
    const avatar = document.querySelector(
      ".auth-gate__account-avatar"
    );

    const mark = document.querySelector(
      ".auth-gate__mark"
    );

    if (!avatar || !mark) {
      return;
    }

    const avatarVisible = Boolean(
      !avatar.hidden &&
      avatar.getAttribute("src")
    );

    /*
     * صورة موجودة: أخفِ دائرة VVIP.
     * لا توجد صورة: أظهر دائرة VVIP.
     */
    mark.hidden = avatarVisible;
  }

  function createLogoutModal() {
    let overlay = document.querySelector(
      "[data-vvip-logout-confirmation]"
    );

    if (overlay) {
      return overlay;
    }

    overlay = document.createElement("div");
    overlay.className =
      "vvip-logout-confirmation";
    overlay.dataset.vvipLogoutConfirmation = "";
    overlay.hidden = true;

    const dialog = document.createElement("section");
    dialog.className =
      "vvip-logout-confirmation__dialog";
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");
    dialog.setAttribute(
      "aria-labelledby",
      "vvip-logout-title"
    );

    const title = document.createElement("h2");
    title.id = "vvip-logout-title";
    title.textContent =
      "تأكيد تسجيل الخروج";

    const message = document.createElement("p");
    message.textContent =
      "هل تريد إنهاء الجلسة الحالية؟";

    const error = document.createElement("p");
    error.className =
      "vvip-logout-confirmation__error";
    error.dataset.vvipLogoutError = "";
    error.hidden = true;

    const actions = document.createElement("div");
    actions.className =
      "vvip-logout-confirmation__actions";

    const cancel = document.createElement("button");
    cancel.type = "button";
    cancel.className =
      "vvip-logout-confirmation__cancel";
    cancel.dataset.vvipLogoutCancel = "";
    cancel.textContent = "إلغاء";

    const confirm = document.createElement("button");
    confirm.type = "button";
    confirm.className =
      "vvip-logout-confirmation__confirm";
    confirm.dataset.vvipLogoutConfirm = "";
    confirm.textContent = "تسجيل الخروج";

    actions.append(cancel, confirm);
    dialog.append(title, message, error, actions);
    overlay.append(dialog);
    document.body.append(overlay);

    return overlay;
  }

  function buildSignedOutUrl() {
    const url = new URL(
      "./index.html",
      document.baseURI
    );

    url.search = "";
    url.hash = "";
    url.searchParams.set("auth", "sign-in");
    url.searchParams.set("signed_out", "1");

    return url;
  }

  async function waitForClerk() {
    const deadline = Date.now() + 12000;

    while (Date.now() < deadline) {
      const clerk = window.Clerk;

      if (
        clerk &&
        typeof clerk.signOut === "function"
      ) {
        return clerk;
      }

      await new Promise((resolve) =>
        window.setTimeout(resolve, 60)
      );
    }

    throw new Error(
      "Clerk sign-out is unavailable"
    );
  }

  function wireLogoutButton() {
    const button = document.querySelector(
      "[data-vvip-logout-account]"
    );

    if (
      !button ||
      button.dataset.vvipLogoutFinalized === "1"
    ) {
      return;
    }

    button.dataset.vvipLogoutFinalized = "1";

    const overlay = createLogoutModal();

    const cancel = overlay.querySelector(
      "[data-vvip-logout-cancel]"
    );

    const confirm = overlay.querySelector(
      "[data-vvip-logout-confirm]"
    );

    const error = overlay.querySelector(
      "[data-vvip-logout-error]"
    );

    function closeModal() {
      overlay.hidden = true;
      document.body.classList.remove(
        "vvip-logout-open"
      );

      if (error) {
        error.hidden = true;
        error.textContent = "";
      }

      button.focus({
        preventScroll: true,
      });
    }

    function openModal() {
      overlay.hidden = false;
      document.body.classList.add(
        "vvip-logout-open"
      );

      if (error) {
        error.hidden = true;
        error.textContent = "";
      }

      confirm?.focus({
        preventScroll: true,
      });
    }

    /*
     * استبدال التنفيذ القديم:
     * لا خروج مباشر دون تأكيد.
     */
    button.onclick = openModal;

    cancel.onclick = closeModal;

    overlay.addEventListener(
      "click",
      (event) => {
        if (event.target === overlay) {
          closeModal();
        }
      }
    );

    document.addEventListener(
      "keydown",
      (event) => {
        if (
          event.key === "Escape" &&
          !overlay.hidden
        ) {
          closeModal();
        }
      }
    );

    confirm.onclick = async () => {
      confirm.disabled = true;
      cancel.disabled = true;

      try {
        const clerk = await waitForClerk();
        const destination =
          buildSignedOutUrl();

        await clerk.signOut({
          redirectUrl: destination.href,
        });

        window.location.replace(
          destination.href
        );
      } catch (logoutError) {
        confirm.disabled = false;
        cancel.disabled = false;

        if (error) {
          error.textContent =
            "تعذر تسجيل الخروج. حاول مرة أخرى.";
          error.hidden = false;
        }

        console.error(
          "VVIP_LOGOUT_FAILED",
          logoutError instanceof Error
            ? logoutError.message
            : "Unknown logout error"
        );
      }
    };
  }

  function applyAll() {
    sanitizeNode(document.body);
    applyAccountIdentity();
    wireLogoutButton();
  }

  function start() {
    applyAll();

    const observer = new MutationObserver(
      (mutations) => {
        for (const mutation of mutations) {
          if (
            mutation.type ===
            "characterData"
          ) {
            const current =
              mutation.target.nodeValue ?? "";

            const clean =
              removeLegacyIdentity(current);

            if (clean !== current) {
              mutation.target.nodeValue = clean;
            }
          }

          for (
            const node of mutation.addedNodes
          ) {
            sanitizeNode(node);
          }
        }

        applyAccountIdentity();
        wireLogoutButton();
      }
    );

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      start,
      { once: true }
    );
  } else {
    start();
  }
})();
