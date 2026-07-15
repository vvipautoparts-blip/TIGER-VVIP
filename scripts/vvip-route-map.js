(function () {
  "use strict";

  if (window.VVIP_P02_ROUTE_MAP) return;

  function phaseFallback() {
    return {
      ar: "هذه الميزة قيد التجهيز وستتوفر ضمن المرحلة المخصصة.",
      en: "This feature is being prepared and will be available in its planned phase."
    };
  }

  var routes = [
    { id: "entry", path: "index.html", target: "index.html", kind: "public", ready: true, status: "active", labels: { ar: "الدخول", en: "Entry" } },
    { id: "home", path: "home.html", target: "home.html", kind: "public", ready: true, status: "active_ui_shell", labels: { ar: "الرئيسية", en: "Home" } },
    { id: "market", path: "market.html", target: "market.html", kind: "public", ready: true, status: "active_ui_shell", labels: { ar: "السوق", en: "Market" } },
    { id: "publicProfile", path: "public-profile.html", target: "public-profile.html", kind: "public", ready: true, status: "active", labels: { ar: "الملف العام", en: "Public Profile" } },
    { id: "privateProfile", path: "clerk-private-profile.html", target: "clerk-private-profile.html", kind: "private", ready: true, status: "protected", labels: { ar: "الحساب", en: "Private Account" } },
    { id: "onboarding", path: null, target: "reserved_for_P04", kind: "private", ready: false, status: "reserved", labels: { ar: "التهيئة", en: "Onboarding" }, reservedFor: "P04", fallbackText: phaseFallback() },
    { id: "createListing", path: "create-listing-preview.html", target: "create-listing-preview.html", kind: "private", ready: true, status: "preview_only", labels: { ar: "إنشاء إعلان", en: "Create Listing" }, reservedFor: "P09", fallbackText: phaseFallback() },
    { id: "listingDetails", path: null, target: "reserved_for_P13", kind: "public", ready: false, status: "preview_only", labels: { ar: "تفاصيل الإعلان", en: "Listing Details" }, reservedFor: "P13", fallbackText: phaseFallback() },
    { id: "messages", path: null, target: "reserved_for_P14", kind: "private", ready: false, status: "disabled", labels: { ar: "الرسائل", en: "Messages" }, reservedFor: "P14", fallbackText: phaseFallback() },
    { id: "sharing", path: null, target: "reserved_for_P15", kind: "private", ready: false, status: "reserved", labels: { ar: "المشاركة", en: "Sharing" }, reservedFor: "P15", fallbackText: phaseFallback() },
    { id: "notifications", path: null, target: "reserved_for_P19", kind: "private", ready: false, status: "disabled", labels: { ar: "الإشعارات", en: "Notifications" }, reservedFor: "P19", fallbackText: phaseFallback() },
    { id: "tigerCare", path: null, target: "reserved_for_P20", kind: "private", ready: false, status: "disabled", labels: { ar: "Tiger Care", en: "Tiger Care" }, reservedFor: "P20", fallbackText: phaseFallback() },
    { id: "menu", path: null, target: "in_shell_panel", kind: "private", ready: true, status: "active", labels: { ar: "القائمة", en: "Menu" }, action: "open-menu" },
    { id: "logout", path: "index.html", target: "safe_clerk_logout", kind: "private", ready: true, status: "existing_action", labels: { ar: "تسجيل الخروج", en: "Logout" }, action: "logout" }
  ];

  function byId(routeId) {
    if (routeId === "discovery") {
      routeId = "market";
    }
    for (var i = 0; i < routes.length; i += 1) {
      if (routes[i].id === routeId) return routes[i];
    }
    return null;
  }

  function normalizePath(pathname) {
    var value = String(pathname || "").trim();
    if (!value || value === "/") return "index.html";
    var clean = value.split("?")[0].split("#")[0];
    var parts = clean.split("/");
    return parts[parts.length - 1] || "index.html";
  }

  window.VVIP_P02_ROUTE_MAP = {
    version: "2026-07-10-p02-authoritative",
    routes: routes,
    byId: byId,
    normalizePath: normalizePath
  };
})();
