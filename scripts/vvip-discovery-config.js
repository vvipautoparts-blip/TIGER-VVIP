window.VVIP_DISCOVERY_CONFIG = Object.freeze({
  version: "1.0.0",
  defaultSector: "all",
  pageSize: 12,
  debounceMs: 220,
  storageKey: "vvip.discovery.filters.v1",
  nav: [
    {
      id: "home",
      label: "الرئيسية",
      icon: "⌂",
      href: "index.html",
      enabled: true,
    },
    {
      id: "search",
      label: "البحث",
      icon: "⌕",
      href: "index.html#vvip-discovery",
      enabled: true,
    },
    {
      id: "create",
      label: "إضافة",
      icon: "＋",
      href: "",
      enabled: false,
    },
    {
      id: "notifications",
      label: "الإشعارات",
      icon: "♢",
      href: "",
      enabled: false,
    },
    {
      id: "profile",
      label: "حسابي",
      icon: "○",
      href: "private-profile.html",
      enabled: true,
    },
  ],
});
