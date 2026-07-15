(function () {
  "use strict";

  if (window.__VVIP_P02_APP_SHELL_BOOTED__) return;
  window.__VVIP_P02_APP_SHELL_BOOTED__ = true;

  var routeMap = window.VVIP_P02_ROUTE_MAP;
  if (!routeMap || !Array.isArray(routeMap.routes)) return;
  if (!document.body || document.body.classList.contains("fb-auth-page")) return;
  if (document.body.dataset.vvipShellInitialized === "true") return;

  var isArabic = (document.documentElement.getAttribute("lang") || "ar").toLowerCase().indexOf("ar") === 0;
  var currentFile = routeMap.normalizePath(window.location.pathname);

  function toRoute(routeId) {
    return routeMap.byId(routeId) || null;
  }

  function t(bundle) {
    if (!bundle || typeof bundle !== "object") return String(bundle || "");
    return String(isArabic ? (bundle.ar || bundle.en || "") : (bundle.en || bundle.ar || ""));
  }

  function icon(name) {
    var map = {
      home: "⌂",
      market: "⌕",
      create: "＋",
      messages: "◇",
      notifications: "◌",
      menu: "☰",
      profile: "◍",
      search: "⌕",
      logo: "VT"
    };
    return map[name] || "•";
  }

  function safeLink(link) {
    if (!link || !link.getAttribute) return;
    var target = String(link.getAttribute("target") || "").toLowerCase();
    if (target !== "_blank") return;
    var rel = String(link.getAttribute("rel") || "");
    var merged = (rel + " noopener noreferrer").trim().split(/\s+/).filter(Boolean);
    var unique = [];
    for (var i = 0; i < merged.length; i += 1) {
      if (unique.indexOf(merged[i]) === -1) unique.push(merged[i]);
    }
    link.setAttribute("rel", unique.join(" "));
  }

  function secureExternalLinks() {
    var links = document.querySelectorAll("a[target='_blank']");
    links.forEach(safeLink);
  }

  function resolveRouteFromHref(href) {
    var file = routeMap.normalizePath(href);
    if (file === "index.html") return "entry";
    if (file === "home.html") return "home";
    if (file === "market.html") return "market";
    if (file === "create-listing-preview.html") return "createListing";
    if (file === "public-profile.html") return "publicProfile";
    if (file === "clerk-private-profile.html") return "privateProfile";
    return null;
  }

  function markActive(navRoot) {
    if (!navRoot) return;
    var items = navRoot.querySelectorAll("a[href]");
    items.forEach(function (item) {
      var href = String(item.getAttribute("href") || "");
      var file = routeMap.normalizePath(href);
      if (file === currentFile) {
        item.setAttribute("aria-current", "page");
      } else if (item.getAttribute("aria-current") === "page") {
        item.removeAttribute("aria-current");
      }
    });
  }

  function routeLabel(routeId) {
    var route = toRoute(routeId);
    if (!route) return "";
    return t(route.labels);
  }

  function showMessage(text) {
    var root = document.getElementById("vvip-shell-toast");
    if (!root) {
      root = document.createElement("div");
      root.id = "vvip-shell-toast";
      root.className = "vvip-shell-toast";
      document.body.appendChild(root);
    }
    root.textContent = text;
    root.classList.add("is-visible");
    window.clearTimeout(window.__VVIP_SHELL_TOAST_TIMER__);
    window.__VVIP_SHELL_TOAST_TIMER__ = window.setTimeout(function () {
      root.classList.remove("is-visible");
    }, 2200);
  }

  function decorateNavItems(navRoot) {
    if (!navRoot) return;

    var links = navRoot.querySelectorAll("a[href]");
    links.forEach(function (link) {
      var routeId = resolveRouteFromHref(link.getAttribute("href"));
      if (!routeId) return;
      link.setAttribute("data-route-id", routeId);
      if (!link.getAttribute("aria-label")) {
        link.setAttribute("aria-label", routeLabel(routeId));
      }
      if (!link.getAttribute("title")) {
        link.setAttribute("title", routeLabel(routeId));
      }
    });

    var buttons = navRoot.querySelectorAll("button[data-route-id], [data-route-id][role='button']");
    buttons.forEach(function (button) {
      var route = routeMap.byId(button.getAttribute("data-route-id"));
      if (!route) return;
      if (route.ready === false) {
        button.setAttribute("aria-disabled", "true");
        button.disabled = true;
        if (!button.getAttribute("title")) {
          button.setAttribute("title", t(route.fallbackText || { ar: "قريبًا", en: "Coming later" }));
        }
      }
      if (!button.getAttribute("aria-label")) {
        button.setAttribute("aria-label", t(route.labels));
      }
    });
  }

  function bindKeyboard(navRoot) {
    if (!navRoot || navRoot.dataset.vvipKbBound === "1") return;
    navRoot.dataset.vvipKbBound = "1";
    navRoot.addEventListener("keydown", function (event) {
      if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
      var nodes = Array.prototype.slice.call(navRoot.querySelectorAll("a,button"));
      if (!nodes.length) return;
      var index = nodes.indexOf(document.activeElement);
      if (index < 0) return;
      event.preventDefault();
      var dir = event.key === "ArrowRight" ? -1 : 1;
      if (document.documentElement.dir === "ltr") dir *= -1;
      var next = (index + dir + nodes.length) % nodes.length;
      nodes[next].focus();
    });
  }

  function makeButton(route, icon) {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "vvip-shell-nav-item";
    btn.setAttribute("aria-label", t(route.labels) + " - " + t(route.fallbackText || { ar: "قريبًا", en: "Coming later" }));
    btn.setAttribute("aria-disabled", "true");
    btn.setAttribute("data-route-id", route.id);
    btn.title = t(route.fallbackText || { ar: "قريبًا", en: "Coming later" });

    var iconNode = document.createElement("span");
    iconNode.className = "vvip-shell-icon";
    iconNode.textContent = icon;
    var label = document.createElement("span");
    label.className = "vvip-shell-label";
    label.textContent = t(route.labels);
    btn.appendChild(iconNode);
    btn.appendChild(label);
    return btn;
  }

  function makeLink(route, icon) {
    var link = document.createElement("a");
    link.className = "vvip-shell-nav-item";
    link.href = route.path;
    link.setAttribute("data-route-id", route.id);
    link.setAttribute("aria-label", t(route.labels));
    link.setAttribute("title", t(route.labels));

    var iconNode = document.createElement("span");
    iconNode.className = "vvip-shell-icon";
    iconNode.textContent = icon;
    var label = document.createElement("span");
    label.className = "vvip-shell-label";
    label.textContent = t(route.labels);
    link.appendChild(iconNode);
    link.appendChild(label);
    return link;
  }

  function renderHeader() {
    if (document.querySelector(".vvip-shell-header")) return;

    var header = document.createElement("header");
    header.className = "vvip-shell-header";
    header.innerHTML =
      '<div class="vvip-shell-header__right">' +
      '  <a class="vvip-shell-logo" href="home.html" aria-label="VVIP TIGER">' + icon("logo") + '</a>' +
      '  <a class="vvip-shell-search" href="market.html" aria-label="بحث موحد" title="بحث موحد">' +
      '    <span>' + icon("search") + '</span><span>' + (isArabic ? 'ابحث في السوق الموحد' : 'Search unified marketplace') + '</span>' +
      '  </a>' +
      '</div>' +
      '<nav class="vvip-shell-header__center" aria-label="Primary Navigation">' +
      '  <a href="home.html" data-route-id="home" title="' + routeLabel("home") + '" aria-label="' + routeLabel("home") + '"><span class="vvip-shell-icon">' + icon("home") + '</span></a>' +
      '  <a href="market.html" data-route-id="market" title="' + routeLabel("market") + '" aria-label="' + routeLabel("market") + '"><span class="vvip-shell-icon">' + icon("market") + '</span></a>' +
      '  <a href="create-listing-preview.html" data-route-id="createListing" title="' + routeLabel("createListing") + '" aria-label="' + routeLabel("createListing") + '"><span class="vvip-shell-icon">' + icon("create") + '</span></a>' +
      '  <button type="button" data-route-id="messages" title="' + routeLabel("messages") + '"><span class="vvip-shell-icon">' + icon("messages") + '</span></button>' +
      '  <button type="button" data-route-id="notifications" title="' + routeLabel("notifications") + '"><span class="vvip-shell-icon">' + icon("notifications") + '</span></button>' +
      '</nav>' +
      '<div class="vvip-shell-header__left">' +
      '  <button class="vvip-shell-icon-btn" type="button" data-route-id="menu" aria-label="القائمة" title="القائمة">' + icon("menu") + '</button>' +
      '  <button class="vvip-shell-icon-btn" type="button" data-vvip-account-toggle aria-label="قائمة الحساب" title="قائمة الحساب">' + icon("profile") + '</button>' +
      '</div>';
    document.body.prepend(header);

    var menu = document.createElement("section");
    menu.className = "vvip-shell-account-menu";
    menu.setAttribute("aria-hidden", "true");
    menu.innerHTML =
      '<a href="public-profile.html">' + (isArabic ? 'عرض الملف العام' : 'Public Profile') + '</a>' +
      '<a href="clerk-private-profile.html">' + (isArabic ? 'إدارة الحساب والملف الخاص' : 'Private Account Management') + '</a>' +
      '<a href="clerk-private-profile.html#settings">' + (isArabic ? 'إعدادات الحساب' : 'Account Settings') + '</a>' +
      '<button type="button" data-route-id="onboarding">' + (isArabic ? 'نوع الحساب (قيد التجهيز)' : 'Account Type (Coming Later)') + '</button>' +
      '<button type="button" data-vvip-lang-toggle>' + (isArabic ? 'اللغة' : 'Language') + '</button>' +
      '<a href="privacy-policy.html">' + (isArabic ? 'الخصوصية' : 'Privacy') + '</a>' +
      '<button type="button" data-route-id="listingDetails">' + (isArabic ? 'المحفوظات' : 'Saved Items') + '</button>' +
      '<button type="button" data-route-id="tigerCare">' + (isArabic ? 'Tiger Care (قيد التجهيز)' : 'Tiger Care (Coming Later)') + '</button>' +
      '<a href="terms-of-service.html">' + (isArabic ? 'المساعدة' : 'Help') + '</a>' +
      '<button type="button" data-vvip-route-action="logout">' + routeLabel("logout") + '</button>';
    document.body.appendChild(menu);
  }

  function isCandidateBottomNav(node) {
    if (!node) return false;
    return node.matches(".bottom-nav, .vvip-shell-bottom-nav, [data-vvip-mobile-nav], nav[aria-label*='الهاتف'], nav[aria-label*='mobile'], nav[aria-label*='Bottom']");
  }

  function buildBottomNav() {
    var nav = document.createElement("nav");
    nav.className = "vvip-shell-bottom-nav";
    nav.setAttribute("data-vvip-mobile-nav", "1");
    nav.setAttribute("aria-label", isArabic ? "التنقل الرئيسي للهاتف" : "Mobile primary navigation");

    var homeRoute = routeMap.byId("home");
    var discoveryRoute = routeMap.byId("market");
    var profileRoute = routeMap.byId("publicProfile");
    var createRoute = routeMap.byId("createListing");
    var messagesRoute = routeMap.byId("messages");

    var items = [
      { route: homeRoute, icon: icon("home") },
      { route: discoveryRoute, icon: icon("market") },
      { route: createRoute, icon: icon("create") },
      { route: messagesRoute, icon: icon("messages") },
      { route: profileRoute, icon: icon("profile") }
    ];

    items.forEach(function (item) {
      var route = item.route;
      if (!route) return;
      var node = route.ready && route.path ? makeLink(route, item.icon) : makeButton(route, item.icon);
      nav.appendChild(node);
    });

    return nav;
  }

  function ensureSingleBottomNav() {
    if (document.body && document.body.classList.contains("fb-auth-page")) {
      return;
    }

    var allNavs = Array.prototype.slice.call(document.querySelectorAll("nav"));
    var candidates = allNavs.filter(isCandidateBottomNav);

    if (!candidates.length) {
      var created = buildBottomNav();
      document.body.appendChild(created);
      candidates = [created];
    }

    var primary = candidates[0];
    if (!primary.classList.contains("vvip-shell-bottom-nav")) {
      primary.classList.add("vvip-shell-bottom-nav");
    }
    document.body.classList.add("vvip-shell-has-bottom-nav");

    for (var i = 1; i < candidates.length; i += 1) {
      candidates[i].setAttribute("aria-hidden", "true");
      candidates[i].style.display = "none";
    }

    decorateNavItems(primary);
    markActive(primary);
    bindKeyboard(primary);
  }

  function bindActionsOnce() {
    if (document.body.dataset.vvipRouteActionsBound === "1") return;
    document.body.dataset.vvipRouteActionsBound = "1";

    document.addEventListener("click", function (event) {
      var target = event.target && event.target.closest ? event.target.closest("[data-vvip-route-action]") : null;
      if (!target) return;

      var action = target.getAttribute("data-vvip-route-action");
      if (action !== "logout") return;

      event.preventDefault();
      Promise.resolve()
        .then(function () {
          if (window.Clerk && typeof window.Clerk.signOut === "function") {
            return window.Clerk.signOut();
          }
          return null;
        })
        .catch(function () {
          return null;
        })
        .finally(function () {
          window.location.href = "index.html";
        });
    }, true);

    document.addEventListener("click", function (event) {
      var disabledTarget = event.target && event.target.closest ? event.target.closest("[data-route-id]") : null;
      if (!disabledTarget) return;
      var route = toRoute(disabledTarget.getAttribute("data-route-id"));
      if (!route || route.ready !== false) return;
      event.preventDefault();
      showMessage(t(route.fallbackText || { ar: "هذه الميزة قيد التجهيز وستتوفر ضمن المرحلة المخصصة.", en: "This feature is being prepared and will be available in its planned phase." }));
    }, true);

    document.addEventListener("click", function (event) {
      var toggle = event.target && event.target.closest ? event.target.closest("[data-vvip-account-toggle]") : null;
      var menu = document.querySelector(".vvip-shell-account-menu");
      if (!menu) return;
      if (toggle) {
        event.preventDefault();
        var hidden = menu.getAttribute("aria-hidden") !== "false";
        menu.setAttribute("aria-hidden", hidden ? "false" : "true");
        return;
      }
      if (!menu.contains(event.target)) {
        menu.setAttribute("aria-hidden", "true");
      }
    }, true);

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        var menu = document.querySelector(".vvip-shell-account-menu");
        if (menu) menu.setAttribute("aria-hidden", "true");
      }
    });

    window.addEventListener("popstate", function () {
      var menu = document.querySelector(".vvip-shell-account-menu");
      if (menu) menu.setAttribute("aria-hidden", "true");
    });
  }

  function boot() {
    renderHeader();
    secureExternalLinks();
    ensureSingleBottomNav();

    var topNavs = document.querySelectorAll(".vvip-shell-header__center, .vvip-nav, .fb-topbar-nav, .vvip-journey-bar");
    topNavs.forEach(function (nav) {
      decorateNavItems(nav);
      markActive(nav);
      bindKeyboard(nav);
    });

    bindActionsOnce();
    document.body.dataset.vvipShellInitialized = "true";
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
