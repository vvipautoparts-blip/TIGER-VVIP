(function (root) {
  'use strict';

  const DRAFT_KEY = 'vvip.fusion.composer.draft.v1';
  const LOCAL_DRAFT_ONLY = 'LOCAL_DRAFT_ONLY';
  const PRICE_TYPES = Object.freeze([
    Object.freeze({ value: 'FIXED', ar: 'سعر ثابت' }),
    Object.freeze({ value: 'FROM', ar: 'يبدأ من' }),
    Object.freeze({ value: 'NEGOTIABLE', ar: 'قابل للتفاوض' }),
    Object.freeze({ value: 'CONTACT', ar: 'تواصل للسعر' })
  ]);

  let layer = null;
  let form = null;
  let mediaController = null;
  let mediaSession = null;
  let lastFocus = null;

  function text(value, max) {
    return String(value == null ? '' : value)
      .replace(/[<>\u0000-\u001f\u007f]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, max);
  }

  function enabledSectors() {
    const source = root.VVIP_FUSION_SECTOR_REGISTRY;
    if (!Array.isArray(source)) return [];
    return source.filter(function (entry) {
      return entry && typeof entry === 'object' && entry.enabled === true &&
        typeof entry.key === 'string' && entry.key.trim() &&
        typeof entry.label === 'string' && entry.label.trim();
    }).slice(0, 100).map(function (entry) {
      return Object.freeze({ key: text(entry.key, 80), label: text(entry.label, 120), enabled: true });
    });
  }

  function sectorOptions() {
    const options = ['<option value="">اختر القطاع</option>'];
    enabledSectors().forEach(function (entry) {
      options.push(`<option value="${entry.key}">${entry.label}</option>`);
    });
    return options.join('');
  }

  function priceTypeOptions() {
    return ['<option value="">نوع السعر</option>'].concat(PRICE_TYPES.map(function (item) {
      return `<option value="${item.value}">${item.ar}</option>`;
    })).join('');
  }

  function markup() {
    return `<div class="fusion-composer-layer" data-fusion-composer-layer aria-hidden="true" hidden>
      <button class="fusion-composer-backdrop" type="button" data-fusion-composer-close aria-label="إغلاق إنشاء الإعلان"></button>
      <section class="fusion-composer-panel" role="dialog" aria-modal="true" aria-labelledby="fusion-composer-title" tabindex="-1">
        <header class="fusion-composer-panel__header">
          <div><span class="eyebrow">VVIP TIGER</span><h2 id="fusion-composer-title">ماذا تريد أن تعرض؟</h2><p>أدخل الأساسيات أولًا، وتظهر التفاصيل المتخصصة عند الحاجة فقط.</p></div>
          <button class="fusion-icon-button" type="button" data-fusion-composer-close aria-label="إغلاق">×</button>
        </header>
        <form class="fusion-progressive-form" data-fusion-progressive-form novalidate>
          <section class="fusion-composer-media" data-fusion-composer-media aria-label="صور الإعلان"></section>
          <div class="fusion-progressive-grid">
            <label class="fusion-field fusion-field--wide"><span>العنوان</span><input name="title" maxlength="80" autocomplete="off" required placeholder="ما الذي تعرضه؟"></label>
            <label class="fusion-field"><span>القطاع</span><select name="sector" required>${sectorOptions()}</select></label>
            <label class="fusion-field"><span>الفئة</span><input name="category" maxlength="100" autocomplete="off" required placeholder="الفئة أو التصنيف"></label>
            <label class="fusion-field"><span>نوع السعر</span><select name="priceType" required>${priceTypeOptions()}</select></label>
            <label class="fusion-field"><span>السعر</span><input name="price" inputmode="decimal" maxlength="24" autocomplete="off" placeholder="0.00"></label>
            <label class="fusion-field fusion-field--wide"><span>الموقع</span><input name="location" maxlength="100" autocomplete="address-level2" required placeholder="الدولة / المدينة"></label>
          </div>
          <div data-fusion-sector-fields aria-live="polite"></div>
          <p class="fusion-composer-status" data-fusion-composer-status role="status" aria-live="polite"></p>
          <div class="fusion-composer-actions">
            <button type="button" data-fusion-save-draft>حفظ مسودة محلية</button>
            <button class="button button--primary" type="submit" data-fusion-publish-request>متابعة تجهيز الإعلان</button>
          </div>
          <p class="fusion-composer-disclaimer">VVIP TIGER منصة عرض واكتشاف وتواصل مباشر، وليست طرفًا في البيع أو الدفع أو التوصيل.</p>
        </form>
      </section>
    </div>`;
  }

  function ensureLayer() {
    if (layer && root.document.contains(layer)) return layer;
    const host = root.document.createElement('div');
    host.innerHTML = markup();
    layer = host.firstElementChild;
    root.document.body.appendChild(layer);
    form = layer.querySelector('[data-fusion-progressive-form]');
    bindLayer();
    return layer;
  }

  function setStatus(message, error) {
    const node = layer && layer.querySelector('[data-fusion-composer-status]');
    if (!node) return;
    node.textContent = message;
    node.setAttribute('role', error ? 'alert' : 'status');
  }

  function mountMedia() {
    const host = layer && layer.querySelector('[data-fusion-composer-media]');
    if (!host) return;
    if (mediaController) return;
    const mediaApi = root.VVIP_PR36_MEDIA;
    if (!mediaApi || typeof mediaApi.createBrowserSession !== 'function' || typeof mediaApi.mountMediaController !== 'function') {
      host.textContent = 'معالجة الصور غير متاحة بأمان على هذا الجهاز الآن.';
      return;
    }
    mediaSession = mediaApi.createBrowserSession(root, root.document);
    if (!mediaSession) {
      host.textContent = 'معالجة الصور غير متاحة بأمان على هذا الجهاز الآن.';
      return;
    }
    mediaController = mediaApi.mountMediaController({
      root: host,
      session: mediaSession,
      document: root.document,
      window: root,
      onChange: function (snapshot) {
        const count = snapshot && Array.isArray(snapshot.images) ? snapshot.images.length : 0;
        setStatus(count ? `${count} صور جاهزة محليًا للمعاينة.` : '', false);
      }
    });
  }

  function draftPayload() {
    const data = new root.FormData(form);
    const priceType = text(data.get('priceType'), 24);
    const price = text(data.get('price'), 24);
    if (priceType !== 'CONTACT' && price && !/^\d+(?:\.\d{1,2})?$/.test(price)) return null;
    const media = mediaController && typeof mediaController.displaySnapshot === 'function'
      ? mediaController.displaySnapshot() : { images: [], coverImageId: null };
    return Object.freeze({
      version: 1,
      state: LOCAL_DRAFT_ONLY,
      title: text(data.get('title'), 80),
      sector: text(data.get('sector'), 80),
      category: text(data.get('category'), 100),
      priceType,
      price,
      location: text(data.get('location'), 100),
      imageCount: Array.isArray(media.images) ? Math.min(media.images.length, 7) : 0,
      savedAt: new Date().toISOString()
    });
  }

  function saveDraft() {
    const payload = draftPayload();
    if (!payload || !payload.title || !payload.sector || !payload.category || !payload.priceType || !payload.location) {
      setStatus('أكمل الحقول الأساسية بصيغة صحيحة قبل حفظ المسودة.', true);
      return false;
    }
    try {
      root.localStorage.setItem(DRAFT_KEY, JSON.stringify(payload));
      setStatus('تم حفظ المسودة محليًا على هذا الجهاز فقط. لم يتم نشر أي شيء.', false);
      root.dispatchEvent(new root.CustomEvent('vvip:fusion-local-draft-saved', { detail: payload }));
      return true;
    } catch (_) {
      setStatus('تعذر حفظ المسودة على هذا الجهاز الآن.', true);
      return false;
    }
  }

  function refreshSectors() {
    if (!form) return;
    const select = form.elements.sector;
    if (!select) return;
    const current = select.value;
    select.innerHTML = sectorOptions();
    if (Array.from(select.options).some(function (option) { return option.value === current; })) select.value = current;
  }

  function open() {
    const current = ensureLayer();
    refreshSectors();
    lastFocus = root.document.activeElement;
    current.hidden = false;
    current.setAttribute('aria-hidden', 'false');
    root.document.body.classList.add('fusion-composer-open');
    mountMedia();
    const panel = current.querySelector('.fusion-composer-panel');
    if (panel) panel.focus();
  }

  function close() {
    if (!layer || layer.hidden) return;
    layer.hidden = true;
    layer.setAttribute('aria-hidden', 'true');
    root.document.body.classList.remove('fusion-composer-open');
    if (lastFocus && typeof lastFocus.focus === 'function') lastFocus.focus();
    lastFocus = null;
  }

  function protectedOpen() {
    const auth = root.VVIP_AUTH;
    if (!auth || typeof auth.requireAuth !== 'function') {
      setStatus('تعذر التحقق من هوية الحساب بأمان.', true);
      return;
    }
    auth.requireAuth({ name: 'CREATE_LISTING' }, open).catch(function () {
      const current = ensureLayer();
      current.hidden = false;
      current.setAttribute('aria-hidden', 'false');
      setStatus('تعذر فتح جلسة إنشاء الإعلان الآمنة.', true);
    });
  }

  function bindLayer() {
    if (!layer || !form) return;
    layer.addEventListener('click', function (event) {
      if (event.target.closest('[data-fusion-composer-close]')) { close(); return; }
      if (event.target.closest('[data-fusion-save-draft]')) saveDraft();
    });
    form.addEventListener('submit', function (event) {
      event.preventDefault();
      if (!saveDraft()) return;
      setStatus('المسودة جاهزة محليًا. النشر الفعلي سيبقى محجوبًا حتى يؤكد الخادم الوسائط والبيانات.', false);
    });
    root.document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && layer && !layer.hidden) close();
    });
  }

  function bindTriggers() {
    root.document.addEventListener('click', function (event) {
      const trigger = event.target.closest('[data-fusion-composer-trigger]');
      if (!trigger) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      protectedOpen();
    }, true);
  }

  bindTriggers();
  root.VVIPFusionComposer = Object.freeze({ open: protectedOpen, close, saveDraft, enabledSectors, LOCAL_DRAFT_ONLY });
})(window);
