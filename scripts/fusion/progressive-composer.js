(function (root) {
  'use strict';

  let layer = null;
  let form = null;
  let mediaController = null;
  let mediaSession = null;
  let lastFocus = null;
  let serverDraft = null;

  function composerError(code, cause) {
    const error = new Error(code);
    error.code = code;
    if (cause) error.cause = cause;
    return error;
  }

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

  function markup() {
    return `<div class="fusion-composer-layer" data-fusion-composer-layer aria-hidden="true" hidden>
      <button class="fusion-composer-backdrop" type="button" data-fusion-composer-close aria-label="إغلاق إنشاء الإعلان"></button>
      <section class="fusion-composer-panel" role="dialog" aria-modal="true" aria-labelledby="fusion-composer-title" tabindex="-1">
        <header class="fusion-composer-panel__header">
          <div><span class="eyebrow">VVIP TIGER</span><h2 id="fusion-composer-title">ماذا تريد أن تعرض؟</h2><p>أكمل المحتوى والصور، راجع البيانات، ثم أرسلها للمراجعة. الظهور المدفوع خدمة مستقلة بعد أهلية المحتوى.</p></div>
          <button class="fusion-icon-button" type="button" data-fusion-composer-close aria-label="إغلاق">×</button>
        </header>
        <form class="fusion-progressive-form" data-fusion-progressive-form novalidate>
          <section class="fusion-composer-media" data-fusion-composer-media aria-label="صور الإعلان"></section>
          <div class="fusion-progressive-grid">
            <label class="fusion-field fusion-field--wide"><span>العنوان</span><input name="title" maxlength="80" autocomplete="off" required placeholder="ما الذي تعرضه؟"></label>
            <label class="fusion-field"><span>القطاع</span><select name="sector" required>${sectorOptions()}</select></label>
            <label class="fusion-field"><span>الفئة</span><input name="category" maxlength="100" autocomplete="off" required placeholder="الفئة أو التصنيف"></label>
            <label class="fusion-field"><span>نوع السعر</span><select name="priceType" required><option value="fixed">سعر ثابت</option><option value="negotiable">قابل للتفاوض</option></select></label>
            <label class="fusion-field"><span>السعر</span><input name="price" inputmode="decimal" maxlength="24" autocomplete="off" required placeholder="0.00"></label>
            <label class="fusion-field"><span>العملة</span><input name="currency" maxlength="3" autocomplete="off" required placeholder="JOD"></label>
            <label class="fusion-field fusion-field--wide"><span>الموقع</span><input name="location" maxlength="120" autocomplete="address-level2" required placeholder="المدينة أو المنطقة"></label>
          </div>
          <div data-fusion-sector-fields aria-live="polite"></div>
          <p class="fusion-composer-status" data-fusion-composer-status role="status" aria-live="polite"></p>
          <div class="fusion-composer-actions">
            <button type="button" data-fusion-save-draft>حفظ المسودة</button>
            <button class="button button--primary" type="submit" data-fusion-submit-review>إرسال للمراجعة</button>
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

  function messageFor(error) {
    const code = error && error.code;
    const messages = {
      FUSION_RUNTIME_UNAVAILABLE: 'الاتصال الآمن بالمنصة غير متاح الآن.',
      FUSION_MARKETPLACE_REPOSITORY_UNAVAILABLE: 'خدمة الإعلانات غير متاحة الآن.',
      LISTING_FIELDS_REQUIRED: 'أكمل الحقول المطلوبة أولًا.',
      LISTING_PRICE_INVALID: 'أدخل سعرًا صحيحًا.',
      LISTING_PRICE_TYPE_INVALID: 'اختر نوع سعر صحيحًا.',
      LISTING_CURRENCY_INVALID: 'أدخل رمز عملة ISO من ثلاثة أحرف.',
      LISTING_COUNTRY_INVALID: 'السوق النشط غير محدد بشكل صحيح.',
      LISTING_CREATE_FAILED: 'تعذر حفظ المسودة الآن.',
      LISTING_SUBMIT_FAILED: 'تعذر إرسال الإعلان للمراجعة الآن.',
      MEDIA_SANITIZED_BLOB_UNAVAILABLE: 'تعذر تجهيز إحدى الصور بأمان.',
      MEDIA_SANITIZED_BLOB_MISMATCH: 'فشل التحقق من إحدى الصور المعالجة.'
    };
    return messages[code] || 'تعذر إكمال العملية بأمان. لم يتم إعلان نجاح غير مؤكد.';
  }

  function mountMedia() {
    const host = layer && layer.querySelector('[data-fusion-composer-media]');
    if (!host || mediaController) return;
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
        serverDraft = null;
        const count = snapshot && Array.isArray(snapshot.images) ? snapshot.images.length : 0;
        setStatus(count ? `${count} صور مطهّرة جاهزة.` : '', false);
      }
    });
  }

  function currencyFraction(currency) {
    try {
      return new Intl.NumberFormat('en', { style: 'currency', currency: currency }).resolvedOptions().maximumFractionDigits;
    } catch (_) {
      throw composerError('LISTING_CURRENCY_INVALID');
    }
  }

  function moneyToMinor(value, currency) {
    const code = text(currency, 3).toUpperCase();
    if (!/^[A-Z]{3}$/.test(code)) throw composerError('LISTING_CURRENCY_INVALID');
    const fraction = currencyFraction(code);
    const normalized = String(value == null ? '' : value)
      .trim()
      .replace(/[٠-٩]/g, function (digit) { return '٠١٢٣٤٥٦٧٨٩'.indexOf(digit); })
      .replace(/[۰-۹]/g, function (digit) { return '۰۱۲۳۴۵۶۷۸۹'.indexOf(digit); })
      .replace(/[٬,\s]/g, '')
      .replace(/٫/g, '.');
    const pattern = fraction === 0 ? /^\d+$/ : new RegExp('^\\d+(?:\\.\\d{1,' + fraction + '})?$');
    if (!pattern.test(normalized)) throw composerError('LISTING_PRICE_INVALID');
    const parts = normalized.split('.');
    const whole = parts[0].replace(/^0+(?=\d)/, '') || '0';
    const decimals = (parts[1] || '').padEnd(fraction, '0');
    const minor = BigInt(whole + decimals);
    if (minor <= 0n || minor > BigInt(Number.MAX_SAFE_INTEGER)) throw composerError('LISTING_PRICE_INVALID');
    return Number(minor);
  }

  function formPayload(runtime) {
    const data = new root.FormData(form);
    const title = text(data.get('title'), 80);
    const sector = text(data.get('sector'), 80);
    const category = text(data.get('category'), 100);
    const priceType = text(data.get('priceType'), 24).toLowerCase();
    const location = text(data.get('location'), 120);
    const currencyCode = text(data.get('currency'), 3).toUpperCase();
    const country = text(root.VVIP_ACTIVE_MARKET_COUNTRY || (runtime && runtime.config && runtime.config.defaultCountryCode), 2).toUpperCase();
    if (!title || !sector || !category || !location) throw composerError('LISTING_FIELDS_REQUIRED');
    if (!['fixed', 'negotiable'].includes(priceType)) throw composerError('LISTING_PRICE_TYPE_INVALID');
    if (!/^[A-Z]{2}$/.test(country)) throw composerError('LISTING_COUNTRY_INVALID');
    return Object.freeze({
      title: title,
      sector: sector,
      location: location,
      activeMarketCountry: country,
      priceMinor: moneyToMinor(data.get('price'), currencyCode),
      currencyCode: currencyCode,
      specifications: Object.freeze({ category: category, priceType: priceType })
    });
  }

  async function sanitizedMedia() {
    if (!mediaSession) return [];
    const metadata = mediaSession.displaySnapshot();
    const previews = mediaSession.previewSnapshot();
    const images = Array.isArray(metadata.images) ? metadata.images.slice(0, Math.min(metadata.images.length, 7)) : [];
    const output = [];
    for (const item of images) {
      const preview = previews.find(function (entry) { return entry.imageId === item.imageId; });
      if (!preview || !preview.url) throw composerError('MEDIA_SANITIZED_BLOB_UNAVAILABLE');
      const response = await root.fetch(preview.url);
      if (!response || !response.ok) throw composerError('MEDIA_SANITIZED_BLOB_UNAVAILABLE');
      const blob = await response.blob();
      if (!blob || blob.type !== item.mimeType || blob.size !== item.sizeBytes) throw composerError('MEDIA_SANITIZED_BLOB_MISMATCH');
      output.push(Object.freeze({
        blob: blob,
        mimeType: item.mimeType,
        width: item.width,
        height: item.height,
        altText: item.altText || 'صورة الإعلان',
        isCover: item.imageId === metadata.coverImageId
      }));
    }
    return output;
  }

  async function marketplaceContext() {
    const context = root.VVIPFusionMarketplaceContext;
    if (!context || typeof context.ready !== 'function') throw composerError('FUSION_RUNTIME_UNAVAILABLE');
    return context.ready();
  }

  async function ensureServerDraft() {
    if (serverDraft && serverDraft.listing_id) return serverDraft;
    if (!form.reportValidity()) throw composerError('LISTING_FIELDS_REQUIRED');
    const context = await marketplaceContext();
    if (!context.repository || typeof context.repository.createDraftWithMedia !== 'function') {
      throw composerError('FUSION_MARKETPLACE_REPOSITORY_UNAVAILABLE');
    }
    const payload = formPayload(context.runtime);
    const images = await sanitizedMedia();
    setStatus('جاري حفظ المسودة الآمنة على الخادم…', false);
    serverDraft = await context.repository.createDraftWithMedia(payload, images);
    if (!serverDraft || !serverDraft.listing_id) throw composerError('LISTING_CREATE_FAILED');
    setStatus('تم حفظ المسودة على الخادم. لم تظهر للعامة بعد.', false);
    root.dispatchEvent(new root.CustomEvent('vvip:fusion-server-draft-saved', { detail: { listingId: serverDraft.listing_id } }));
    return serverDraft;
  }

  async function saveDraft() {
    try {
      await ensureServerDraft();
      return true;
    } catch (error) {
      setStatus(messageFor(error), true);
      return false;
    }
  }

  async function submitForReview() {
    const draft = await ensureServerDraft();
    const context = await marketplaceContext();
    if (!context.repository || typeof context.repository.submitForReview !== 'function') {
      throw composerError('FUSION_MARKETPLACE_REPOSITORY_UNAVAILABLE');
    }
    setStatus('جاري إرسال الإعلان للمراجعة…', false);
    const result = await context.repository.submitForReview(draft.listing_id);
    if (!result || result.status !== 'PENDING_REVIEW') throw composerError('LISTING_SUBMIT_FAILED');
    setStatus('تم إرسال الإعلان للمراجعة. سيظهر للعامة بعد الاعتماد فقط.', false);
    root.dispatchEvent(new root.CustomEvent('vvip:fusion-review-submitted', { detail: { listingId: draft.listing_id, status: result.status } }));
    return result;
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
      ensureLayer();
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
      if (event.target.closest('[data-fusion-save-draft]')) {
        saveDraft().catch(function (error) { setStatus(messageFor(error), true); });
      }
    });
    form.addEventListener('input', function () { serverDraft = null; });
    form.addEventListener('submit', function (event) {
      event.preventDefault();
      submitForReview().catch(function (error) { setStatus(messageFor(error), true); });
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
  root.VVIPFusionComposer = Object.freeze({
    open: protectedOpen,
    close: close,
    saveDraft: saveDraft,
    submitForReview: submitForReview,
    enabledSectors: enabledSectors
  });
})(window);
