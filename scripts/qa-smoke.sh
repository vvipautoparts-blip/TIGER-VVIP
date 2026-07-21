#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

echo "[smoke] validating PR29 replacement files"
for file in \
  index.html \
  auth-clerk-index.js \
  private-profile-p03.html \
  scripts/vvip-pr29-home-marketplace.js \
  scripts/vvip-pr30-resilience.js \
  scripts/vvip-pr31-create-listing-shell.js \
  scripts/vvip-pr32-draft-preview.js \
  scripts/vvip-pr33-publish-readiness.js \
  scripts/qa-pr33-accessibility.sh \
  styles/vvip-pr29-home-marketplace.css \
  styles/vvip-pr31-create-listing-shell.css \
  styles/vvip-pr32-draft-preview.css \
  styles/vvip-pr33-publish-readiness.css \
  scripts/vvip-p03-route-map.js \
  sw.js; do
  [[ -f "$file" ]] || {
    echo "[smoke][fail] missing required file: $file"
    exit 1
  }
done

echo "[smoke] validating legacy UI files are absent"
python3 <<'PY_FILES'
from pathlib import Path

legacy = [
    Path("scripts") / ("vvip-" + "discovery-shell.js"),
    Path("scripts") / ("vvip-" + "discovery-config.js"),
    Path("styles") / ("vvip-" + "discovery-shell.css"),
    Path("social" + "-ui.js"),
    Path("public" + "-profile.html"),
    Path("public" + "-profile-p03.html"),
]

remaining = [str(path) for path in legacy if path.exists()]
if remaining:
    raise SystemExit(
        "[smoke][fail] legacy files remain: " + ", ".join(remaining)
    )
PY_FILES

echo "[smoke] validating canonical index markers and assets"
python3 <<'PY_INDEX'
from pathlib import Path

text = Path("index.html").read_text(encoding="utf-8")
markers = [
    "data-vvip-pr29-app",
    "data-vvip-auth-gate",
    "data-vvip-unified-home",
    "data-vvip-marketplace-feed",
    "data-vvip-sector-filters",
    "data-vvip-listing-detail-sheet",
]

for marker in markers:
    if marker not in text:
        raise SystemExit(f"[smoke][fail] missing index marker: {marker}")

required_assets = [
    "styles/vvip-pr29-home-marketplace.css",
    "styles/vvip-pr31-create-listing-shell.css",
    "styles/vvip-pr32-draft-preview.css",
    "styles/vvip-pr33-publish-readiness.css",
    "scripts/vvip-pr29-home-marketplace.js",
    "scripts/vvip-pr30-resilience.js",
    "scripts/vvip-pr31-create-listing-shell.js",
    "scripts/vvip-pr32-draft-preview.js",
    "scripts/vvip-pr33-publish-readiness.js",
]

for asset in required_assets:
    if asset not in text:
        raise SystemExit(f"[smoke][fail] index does not load: {asset}")

accessibility_contract = [
    'aria-label="البحث في إعلانات السوق"',
    "data-results-count",
    "data-empty-state",
    "data-reset-listings",
    "data-network-notice",
    "listing-skeleton",
]

for contract in accessibility_contract:
    if contract not in text:
        raise SystemExit(f"[smoke][fail] missing home accessibility contract: {contract}")

forbidden_assets = [
    "vvip-" + "discovery-shell",
    "vvip-" + "discovery-config",
    "social" + "-ui",
]

for asset in forbidden_assets:
    if asset.lower() in text.lower():
        raise SystemExit(f"[smoke][fail] index loads legacy asset: {asset}")

styles = Path("styles/vvip-pr29-home-marketplace.css").read_text(
    encoding="utf-8"
).lower()
facebook_like_contract = [
    "--bg: #f0f2f5;",
    "--surface: #ffffff;",
    "--fb-blue: #1877f2;",
    "padding: 24px 16px 12px;",
    "aspect-ratio: 4 / 3;",
    "background: var(--fb-blue);",
    "grid-template-columns: repeat(3, minmax(0, 1fr));",
]
for contract in facebook_like_contract:
    if contract not in styles:
        raise SystemExit(
            f"[smoke][fail] missing Facebook-like home contract: {contract}"
        )
PY_INDEX

echo "[smoke] validating runtime hooks and nine listing seeds"
python3 <<'PY_RUNTIME'
from pathlib import Path
import re

text = Path("scripts/vvip-pr29-home-marketplace.js").read_text(
    encoding="utf-8"
)

hooks = [
    "data-sector-filter",
    "data-listing-card",
    "data-listing-details",
    "data-listing-interest",
    "data-listing-contact",
    "data-listing-private-share",
]

for hook in hooks:
    if hook not in text:
        raise SystemExit(f"[smoke][fail] missing runtime hook: {hook}")

behaviors = [
    ".concat(item.specs)",
    "تم تسجيل اهتمامك مبدئيًا.",
    "التواصل الرسمي داخل VVIP TIGER قيد التجهيز.",
    "المشاركة الخاصة قيد التجهيز داخل المنصة.",
    "هذه الميزة قيد التجهيز ضمن VVIP TIGER.",
    "lastFocusedElement",
    'setAttribute("aria-hidden", "false")',
    'setAttribute("aria-hidden", "true")',
    "function updateInterestButtons",
    "state.interests.delete(id)",
    "function resetListings",
    "SEARCH_DEBOUNCE_MS = 180",
    "clearTimeout(searchTimer)",
]
for behavior in behaviors:
    if behavior not in text:
        raise SystemExit(f"[smoke][fail] missing home behavior: {behavior}")

ids = re.findall(
    r'\bid:\s*"((?:auto|materials|real)-[^" ]+)"',
    text,
)

if len(ids) != 9 or len(set(ids)) != 9:
    raise SystemExit(
        f"[smoke][fail] expected nine unique listing seeds, found {len(ids)}"
    )
PY_RUNTIME

echo "[smoke] validating account center contract"
python3 <<'PY_ACCOUNT'
from pathlib import Path
import re

html = Path("private-profile-p03.html").read_text(encoding="utf-8")
runtime = Path("scripts/vvip-p03-profile.js").read_text(encoding="utf-8")
signout = Path("scripts/vvip-p03-sign-out.js").read_text(encoding="utf-8")

markers = [
    "data-vvip-account-center",
    "data-vvip-private-owner-only",
    "data-vvip-account-actions",
    "data-vvip-my-listings",
    "data-vvip-account-security",
    "data-vvip-tiger-care-entry",
    "data-network-notice",
    "scripts/vvip-pr30-resilience.js",
]
for marker in markers:
    if marker not in html:
        raise SystemExit(f"[smoke][fail] missing account marker: {marker}")

hooks = [
    "data-account-action",
    "data-preview-listing",
    "data-coming-soon",
    "data-scroll-target",
    "data-close-sheet",
    "data-account-nav",
]
for hook in hooks:
    if hook not in html + runtime:
        raise SystemExit(f"[smoke][fail] missing account action hook: {hook}")

required_copy = ["مركز الحساب الخاص", "إدارة حسابك وإعلاناتك داخل المنصة الموحدة."]
for text in required_copy:
    if text not in html:
        raise SystemExit(f"[smoke][fail] missing account copy: {text}")

account_behaviors = [
    "previewAllowed",
    "lastFocusedElement",
    "تعديل الإعلان قيد التجهيز.",
    "إيقاف الإعلان قيد التجهيز.",
    "الإشعارات قيد التجهيز ضمن VVIP TIGER.",
]

for behavior in account_behaviors:
    if behavior not in runtime:
        raise SystemExit(f"[smoke][fail] missing account behavior: {behavior}")

signout_preview_contract = [
    "localPreviewAllowed",
    "if (localPreviewAllowed()) return;",
]

for contract in signout_preview_contract:
    if contract not in signout:
        raise SystemExit(f"[smoke][fail] sign-out guard blocks local preview: {contract}")

preview_guards = {
    "scripts/vvip-p03-profile.js": 'return isLocalHost && preview === "account";',
    "scripts/vvip-p03-sign-out.js": 'return isLocalHost && preview === "account";',
}

for file, contract in preview_guards.items():
    text = Path(file).read_text(encoding="utf-8")
    if contract not in text:
        raise SystemExit(f"[smoke][fail] preview is not localhost-only: {file}")

styles = Path("styles/vvip-p03-profile.css").read_text(encoding="utf-8")
facebook_like_contract = [
    "--ac-bg: #f0f2f5;",
    "--ac-surface: #ffffff;",
    "--ac-blue: #1877f2;",
]

for contract in facebook_like_contract:
    if contract not in styles:
        raise SystemExit(f"[smoke][fail] missing Facebook-like account contract: {contract}")

if not re.search(
    r"@media\s*\(min-width:\s*700px\).*?\.account-bottom-nav\s*\{\s*display:\s*none;",
    styles,
    re.S,
):
    raise SystemExit("[smoke][fail] account bottom nav is not mobile-only")
PY_ACCOUNT

echo "[smoke] validating PR30 resilience contracts"
python3 <<'PY_PR30'
from html.parser import HTMLParser
from pathlib import Path

runtime = Path("scripts/vvip-pr30-resilience.js").read_text(encoding="utf-8")
required = [
    "function safeNavigate",
    "function isSafeTarget",
    "function showFeedback",
    "function guardAction",
    'window.addEventListener("error"',
    'window.addEventListener("unhandledrejection"',
    'window.addEventListener("offline"',
    'window.addEventListener("online"',
    "VVIP_RESILIENCE_RECOVERY",
    "حدث تعذر مؤقت. يمكنك المتابعة من السوق أو الرجوع للرئيسية.",
    "الاتصال ضعيف أو غير متاح. يمكنك متابعة التصفح المحلي مؤقتًا.",
    "window.VVIP_PR30",
    'preview === "home" && isIndex',
]
for contract in required:
    if contract not in runtime:
        raise SystemExit(f"[smoke][fail] missing PR30 resilience contract: {contract}")

unsafe = [
    "java" + "script:",
    "da" + "ta:",
    "ht" + "tp:",
    "ht" + "tps:",
]
for token in unsafe:
    if f'ALLOWED_TARGETS.add("{token}' in runtime:
        raise SystemExit(f"[smoke][fail] unsafe navigation allowlist: {token}")

class Buttons(HTMLParser):
    def __init__(self):
        super().__init__()
        self.unguarded = []

    def handle_starttag(self, tag, attrs):
        if tag != "button":
            return
        keys = {key for key, _ in attrs}
        guarded = {
            "data-coming-soon",
            "data-open-create-listing",
            "data-sector-filter",
            "data-sheet-close",
            "data-reset-listings",
            "data-account-action",
            "data-preview-listing",
            "data-close-sheet",
            "data-open-signout",
            "data-confirm-signout",
            "data-cancel-signout",
            "data-vvip-tiger-care-entry",
            "data-profile-actions-trigger",
            "data-profile-assign",
            "data-profile-suspend",
            "data-profile-revoke",
        }
        if not keys.intersection(guarded):
            self.unguarded.append(sorted(keys))

for page in [Path("index.html"), Path("private-profile-p03.html")]:
    parser = Buttons()
    parser.feed(page.read_text(encoding="utf-8"))
    if parser.unguarded:
        raise SystemExit(f"[smoke][fail] unguarded static button in {page}")

styles = Path("styles/vvip-pr29-home-marketplace.css").read_text(
    encoding="utf-8"
)
for contract in [".network-notice", ".listing-skeleton"]:
    if contract not in styles:
        raise SystemExit(f"[smoke][fail] missing resilience style: {contract}")
PY_PR30

echo "[smoke] validating PR31 create listing safe shell"
python3 <<'PY_PR31'
from pathlib import Path

home = Path("index.html").read_text(encoding="utf-8")
account = Path("private-profile-p03.html").read_text(encoding="utf-8")
runtime = Path("scripts/vvip-pr31-create-listing-shell.js").read_text(
    encoding="utf-8"
)
home_runtime = Path("scripts/vvip-pr29-home-marketplace.js").read_text(
    encoding="utf-8"
)
account_runtime = Path("scripts/vvip-p03-profile.js").read_text(
    encoding="utf-8"
)
styles = Path("styles/vvip-pr31-create-listing-shell.css").read_text(
    encoding="utf-8"
)
resilience = Path("scripts/vvip-pr30-resilience.js").read_text(encoding="utf-8")
routes = Path("scripts/vvip-p03-route-map.js").read_text(encoding="utf-8")
service_worker = Path("sw.js").read_text(encoding="utf-8")

for page_name, page in [("Home", home), ("Account", account)]:
    for asset in [
        "styles/vvip-pr31-create-listing-shell.css",
        "scripts/vvip-pr31-create-listing-shell.js",
    ]:
        if asset not in page:
            raise SystemExit(f"[smoke][fail] {page_name} does not load {asset}")
    if "data-open-create-listing" not in page:
        raise SystemExit(f"[smoke][fail] {page_name} has no create shell trigger")

markers = [
    "data-vvip-create-listing-shell",
    "data-vvip-create-listing-stepper",
    "data-vvip-create-listing-sector-step",
    "data-vvip-create-listing-details-step",
    "data-vvip-create-listing-media-step",
    "data-vvip-create-listing-review-step",
    "data-vvip-create-listing-safe-draft",
    "data-vvip-publishing-readiness-layer",
]
for marker in markers:
    if marker not in runtime:
        raise SystemExit(f"[smoke][fail] missing PR31 marker: {marker}")

behaviors = [
    "vvip_pr31_create_listing_draft",
    "function escapeText",
    "function parseSafePrice",
    "selectedLocalPhotoCount",
    "لا يمكن حفظ المسودة محليًا الآن، لكن يمكنك مراجعة البيانات قبل الإغلاق.",
    "تم حفظ المسودة المحلية وهي جاهزة للمراجعة لاحقًا.",
    "تم حفظ المسودة محليًا، وتحتاج إلى إكمال بعض الحقول.",
    "تعذر فتح نموذج الإعلان مؤقتًا. يمكنك متابعة التصفح والعودة لاحقًا.",
    "هذا النموذج تجريبي آمن ولا ينشر الإعلان الآن.",
    "data-vvip-create-confirmation",
    "data-create-confirm-title",
    "data-create-confirm-message",
    "data-create-confirm-cancel",
    "data-create-confirm-accept",
    "حذف المسودة المحلية؟",
    "سيتم حذف هذه المسودة من هذا الجهاز فقط. لن يتم حذف أي بيانات من المنصة.",
    "إغلاق النموذج؟",
    "قد تفقد البيانات غير المحفوظة. يمكنك الرجوع أو حفظها كمسودة محلية.",
    "متابعة التحرير",
    "إغلاق النموذج",
    'class="vvip-create-confirmation__backdrop" type="button" tabindex="-1"',
]
from pathlib import Path
pr36_active = (
    Path("scripts/media/pr36-controller.js").is_file()
    and Path("docs/launch/pr36/CHANGE_CONTROL_MANIFEST.json").is_file()
)
if pr36_active:
    behaviors.extend(["VVIP_PR36_MEDIA", "photoMetadata", "لا رفع ولا نشر في هذه المرحلة."])
else:
    behaviors.extend(["URL.createObjectURL", "URL.revokeObjectURL", "photoNames", "المعاينة محلية فقط ولن يتم رفع الصور في هذه المرحلة."])
for behavior in behaviors:
    if behavior not in runtime:
        raise SystemExit(f"[smoke][fail] missing PR31 behavior: {behavior}")

for hook in [
    "data-create-next",
    "data-create-back",
    "data-create-close",
    "data-save-local-draft",
    "data-delete-local-draft",
]:
    if hook not in runtime:
        raise SystemExit(f"[smoke][fail] missing PR31 action: {hook}")

if "data:image" in runtime or "readAsDataURL" in runtime:
    raise SystemExit("[smoke][fail] PR31 attempts to persist image data")

for contract in [
    ".vvip-create-layer",
    "aspect-ratio: 4 / 3;",
    "background: #f0f2f5;",
    "#1877f2",
    "@media (max-width: 640px)",
]:
    if contract not in styles.lower():
        raise SystemExit(f"[smoke][fail] missing PR31 visual contract: {contract}")

if "[data-open-create-listing]" not in resilience:
    raise SystemExit("[smoke][fail] PR30 guard does not recognize PR31 triggers")
if 'action: "openCreateListing"' not in routes:
    raise SystemExit("[smoke][fail] route map does not expose internal create action")
if "createListing:" not in routes:
    raise SystemExit("[smoke][fail] route map misses named createListing action")
missing_create_page = "create" + "-listing.html"
if missing_create_page in home + account + runtime + routes:
    raise SystemExit("[smoke][fail] create shell links to a missing page")

retired_create_fallback = "إنشاء الإعلان قيد التجهيز ضمن VVIP TIGER."
if retired_create_fallback in home_runtime + account_runtime:
    raise SystemExit("[smoke][fail] retired create-listing toast remains")

live_runtime_files = [
    Path("scripts/vvip-pr31-create-listing-shell.js"),
    Path("scripts/vvip-pr32-draft-preview.js"),
    Path("scripts/vvip-pr33-publish-readiness.js"),
    Path("scripts/vvip-pr30-resilience.js"),
    Path("scripts/vvip-pr29-home-marketplace.js"),
    Path("scripts/vvip-p03-profile.js"),
    Path("index.html"),
    Path("private-profile-p03.html"),
]
native_dialog_calls = [
    "con" + "firm(",
    "window." + "confirm(",
    "window." + "alert(",
    "window." + "prompt(",
    "ale" + "rt(",
    "pro" + "mpt(",
]
for file in live_runtime_files:
    source = file.read_text(encoding="utf-8", errors="ignore")
    for call in native_dialog_calls:
        if call in source:
            raise SystemExit(f"[smoke][fail] native browser dialog in {file}")

for contract in [
    ".vvip-create-confirmation",
    ".vvip-create-confirmation__card",
    ".vvip-create-danger",
]:
    if contract not in styles:
        raise SystemExit(f"[smoke][fail] missing in-app confirmation style: {contract}")

for hook in ["[data-create-confirm-cancel]", "[data-create-confirm-accept]"]:
    if hook not in resilience:
        raise SystemExit(f"[smoke][fail] PR30 guard blocks confirmation action: {hook}")

if 'CACHE_NAME = CACHE_PREFIX + "v21"' not in service_worker:
    raise SystemExit("[smoke][fail] PR31 confirmation cache was not invalidated")
PY_PR31

node <<'JS_PR31_HELPERS'
const assert = require("node:assert/strict");
const helpers = require("./scripts/vvip-pr31-create-listing-shell.js");

assert.equal(helpers.escapeText("  عنوان <script>alert(1)</script> آمن  "), "عنوان alert(1) آمن");
assert.equal(helpers.parseSafePrice("1250.50"), 1250.5);
assert.equal(helpers.parseSafePrice("0"), null);
assert.equal(helpers.parseSafePrice("12x"), null);
JS_PR31_HELPERS

echo "[smoke] validating PR32 draft preview integration"
python3 <<'PY_PR32'
from pathlib import Path

home = Path("index.html").read_text(encoding="utf-8")
account = Path("private-profile-p03.html").read_text(encoding="utf-8")
runtime = Path("scripts/vvip-pr32-draft-preview.js").read_text(encoding="utf-8")
shell = Path("scripts/vvip-pr31-create-listing-shell.js").read_text(encoding="utf-8")
styles = Path("styles/vvip-pr32-draft-preview.css").read_text(encoding="utf-8").lower()
resilience = Path("scripts/vvip-pr30-resilience.js").read_text(encoding="utf-8")
routes = Path("scripts/vvip-p03-route-map.js").read_text(encoding="utf-8")
service_worker = Path("sw.js").read_text(encoding="utf-8")

for page_name, page in [("Home", home), ("Account", account)]:
    for asset in [
        "styles/vvip-pr32-draft-preview.css",
        "scripts/vvip-pr32-draft-preview.js",
    ]:
        if asset not in page:
            raise SystemExit(f"[smoke][fail] {page_name} does not load {asset}")

markers = [
    "data-vvip-local-draft-preview",
    "data-vvip-local-draft-card",
    "data-vvip-draft-preview-sheet",
    "data-vvip-draft-resume-action",
    "data-vvip-draft-delete-action",
    "data-vvip-draft-empty-state",
]
combined = home + account + runtime
for marker in markers:
    if marker not in combined:
        raise SystemExit(f"[smoke][fail] missing PR32 marker: {marker}")

helpers = [
    "function readLocalDraft",
    "function writeLocalDraft",
    "function clearLocalDraft",
    "function normalizeDraft",
    "function sanitizeDraft",
    "function renderDraftPreview",
]
for helper in helpers:
    if helper not in runtime:
        raise SystemExit(f"[smoke][fail] missing PR32 helper: {helper}")

for storage_contract in ["localStorage.getItem", "localStorage.setItem", "localStorage.removeItem"]:
    if storage_contract not in runtime:
        raise SystemExit(f"[smoke][fail] missing PR32 storage contract: {storage_contract}")

copy = [
    "مسودتك الحالية",
    "مسودة محلية",
    "هذه المسودة محفوظة محليًا على هذا الجهاز فقط.",
    "لم يتم نشر الإعلان بعد.",
    "لن تظهر للمستخدمين حتى يتم تفعيل النشر الحقيقي لاحقًا.",
    "معاينة المسودة",
    "هذه معاينة محلية فقط. لم يتم نشر الإعلان ولم يتم إرسال أي بيانات إلى VVIP TIGER.",
    "تم فتح المسودة، قد تحتاج لإكمال بعض الحقول.",
    "تعذر قراءة المسودة المحلية. يمكنك حذفها أو إنشاء مسودة جديدة.",
    "لا توجد مسودات محلية حاليًا.",
]
for text in copy:
    if text not in combined + shell:
        raise SystemExit(f"[smoke][fail] missing PR32 copy: {text}")

shell_contract = [
    "استكمال المسودة",
    "بدء إعلان جديد",
    "بدء إعلان جديد؟",
    "سيتم استبدال المسودة المحلية الحالية على هذا الجهاز فقط.",
    "بدء جديد",
    "function requestOpenShell",
    "function requestDeleteDraft",
    "function transitionConfirmation",
    "resume:",
]
for contract in shell_contract:
    if contract not in shell:
        raise SystemExit(f"[smoke][fail] missing PR32 shell contract: {contract}")

for forbidden in ["data:" + "image", "base" + "64", "readAs" + "DataURL"]:
    if forbidden.lower() in runtime.lower():
        raise SystemExit(f"[smoke][fail] unsafe PR32 local image storage: {forbidden}")

for contract in [
    ".vvip-draft-preview",
    ".vvip-draft-card",
    ".vvip-draft-sheet",
    "aspect-ratio: 4 / 3;",
    "#f0f2f5",
    "#1877f2",
]:
    if contract not in styles:
        raise SystemExit(f"[smoke][fail] missing PR32 visual contract: {contract}")

for hook in [
    "[data-vvip-draft-resume-action]",
    "[data-vvip-draft-delete-action]",
    "[data-draft-preview-open]",
    "[data-draft-preview-close]",
]:
    if hook not in resilience:
        raise SystemExit(f"[smoke][fail] PR30 guard blocks PR32 action: {hook}")

if 'draftPreview:' not in routes or 'action: "openDraftPreview"' not in routes:
    raise SystemExit("[smoke][fail] route map misses internal draft preview action")

for asset in [
    "/scripts/vvip-pr32-draft-preview.js",
    "/styles/vvip-pr32-draft-preview.css",
]:
    if asset not in service_worker:
        raise SystemExit(f"[smoke][fail] service worker misses PR32 asset: {asset}")
if 'CACHE_NAME = CACHE_PREFIX + "v21"' not in service_worker:
    raise SystemExit("[smoke][fail] service worker cache was not bumped for PR32")
PY_PR32

PR36_SMOKE_ENABLED="$(test -f scripts/media/pr36-controller.js && test -f docs/launch/pr36/CHANGE_CONTROL_MANIFEST.json && printf 1 || printf 0)" node <<'JS_PR32_HELPERS'
const assert = require("node:assert/strict");
const pr36Enabled = process.env.PR36_SMOKE_ENABLED === "1";
const memory = new Map();
global.window = {
  localStorage: {
    getItem(key) { return memory.has(key) ? memory.get(key) : null; },
    setItem(key, value) { memory.set(key, String(value)); },
    removeItem(key) { memory.delete(key); },
  },
};
const drafts = require("./scripts/vvip-pr32-draft-preview.js");

const normalized = drafts.normalizeDraft({
  version: 1,
  sector: "automotive",
  title: " <b>قطعة</b> ",
  price: "120",
  location: "الرياض",
  sectorDetails: { autoType: "فرامل" },
  photoNames: ["front.jpg"],
  selectedLocalPhotoCount: 1,
});
assert.equal(normalized.title, "قطعة");
assert.equal(normalized.price, 120);
if (pr36Enabled) {
  assert.equal(normalized.photoCount, 0);
  assert.deepEqual(normalized.photoMetadata, []);
  assert.equal(Object.hasOwn(normalized, "photoFileNames"), false);
} else {
  assert.equal(normalized.photoCount, 1);
  assert.equal(normalized.photoFileNames[0], "front.jpg");
}
const explicitlyIncomplete = drafts.normalizeDraft({
  sector: "automotive",
  title: "قطعة أصلية",
  price: "120",
  location: "الرياض",
  readinessStatus: "incomplete",
  readinessScore: 75,
  missingFields: ["summary"],
  warnings: ["photos"],
});
assert.equal(explicitlyIncomplete.readinessStatus, "incomplete");
assert.equal(explicitlyIncomplete.incomplete, true);
assert.equal(explicitlyIncomplete.readinessScore, 75);
assert.deepEqual(explicitlyIncomplete.missingFields, ["summary"]);
assert.deepEqual(explicitlyIncomplete.warnings, ["photos"]);
assert.equal(drafts.normalizeDraft({ sector: "unknown" }), null);
assert.equal(drafts.writeLocalDraft(normalized), true);
assert.equal(drafts.readLocalDraft().status, "ready");
assert.equal(drafts.readLocalDraft().draft.title, "قطعة");
memory.set("vvip_pr31_create_listing_draft", "{broken");
assert.equal(drafts.readLocalDraft().status, "corrupt");
assert.equal(drafts.clearLocalDraft(), true);
assert.equal(drafts.readLocalDraft().status, "empty");
JS_PR32_HELPERS

echo "[smoke] validating PR33 publish readiness"
PR36_SMOKE_ENABLED="$(test -f scripts/media/pr36-controller.js && test -f docs/launch/pr36/CHANGE_CONTROL_MANIFEST.json && printf 1 || printf 0)" python3 <<'PY_PR33'
import os
from pathlib import Path

home = Path("index.html").read_text(encoding="utf-8")
account = Path("private-profile-p03.html").read_text(encoding="utf-8")
runtime = Path("scripts/vvip-pr33-publish-readiness.js").read_text(encoding="utf-8")
shell = Path("scripts/vvip-pr31-create-listing-shell.js").read_text(encoding="utf-8")
drafts = Path("scripts/vvip-pr32-draft-preview.js").read_text(encoding="utf-8")
styles = Path("styles/vvip-pr33-publish-readiness.css").read_text(encoding="utf-8").lower()
resilience = Path("scripts/vvip-pr30-resilience.js").read_text(encoding="utf-8")
routes = Path("scripts/vvip-p03-route-map.js").read_text(encoding="utf-8")
service_worker = Path("sw.js").read_text(encoding="utf-8")

for page_name, page in [("Home", home), ("Account", account)]:
    for asset in [
        "styles/vvip-pr33-publish-readiness.css",
        "scripts/vvip-pr33-publish-readiness.js",
    ]:
        if asset not in page:
            raise SystemExit(f"[smoke][fail] {page_name} does not load {asset}")

combined = runtime + shell + drafts + home + account
for marker in [
    "data-vvip-pr33-readiness",
    "data-vvip-readiness-status",
    "data-vvip-readiness-sheet",
    "data-vvip-validation-error",
    "data-vvip-validation-warning",
    "data-vvip-safe-publish-action",
    "data-vvip-mobile-safe-shell",
]:
    if marker not in combined:
        raise SystemExit(f"[smoke][fail] missing PR33 marker: {marker}")

for helper in [
    "function validateListingDraft",
    "function normalizeValidationInput",
    "function validateRequiredText",
    "function validatePrice",
    "function validateSector",
    "function validateLocation",
    "function validateSummary",
    "function getListingReadiness",
    "function renderValidationErrors",
    "function clearValidationErrors",
    "function setFieldError",
    "function setFieldWarning",
    "function showReadinessSheet",
    "function updateReadinessStatus",
]:
    if helper not in runtime:
        raise SystemExit(f"[smoke][fail] missing PR33 helper: {helper}")

for text in [
    "أكمل الحقول المطلوبة للانتقال.",
    "اكتب اسم الإعلان بوضوح.",
    "أدخل سعرًا صحيحًا أكبر من صفر.",
    "حدد المدينة أو المنطقة.",
    "أضف وصفًا مختصرًا يساعد المستخدمين على فهم الإعلان.",
    "فحص جاهزية الإعلان",
    "جاهز للمراجعة",
    "النشر الحقيقي قيد التجهيز",
    "النشر الحقيقي سيتم تفعيله لاحقًا بعد ربط قاعدة البيانات والمراجعة.",
    "لم يتم إرسال أي بيانات خارج هذا الجهاز في هذه المرحلة.",
    "مسودة جاهزة",
    "تحتاج إكمال",
]:
    if text not in combined:
        raise SystemExit(f"[smoke][fail] missing PR33 copy: {text}")

photo_copy = "لا رفع ولا نشر في هذه المرحلة." if os.environ.get("PR36_SMOKE_ENABLED") == "1" else "الصور ستُرفع لاحقًا عند تفعيل النشر الحقيقي."
if photo_copy not in combined:
    raise SystemExit(f"[smoke][fail] missing PR33 photo copy: {photo_copy}")

for metadata in [
    "readinessStatus",
    "readinessScore",
    "readinessUpdatedAt",
    "missingFields",
    "warnings",
]:
    if metadata not in shell + drafts:
        raise SystemExit(f"[smoke][fail] missing PR33 draft metadata: {metadata}")

for shell_contract in [
    "currentDraft: function",
    "layer && !layer.hidden",
    "values.slice(0, 10).forEach",
]:
    if shell_contract not in shell:
        raise SystemExit(f"[smoke][fail] missing PR33 active-shell contract: {shell_contract}")

for readiness_contract in [
    "const activeDraft = shell.currentDraft()",
    "if (activeDraft) return activeDraft",
]:
    if readiness_contract not in runtime:
        raise SystemExit(f"[smoke][fail] missing PR33 stored-draft fallback: {readiness_contract}")

for contract in [
    ".vvip-readiness-panel",
    ".vvip-readiness-sheet",
    ".vvip-field-error",
    ".vvip-field-warning",
    "position: sticky",
    "overflow-x: hidden",
    "#f0f2f5",
    "#1877f2",
    ":focus-visible",
    "@media (max-width: 640px)",
]:
    if contract not in styles:
        raise SystemExit(f"[smoke][fail] missing PR33 visual contract: {contract}")

for hook in [
    "[data-vvip-safe-publish-action]",
    "[data-vvip-readiness-open]",
    "[data-vvip-readiness-close]",
]:
    if hook not in resilience:
        raise SystemExit(f"[smoke][fail] PR30 guard blocks PR33 action: {hook}")

if 'publishReadiness:' not in routes or 'action: "openPublishReadiness"' not in routes:
    raise SystemExit("[smoke][fail] route map misses internal readiness action")

for asset in [
    "/scripts/vvip-pr33-publish-readiness.js",
    "/styles/vvip-pr33-publish-readiness.css",
]:
    if asset not in service_worker:
        raise SystemExit(f"[smoke][fail] service worker misses PR33 asset: {asset}")
if 'CACHE_NAME = CACHE_PREFIX + "v21"' not in service_worker:
    raise SystemExit("[smoke][fail] service worker cache was not bumped for PR33")

if "fetch(" in runtime or "XMLHttpRequest" in runtime:
    raise SystemExit("[smoke][fail] PR33 runtime performs a network write")
PY_PR33

node <<'JS_PR33_HELPERS'
const assert = require("node:assert/strict");
const readiness = require("./scripts/vvip-pr33-publish-readiness.js");

assert.equal(readiness.normalizeValidationInput("  <b>عنوان</b>  "), "عنوان");
assert.equal(readiness.validateSector("automotive").valid, true);
assert.equal(readiness.validateSector("unknown").valid, false);
assert.equal(readiness.validatePrice("١٬٢٥٠٫٥٠").value, 1250.5);
assert.equal(readiness.validatePrice("0").valid, false);
assert.equal(readiness.validatePrice("not-a-price").valid, false);
assert.equal(readiness.validateLocation("الرياض").valid, true);
assert.equal(readiness.validateLocation("س".repeat(61)).valid, false);
assert.equal(readiness.validateSummary("").severity, "warning");
assert.equal(readiness.validateSummary("وصف ".repeat(80)).valid, false);

const ready = readiness.getListingReadiness({
  sector: "automotive",
  title: "قطعة أصلية",
  price: "250",
  location: "الرياض",
  summary: "وصف واضح ومختصر للإعلان",
  specs: "أصلي، جديد",
  sectorDetails: { autoType: "فرامل" },
  selectedLocalPhotoCount: 0,
});
assert.equal(ready.ready, true);
assert.equal(ready.score, 100);
assert.equal(ready.blockers.length, 0);
assert.ok(ready.warnings.includes("photos"));

const blocked = readiness.validateListingDraft({
  sector: "unknown",
  title: "x",
  price: "0",
  location: "",
  summary: "",
});
assert.equal(blocked.ready, false);
assert.deepEqual(blocked.missing.sort(), ["location", "price", "sector", "title"]);
assert.equal(blocked.errors.title, "اكتب اسم الإعلان بوضوح.");
JS_PR33_HELPERS

bash scripts/qa-pr33-accessibility.sh

echo "[smoke] validating auth preview and safe return path"
python3 <<'PY_AUTH'
from pathlib import Path

text = Path("auth-clerk-index.js").read_text(encoding="utf-8")

required = [
    'return isLocalHost && preview === "home";',
    "SAFE_RETURN_PATHS.has(returnTo)",
    "location.replace(returnTo)",
]

for contract in required:
    if contract not in text:
        raise SystemExit(f"[smoke][fail] missing safe auth contract: {contract}")

allowed_returns = [
    '"index.html"',
    '"/index.html"',
    '"./index.html"',
    '"private-profile-p03.html"',
    '"/private-profile-p03.html"',
    '"./private-profile-p03.html"',
]
for value in allowed_returns:
    if value not in text:
        raise SystemExit(f"[smoke][fail] safe return allowlist misses: {value}")

preview_files = [
    Path("auth-clerk-index.js"),
    Path("scripts/vvip-pr29-home-marketplace.js"),
    Path("scripts/vvip-p03-profile.js"),
    Path("scripts/vvip-p03-sign-out.js"),
]
loopback_contract = [
    'location.hostname === "localhost"',
    'location.hostname === "127.0.0.1"',
    'location.hostname === "::1"',
    'location.hostname === "[::1]"',
    'location.hostname === "0.0.0.0"',
]
for file in preview_files:
    source = file.read_text(encoding="utf-8")
    for contract in loopback_contract:
        if contract not in source:
            raise SystemExit(
                f"[smoke][fail] incomplete localhost preview guard in {file}: {contract}"
            )

profile = Path("scripts/vvip-p03-profile.js").read_text(encoding="utf-8")
signout = Path("scripts/vvip-p03-sign-out.js").read_text(encoding="utf-8")
private_return = "index.html?return_to=private-profile-p03.html"
if private_return not in profile:
    raise SystemExit("[smoke][fail] private account auth return is not canonical")
if private_return not in signout:
    raise SystemExit("[smoke][fail] sign-out auth guard races canonical return")
PY_AUTH

echo "[smoke] validating route availability"
python3 <<'PY_ROUTES'
from pathlib import Path
import re

text = Path("scripts/vvip-p03-route-map.js").read_text(encoding="utf-8")

def block(name):
    match = re.search(
        rf"\b{name}\s*:\s*\{{(?P<body>[^}}]*)\}}",
        text,
    )
    if not match:
        raise SystemExit(f"[smoke][fail] missing route: {name}")
    return match.group("body")

expected = {
    "home": ("index.html", True),
    "marketplace": ("index.html#marketplace", True),
    "search": ("index.html#search", True),
    "account": ("private-profile-p03.html", True),
    "private": ("private-profile-p03.html", True),
    "create": (None, True),
    "createListing": (None, True),
    "listingDetails": (None, False),
}

for name, (href, available) in expected.items():
    route = block(name)
    expected_flag = f"available: {str(available).lower()}"
    if expected_flag not in route:
        raise SystemExit(f"[smoke][fail] wrong availability: {name}")
    if href and f'href: "{href}"' not in route:
        raise SystemExit(f"[smoke][fail] wrong href: {name}")

if 'action: "openCreateListing"' not in block("create"):
    raise SystemExit("[smoke][fail] create route is not an internal shell action")

public_token = "public" + "Profile"
public_path = "public" + "-profile"
if public_token in text or public_path in text:
    raise SystemExit("[smoke][fail] public profile route remains")
PY_ROUTES

echo "[smoke] validating service worker cache"
python3 <<'PY_SW'
from pathlib import Path

text = Path("sw.js").read_text(encoding="utf-8")
required = [
    "/scripts/vvip-pr29-home-marketplace.js",
    "/styles/vvip-pr29-home-marketplace.css",
    "/scripts/vvip-p03-profile.js",
    "/scripts/vvip-p03-sign-out.js",
    "/styles/vvip-p03-profile.css",
    "/scripts/vvip-pr31-create-listing-shell.js",
    "/styles/vvip-pr31-create-listing-shell.css",
]
for asset in required:
    if asset not in text:
        raise SystemExit(f"[smoke][fail] service worker misses: {asset}")

legacy = [
    "vvip-" + "discovery-shell",
    "vvip-" + "discovery-config",
    "social" + "-ui",
    "public" + "-profile",
]
for token in legacy:
    if token in text:
        raise SystemExit(f"[smoke][fail] service worker caches legacy: {token}")

hardening = [
    "const CACHE_PREFIX",
    "key.startsWith(CACHE_PREFIX)",
    "new URL(event.request.url)",
    "url.origin !== self.location.origin",
    'event.request.mode === "navigate"',
    "ASSET_PATHS.has(url.pathname)",
    "url.search",
    "function shouldBypass",
    '"clerk"',
    '"supabase"',
    '"token"',
    '"auth"',
    'return caches.match("/index.html")',
    "/scripts/vvip-pr30-resilience.js",
]
for contract in hardening:
    if contract not in text:
        raise SystemExit(f"[smoke][fail] service worker hardening missing: {contract}")

forbidden_cache_patterns = [
    "cache.put(event.request",
    "keys.filter(function (key) { return key !== CACHE_NAME;",
]
for pattern in forbidden_cache_patterns:
    if pattern in text:
        raise SystemExit(f"[smoke][fail] unsafe service worker pattern remains: {pattern}")

if '"/private-profile-p03.html"' in text:
    raise SystemExit("[smoke][fail] service worker precaches private account HTML")
PY_SW

echo "[smoke] validating Firebase legacy redirects"
python3 <<'PY_FIREBASE'
from pathlib import Path
import json

config = json.loads(Path("firebase.json").read_text(encoding="utf-8"))
redirects = config.get("hosting", {}).get("redirects", [])
actual = {
    (item.get("source"), item.get("destination"), item.get("type"))
    for item in redirects
}
expected = {
    ("/public-profile.html", "/index.html", 301),
    ("/public-profile-p03.html", "/index.html", 301),
    ("/public-profile", "/index.html", 301),
    ("/public-profile-p03", "/index.html", 301),
}

missing = expected - actual
if missing:
    raise SystemExit(f"[smoke][fail] missing Firebase legacy redirects: {sorted(missing)}")
PY_FIREBASE

echo "[smoke] validating forbidden live terminology and navigation"
python3 <<'PY_TERMS'
from pathlib import Path

files = [
    Path("index.html"),
    Path("private-profile-p03.html"),
    Path("auth-clerk-index.js"),
    Path("scripts/vvip-pr29-home-marketplace.js"),
    Path("scripts/vvip-p03-route-map.js"),
    Path("styles/vvip-pr29-home-marketplace.css"),
    Path("sw.js"),
    Path("scripts/vvip-p03-profile.js"),
    Path("scripts/vvip-p03-sign-out.js"),
    Path("scripts/vvip-pr31-create-listing-shell.js"),
    Path("scripts/vvip-pr32-draft-preview.js"),
    Path("scripts/vvip-pr33-publish-readiness.js"),
    Path("styles/vvip-p03-profile.css"),
    Path("styles/vvip-visual-trust-layer.css"),
]

forbidden = [
    "".join(chr(code) for code in [1586, 1575, 1574, 1585]),
    "".join(chr(code) for code in [1586, 1608, 1575, 1585]),
    "".join(chr(code) for code in [1575, 1604, 1586, 1608, 1575, 1585]),
    "visit" + "or",
    "visit" + "ors",
    "g" + "uest",
    "g" + "uests",
    "view" + "-as",
    "view" + " as",
    "public" + "-profile.html",
    "public" + "-profile-p03.html",
    "".join(chr(code) for code in [1575, 1604, 1589, 1601, 1581, 1577, 32, 1575, 1604, 1593, 1575, 1605, 1577]),
]

missing_pages = [
    "home" + ".html",
    "market" + ".html",
    "create" + "-listing.html",
    "listing" + "-details.html",
]

for file in files:
    if not file.exists():
        continue
    text = file.read_text(encoding="utf-8", errors="ignore").lower()
    for term in forbidden + missing_pages:
        if term.lower() in text:
            raise SystemExit(
                f"[smoke][fail] forbidden live term or path in {file}"
            )
PY_TERMS

echo "[smoke] validating retired static policies"
python3 <<'PY_POLICY'
from pathlib import Path

files = [
    Path("index.html"),
    Path("auth-clerk-index.js"),
    Path("scripts/vvip-pr29-home-marketplace.js"),
    Path("scripts/vvip-pr31-create-listing-shell.js"),
    Path("scripts/vvip-pr32-draft-preview.js"),
    Path("scripts/vvip-pr33-publish-readiness.js"),
]

terms = [
    "7 " + "photos",
    "7 " + "صور",
    "120 " + "days",
    "120 " + "يوم",
    "4 " + "posts",
    "4 " + "منشورات",
    "4 " + "months",
    "4 " + "أشهر",
]

for file in files:
    text = file.read_text(encoding="utf-8", errors="ignore").lower()
    for term in terms:
        if term.lower() in text:
            raise SystemExit(f"[smoke][fail] retired policy in {file}")
PY_POLICY

echo "[smoke] validating sanitized client recovery logging"
python3 <<'PY_LOGGING'
from pathlib import Path

files = [
    Path("auth-clerk-index.js"),
    Path("scripts/vvip-p03-profile.js"),
    Path("scripts/vvip-p03-sign-out.js"),
    Path("scripts/vvip-pr29-home-marketplace.js"),
    Path("scripts/vvip-pr30-resilience.js"),
    Path("scripts/vvip-pr31-create-listing-shell.js"),
    Path("scripts/vvip-pr32-draft-preview.js"),
    Path("scripts/vvip-pr33-publish-readiness.js"),
]

unsafe_fragments = [
    ", error",
    ", event.reason",
    "error.stack",
    "error.message",
]

for file in files:
    source = file.read_text(encoding="utf-8", errors="ignore")
    for fragment in unsafe_fragments:
        if fragment in source:
            raise SystemExit(
                f"[smoke][fail] unsanitized client recovery logging in {file}"
            )
PY_LOGGING

echo "[smoke] validating no database-scope diff"
python3 <<'PY_DIFF'
import os
import subprocess
from pathlib import Path

PR34_BRANCH = "feat/pr34-listing-persistence-runtime"
PR36_BRANCH = "feat/pr36-secure-seven-photo-processing"
CLEANROOM_BRANCH = "feat/global-control-plane-20260720"
CLEANROOM_ALLOWED_DB_PATHS = {"supabase/config.toml"}
PR34_ALLOWED_PATHS = {
    "scripts/listing/listing-contract.js",
    "scripts/listing/listing-repository.js",
    "scripts/listing/listing-contract.test.js",
    "scripts/qa-pr34-hour1.sh",
    "scripts/qa-smoke.sh",
    "docs/superpowers/specs/2026-07-14-pr34-listing-contract-design.md",
    "docs/superpowers/plans/2026-07-14-pr34-listing-contract-plan.md",
    "docs/launch/pr34/CHANGE_CONTROL_MANIFEST.md",
    "docs/launch/pr34/HOUR1_QA_EVIDENCE.md",
    "docs/launch/pr34/HOUR1_FINAL_REPORT.md",
}

allowlist_path = Path("docs/launch/pr35/CHANGED_FILES.allowlist")
pr35_allowed = (
    set(allowlist_path.read_text(encoding="utf-8").splitlines())
    if allowlist_path.exists()
    else set()
)


def scope_error(branch, paths):
    if branch == CLEANROOM_BRANCH:
        database_changes = sorted(
            name for name in paths
            if name.lower().endswith(".sql")
            or name.lower().startswith(
                ("supabase/migrations/", "migrations/", "storage/", "rls/", "policy/")
            )
        )
        if database_changes:
            return (
                "[smoke][fail] cleanroom operation changed database scope: "
                + ", ".join(database_changes)
            )
        return None
    if branch == PR36_BRANCH:
        manifest = Path("docs/launch/pr36/CHANGE_CONTROL_MANIFEST.json")
        if not manifest.exists():
            return "[smoke][fail] PR36 manifest is missing"
        import json
        allowed = set(json.loads(manifest.read_text(encoding="utf-8"))["allowed_paths"])
        undeclared = sorted(set(paths) - allowed)
        if undeclared:
            return "[smoke][fail] undeclared PR36 scope changed: " + ", ".join(undeclared)
        return None
    if branch == PR34_BRANCH:
        undeclared = sorted(set(paths) - PR34_ALLOWED_PATHS)
        if undeclared:
            return (
                "[smoke][fail] undeclared PR34 scope changed: "
                + ", ".join(undeclared)
            )
        return None

    forbidden_roots = ("backups/", "approved/", "docs/")
    for name in paths:
        if name.startswith(forbidden_roots) and name not in pr35_allowed:
            return f"[smoke][fail] forbidden PR30 scope changed: {name}"
    return None


if scope_error("main", ["docs/unauthorized.md"]) is None:
    raise SystemExit(
        "[smoke][fail] scope regression: default mode allowed docs change"
    )

if scope_error(PR34_BRANCH, sorted(PR34_ALLOWED_PATHS)) is not None:
    raise SystemExit(
        "[smoke][fail] scope regression: PR34 rejected declared paths"
    )

if scope_error(PR36_BRANCH, ["docs/launch/pr36/CHANGE_CONTROL_MANIFEST.json"]) is not None:
    raise SystemExit("[smoke][fail] scope regression: PR36 rejected its manifest")

if scope_error(PR36_BRANCH, ["docs/launch/pr36/UNDECLARED.md"]) is None:
    raise SystemExit("[smoke][fail] scope regression: PR36 allowed undeclared path")

if scope_error(CLEANROOM_BRANCH, ["docs/cleanroom.md", "approved/obsolete.md"]) is not None:
    raise SystemExit("[smoke][fail] scope regression: cleanroom rejected authorized cleanup")

if scope_error(CLEANROOM_BRANCH, ["supabase/migrations/20260101_changed.sql"]) is None:
    raise SystemExit("[smoke][fail] scope regression: cleanroom allowed migration change")

if scope_error(
    PR34_BRANCH,
    ["docs/launch/pr34/UNDECLARED.md"],
) is None:
    raise SystemExit(
        "[smoke][fail] scope regression: PR34 allowed undeclared path"
    )

pr35_sample = "docs/launch/pr35/SECURITY_THREAT_MODEL.md"
if (
    pr35_sample in pr35_allowed
    and scope_error("main", [pr35_sample]) is not None
):
    raise SystemExit(
        "[smoke][fail] scope regression: PR35 rejected declared path"
    )

changed = subprocess.run(
    ["git", "diff", "HEAD", "--name-only"],
    check=True,
    capture_output=True,
    text=True,
).stdout.splitlines()

untracked = subprocess.run(
    ["git", "ls-files", "--others", "--exclude-standard"],
    check=True,
    capture_output=True,
    text=True,
).stdout.splitlines()

changed.extend(untracked)

def resolve_branch():
    current = subprocess.run(
        ["git", "branch", "--show-current"],
        check=True,
        capture_output=True,
        text=True,
    ).stdout.strip()

    if current:
        return current

    for variable in (
        "GITHUB_HEAD_REF",
        "GITHUB_REF_NAME",
        "CI_COMMIT_REF_NAME",
        "BRANCH_NAME",
    ):
        value = os.environ.get(variable, "").strip()
        if value.startswith("refs/heads/"):
            value = value[len("refs/heads/"):]
        if value and value != "HEAD":
            return value

    return ""


branch = resolve_branch()

backup_paths = [
    name for name in untracked
    if name.startswith("backups/")
]

if backup_paths:
    raise SystemExit(
        "[smoke][fail] repository backup remains untracked: "
        + ", ".join(backup_paths)
    )

error = scope_error(branch, changed)
if error:
    raise SystemExit(error)

blocked_roots = [
    "supa" + "base/",
    "migra" + "tions/",
    "stor" + "age/",
    "r" + "ls/",
    "pol" + "icy/",
]

for name in changed:
    lowered = name.lower()
    review_sql = (
        name.startswith("docs/security/sql-review/pr35/")
        and name in pr35_allowed
    )
    cleanroom_config = (
        branch == CLEANROOM_BRANCH
        and name in CLEANROOM_ALLOWED_DB_PATHS
    )
    if (
        lowered.endswith("." + "sql")
        or any(root in lowered for root in blocked_roots)
    ) and not review_sql and not cleanroom_config:
        raise SystemExit(
            f"[smoke][fail] database-scope file changed: {name}"
        )
PY_DIFF

echo "[smoke][pass] PR29 legacy eradication checks succeeded"
