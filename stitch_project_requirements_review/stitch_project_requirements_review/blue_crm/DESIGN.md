---
name: Blue CRM
colors:
  surface: '#0b1326'
  surface-dim: '#0b1326'
  surface-bright: '#31394d'
  surface-container-lowest: '#060e20'
  surface-container-low: '#131b2e'
  surface-container: '#171f33'
  surface-container-high: '#222a3d'
  surface-container-highest: '#2d3449'
  on-surface: '#dae2fd'
  on-surface-variant: '#c3c6d7'
  inverse-surface: '#dae2fd'
  inverse-on-surface: '#283044'
  outline: '#8d90a0'
  outline-variant: '#434655'
  surface-tint: '#b4c5ff'
  primary: '#b4c5ff'
  on-primary: '#002a78'
  primary-container: '#2563eb'
  on-primary-container: '#eeefff'
  inverse-primary: '#0053db'
  secondary: '#ffb95f'
  on-secondary: '#472a00'
  secondary-container: '#ee9800'
  on-secondary-container: '#5b3800'
  tertiary: '#4edea3'
  on-tertiary: '#003824'
  tertiary-container: '#007d55'
  on-tertiary-container: '#bdffdb'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#dbe1ff'
  primary-fixed-dim: '#b4c5ff'
  on-primary-fixed: '#00174b'
  on-primary-fixed-variant: '#003ea8'
  secondary-fixed: '#ffddb8'
  secondary-fixed-dim: '#ffb95f'
  on-secondary-fixed: '#2a1700'
  on-secondary-fixed-variant: '#653e00'
  tertiary-fixed: '#6ffbbe'
  tertiary-fixed-dim: '#4edea3'
  on-tertiary-fixed: '#002113'
  on-tertiary-fixed-variant: '#005236'
  background: '#0b1326'
  on-background: '#dae2fd'
  surface-variant: '#2d3449'
  surface-deep: '#0B1120'
  surface-card: '#1E293B'
  border-subtle: rgba(255, 255, 255, 0.08)
  text-primary: '#F8FAFC'
  text-secondary: '#94A3B8'
  status-pending: '#64748B'
  status-production: '#3B82F6'
  status-ready: '#10B981'
  status-alert: '#EF4444'
typography:
  display-lg:
    fontFamily: Geist
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Geist
    fontSize: 30px
    fontWeight: '600'
    lineHeight: 38px
  title-sm:
    fontFamily: Geist
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-base:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  data-table:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 18px
  label-caps:
    fontFamily: JetBrains Mono
    fontSize: 11px
    fontWeight: '700'
    lineHeight: 16px
    letterSpacing: 0.05em
  financial-metric:
    fontFamily: Geist
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.01em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  container-margin: 2rem
  gutter: 1.5rem
  component-gap: 1rem
  stack-sm: 0.5rem
  stack-xs: 0.25rem
---

## Brand & Style

The design system for Blue CRM is built on a **Technical Modernist** aesthetic. It is a precision-oriented environment designed for high-density data management in the industrial printing and plotter industry. The personality is analytical, efficient, and sophisticated, avoiding the generic lightness of consumer SaaS in favor of a focused, dark-mode-first workspace that mirrors the professional nature of production environments.

The visual direction combines elements of **Minimalism** (to handle 400+ data columns without clutter) and **Corporate/Modern** reliability. It utilizes a deep-space foundation with vibrant electric blue accents to guide the user's eye to primary actions, while amber alerts provide immediate cognitive recognition of inventory or production issues.

**Key Brand Pillars:**
- **Industrial Precision:** Every pixel and margin serves the clarity of technical specs (CMYK, m², ink CCs).
- **Executive Elegance:** High-contrast typography and subtle glass-like borders create a premium, authoritative tool.
- **Operational Focus:** The UI recedes into the background, allowing metrics and status indicators to take center stage.

## Colors

The color system is optimized for a low-eye-strain dark environment. 

### Palette Logic
- **Primary (Electric Blue):** Used for the core brand identity, active navigation states, and primary action buttons. It represents the "Blue" in Blue CRM.
- **Secondary (Alert Amber):** Reserved exclusively for low stock warnings, urgent priorities, and financial alerts.
- **Backgrounds:** A tiered system of deep navy-grays. `#0B1120` is the base canvas, while `#1E293B` defines elevated containers (cards/modals).
- **Semantic Colors:** Green (#10B981) for "Ready/Confirmed" and Red (#EF4444) for "Canceled/Error" follow standard industry patterns but are adjusted for high-contrast legibility against dark backgrounds.

**Implementation Note:** Use subtle transparency for borders (`rgba(255,255,255,0.08)`) instead of solid hex codes to allow background depth to bleed through, enhancing the modern feel.

## Typography

Typography focuses on readability within high-density layouts. 

- **Geist (Headlines/Metrics):** Used for large titles and KPI numbers. Its geometric precision feels technical and modern.
- **Inter (UI/Body):** The workhorse font for all form fields, navigation, and description text. It maintains clarity at small sizes.
- **JetBrains Mono (Technical/Labels):** Used specifically for status badges, technical machine specs (e.g., "720dpi"), and column headers in the Plotter module. This monospaced touch reinforces the "Machine/Tool" identity of the CRM.

**Mobile Scaling:** Headlines above 30px should scale down by 20% on mobile devices, while table data remains at 13px (scrollable horizontally) to preserve professional information density.

## Layout & Spacing

This design system utilizes a **12-column Fixed Grid** for the main content area (max-width 1600px) with a persistent **Sidebar** navigation (280px). 

### Layout Rhythm
- **Sidebar:** Fixed to the left, using a deep `#0B1220` surface.
- **Topbar:** Fixed to the top, housing real-time Binance/USD rates and global search.
- **Dashboard:** Uses a CSS Grid-based layout for KPI cards that reflows from 4 columns (Desktop) to 1 column (Mobile).
- **Data Grids:** High-density vertical rhythm with 8px internal padding for rows to maximize visible data without sacrificing legibility.

**Adaptation:** On tablet, the sidebar collapses into an icon-only rail (80px). On mobile, the sidebar becomes a bottom-sheet navigation or a hamburger overlay.

## Elevation & Depth

Hierarchy is achieved through **Tonal Layering** and **Low-Contrast Outlines** rather than heavy shadows.

- **Level 0 (Base):** `#0B1120` — The lowest surface.
- **Level 1 (Cards/Sidebar):** `#1E293B` — Used for main content containers and navigation. 
- **Level 2 (Modals/Popovers):** `#263449` — Used for elements that sit above the UI.
- **Borders:** Every card and interactive element uses a 1px border of `rgba(255, 255, 255, 0.08)`. This "inner glow" border style replaces the need for drop shadows, keeping the UI crisp and "technical."
- **Glassmorphism:** Apply a subtle `backdrop-filter: blur(12px)` to the Topbar and Drawer components to maintain a sense of context and depth when scrolling.

## Shapes

The shape language is **Soft (0.25rem)**. 

In a technical CRM, overly rounded "pill" shapes can feel too playful and waste screen real estate in dense tables.
- **Buttons & Inputs:** Use a 4px (0.25rem) radius for a professional, sharp look.
- **Cards:** Use an 8px (0.5rem) radius to define major layout sections.
- **Status Badges:** Utilize a slight rounding (4px) or a pill-shape ONLY for specific status indicators to distinguish them from clickable buttons.

## Components

### Buttons
- **Primary:** Electric Blue background, white text. Subtle 1px light-blue inner border.
- **Secondary:** Transparent background with the `border-subtle` and white text.
- **Alert:** Amber background with black text (high contrast) for stock warnings.

### Cards
- Dark background (`#1E293B`), 1px subtle border, and 16px-24px padding. 
- Headers within cards should use a 1px bottom border to separate the title from content.

### Inputs & Selects
- Backgrounds should be darker than the card surface (`#0F172A`) to create an "inset" feel.
- Focus state: 1px Electric Blue border with a 2px blue glow (low opacity).

### Data Tables
- **Header:** Darker than rows, bolded monospaced labels.
- **Alternating Rows:** No zebra striping; use subtle 1px divider lines only.
- **Status Badges:** Small text, capitalized, with a low-opacity background of the semantic color (e.g., 10% opacity blue for "Production").

### Plotter Calculator
- A specialized component featuring large numerical inputs and a real-time "Result Card" on the right that updates costs and margins as measurements are typed. Use a specific "Calculation" icon for this section.