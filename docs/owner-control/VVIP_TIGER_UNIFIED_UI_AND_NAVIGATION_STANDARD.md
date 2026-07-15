# VVIP TIGER — Unified UI and Navigation Standard (P02)

## Scope

- Phase: P02
- Status: In Progress
- Applies to: `index.html`, `home.html`, `market.html`, `public-profile.html`, `clerk-private-profile.html`
- Out of scope in this standard: Clerk config, Supabase, SQL, RLS, Production, Payments

## Design Tokens Source

- [docs/owner-control/vvip-unified-ui-tokens.json](./vvip-unified-ui-tokens.json)

## Official UI Contract

### Colors

- Social primary: blue family for active states and primary actions
- Surfaces: white and light gray for feed/cards/navigation
- Brand accents: navy + premium gold only for VVIP identity highlights

### Button System

- Icon Button: 40 to 44 px circular, minimum tap target 44 px
- Primary Button: blue, white text, radius 8 px, height 40 to 44 px
- Secondary Button: neutral surface hover color, dark text, radius 8 px
- Filter Chip: height 34 to 38 px, pill radius, active blue tint

### Header and Navigation

- Desktop Header: fixed, 56 px
- Mobile Header: fixed, 56 px
- Mobile Bottom Navigation: one bar only, 5 items only
- Bottom nav order:
  1. Home
  2. Market
  3. Create Listing (disabled until P09)
  4. Messages or Notifications (disabled until dedicated phase)
  5. Profile

### Search and Filters

- Unified search entry point in home and market
- Sector chips only:
  - All
  - Automotive and Services
  - Materials and Supplies
  - Real Estate
- Advanced search panel reserved for structured filters

### Account Menu

- Single account menu opened by profile icon
- Must include:
  - Public profile
  - Private account management
  - Account settings
  - Account type reserved for P04
  - Language
  - Privacy
  - Tiger Care reserved for P20
  - Logout

### Public and Private Profile

- Public profile is for public identity only
- Private profile remains protected
- Both belong to one account identity

### Disabled and Reserved States

- Any route not ready must be disabled or reserved
- No fake success state
- No 404 for known reserved route contract
- Message standard:
  - "هذه الميزة قيد التجهيز وستتوفر ضمن المرحلة المخصصة."

### No Video Rule

- No video tabs
- No video buttons
- No video upload inputs
- Image-first listing preview only

### Responsive Breakpoints

- Mobile-first behavior at 360 to 412 widths
- Tablet behavior around 768 to 1024
- Desktop behavior from 1025+

### Accessibility States

- Visible focus ring on interactive controls
- `aria-label` on icon-only controls
- `aria-current` for active route items
- RTL compatibility required
- Reduced-motion respected

### Loading / Empty / Error

- Empty state must be explicit and honest
- No mock result pretending to be production data
- Error text user-safe and non-technical

### Anti-duplication Rules

- One route map only
- One app shell controller only
- One mobile bottom nav only
- No duplicate listeners
- No double initialization

### Privacy Rules

- No email display in public profile
- No Clerk ID, no Supabase ID in public UI
- No tokens/secrets in UI or console output
- No internal owner/admin labels in user-facing screens
