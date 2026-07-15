(function (root, factory) {
  "use strict";
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.VVIP_PR36_MEDIA = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const ACCEPT = "image/jpeg,image/png,image/webp";
  const KEYBOARD_HELP = "Alt+Arrow";
  const ERROR_COPY = Object.freeze({
    too_many_photos: "يمكن اختيار سبع صور كحد أقصى.", source_too_large: "إحدى الصور أكبر من الحد المسموح.",
    selection_total_too_large: "الحجم الإجمالي للصور أكبر من الحد المسموح.", mime_not_allowed: "صيغة الصورة غير مدعومة.",
    signature_mismatch: "تعذر التحقق من صيغة الصورة بأمان.", unknown_format: "تعذر قراءة الصورة بأمان.",
    decode_failed: "تعذر فتح الصورة ومعالجتها بأمان.",
    dimensions_too_small: "أبعاد الصورة أصغر من الحد المطلوب.", decoded_pixels_exceeded: "أبعاد الصورة كبيرة جدًا للمعالجة الآمنة.",
    orientation_uncertain: "تعذر تحديد اتجاه الصورة بأمان.", encode_failed: "تعذر إنشاء نسخة آمنة من الصورة.",
    processing_timeout: "استغرقت معالجة الصورة وقتًا أطول من المسموح.", session_timeout: "انتهت مهلة جلسة معالجة الصور.",
    cancelled: "أُلغيت العملية بأمان.", stale_result: "تم تجاهل نتيجة قديمة بأمان.",
    capability_unavailable: "معالجة الصور غير متاحة بأمان في هذا المتصفح."
  });

  function createBrowserSession(win, doc) {
    const policy = win.VVIP_PR36_POLICY;
    const canvasApi = win.VVIP_PR36_CANVAS;
    const workerApi = win.VVIP_PR36_WORKER;
    const sessionApi = win.VVIP_PR36_SESSION;
    const schedulerApi = win.VVIP_PR36_SCHEDULER;
    if (!policy || !canvasApi || !sessionApi || !schedulerApi || typeof win.createImageBitmap !== "function" || !win.URL || typeof win.URL.createObjectURL !== "function" || typeof win.URL.revokeObjectURL !== "function" || typeof AbortController !== "function" || !win.crypto || typeof win.crypto.randomUUID !== "function") return null;
    let webpSupport;
    const adapter = canvasApi.createCanvasAdapter({
      decode: function (file, signal) { if (signal && signal.aborted) return Promise.reject(policy.createMediaError("cancelled")); return win.createImageBitmap(file, { imageOrientation: "from-image" }); },
      createCanvas: function (width, height) { const canvas = doc.createElement("canvas"); canvas.width = width; canvas.height = height; return canvas; },
      draw: function (canvas, image, crop, output) { const context = canvas.getContext("2d", { alpha: false }); if (!context) throw policy.createMediaError("capability_unavailable"); context.drawImage(image, crop.x, crop.y, crop.width, crop.height, 0, 0, output.width, output.height); },
      encode: function (canvas, type, quality) { return new Promise(function (resolve, reject) { canvas.toBlob(function (blob) { if (blob) resolve(blob); else reject(policy.createMediaError("encode_failed")); }, type, quality); }); },
      probeWebP: function () {
        if (webpSupport !== undefined) return webpSupport;
        const canvas = doc.createElement("canvas");
        try { webpSupport = typeof canvas.toDataURL === "function" && canvas.toDataURL("image/webp").startsWith("data:image/webp"); }
        finally { canvas.width = 0; canvas.height = 0; }
        return webpSupport;
      },
      closeDecoded: function (image) { if (image && typeof image.close === "function") image.close(); },
      clearCanvas: function (canvas) { canvas.width = 0; canvas.height = 0; }
    });
    const mainThread = Object.freeze({ process: function (job) {
      return adapter.process({ source: job.source, transform: job.transform, signal: job.signal });
    } });
    const processor = workerApi && typeof workerApi.selectProcessingAdapter === "function"
      ? workerApi.selectProcessingAdapter({
        Worker: win.Worker,
        OffscreenCanvas: win.OffscreenCanvas,
        createImageBitmap: win.createImageBitmap,
        workerFactory: typeof win.Worker === "function" ? function () { return new win.Worker("scripts/media/pr36-media-worker.js"); } : null,
        mainThread: mainThread
      })
      : mainThread;
    const scheduler = schedulerApi.createScheduler({ maxConcurrency: 2, jobTimeoutMs: 20000, sessionTimeoutMs: 120000 });
    return sessionApi.createMediaSession({
      ids: function () { return win.crypto.randomUUID(); }, scheduler,
      urls: { create: function (blob) { return win.URL.createObjectURL(blob); }, revoke: function (url) { win.URL.revokeObjectURL(url); } },
      validator: policy,
      processor: async function (source, edit) {
        const file = source && (source.file || source);
        const signal = edit && edit.signal;
        if (signal && signal.aborted) throw policy.createMediaError("cancelled");
        let bytes = null;
        if (processor !== mainThread) {
          try { bytes = await file.arrayBuffer(); }
          catch (error) { throw policy.createMediaError("decode_failed"); }
        }
        return processor.process({
          jobId: win.crypto.randomUUID(), source: source,
          bytes: bytes, mimeType: source.mimeType || file.type,
          transform: edit && edit.transform, policy: policy.CONSTANTS, signal: signal
        });
      }
    });
  }

  function mountMediaController(options) {
    const root = options.root;
    const doc = options.document || document;
    const win = options.window || window;
    const session = options.session;
    root.replaceChildren();
    root.dir = "rtl";
    const input = doc.createElement("input"); input.type = "file"; input.multiple = true; input.accept = ACCEPT; input.setAttribute("aria-label", "اختيار صور الإعلان");
    const status = doc.createElement("p"); status.setAttribute("aria-live", "polite"); status.setAttribute("role", "status");
    const list = doc.createElement("ol"); list.setAttribute("aria-label", "الصور المختارة بالترتيب");
    const editor = doc.createElement("div"); editor.hidden = true; editor.setAttribute("role", "group"); editor.setAttribute("aria-label", "قص الصورة بنسبة 4 إلى 3"); editor.tabIndex = -1;
    let timer = null;
    let lastFocus = null;
    let editingId = null;
    let disposed = false;
    const itemNodes = new Map();

    function makeButton(text, action, id) { const button = doc.createElement("button"); button.type = "button"; button.textContent = text; button.dataset.action = action; if (id) button.dataset.imageId = id; return button; }
    function createItem(metadata) {
      const item = doc.createElement("li"); item.dataset.imageId = metadata.imageId;
      item.append(doc.createElement("img"), makeButton("", "cover", metadata.imageId), makeButton("تحريك قبل", "before", metadata.imageId), makeButton("تحريك بعد", "after", metadata.imageId), makeButton("تعديل القص", "edit", metadata.imageId), makeButton("إزالة", "remove", metadata.imageId));
      itemNodes.set(metadata.imageId, item);
      return item;
    }
    function render(notify) {
      const snapshot = session.displaySnapshot();
      const previews = session.previewSnapshot ? session.previewSnapshot() : [];
      const activeIds = new Set(snapshot.images.map(function (metadata) { return metadata.imageId; }));
      for (const id of itemNodes.keys()) if (!activeIds.has(id)) itemNodes.delete(id);
      const ordered = snapshot.images.map(function (metadata) {
        const item = itemNodes.get(metadata.imageId) || createItem(metadata);
        const image = item.children[0]; const preview = previews.find(function (candidate) { return candidate.imageId === metadata.imageId; });
        if (preview) image.src = preview.url; image.alt = metadata.altText || "صورة الإعلان";
        item.children[1].textContent = metadata.imageId === snapshot.coverImageId ? "صورة الغلاف" : "تعيين غلاف";
        item.children[1].setAttribute("aria-pressed", String(metadata.imageId === snapshot.coverImageId));
        return item;
      });
      list.replaceChildren(...ordered);
      if (notify !== false && options.onChange) options.onChange(snapshot);
    }
    function setStatus(message, isError) { status.setAttribute("role", isError ? "alert" : "status"); status.setAttribute("aria-live", isError ? "assertive" : "polite"); status.textContent = message; }
    function range(label, minimum, maximum, step, value) { const control = doc.createElement("input"); control.type = "range"; control.min = minimum; control.max = maximum; control.step = step; control.value = value; control.setAttribute("aria-label", label); return control; }
    const cropPreview = doc.createElement("img"); cropPreview.alt = "معاينة محلية لقص الصورة"; cropPreview.setAttribute("aria-label", "معاينة القص بنسبة 4 إلى 3"); cropPreview.className = "vvip-pr36-crop-preview";
    const zoom = range("تكبير", "1", "4", ".05", "1");
    const panX = range("تحريك يمين أو يسار", "-1", "1", ".05", "0");
    const panY = range("تحريك أعلى أو أسفل", "-1", "1", ".05", "0");
    const panRight = makeButton("تحريك يمين", "pan-right"); const panLeft = makeButton("تحريك يسار", "pan-left");
    const panUp = makeButton("تحريك أعلى", "pan-up"); const panDown = makeButton("تحريك أسفل", "pan-down");
    const reset = makeButton("إعادة الضبط", "reset"); const confirm = makeButton("تأكيد المعالجة", "confirm"); const cancel = makeButton("إلغاء", "cancel");
    editor.append(cropPreview, zoom, panX, panY, panRight, panLeft, panUp, panDown, reset, confirm, cancel);

    async function applyEdit() { if (!editingId) return false; const id = editingId; await session.previewEdit(id, { zoom: Number(zoom.value), panX: Number(panX.value), panY: Number(panY.value) }); const preview = session.provisionalSnapshot().find(function (item) { return item.imageId === id; }); if (preview) cropPreview.src = preview.url; setStatus("تم تحديث المعاينة المحلية.", false); return true; }
    function debounceEdit() { win.clearTimeout(timer); timer = win.setTimeout(function () { applyEdit().catch(function (error) { setStatus(ERROR_COPY[error.code] || ERROR_COPY.capability_unavailable, true); }); }, 250); }
    function synchronizeEditorControls(transform) {
      const current = transform || {};
      const zoomValue = Number(current.zoom);
      const panXValue = Number(current.panX);
      const panYValue = Number(current.panY);
      zoom.value = String(Number.isFinite(zoomValue) ? Math.max(1, Math.min(4, zoomValue)) : 1);
      panX.value = String(Number.isFinite(panXValue) ? Math.max(-1, Math.min(1, panXValue)) : 0);
      panY.value = String(Number.isFinite(panYValue) ? Math.max(-1, Math.min(1, panYValue)) : 0);
    }
    function openEditor(id, focusOrigin) {
      const preview = session.provisionalSnapshot().find(function (item) { return item.imageId === id; });
      editingId = id;
      lastFocus = focusOrigin;
      synchronizeEditorControls(preview && preview.transform);
      cropPreview.src = preview ? preview.url : "";
      editor.hidden = false;
      editor.focus();
      setStatus("اضبط القص بنسبة 4 إلى 3 ثم أكد المعالجة.", false);
    }
    function closeEditor(message, isError) { win.clearTimeout(timer); timer = null; editor.hidden = true; cropPreview.removeAttribute && cropPreview.removeAttribute("src"); cropPreview.src = ""; editingId = null; setStatus(message, Boolean(isError)); if (lastFocus && typeof lastFocus.focus === "function") lastFocus.focus(); }
    async function selected() {
      setStatus("جاري التحقق من الصور محليًا…", false);
      try { await session.select(Array.from(input.files || [])); const pending = session.provisionalSnapshot(); if (pending[0]) openEditor(pending[0].imageId, input); }
      catch (error) { session.cancelOperation(); setStatus(ERROR_COPY[error.code] || ERROR_COPY.capability_unavailable, true); }
      finally { input.value = ""; }
    }
    function reportEdit() { win.clearTimeout(timer); timer = null; applyEdit().catch(function (error) { if (error && ["cancelled", "stale_result"].includes(error.code)) return; setStatus(ERROR_COPY[error.code] || ERROR_COPY.capability_unavailable, true); }); }
    function adjust(control, delta) { control.value = String(Math.max(Number(control.min), Math.min(Number(control.max), Number(control.value) + delta))); reportEdit(); }
    function editorClick(event) {
      const action = event.target && event.target.dataset.action;
      if (action === "pan-right") adjust(panX, 0.05); if (action === "pan-left") adjust(panX, -0.05);
      if (action === "pan-up") adjust(panY, -0.05); if (action === "pan-down") adjust(panY, 0.05);
      if (action === "reset") { zoom.value = "1"; panX.value = "0"; panY.value = "0"; reportEdit(); }
      if (action === "cancel") { session.cancelOperation(); closeEditor(ERROR_COPY.cancelled); }
      if (action === "confirm") {
        win.clearTimeout(timer); timer = null;
        confirm.disabled = true;
        applyEdit().then(function () { return session.confirmOperation(); }).then(function () { closeEditor("اكتملت معالجة الصور محليًا."); render(); }, function (error) { session.cancelOperation(); closeEditor(ERROR_COPY[error.code] || ERROR_COPY.capability_unavailable, true); render(); }).finally(function () { confirm.disabled = false; });
      }
    }
    function listClick(event) {
      const button = event.target.closest("button"); if (!button) return;
      const snapshot = session.displaySnapshot(); const index = snapshot.images.findIndex(function (item) { return item.imageId === button.dataset.imageId; });
      if (button.dataset.action === "remove") { session.remove(button.dataset.imageId); setStatus("تمت إزالة الصورة المحلية.", false); }
      if (button.dataset.action === "cover") { session.setCover(button.dataset.imageId); setStatus("تم تعيين صورة الغلاف.", false); }
      if (button.dataset.action === "before") { session.reorder(button.dataset.imageId, index - 1); setStatus("تم تحريك الصورة قبل موضعها السابق.", false); }
      if (button.dataset.action === "after") { session.reorder(button.dataset.imageId, index + 1); setStatus("تم تحريك الصورة بعد موضعها السابق.", false); }
      if (button.dataset.action === "edit" && session.beginEdit(button.dataset.imageId)) openEditor(button.dataset.imageId, button);
      render();
    }
    function keydown(event) {
      if (event.key === "Escape" && !editor.hidden) { event.preventDefault(); event.stopImmediatePropagation(); session.cancelOperation(); closeEditor(ERROR_COPY.cancelled); return; }
      if (!event.altKey || !["ArrowLeft", "ArrowRight"].includes(event.key)) return;
      const item = event.target.closest && event.target.closest("li"); if (!item) return;
      event.preventDefault(); const snapshot = session.displaySnapshot(); const index = snapshot.images.findIndex(function (image) { return image.imageId === item.dataset.imageId; });
      session.reorder(item.dataset.imageId, event.key === "ArrowRight" ? index - 1 : index + 1); setStatus("تم تحديث ترتيب الصور.", false); render();
    }
    function pagehide() { dispose(); }
    function dispose() {
      if (disposed) return; disposed = true; win.clearTimeout(timer); input.removeEventListener("change", selected); list.removeEventListener("click", listClick); editor.removeEventListener("input", debounceEdit); editor.removeEventListener("change", reportEdit); editor.removeEventListener("click", editorClick); doc.removeEventListener("keydown", keydown); win.removeEventListener("pagehide", pagehide); session.dispose(); root.replaceChildren();
    }
    input.addEventListener("change", selected); list.addEventListener("click", listClick); editor.addEventListener("input", debounceEdit); editor.addEventListener("change", reportEdit); editor.addEventListener("click", editorClick); doc.addEventListener("keydown", keydown); win.addEventListener("pagehide", pagehide, { once: true });
    root.append(input, status, list, editor); render(false);
    return Object.freeze({ displaySnapshot: function () { return session.displaySnapshot(); }, reset: function () { session.reset(); render(); }, dispose });
  }
  return Object.freeze({ createBrowserSession, mountMediaController, ACCEPT, KEYBOARD_HELP, ERROR_COPY });
});
