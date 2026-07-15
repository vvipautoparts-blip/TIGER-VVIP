(function (window, document) {
  "use strict";

  function requestTemporaryDeactivation(env) {
    if (!env || env.backendAvailable !== true) {
      return {
        ok: false,
        message: "طلب التعطيل غير متاح رسميًا حتى اكتمال ربط إدارة الحساب."
      };
    }
    return {
      ok: false,
      message: "تم تعطيل التنفيذ المباشر في PR39 لحماية الحساب."
    };
  }

  function requestAccountDeletion(env) {
    if (!env || env.backendAvailable !== true) {
      return {
        ok: false,
        message: "تنفيذ الحذف الرسمي يحتاج خدمة إدارة الحساب المعتمدة."
      };
    }
    return {
      ok: false,
      message: "تم تعطيل التنفيذ المباشر في PR39 لحماية البيانات."
    };
  }

  function bindWizard(sectionSelector, action) {
    const root = document.querySelector(sectionSelector);
    if (!root) return;
    const steps = Array.prototype.slice.call(root.querySelectorAll("[data-step]"));
    const status = root.querySelector("[data-status]");
    let current = 0;

    function render() {
      steps.forEach(function (step, index) {
        step.hidden = index !== current;
      });
    }

    root.addEventListener("click", function (event) {
      const next = event.target.closest("[data-next]");
      if (next && current < steps.length - 1) {
        const currentStep = steps[current];
        const requiredPhrase = currentStep && currentStep.getAttribute("data-requires-phrase");
        if (requiredPhrase) {
          const phraseInput = currentStep.querySelector("[data-confirm-phrase]");
          const typed = phraseInput ? String(phraseInput.value || "").trim() : "";
          if (typed !== requiredPhrase) {
            if (status) status.textContent = "أدخل عبارة التأكيد كما هي قبل المتابعة.";
            return;
          }
        }
        current += 1;
        render();
        return;
      }
      const back = event.target.closest("[data-back]");
      if (back && current > 0) {
        current -= 1;
        render();
        return;
      }
      const submit = event.target.closest("[data-submit]");
      if (submit) {
        const result = action({ backendAvailable: false });
        if (status) status.textContent = result.message;
      }
    });

    render();
  }

  function bootstrap() {
    bindWizard("[data-pr39-deactivation]", requestTemporaryDeactivation);
    bindWizard("[data-pr39-deletion]", requestAccountDeletion);
  }

  if (document && typeof document.addEventListener === "function") {
    document.addEventListener("DOMContentLoaded", bootstrap);
  }

  window.VVIP_PR39_ACCOUNT_MANAGEMENT = Object.freeze({
    requestTemporaryDeactivation: requestTemporaryDeactivation,
    requestAccountDeletion: requestAccountDeletion
  });
}(window, document));
