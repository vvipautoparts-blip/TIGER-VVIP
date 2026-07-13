(function () {
  "use strict";
  window.VVIP_P03_ROUTES = Object.freeze({
    home: { label: "الرئيسية", href: "index.html", available: true },
    marketplace: { label: "السوق", href: "index.html#marketplace", available: true },
    search: { label: "البحث", href: "index.html#search", available: true },
    create: { label: "إنشاء إعلان", href: null, available: true, action: "openCreateListing" },
    createListing: { label: "إنشاء إعلان", href: null, available: true, action: "openCreateListing" },
    createListingShell: { label: "إنشاء إعلان", href: null, available: true, action: "openCreateListing" },
    draftPreview: { label: "معاينة المسودة", href: null, available: true, action: "openDraftPreview" },
    publishReadiness: { label: "جاهزية النشر", href: null, available: true, action: "openPublishReadiness" },
    validateDraft: { label: "فحص المسودة", href: null, available: true, action: "validateDraft" },
    resumeDraft: { label: "متابعة المسودة", href: null, available: true, action: "resumeDraft" },
    listingDetails: { label: "تفاصيل الإعلان", href: null, available: false },
    account: { label: "حسابي", href: "private-profile-p03.html", available: true },
    private: { label: "حسابي", href: "private-profile-p03.html", available: true },
    notifications: { label: "الإشعارات", href: null, available: false }
  });
})();
