(function () {
  "use strict";

  const isPrivate =
    window.location.pathname.endsWith(
      "private-profile-p03.html"
    );

  const OUTPUT = {
    avatar: {
      width: 1024,
      height: 1024,
      quality: 0.88
    },
    cover: {
      width: 1600,
      height: 640,
      quality: 0.88
    }
  };

  const ALLOWED_TYPES = new Set([
    "image/jpeg",
    "image/png",
    "image/webp"
  ]);

  const MAX_BYTES = 15 * 1024 * 1024;
  const debugEnabled = new URLSearchParams(
    window.location.search
  ).get("vvip_debug") === "profile";
  const diagnostics = debugEnabled ? {
    editorReady: false,
    busy: false,
    lastStage: "boot",
    lastStatus: "idle",
    lastDurationMs: 0,
    remoteVerified: false,
    offline: navigator.onLine === false
  } : null;

  if (diagnostics) {
    window.__VVIP_PROFILE_LIVE_DIAGNOSTICS = diagnostics;
  }

  function diagnose(values) {
    if (diagnostics) Object.assign(diagnostics, values);
  }

  const state = {
    kind: "avatar",
    image: null,
    objectUrl: "",
    zoom: 1,
    x: 0,
    y: 0,
    drawWidth: 0,
    drawHeight: 0,
    dragging: false,
    pointerId: null,
    lastX: 0,
    lastY: 0,
    busy: false
  };

  let picker;
  let backdrop;
  let stage;
  let canvas;
  let context;
  let range;
  let title;
  let errorBox;
  let confirmButton;
  let toast;
  let toastTimer;
  const PRIVATE_AUTH_RETURN_URL =
    "index.html?reason=session_required&return_to=private-profile-p03.html";

  async function hasActiveSession(timeout = 700) {
    const startedAt = Date.now();

    while (Date.now() - startedAt < timeout) {
      if (
        window.Clerk &&
        typeof window.Clerk.load === "function"
      ) {
        try {
          await Promise.race([
            window.Clerk.load(),
            new Promise((resolve) => {
              window.setTimeout(resolve, 700);
            })
          ]);
        } catch (error) {
          console.warn(
            "VVIP_CLEAN_EDITOR_CLERK_LOAD_FAILED",
            error && error.message ? error.message : error
          );
        }

        if (window.Clerk.user && window.Clerk.session) {
          return true;
        }
      }

      await new Promise((resolve) => {
        window.setTimeout(resolve, 80);
      });
    }

    return false;
  }

  async function ensureSessionOrRedirect() {
    if (await hasActiveSession()) {
      return true;
    }

    showToast("انتهت جلستك. يرجى تسجيل الدخول من جديد.");

    if (backdrop && !backdrop.hidden) {
      closeEditor(true, true);
    }

    window.setTimeout(() => {
      window.location.replace(PRIVATE_AUTH_RETURN_URL);
    }, 220);

    return false;
  }

  function createEditor() {
    if (!isPrivate) return;

    picker = document.createElement("input");
    picker.type = "file";
    picker.accept =
      "image/jpeg,image/png,image/webp";
    picker.hidden = true;

    backdrop = document.createElement("div");
    backdrop.className =
      "vvip-clean-editor-backdrop";
    backdrop.hidden = true;

    backdrop.innerHTML = `
      <section
        class="vvip-clean-editor"
        role="dialog"
        aria-modal="true"
        aria-labelledby="vvip-clean-editor-title"
        dir="rtl"
      >
        <div class="vvip-clean-editor-handle"></div>

        <header class="vvip-clean-editor-header">
          <h2 id="vvip-clean-editor-title">
            ضبط الصورة
          </h2>

          <button
            class="vvip-clean-editor-close"
            type="button"
            aria-label="إغلاق"
            data-clean-editor-close
          >
            ×
          </button>
        </header>

        <button
          class="vvip-clean-editor-pick"
          type="button"
          data-clean-editor-pick
        >
          اختيار صورة أخرى
        </button>

        <div
          class="vvip-clean-editor-stage"
          data-clean-editor-stage
          data-kind="avatar"
        >
          <canvas data-clean-editor-canvas></canvas>
          <div
            class="vvip-clean-editor-grid"
            aria-hidden="true"
          ></div>
        </div>

        <div class="vvip-clean-editor-controls">
          <label for="vvip-clean-editor-zoom">
            التكبير
          </label>

          <input
            id="vvip-clean-editor-zoom"
            type="range"
            min="1"
            max="3"
            step="0.01"
            value="1"
            data-clean-editor-range
          >
        </div>

        <p class="vvip-clean-editor-help">
          حرّك الصورة داخل الإطار ثم اضبط التكبير.
          لن يظهر نجاح إلا بعد حفظها على الحساب المركزي.
        </p>

        <div
          class="vvip-clean-editor-error"
          data-clean-editor-error
          role="alert"
          hidden
        ></div>

        <button
          class="vvip-clean-editor-confirm"
          type="button"
          data-clean-editor-confirm
        >
          اعتماد الصورة
        </button>
      </section>
    `;

    toast = document.createElement("div");
    toast.className = "vvip-clean-editor-toast";
    toast.hidden = true;
    toast.setAttribute("role", "status");
    toast.setAttribute("aria-live", "polite");

    document.body.appendChild(picker);
    document.body.appendChild(backdrop);
    document.body.appendChild(toast);

    stage = backdrop.querySelector(
      "[data-clean-editor-stage]"
    );

    canvas = backdrop.querySelector(
      "[data-clean-editor-canvas]"
    );

    context = canvas.getContext("2d", {
      alpha: false
    });

    range = backdrop.querySelector(
      "[data-clean-editor-range]"
    );

    title = backdrop.querySelector(
      "#vvip-clean-editor-title"
    );

    errorBox = backdrop.querySelector(
      "[data-clean-editor-error]"
    );

    confirmButton = backdrop.querySelector(
      "[data-clean-editor-confirm]"
    );

    bindEditorEvents();
  }

  function bindEditorEvents() {
    picker.addEventListener("change", () => {
      const file = picker.files?.[0];

      if (file) {
        loadFile(file);
      }
    });

    backdrop.addEventListener("click", (event) => {
      if (
        event.target === backdrop ||
        event.target.closest(
          "[data-clean-editor-close]"
        )
      ) {
        event.preventDefault();
        closeEditor();
        return;
      }

      if (
        event.target.closest(
          "[data-clean-editor-pick]"
        )
      ) {
        event.preventDefault();
        picker.value = "";
        picker.click();
      }
    });

    confirmButton.addEventListener(
      "click",
      confirmImage
    );

    range.addEventListener("input", () => {
      state.zoom = Number(range.value) || 1;
      calculateDrawing(true);
      render();
    });

    canvas.addEventListener(
      "pointerdown",
      startDrag
    );

    canvas.addEventListener(
      "pointermove",
      moveDrag
    );

    canvas.addEventListener(
      "pointerup",
      endDrag
    );

    canvas.addEventListener(
      "pointercancel",
      endDrag
    );
  }

  function openPicker(kind) {
    if (state.busy) return;

    ensureSessionOrRedirect().then((isValid) => {
      if (!isValid) return;

      state.kind = kind;
      picker.value = "";
      picker.click();
    });
  }

  function validateFile(file) {
    if (!ALLOWED_TYPES.has(file.type)) {
      throw new Error(
        "اختر صورة JPG أو PNG أو WebP."
      );
    }

    if (file.size > MAX_BYTES) {
      throw new Error(
        "حجم الصورة يتجاوز 15 ميغابايت."
      );
    }
  }

  function loadFile(file) {
    try {
      validateFile(file);
    } catch (error) {
      showToast(error.message);
      return;
    }

    resetImage();

    const image = new Image();
    const url = URL.createObjectURL(file);

    image.onload = () => {
      state.image = image;
      state.objectUrl = url;
      state.zoom = 1;
      range.value = "1";

      openEditor();
    };

    image.onerror = () => {
      URL.revokeObjectURL(url);
      showToast(
        "تعذر فتح الصورة. اختر صورة أخرى."
      );
    };

    image.src = url;
  }

  function openEditor() {
    clearError();

    title.textContent =
      state.kind === "cover"
        ? "ضبط صورة الغلاف"
        : "ضبط الصورة الشخصية";

    stage.dataset.kind = state.kind;

    backdrop.hidden = false;
    document.body.style.overflow = "hidden";

    window.history.pushState(
      {
        ...(window.history.state || {}),
        vvipOverlay: "clean-profile-editor"
      },
      ""
    );

    requestAnimationFrame(() => {
      prepareCanvas();
      calculateDrawing(false);
      render();
    });
  }

  function closeEditor(skipHistory = false, force = false) {
    if (state.busy && !force) return;

    backdrop.hidden = true;
    document.body.style.overflow = "";

    resetImage();

    if (
      !skipHistory &&
      window.history.state?.vvipOverlay ===
        "clean-profile-editor"
    ) {
      window.history.back();
    }
  }

  function resetImage() {
    if (state.objectUrl) {
      URL.revokeObjectURL(state.objectUrl);
    }

    state.image = null;
    state.objectUrl = "";
    state.zoom = 1;
    state.x = 0;
    state.y = 0;
    state.drawWidth = 0;
    state.drawHeight = 0;
    state.dragging = false;
    state.pointerId = null;

    if (range) {
      range.value = "1";
    }
  }

  function prepareCanvas() {
    const ratio =
      state.kind === "cover"
        ? 5 / 2
        : 1;

    const width = Math.max(
      280,
      Math.round(stage.clientWidth)
    );

    canvas.width = width;
    canvas.height = Math.round(width / ratio);
  }

  function calculateDrawing(keepCenter) {
    if (!state.image) return;

    const previousWidth =
      state.drawWidth || 1;

    const previousHeight =
      state.drawHeight || 1;

    const centerX =
      (canvas.width / 2 - state.x) /
      previousWidth;

    const centerY =
      (canvas.height / 2 - state.y) /
      previousHeight;

    const baseScale = Math.max(
      canvas.width /
        state.image.naturalWidth,
      canvas.height /
        state.image.naturalHeight
    );

    const scale =
      baseScale * state.zoom;

    state.drawWidth =
      state.image.naturalWidth * scale;

    state.drawHeight =
      state.image.naturalHeight * scale;

    if (keepCenter) {
      state.x =
        canvas.width / 2 -
        centerX * state.drawWidth;

      state.y =
        canvas.height / 2 -
        centerY * state.drawHeight;
    } else {
      state.x =
        (canvas.width -
          state.drawWidth) / 2;

      state.y =
        (canvas.height -
          state.drawHeight) / 2;
    }

    clampPosition();
  }

  function clampPosition() {
    state.x = Math.min(
      0,
      Math.max(
        canvas.width - state.drawWidth,
        state.x
      )
    );

    state.y = Math.min(
      0,
      Math.max(
        canvas.height - state.drawHeight,
        state.y
      )
    );
  }

  function render() {
    if (!state.image) return;

    context.fillStyle = "#111827";
    context.fillRect(
      0,
      0,
      canvas.width,
      canvas.height
    );

    context.drawImage(
      state.image,
      state.x,
      state.y,
      state.drawWidth,
      state.drawHeight
    );
  }

  function startDrag(event) {
    if (!state.image || state.busy) return;

    state.dragging = true;
    state.pointerId = event.pointerId;
    state.lastX = event.clientX;
    state.lastY = event.clientY;

    canvas.setPointerCapture(
      event.pointerId
    );
  }

  function moveDrag(event) {
    if (
      !state.dragging ||
      event.pointerId !== state.pointerId
    ) {
      return;
    }

    state.x +=
      event.clientX - state.lastX;

    state.y +=
      event.clientY - state.lastY;

    state.lastX = event.clientX;
    state.lastY = event.clientY;

    clampPosition();
    render();
  }

  function endDrag(event) {
    if (
      event.pointerId !== state.pointerId
    ) {
      return;
    }

    state.dragging = false;
    state.pointerId = null;
  }

  function createOutputBlob() {
    const config = OUTPUT[state.kind];

    const output =
      document.createElement("canvas");

    output.width = config.width;
    output.height = config.height;

    const outputContext =
      output.getContext("2d", {
        alpha: false
      });

    const factor =
      config.width / canvas.width;

    outputContext.fillStyle = "#ffffff";
    outputContext.fillRect(
      0,
      0,
      output.width,
      output.height
    );

    outputContext.drawImage(
      state.image,
      state.x * factor,
      state.y * factor,
      state.drawWidth * factor,
      state.drawHeight * factor
    );

    return new Promise((resolve, reject) => {
      output.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(
              new Error(
                "تعذر إنشاء النسخة المعالجة."
              )
            );
          }
        },
        "image/webp",
        config.quality
      );
    });
  }

  function readableError(error) {
    const code =
      error?.code ||
      error?.details?.code ||
      error?.message ||
      "PROFILE_MEDIA_SAVE_FAILED";

    const messages = {
      PROFILE_STORE_NOT_READY:
        "مخزن صور الحساب غير جاهز.",

      PROFILE_USER_ID_MISSING:
        "تعذر تحديد المستخدم الحالي.",

      PROFILE_REMOTE_SYNC_NOT_READY:
        "المزامنة المركزية غير محملة.",

      SUPABASE_PUBLIC_CONFIG_MISSING:
        "إعداد Supabase العام غير مكتمل.",

      CLERK_SESSION_MISSING:
        "جلسة المستخدم غير متاحة. أعد تسجيل الدخول.",

      PROFILE_MEDIA_STATE_FAILED:
        "جداول مزامنة الصور أو وظائف RPC غير مفعلة.",

      PROFILE_MEDIA_UPLOAD_FAILED:
        "رفض Supabase Storage رفع الصورة.",

      PROFILE_MEDIA_DATABASE_FAILED:
        "فشل حفظ رابط الصورة في ملف المستخدم.",

      PROFILE_MEDIA_VERIFY_FAILED:
        "لم يؤكد الحساب المركزي حفظ الصورة. لم يتم اعتمادها.",

      PROFILE_MEDIA_TIMEOUT:
        "الاتصال بطيء الآن. بقي المحرر مفتوحًا لتعيد المحاولة."
    };

    return (
      messages[code] ||
      "تعذر حفظ الصورة على الحساب الآن. حاول مرة أخرى."
    );
  }

  async function confirmImage() {
    if (
      state.busy ||
      !state.image
    ) {
      return;
    }

    clearError();

    if (!(await ensureSessionOrRedirect())) {
      return;
    }

    state.busy = true;
    const startedAt = performance.now();
    diagnose({ busy: true, lastStage: "processing", lastStatus: "running", remoteVerified: false });
    confirmButton.disabled = true;
    confirmButton.textContent =
      "جارٍ الحفظ على الحساب…";

    try {
      const store =
        window.VVIP_P03_PROFILE_STORE;

      if (
        !store ||
        typeof store.resolveIdentity !==
          "function" ||
        typeof store.saveProcessedImage !==
          "function"
      ) {
        const error = new Error(
          "PROFILE_STORE_NOT_READY"
        );

        error.code =
          "PROFILE_STORE_NOT_READY";

        throw error;
      }

      const identity =
        await store.resolveIdentity();

      if (!identity?.userId) {
        const error = new Error(
          "PROFILE_USER_ID_MISSING"
        );

        error.code =
          "PROFILE_USER_ID_MISSING";

        throw error;
      }

      const remote =
        window.VVIP_P03_PROFILE_REMOTE_SYNC;

      if (
        !remote ||
        typeof remote.upload !== "function"
      ) {
        const error = new Error(
          "PROFILE_REMOTE_SYNC_NOT_READY"
        );

        error.code =
          "PROFILE_REMOTE_SYNC_NOT_READY";

        throw error;
      }

      const blob =
        await createOutputBlob();
      diagnose({ lastStage: "remote-upload" });

      /*
        الحفظ المركزي أولًا.
        لا نجاح كاذب ولا إغلاق قبل نجاحه.
      */
      await remote.upload({
        userId: identity.userId,
        kind: state.kind,
        blob
      });
      diagnose({ lastStage: "central-verified", remoteVerified: true });

      await store.saveProcessedImage(
        identity.userId,
        state.kind,
        blob
      );
      diagnose({ lastStage: "local-cache", lastStatus: "success" });

      const source =
        URL.createObjectURL(blob);

      const selector =
        state.kind === "cover"
          ? "[data-profile-cover-image]"
          : "[data-profile-avatar-image]";

      document
        .querySelectorAll(selector)
        .forEach((image) => {
          image.src = source;
        });

      const savedKind = state.kind;

      closeEditor(false, true);

      showToast(
        savedKind === "cover"
          ? "تم حفظ الغلاف ومزامنته مع الحساب."
          : "تم حفظ الصورة الشخصية ومزامنتها مع الحساب."
      );
    } catch (error) {
      diagnose({ lastStatus: "failed", lastStage: error?.code || "save-failed" });
      console.error(
        "VVIP_CLEAN_PROFILE_SAVE_FAILED",
        error
      );

      showError(
        readableError(error)
      );
    } finally {
      state.busy = false;
      diagnose({ busy: false, lastDurationMs: Math.round(performance.now() - startedAt) });
      confirmButton.disabled = false;
      confirmButton.textContent =
        "اعتماد الصورة";
    }
  }

  function showError(message) {
    errorBox.textContent = message;
    errorBox.hidden = false;
  }

  function clearError() {
    errorBox.textContent = "";
    errorBox.hidden = true;
  }

  function showToast(message) {
    clearTimeout(toastTimer);

    toast.textContent = message;
    toast.hidden = false;

    toastTimer = setTimeout(() => {
      toast.hidden = true;
    }, 2800);
  }

  function bindCameraButtons() {
    document
      .querySelectorAll("[data-select-avatar]")
      .forEach((button) => {
        button.addEventListener("click", (event) => {
          event.preventDefault();
          openPicker("avatar");
        });
      });

    document
      .querySelectorAll("[data-select-cover]")
      .forEach((button) => {
        button.addEventListener("click", (event) => {
          event.preventDefault();
          openPicker("cover");
        });
      });
  }

  function initialize() {
    document.body.classList.add(
      "vvip-clean-profile"
    );

    if (isPrivate) {
      createEditor();
      bindCameraButtons();
      diagnose({ editorReady: true, lastStage: "ready" });
    }

    window.addEventListener(
      "popstate",
      () => {
        if (
          backdrop &&
          !backdrop.hidden &&
          !state.busy
        ) {
          closeEditor(true);
        }
      }
    );
  }

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      initialize,
      { once: true }
    );
  } else {
    initialize();
  }
})();
