"use strict";

(() => {
  function openPlatform(event) {
    if (event) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }

    const gate = document.querySelector(
      "[data-vvip-auth-gate]"
    );

    if (gate) {
      gate.hidden = true;
      gate.setAttribute("aria-hidden", "true");
      gate.style.setProperty(
        "display",
        "none",
        "important"
      );
    }

    const marketplace = window.VVIP_PR29;

    if (
      marketplace &&
      typeof marketplace.showHome === "function"
    ) {
      marketplace.showHome();

      if (gate) {
        gate.hidden = true;
        gate.style.setProperty(
          "display",
          "none",
          "important"
        );
      }

      return;
    }

    console.error(
      "VVIP_MARKETPLACE_API_NOT_READY"
    );
  }

  function bindContinueButton() {
    const button = document.querySelector(
      "[data-vvip-continue-account]"
    );

    if (!button) {
      return;
    }

    button.disabled = false;
    button.removeAttribute("disabled");
    button.style.pointerEvents = "auto";
    button.dataset.vvipEntryBound = "1";
    button.onclick = openPlatform;
  }

  document.addEventListener(
    "click",
    (event) => {
      const target =
        event.target instanceof Element
          ? event.target.closest(
              "[data-vvip-continue-account]"
            )
          : null;

      if (target) {
        openPlatform(event);
      }
    },
    true
  );

  bindContinueButton();

  document.addEventListener(
    "DOMContentLoaded",
    bindContinueButton,
    { once: true }
  );

  window.addEventListener(
    "pageshow",
    bindContinueButton
  );

  new MutationObserver(
    bindContinueButton
  ).observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
})();
