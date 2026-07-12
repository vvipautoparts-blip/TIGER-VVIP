(function () {
  "use strict";

  const unavailable = "index.html?reason=route_unavailable";

  window.VVIP_P03_ROUTES = Object.freeze({
    home: {
      label: "الرئيسية",
      href: "index.html",
      available: true
    },
    market: {
      label: "السوق",
      href: unavailable + "&route=market",
      available: false
    },
    create: {
      label: "إنشاء إعلان",
      href: unavailable + "&route=create-listing",
      available: false
    },
    listingDetails: {
      label: "تفاصيل المنشور",
      href: unavailable + "&route=listing-details",
      available: false
    },
    notifications: {
      label: "الإشعارات",
      href: unavailable + "&route=notifications",
      available: false
    },
    profile: {
      label: "حسابي",
      href: "private-profile-p03.html",
      available: true
    }
  });
})();
