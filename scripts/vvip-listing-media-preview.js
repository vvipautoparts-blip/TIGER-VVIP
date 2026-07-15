(function () {
  "use strict";

  var MAX_IMAGES = 7;
  var ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
  var REQUIRED_ASPECT = "4:3";

  var state = {
    items: [],
    activeId: null,
    crop: null,
    cropSourceUrl: null,
    cropSourceImage: null,
    draggingId: null,
    processing: false
  };

  var els = {
    pickBtn: document.getElementById("pick-image-btn"),
    fileInput: document.getElementById("image-picker"),
    status: document.getElementById("media-status"),
    progress: document.getElementById("media-progress"),
    thumbGrid: document.getElementById("thumb-grid"),
    cardMedia: document.getElementById("card-media"),
    cardCount: document.getElementById("card-count"),
    detailsMain: document.getElementById("details-main"),
    detailsCounter: document.getElementById("details-counter"),
    detailsStrip: document.getElementById("details-strip"),
    modal: document.getElementById("crop-modal"),
    cropImg: document.getElementById("crop-image"),
    cropStage: document.getElementById("crop-stage"),
    cropZoom: document.getElementById("crop-zoom"),
    cropReset: document.getElementById("crop-reset"),
    cropCancel: document.getElementById("crop-cancel"),
    cropApply: document.getElementById("crop-apply"),
    toast: document.getElementById("media-toast"),
    setCoverAction: document.getElementById("set-cover-current"),
    deleteAction: document.getElementById("delete-current")
  };

  function setStatus(kind, text) {
    els.status.className = "vvip-status" + (kind ? " is-" + kind : "");
    els.status.textContent = text;
  }

  function setProgress(value) {
    els.progress.textContent = value > 0 ? "التقدم: " + value + "%" : "";
  }

  function showToast(text) {
    if (!els.toast) return;
    els.toast.textContent = text;
    els.toast.classList.add("is-visible");
    window.clearTimeout(showToast._t);
    showToast._t = window.setTimeout(function () {
      els.toast.classList.remove("is-visible");
    }, 2200);
  }

  function cleanupUrls(item) {
    if (!item || !item.urls) return;
    Object.keys(item.urls).forEach(function (k) {
      if (item.urls[k]) URL.revokeObjectURL(item.urls[k]);
    });
  }

  function getItemById(id) {
    for (var i = 0; i < state.items.length; i += 1) {
      if (state.items[i].id === id) return state.items[i];
    }
    return null;
  }

  function ensureCover() {
    if (!state.items.length) {
      state.activeId = null;
      return;
    }
    var found = state.items.some(function (it) { return it.isCover; });
    if (!found) state.items[0].isCover = true;
    var cover = state.items.find(function (it) { return it.isCover; });
    if (!state.activeId || !getItemById(state.activeId)) {
      state.activeId = cover ? cover.id : state.items[0].id;
    }
  }

  function renderCard() {
    ensureCover();
    var cover = state.items.find(function (it) { return it.isCover; }) || null;
    if (!cover) {
      els.cardMedia.innerHTML = "";
      els.cardCount.textContent = "0 صور";
      return;
    }
    els.cardMedia.innerHTML = '<img src="' + cover.urls.card + '" alt="صورة الغلاف" loading="eager" decoding="async" width="800" height="600" />';
    els.cardCount.textContent = state.items.length + " صور";
  }

  function renderDetails() {
    ensureCover();
    if (!state.items.length) {
      els.detailsMain.innerHTML = "";
      els.detailsCounter.textContent = "0 من 0";
      els.detailsStrip.innerHTML = "";
      return;
    }
    var active = getItemById(state.activeId) || state.items[0];
    var index = state.items.findIndex(function (it) { return it.id === active.id; });
    els.detailsMain.innerHTML = '<img src="' + active.urls.large + '" alt="صورة التفاصيل" loading="eager" decoding="async" width="1200" height="900" />';
    els.detailsCounter.textContent = (index + 1) + " من " + state.items.length;

    els.detailsStrip.innerHTML = "";
    state.items.forEach(function (item) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "vvip-gallery-thumb";
      btn.setAttribute("aria-current", item.id === active.id ? "true" : "false");
      btn.setAttribute("aria-label", "فتح الصورة " + item.order);
      btn.dataset.action = "open-image";
      btn.dataset.id = item.id;
      btn.innerHTML = '<img src="' + item.urls.thumb + '" alt="مصغرة" loading="lazy" decoding="async" width="400" height="300" />';
      els.detailsStrip.appendChild(btn);
    });
  }

  function renderThumbs() {
    ensureCover();
    els.thumbGrid.innerHTML = "";
    state.items.forEach(function (item, idx) {
      item.order = idx + 1;
      var card = document.createElement("article");
      card.className = "vvip-thumb";
      card.draggable = true;
      card.dataset.id = item.id;
      card.innerHTML =
        '<div class="vvip-thumb-media"><img src="' + item.urls.thumb + '" alt="صورة ' + item.order + '" loading="lazy" decoding="async" width="400" height="300" /></div>' +
        '<div class="vvip-media-toolbar">' +
        '  <span class="vvip-media-chip">ترتيب ' + item.order + '</span>' +
        (item.isCover ? '  <span class="vvip-media-chip">الغلاف</span>' : '') +
        '</div>' +
        '<div class="vvip-thumb-tools">' +
        '  <button class="vvip-btn vvip-btn-secondary" type="button" data-action="set-cover" data-id="' + item.id + '">تعيين غلاف</button>' +
        '  <button class="vvip-btn vvip-btn-danger" type="button" data-action="delete" data-id="' + item.id + '">حذف</button>' +
        '</div>';
      if (item.id === state.activeId) {
        card.style.borderColor = "#0866ff";
      }
      els.thumbGrid.appendChild(card);
    });
    renderCard();
    renderDetails();
  }

  function updateDisabledState() {
    var disabled = state.items.length >= MAX_IMAGES || state.processing;
    els.pickBtn.disabled = disabled;
    els.setCoverAction.disabled = !state.items.length;
    els.deleteAction.disabled = !state.items.length;
    if (state.items.length >= MAX_IMAGES) {
      setStatus("disabled", "تم الوصول للحد الأقصى: 7 صور.");
    }
  }

  function setCover(id) {
    state.items.forEach(function (it) {
      it.isCover = it.id === id;
    });
    state.activeId = id;
    renderThumbs();
    showToast("تم تعيين صورة الغلاف.");
  }

  function deleteImage(id) {
    var item = getItemById(id);
    if (!item) return;
    if (!window.confirm("هل تريد حذف الصورة؟")) return;
    cleanupUrls(item);
    state.items = state.items.filter(function (it) { return it.id !== id; });
    ensureCover();
    renderThumbs();
    updateDisabledState();
    showToast("تم حذف الصورة.");
    if (!state.items.length) {
      setStatus("", "الحالة الفارغة: لا توجد صور بعد.");
    }
  }

  function validateFile(file) {
    if (!file) return "لم يتم اختيار ملف.";
    if (ALLOWED_TYPES.indexOf(file.type) === -1) {
      return "صيغة غير مدعومة. الصيغ المتاحة: JPEG/PNG/WEBP";
    }
    if (file.size > 15 * 1024 * 1024) {
      return "الحجم كبير جدًا. الحد الأقصى 15MB.";
    }
    return "";
  }

  function openCrop(file) {
    var err = validateFile(file);
    if (err) {
      setStatus("error", err);
      return;
    }
    if (state.items.length >= MAX_IMAGES) {
      setStatus("disabled", "لا يمكن إضافة أكثر من 7 صور.");
      return;
    }

    var sourceUrl = URL.createObjectURL(file);
    var img = new Image();
    img.onload = function () {
      state.cropSourceUrl = sourceUrl;
      state.cropSourceImage = img;
      state.crop = {
        zoom: 1,
        minZoom: 1,
        maxZoom: 3,
        panX: 0,
        panY: 0
      };
      els.cropZoom.value = "1";
      els.cropImg.src = sourceUrl;
      applyCropTransform();
      els.modal.setAttribute("aria-hidden", "false");
      setStatus("", "افتح القص: حرّك الصورة وكبّر ثم اعتمد.");
    };
    img.onerror = function () {
      URL.revokeObjectURL(sourceUrl);
      setStatus("error", "تعذر قراءة الصورة. حاول ملفًا آخر.");
    };
    img.src = sourceUrl;
  }

  function closeCrop(clearSource) {
    els.modal.setAttribute("aria-hidden", "true");
    if (clearSource && state.cropSourceUrl) {
      URL.revokeObjectURL(state.cropSourceUrl);
      state.cropSourceUrl = null;
      state.cropSourceImage = null;
      state.crop = null;
      els.cropImg.removeAttribute("src");
    }
  }

  function applyCropTransform() {
    if (!state.crop) return;
    var tr = "translate(-50%, -50%) translate(" + state.crop.panX + "px, " + state.crop.panY + "px) scale(" + state.crop.zoom + ")";
    els.cropImg.style.transform = tr;
  }

  function readCropRect() {
    var stageRect = els.cropStage.getBoundingClientRect();
    var img = state.cropSourceImage;
    var fit = Math.max(stageRect.width / img.naturalWidth, stageRect.height / img.naturalHeight);
    var displayW = img.naturalWidth * fit * state.crop.zoom;
    var displayH = img.naturalHeight * fit * state.crop.zoom;
    var imgLeft = (stageRect.width / 2) - (displayW / 2) + state.crop.panX;
    var imgTop = (stageRect.height / 2) - (displayH / 2) + state.crop.panY;

    var sx = ((0 - imgLeft) / displayW) * img.naturalWidth;
    var sy = ((0 - imgTop) / displayH) * img.naturalHeight;
    var sw = (stageRect.width / displayW) * img.naturalWidth;
    var sh = (stageRect.height / displayH) * img.naturalHeight;

    sx = Math.max(0, Math.min(img.naturalWidth - 1, sx));
    sy = Math.max(0, Math.min(img.naturalHeight - 1, sy));
    sw = Math.max(1, Math.min(img.naturalWidth - sx, sw));
    sh = Math.max(1, Math.min(img.naturalHeight - sy, sh));

    return { sx: sx, sy: sy, sw: sw, sh: sh };
  }

  function canvasFromCrop(width, height, cropRect) {
    var canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    var ctx = canvas.getContext("2d", { alpha: false });
    ctx.drawImage(
      state.cropSourceImage,
      cropRect.sx,
      cropRect.sy,
      cropRect.sw,
      cropRect.sh,
      0,
      0,
      width,
      height
    );
    return canvas;
  }

  function toBlob(canvas, type, quality) {
    return new Promise(function (resolve, reject) {
      canvas.toBlob(function (blob) {
        if (!blob) reject(new Error("blob_failed"));
        else resolve(blob);
      }, type, quality);
    });
  }

  async function processAndAddImage() {
    if (!state.cropSourceImage || !state.crop) return;
    state.processing = true;
    setStatus("loading", "Processing: جار معالجة الصورة محليًا...");
    setProgress(10);

    try {
      var cropRect = readCropRect();
      setProgress(35);
      var masterCanvas = canvasFromCrop(1600, 1200, cropRect);
      var largeCanvas = canvasFromCrop(1200, 900, cropRect);
      var cardCanvas = canvasFromCrop(800, 600, cropRect);
      var thumbCanvas = canvasFromCrop(400, 300, cropRect);

      setProgress(70);
      var masterBlob = await toBlob(masterCanvas, "image/webp", 0.9);
      var largeBlob = await toBlob(largeCanvas, "image/webp", 0.88);
      var cardBlob = await toBlob(cardCanvas, "image/webp", 0.86);
      var thumbBlob = await toBlob(thumbCanvas, "image/webp", 0.84);

      setProgress(90);
      var id = "img-" + Date.now() + "-" + Math.floor(Math.random() * 9999);
      var item = {
        id: id,
        order: state.items.length + 1,
        isCover: state.items.length === 0,
        mimeType: "image/webp",
        aspectRatio: REQUIRED_ASPECT,
        crop: {
          x: Number(cropRect.sx.toFixed(2)),
          y: Number(cropRect.sy.toFixed(2)),
          zoom: Number(state.crop.zoom.toFixed(3))
        },
        urls: {
          master: URL.createObjectURL(masterBlob),
          large: URL.createObjectURL(largeBlob),
          card: URL.createObjectURL(cardBlob),
          thumb: URL.createObjectURL(thumbBlob)
        },
        sizes: {
          master: { width: 1600, height: 1200 },
          large: { width: 1200, height: 900 },
          card: { width: 800, height: 600 },
          thumbnail: { width: 400, height: 300 }
        }
      };

      state.items.push(item);
      state.activeId = id;
      setProgress(100);
      closeCrop(true);
      renderThumbs();
      updateDisabledState();
      setStatus("success", "تم اعتماد الصورة محليًا دون أي رفع أو حفظ دائم.");
      showToast("تمت إضافة الصورة للمعرض.");
    } catch (err) {
      setStatus("error", "فشلت معالجة الصورة. أعد المحاولة.");
    } finally {
      state.processing = false;
      window.setTimeout(function () { setProgress(0); }, 500);
    }
  }

  function initCropDrag() {
    var dragging = false;
    var startX = 0;
    var startY = 0;
    var baseX = 0;
    var baseY = 0;

    function down(clientX, clientY) {
      if (!state.crop) return;
      dragging = true;
      startX = clientX;
      startY = clientY;
      baseX = state.crop.panX;
      baseY = state.crop.panY;
    }

    function move(clientX, clientY) {
      if (!dragging || !state.crop) return;
      state.crop.panX = baseX + (clientX - startX);
      state.crop.panY = baseY + (clientY - startY);
      applyCropTransform();
    }

    function up() {
      dragging = false;
    }

    els.cropStage.addEventListener("mousedown", function (e) {
      e.preventDefault();
      down(e.clientX, e.clientY);
    });
    window.addEventListener("mousemove", function (e) { move(e.clientX, e.clientY); });
    window.addEventListener("mouseup", up);

    els.cropStage.addEventListener("touchstart", function (e) {
      var t = e.touches[0];
      if (!t) return;
      down(t.clientX, t.clientY);
    }, { passive: true });
    els.cropStage.addEventListener("touchmove", function (e) {
      var t = e.touches[0];
      if (!t) return;
      move(t.clientX, t.clientY);
    }, { passive: true });
    els.cropStage.addEventListener("touchend", up, { passive: true });
  }

  function reorder(dragId, targetId) {
    if (!dragId || !targetId || dragId === targetId) return;
    var from = state.items.findIndex(function (it) { return it.id === dragId; });
    var to = state.items.findIndex(function (it) { return it.id === targetId; });
    if (from < 0 || to < 0) return;
    var moved = state.items.splice(from, 1)[0];
    state.items.splice(to, 0, moved);
    ensureCover();
    renderThumbs();
    showToast("تم تحديث ترتيب الصور.");
  }

  function bindEvents() {
    els.pickBtn.addEventListener("click", function () {
      if (state.items.length >= MAX_IMAGES) {
        setStatus("disabled", "لا يمكن إضافة أكثر من 7 صور.");
        return;
      }
      els.fileInput.click();
    });

    els.fileInput.addEventListener("change", function () {
      var file = els.fileInput.files && els.fileInput.files[0];
      if (file) openCrop(file);
      els.fileInput.value = "";
    });

    els.cropZoom.addEventListener("input", function () {
      if (!state.crop) return;
      state.crop.zoom = Number(els.cropZoom.value || "1");
      applyCropTransform();
    });

    els.cropReset.addEventListener("click", function () {
      if (!state.crop) return;
      state.crop.zoom = 1;
      state.crop.panX = 0;
      state.crop.panY = 0;
      els.cropZoom.value = "1";
      applyCropTransform();
    });

    els.cropCancel.addEventListener("click", function () {
      closeCrop(true);
      setStatus("", "تم إلغاء الصورة. لم يتم حفظ أي بيانات.");
    });

    els.cropApply.addEventListener("click", processAndAddImage);

    els.thumbGrid.addEventListener("click", function (event) {
      var btn = event.target.closest("[data-action]");
      if (!btn) return;
      var action = btn.dataset.action;
      var id = btn.dataset.id;
      if (action === "set-cover") setCover(id);
      if (action === "delete") deleteImage(id);
    });

    els.thumbGrid.addEventListener("dragstart", function (event) {
      var card = event.target.closest(".vvip-thumb");
      if (!card) return;
      state.draggingId = card.dataset.id;
      card.classList.add("is-dragging");
    });

    els.thumbGrid.addEventListener("dragend", function (event) {
      var card = event.target.closest(".vvip-thumb");
      if (card) card.classList.remove("is-dragging");
      state.draggingId = null;
    });

    els.thumbGrid.addEventListener("dragover", function (event) {
      if (!state.draggingId) return;
      event.preventDefault();
    });

    els.thumbGrid.addEventListener("drop", function (event) {
      var card = event.target.closest(".vvip-thumb");
      if (!card) return;
      event.preventDefault();
      reorder(state.draggingId, card.dataset.id);
    });

    els.detailsStrip.addEventListener("click", function (event) {
      var btn = event.target.closest("[data-action='open-image']");
      if (!btn) return;
      state.activeId = btn.dataset.id;
      renderDetails();
    });

    els.setCoverAction.addEventListener("click", function () {
      if (!state.activeId) return;
      setCover(state.activeId);
    });

    els.deleteAction.addEventListener("click", function () {
      if (!state.activeId) return;
      deleteImage(state.activeId);
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && els.modal.getAttribute("aria-hidden") === "false") {
        closeCrop(true);
      }
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      if (!state.items.length) return;
      var idx = state.items.findIndex(function (it) { return it.id === state.activeId; });
      if (idx < 0) idx = 0;
      idx += event.key === "ArrowRight" ? -1 : 1;
      if (idx < 0) idx = state.items.length - 1;
      if (idx >= state.items.length) idx = 0;
      state.activeId = state.items[idx].id;
      renderDetails();
    });

    window.addEventListener("beforeunload", function () {
      if (state.cropSourceUrl) URL.revokeObjectURL(state.cropSourceUrl);
      state.items.forEach(cleanupUrls);
    });
  }

  function renderInitial() {
    setStatus("", "الحالة الفارغة: لا توجد صور بعد.");
    setProgress(0);
    renderThumbs();
    updateDisabledState();
    setStatus("disabled", "معاينة تصميمية محلية - لا يتم رفع أو حفظ الصور.");
  }

  function boot() {
    initCropDrag();
    bindEvents();
    renderInitial();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
