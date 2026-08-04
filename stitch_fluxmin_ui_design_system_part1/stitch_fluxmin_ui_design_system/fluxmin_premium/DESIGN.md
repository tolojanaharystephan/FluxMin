---
name: FluxMin Premium
colors:
  surface: '#0e1513'
  surface-dim: '#0e1513'
  surface-bright: '#343b39'
  surface-container-lowest: '#090f0e'
  surface-container-low: '#161d1b'
  surface-container: '#1a211f'
  surface-container-high: '#252b2a'
  surface-container-highest: '#2f3634'
  on-surface: '#dde4e1'
  on-surface-variant: '#bbcac6'
  inverse-surface: '#dde4e1'
  inverse-on-surface: '#2b3230'
  outline: '#859490'
  outline-variant: '#3c4947'
  surface-tint: '#4fdbc8'
  primary: '#4fdbc8'
  on-primary: '#003731'
  primary-container: '#14b8a6'
  on-primary-container: '#00423b'
  inverse-primary: '#006b5f'
  secondary: '#89ceff'
  on-secondary: '#00344d'
  secondary-container: '#00a2e6'
  on-secondary-container: '#00344e'
  tertiary: '#ffb59e'
  on-tertiary: '#5e1800'
  tertiary-container: '#f38764'
  on-tertiary-container: '#6c2106'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#71f8e4'
  primary-fixed-dim: '#4fdbc8'
  on-primary-fixed: '#00201c'
  on-primary-fixed-variant: '#005048'
  secondary-fixed: '#c9e6ff'
  secondary-fixed-dim: '#89ceff'
  on-secondary-fixed: '#001e2f'
  on-secondary-fixed-variant: '#004c6e'
  tertiary-fixed: '#ffdbd0'
  tertiary-fixed-dim: '#ffb59e'
  on-tertiary-fixed: '#3a0b00'
  on-tertiary-fixed-variant: '#7c2d11'
  background: '#0e1513'
  on-background: '#dde4e1'
  surface-variant: '#2f3634'
typography:
  display-lg:
    fontFamily: Geist
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.04em
  headline-lg:
    fontFamily: Geist
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.03em
  headline-md:
    fontFamily: Geist
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.02em
  title-md:
    fontFamily: Geist
    fontSize: 18px
    fontWeight: '500'
    lineHeight: 28px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Geist
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: 0em
  body-sm:
    fontFamily: Geist
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: 0em
  label-md:
    fontFamily: Geist
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-caps:
    fontFamily: Geist
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  sidebar-collapsed: 68px
  sidebar-expanded: 260px
  container-padding: 2rem
  gutter: 1.5rem
  stack-sm: 0.5rem
  stack-md: 1rem
  stack-lg: 2rem
---

## Brand & Style

The design system is engineered for high-stakes ministerial correspondence management, where clarity, security, and velocity are paramount. The aesthetic follows a "SaaS Premium 2026" trajectory—combining the precision of developer tools with the elegance of luxury enterprise software.

The visual language is characterized by:
- **Linear-Style Minimalism:** A focus on high-fidelity borders, subtle gradients, and structural integrity.
- **Deep Immersion:** A dark-first interface that reduces eye strain during prolonged administrative sessions.
- **Subtle Depth:** Utilization of glassmorphism and layered translucency to indicate hierarchy without cluttering the spatial mental model.
- **High-Performance Utility:** Every element is optimized for rapid scanning and "Command+K" driven workflows.

## Colors

The palette is anchored by a deep, "obsidian-teal" background that provides a high-contrast foundation for vibrant functional accents. 

- **Core:** The primary Teal (#14b8a6) is reserved for the main call-to-action and active states, symbolizing the "flow" of information.
- **Surfaces:** Use varying levels of transparency rather than flat grays to maintain the depth of the dark background.
- **Semantics:** Color is used sparingly but decisively. For example, the Cyan (#22d3ee) is strictly reserved for AI-augmented insights and automated summarization features.
- **Muted States:** Secondary and tertiary text should utilize a reduced opacity (60-70%) of the neutral white/off-white palette to ensure the primary data remains the focal point.

## Typography

This design system leverages Geist for its technical precision and exceptional legibility in data-dense environments.

- **Tracking:** Headlines use tight negative letter-spacing to create a "compact-premium" feel suitable for dashboard headers.
- **Hierarchy:** Use `label-caps` for section headers in sidebars and metadata categories to provide clear visual separation without increasing font size.
- **Contrast:** Secondary information should use `body-sm` with a 60% white opacity to create a natural visual fallback from primary titles.

## Layout & Spacing

The layout is built on a responsive 12-column grid with specific affordances for a "command-center" experience.

- **Sidebar:** A dual-state navigation bar that collapses to an icon-only view (68px) to maximize workspace during deep-work sessions.
- **Command + K:** Centrally located search bar acting as the primary navigation engine, always accessible and visually distinct.
- **Viewports:**
  - **Desktop:** 12 columns, 24px gutters, fixed sidebar.
  - **Tablet:** 8 columns, 16px gutters, overlay sidebar.
  - **Mobile:** 4 columns, 16px margins, bottom-sheet navigation for key actions.

## Elevation & Depth

Elevation in this design system is conveyed through luminosity and blur rather than traditional shadows.

- **Base Layer:** The deepest background (#07110f).
- **Surface Layer:** `border-white/10` with a `backdrop-blur-md` (12px-16px). This layer is used for cards and navigation bars.
- **Floating Layer:** Used for Command+K menus and dropdowns. These should feature a slightly brighter border (`border-white/20`) and a subtle outer glow using the primary Teal color at 5% opacity.
- **Micro-shadows:** Only used to separate text from complex background blurs, ensuring maximum legibility of white text over translucent surfaces.

## Shapes

The shape language balances professional rigidity with modern softness. 
- **Standard UI:** Buttons and inputs use a standard 8px (0.5rem) radius.
- **Containers:** Main content cards and modular containers use `rounded-xl` (16px) or `rounded-2xl` (24px) to create a distinct "encapsulated" feel.
- **Badges:** All status indicators (pill-shaped) use a full `rounded-full` property to distinguish them from interactive buttons.

## Components

### Buttons
- **Primary:** Solid Teal (#14b8a6) with white text. High-contrast, no shadow, subtle inner-light border.
- **Outline:** Transparent background, `border-white/10`, hover state increases border opacity to 40% and adds a subtle background tint.
- **Ghost:** No border or background. Reserved for low-priority actions in toolbars.

### Cards
- **Structure:** `backdrop-blur-xl`, `bg-white/5`, `border-white/10`.
- **Hover:** Transition border to `primary-teal/30` and increase backdrop-blur intensity.

### Badges & Chips
- **Pill Style:** High-saturation background at 15% opacity with 100% opacity text of the same color (e.g., Sky-500/15 background with Sky-500 text).

### Input Fields
- **Glass-style:** Subtle `bg-white/5` background, `border-white/10`. On focus, the border transitions to `primary-teal` with a 2px outer ring at 20% opacity.

### Navigation Components
- **Notification Bell:** Features a floating Teal dot (badge) for active alerts.
- **Sidebar Items:** Active state uses a vertical teal bar (2px wide) on the left edge and a soft teal gradient background at 5% opacity.

### Iconography
- **Style:** Thin linear (1.5px stroke), Lucide-inspired. Use consistent 20px sizing for sidebar and 16px for inline actions.