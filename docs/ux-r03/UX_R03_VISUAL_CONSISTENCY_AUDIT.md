# UX-R03 Visual Consistency Audit And Design Principles

## Current Visual Sources

- Legacy shared identity layers use dark navy surfaces (`#07111f`, `#0d1b2f`), gold accents (`#d6aa3f`), broad radii, and premium shadows.
- UX-R01 uses a light operational canvas (`#f4f7fa`), navy (`#112a46`), restrained gold (`#b8872e`), compact `8px` cards, dense tables, and a right sidebar.
- UX-R02 uses a similarly light canvas (`#f3f6f9`) but a slightly different navy (`#102d4b`), blue gradients for listing media, fixed bottom navigation, and mobile sheets.

## Differences To Normalize In The Reference System

| Area | Current variation | UX-R03 reference |
|---|---|---|
| Color | Dark legacy layers conflict with light preview surfaces; navy/gold values differ slightly. | Light page and white cards, one navy identity, blue daily primary action, gold only for premium emphasis. |
| Typography | Legacy Cairo-first and preview Tahoma stacks vary; labels and metrics have no shared scale. | Arabic-first stack, named display-to-caption scale, visible numeric metric style, comfortable line height. |
| Buttons | Gold, navy, quiet, and danger patterns vary by surface. | One blue primary, navy/outline secondary, ghost, explicit danger; focus and disabled states always visible. |
| Cards | Legacy radii and dark gradients differ from compact light preview cards. | `8px` standard card radius, calm border, modest shadow; no nested page-section cards. |
| Navigation | UX-R01 uses sidebar/topbar; UX-R02 uses header/bottom nav. | Preserve both: operations needs desktop information density; user journey needs mobile bottom navigation. |
| Sheets | UX-R01 desktop modal and UX-R02 mobile bottom sheet are separate. | Same overlay token and dialog rules; desktop modal centers, mobile sheet respects safe area. |
| Forms, tables, badges | Label, border, and status colors vary. | Shared 44px controls, internal-scroll tables, textual status labels plus color, card alternative on mobile. |

## Elements To Remain Different

- Operations sidebar, data tables, audit entries, and dense metric layouts remain administrative patterns.
- User-facing listing cards, profile header, search, and fixed bottom navigation remain consumer patterns.
- Sectors are universal filter chips only. They receive no separate brand, product shell, or visual identity.

## Protected Runtime Files

`operations-console/`, `user-journey-preview/`, `docs/ux-r01/`, `docs/ux-r02/`, existing shared CSS, authentication files, Supabase assets, SQL, migrations, and `phase-status.json` are not modified.

## Local Boundary

UX-R03 is a local visual reference and showcase. Tokens do not provide authentication, authorization, security, or production readiness. Real component adoption requires a separately approved implementation package and authorized backend/security phases. P08 remains incomplete and P09 remains not started.