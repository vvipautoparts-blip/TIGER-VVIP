"use strict";

(() => {
  const gate = document.querySelector("[data-vvip-auth-gate]");
  const host = document.getElementById("clerk-sign-in");

  if (!gate || !host) return;

  function revealWhenReady() {
    if (host.childElementCount === 0) return false;

    if (gate.dataset.vvipAuthState === "loading") {
      gate.dataset.vvipAuthState = "ready";
    }

    return true;
  }

  if (revealWhenReady()) return;

  const observer = new MutationObserver(() => {
    if (revealWhenReady()) observer.disconnect();
  });

  observer.observe(host, {
    childList: true,
    subtree: true
  });

  window.setTimeout(() => {
    if (!revealWhenReady()) {
      gate.dataset.vvipAuthState = "fallback";
    }
  }, 12000);
})();
