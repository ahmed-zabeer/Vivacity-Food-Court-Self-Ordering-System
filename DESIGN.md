---
name: Viva City Food Court
colors:
  surface: '#faf9f7'
  surface-dim: '#dadad8'
  surface-bright: '#faf9f7'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f4f3f1'
  surface-container: '#efeeec'
  surface-container-high: '#e9e8e6'
  surface-container-highest: '#e3e2e0'
  on-surface: '#1a1c1b'
  on-surface-variant: '#574238'
  inverse-surface: '#2f3130'
  inverse-on-surface: '#f1f1ef'
  outline: '#8a7266'
  outline-variant: '#dec0b3'
  surface-tint: '#9d4300'
  primary: '#994200'
  on-primary: '#ffffff'
  primary-container: '#bf5506'
  on-primary-container: '#fffbff'
  inverse-primary: '#ffb690'
  secondary: '#5c5e65'
  on-secondary: '#ffffff'
  secondary-container: '#dedfe8'
  on-secondary-container: '#60626a'
  tertiary: '#825100'
  on-tertiary: '#ffffff'
  tertiary-container: '#a36700'
  on-tertiary-container: '#fffbff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdbca'
  primary-fixed-dim: '#ffb690'
  on-primary-fixed: '#341100'
  on-primary-fixed-variant: '#783200'
  secondary-fixed: '#e1e2ea'
  secondary-fixed-dim: '#c4c6ce'
  on-secondary-fixed: '#191c21'
  on-secondary-fixed-variant: '#44474d'
  tertiary-fixed: '#ffddb8'
  tertiary-fixed-dim: '#ffb95f'
  on-tertiary-fixed: '#2a1700'
  on-tertiary-fixed-variant: '#653e00'
  background: '#faf9f7'
  on-background: '#1a1c1b'
  surface-variant: '#e3e2e0'
typography:
  display-lg:
    fontFamily: Manrope
    fontSize: 40px
    fontWeight: '700'
    lineHeight: 48px
    letterSpacing: -0.03em
  display-lg-mobile:
    fontFamily: Manrope
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 38px
    letterSpacing: -0.025em
  headline-xl:
    fontFamily: Manrope
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 34px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Manrope
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.015em
  headline-md:
    fontFamily: Manrope
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Hanken Grotesk
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: -0.005em
  body-md:
    fontFamily: Hanken Grotesk
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: 0em
  body-sm:
    fontFamily: Hanken Grotesk
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
    letterSpacing: 0.01em
  label-lg:
    fontFamily: Hanken Grotesk
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 18px
    letterSpacing: 0.01em
  label-md:
    fontFamily: Hanken Grotesk
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Hanken Grotesk
    fontSize: 10px
    fontWeight: '700'
    lineHeight: 12px
    letterSpacing: 0.04em
rounded:
  sm: 0.5rem
  DEFAULT: 1rem
  md: 1.5rem
  lg: 2rem
  xl: 3rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-desktop: 1.5rem
  margin: 1rem
  margin-desktop: 2.5rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
  space-2xl: 3rem
---

## Brand & Style

This design system establishes a premier culinary collective and hospitality-tech interface. The visual language bridges architectural dining aesthetics with tactile digital ordering, replacing the generic, utilitarian feel of legacy point-of-sale systems with an elevated, editorial culinary medium.

The aesthetic fuses warm architectural minimalism with tactile modernism. It balances soft chalk-stone backdrops, precise obsidian typography, and rich terracotta accents that evoke sun-baked clay, heritage cookware, and ambient restaurant lighting. The experience focuses on culinary sensuality and functional clarity: generous whitespace, high-fidelity imagery, frosted micro-surfaces, and effortless spatial transitions guide diners through curated stalls and kitchens.

## Colors

The palette uses warm mineral tones to evoke hospitality and culinary sophistication while maintaining high functional contrast.

- **Primary (`#E06D24`):** Bespoke Terracotta. Used for primary calls to action, selected active states, critical floating bar actions, and primary price accents.
- **Secondary (`#1F2228`):** Deep Slate Charcoal. Anchors the structural interface, card containers, tabs, navigation bars, and primary typography.
- **Tertiary (`#F59E0B`):** Warm Amber Gold. Reserved for preparation states, pending reviews, stall highlight ribbons, and promotional badging.
- **Neutral Canvas (`#F8F7F5`):** Warm Chalk White. Softens background glare under ambient food hall lighting, replacing harsh digital whites with natural linen warmth.
- **Surface Elevation:** Layered warm chalk (`#FFFFFF` on `#F8F7F5`) paired with hairline borders tinted with 8% obsidian (`#12131614`).
- **Semantic Status Tints:** Emerald (`#10B981`) indicates paid orders, stall open states, and ready items. Warm Amber (`#F59E0B`) flags in-prep stages and live kitchen updates. Muted Crimson (`#EF4444`) is strictly reserved for kitchen sold-out alerts, out-of-stock items, and validation errors.

## Typography

The typographic hierarchy balances structural architecture with legible, editorial dining menus.

- **Headlines (Manrope):** Geometric, precise, and contemporary. Carries rhythmic weight across venue titles, stall banners, and dish names. Tighter letter spacing on display scales creates a composed, editorial magazine hierarchy.
- **Body & Labels (Hanken Grotesk):** Engineered for fast, high-density reading under varying screen brightness. Dish descriptions, allergen profiles, kitchen modification notes, and transactional order receipts render clearly with neutral open counters.
- **Numerical Treatment:** Prices, table indicators, and stall station numbers adopt medium to bold tabular numerals in Hanken Grotesk to avoid layout jitter during live cart updates and tally rollups.

## Layout & Spacing

The layout adapts to customer ordering on mobile devices and dense multi-stall merchant dashboards on desktop:

- **Mobile Viewport (Customer QR Flow):** A fluid 4-column structure constrained to a maximum width of 480px on larger screens. It uses `1rem` margins and `1rem` gutters to maximize menu touch targets. Sticky navigation and summary bars maintain `space-md` clearance above screen bottom notches.
- **Tablet & Order Hubs:** An 8-column layout with 24px gutters, suited for counter kiosks and expediter monitors.
- **Desktop Viewport (Venue Management & Dashboard):** A 12-column responsive layout with 32px gutters and 40px outer margins. Content groups into modular split-view panels: live stall performance, order pacing timelines, and dynamic kitchen queues.
- **Vertical Rhythm:** Rooted in an 8px spatial grid. Component padding shifts from compact `0.5rem` on dense dietary tags to generous `1.5rem` and `2rem` paddings on hero vendor features and food card modules.

## Elevation & Depth

This system avoids heavy drop shadows, using warm ambient diffusion, frosted glass surfaces, and fine border outlines to establish depth:

- **Ground Level (Canvas):** Flat warm chalk `#F8F7F5`. Serves as the base foundation for all content streams.
- **Level 1 (Card & Content Blocks):** Pure optical white `#FFFFFF` surface framed by an 8% obsidian tint border (`#12131614`). Layered with an ambient, warm diffusion: `0 2px 8px -2px rgba(18, 19, 22, 0.04), 0 1px 4px -1px rgba(224, 109, 36, 0.03)`.
- **Level 2 (Hover States & Selected Items):** Modest elevation with a slight terracotta undertone: `0 8px 24px -4px rgba(18, 19, 22, 0.08), 0 2px 8px -1px rgba(224, 109, 36, 0.06)`.
- **Level 3 (Floating Bars & Cart Summaries):** High-interaction surfaces floating above scrolling menus. Styled with a frosted backdrop (`backdrop-filter: blur(16px)`), a 90% opacity chalk fill, an obsidian keyline, and an elevated shadow: `0 12px 32px -4px rgba(18, 19, 22, 0.12)`.
- **Level 4 (Modals, Dish Customizers & Drawers):** Anchored bottom sheets and modal dialogues backed by a warm 35% charcoal overlay (`#12131659`) with `backdrop-filter: blur(8px)`.

## Shapes

The interface uses roundedness level 3, balancing soft, approachable pill-shaped contours with structured layout blocks:

- **Buttons & Chips:** Full pill geometry (`border-radius: 9999px`) provides tactile feedback for touch-driven QR ordering.
- **Food Cards & Vendor Modules:** `rounded-lg` (2rem) softens large product modules and imagery containers, echoing contemporary interior finishes.
- **Modal Sheets & Drawer Panels:** `rounded-xl` (3rem) top radiuses create smooth drawer slides on mobile screens.
- **Input Fields & Quantity Adjusters:** `rounded-lg` (1.5rem to 2rem) maintains consistent curvature across interactive forms.

## Components

### Buttons
- **Primary:** Terracotta background (`#E06D24`), pure white text, full pill radius. Press states transition to a deeper `#C85B17` shade with a subtle `scale(0.98)` compression.
- **Secondary:** Deep slate (`#1F2228`) with white text for secondary management workflows and dashboard controls.
- **Tertiary / Outline:** Chalk white surface, hairline border (`#12131618`), deep charcoal text. Hover states apply a 5% terracotta tint fill.
- **Floating Cart Button:** Full-width pill anchored in the sticky footer with a dual-label layout: dish quantity badge on the left, total price and checkout CTA on the right.

### Chips & Filter Pills
- **Stall & Category Filters:** Pill-shaped, horizontal scrolling with snap alignment. Unselected states use subtle `#FFFFFF` backdrops with a hairline border. Selected states switch to solid Obsidian (`#1F2228`) with chalk text, or Terracotta (`#E06D24`) for active multi-stall filters.
- **Dietary Indicators:** Compact pill badges featuring 10px uppercase labels (e.g., VEGAN, GLUTEN-FREE, HALAL) on neutral stone fills with low-contrast borders.

### Food & Vendor Cards
- **Editorial Dish Card:** Pure white container with a 2rem border radius. High-resolution imagery uses a dedicated 4:3 aspect ratio with soft-clipped internal corners, nested above a clear typographic hierarchy: dish title in Manrope SemiBold, price in Terracotta, truncated description, and a quick-add `+` pill trigger.
- **Sold Out State:** The card body drops to 50% opacity, image shifts to monochrome, and the quick-add button is replaced with a crimson-accented Sold Out pill badge.

### Form Inputs & Quantity Selectors
- **Input Fields:** Warm white base (`#FFFFFF`), hairline border, 1rem internal padding, and a 1.5rem radius. Focus states apply a crisp 1.5px Terracotta border ring with no heavy glow.
- **Stepper Counter:** Compact pill container housing soft circular minus/plus tap targets with a centered tabular numeral display.

### Modals & Bottom Sheets
- **Mobile Menu Modifier Sheet:** Anchors to the bottom of the viewport with a 3rem radius, featuring a centered grab handle, scrollable modification groups (radios for size, checkboxes for add-ons), and a sticky floating submit bar.