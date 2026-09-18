---
name: world-class-ui-ux-design
description: Enterprise-grade World Top 0.1% UI/UX Design System & Ergonomics Framework for web, desktop, tablet, and mobile platforms. Enforces rigorous standards for perceptual physics, typography math, fluid responsiveness, touch targets, micro-interactions, accessibility, and publication-grade document generation.
---

# World Top 0.1% UI/UX Design System & Ergonomics Framework

This master skill establishes the global top-tier design intelligence, cognitive ergonomics, spatial rhythm, and engineering standards for enterprise platforms across Desktop, Laptop, Tablet, and Mobile devices.

---

## 1. Perceptual Physics & Cognitive Ergonomics

### A. The 60-30-10 Chromatic Harmony Rule
Every screen and viewport must strictly balance visual weight according to the 60-30-10 distribution:
1. **60% Dominant Canvas Surface**:
   - **Dark Theme**: Tinted deep midnight canvas (`#070b14` canvas, `#0f172a` primary cards, `#1e293b` elevated surfaces). Never use flat `#000000` (causes OLED black-smear and harsh contrast fatigue).
   - **Light Theme**: Warm alabaster canvas (`#f8fafc` canvas, `#ffffff` cards, `#f1f5f9` subtle surface dividers).
2. **30% Structural Hierarchy & High-Contrast Typography**:
   - **Primary Text**: High-contrast, crisp slate (`#f8fafc` dark / `#0f172a` light) — minimum 7:1 contrast ratio (WCAG AAA).
   - **Secondary Text**: Supporting metadata (`#94a3b8` dark / `#64748b` light) — minimum 4.5:1 contrast ratio.
   - **Muted / Hairline Borders**: Structural boundaries (`rgba(255, 255, 255, 0.08)` dark / `#e2e8f0` light).
3. **10% High-Intent Semantic Accent Tokens**:
   - **Indigo / Violet (Primary Action & Brand)**: `#6366f1` / `#4f46e5`
   - **Emerald (Success / In-Stock / Safe / Verified)**: `#10b981` / `#059669`
   - **Rose (Deficit / Critical Shortage / Error / Destructive)**: `#f43f5e` / `#e11d48`
   - **Amber (Warning / In-House Workshop / Lead Time / Attention)**: `#f59e0b` / `#d97706`
   - **Sky (Local Sourcing / Informational / Transit)**: `#0ea5e9` / `#0284c7`
   - **Purple (Quality Assurance / Certifications / 21 CFR Compliance)**: `#a855f7` / `#9333ea`

### B. Cognitive Load Laws
- **Fitts's Law**: Frequently used action targets (Save, Scan, Export, Filter) must be appropriately sized and placed within effortless reach (bottom thumb-zone on mobile, sticky top/bottom bars on desktop).
- **Hick's Law**: Minimize decision time by breaking complex forms and long tables into distinct tabs, progressive disclosure drawers, and 1-click preset filters.
- **Miller's Rule ($7 \pm 2$)**: Group large datasets into chunks with visual badges, category groupings, and clear metric cards.
- **Jakob's Law**: Maintain standard intuitive affordances (search bar top-left/center, user profile top-right, navigation persistent on left or bottom).

---

## 2. Typographic Scale & Spatial Mathematics

### A. Modular Scale & Font Stacks
- **Primary Body Font**: `'Inter', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`
- **Monospace / Numerical Font**: `'JetBrains Mono', 'SF Mono', Menlo, Monaco, Consolas, monospace`
- **Tabular Numerals**: Every monetary figure, percentage, stock count, and serial number MUST enable `font-variant-numeric: tabular-nums` or Tailwind `tabular-nums` to ensure exact vertical alignment across rows.

| Token | Size | Line Height | Letter Spacing | Font Weight | Typical Use Case |
|---|---|---|---|---|---|
| `display-xl` | 28px – 32px | 1.2 | -0.03em | 800 (Extra Bold) | Landing / Main Cockpit Hero Metric |
| `title-lg` | 20px – 24px | 1.25 | -0.025em | 700 (Bold) | Page / Modal Title |
| `heading-md` | 16px – 18px | 1.35 | -0.02em | 600 (Semi-Bold) | Section Header / Card Header |
| `body-md` | 13px – 14px | 1.5 | -0.01em | 400 / 500 | Standard Table Cell / Form Input |
| `caption-sm` | 11px – 12px | 1.4 | 0em | 500 (Medium) | Metadata / Timestamps / Table Headers |
| `badge-xs` | 10px – 11px | 1.2 | +0.05em | 700 (Bold / Mono) | SKU / Channel Pills / Status Tags |

### B. Spatial Rhythm & Padding Scale
- Base 4px / 8px grid scale:
  - `p-1` (4px), `p-2` (8px), `p-3` (12px), `p-4` (16px), `p-6` (24px), `p-8` (32px).
- Table rows: Minimum 38px–44px height for ergonomic clickability.

---

## 3. Dual-Platform Ergonomics (Desktop vs Mobile)

### A. Desktop & Laptop High-Density Mastery
1. **Information Density without Fatigue**:
   - Sticky table headers with subtle blur (`backdrop-blur-md bg-slate-900/90`) so users never lose context when scrolling through 500+ items.
   - Pinned action columns (Edit, Delete, History) on the right edge.
   - Instant live search with `Ctrl+K` / `Cmd+K` global palette.
   - Clear multi-key sorting indicators (`▲` / `▼`) on sortable columns.
2. **Viewport Containment**:
   - Prevent horizontal page-body scrollbars. Internal data grids must use isolated overflow containers (`overflow-x-auto custom-scrollbar`).
   - Modals must be bounded to `max-h-[92vh]` with internal scrollable bodies and fixed headers/footers.

### B. Mobile & Tablet Touch-First Ergonomics
1. **The 44px Touch Rule (Apple HIG & WCAG)**:
   - Every interactive control (button, icon button, checkbox, toggle switch, dropdown trigger) must have a minimum interactive bounding box of **$44 \times 44\text{px}$** (`min-h-[44px] min-w-[44px]`).
2. **Thumb-Zone Navigation**:
   - Fixed bottom navigation bar with elevated center floating action button (e.g. Barcode Scanner).
   - Bottom drawers and action sheets (`slideInUp` animation) for filters, edits, and confirmations.
   - Safe-area inset compensation (`padding-bottom: max(0.5rem, env(safe-area-inset-bottom))`) for notched and gesture-bar devices (iPhone, iPad, modern Android).
3. **Adaptive Card Transformation**:
   - On screens `< 768px` (Mobile), complex 8+ column data tables must automatically transform into high-contrast, touch-friendly cards with expandable detail sections.
4. **Tactile Touch Feedback**:
   - Buttons must provide tactile spring depression on tap: `active:scale-[0.97]` or `active:scale-95`.

---

## 4. Depth Architecture & Glassmorphism

### A. Layered Elevation Scale
- **Level 0 (Canvas)**: Background foundation (`bg-slate-100 dark:bg-slate-950`).
- **Level 1 (Cards & Panels)**: Elevated surface with hairline border (`bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm`).
- **Level 2 (Dropdowns & Popovers)**: Higher elevation (`bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200 dark:border-slate-700 shadow-xl`).
- **Level 3 (Modals & Bottom Sheets)**: High-z-index overlay with frosted backdrop (`backdrop-blur-md bg-black/60`).

### B. Glassmorphism Math
- Blur radius: `backdrop-filter: blur(16px);`
- Background opacity: `rgba(255, 255, 255, 0.75)` in light mode, `rgba(15, 23, 42, 0.80)` in dark mode.
- Subtle specular top highlight: `box-shadow: inset 0 1px 0 0 rgba(255, 255, 255, 0.1);`

---

## 5. Motion Physics & Micro-Interactions

### A. Spring Curves & Durations
- **Fast Micro-interactions (hover, press, toggle)**: `150ms cubic-bezier(0.16, 1, 0.3, 1)`
- **Modal / Drawer Transitions**: `250ms – 300ms cubic-bezier(0.16, 1, 0.3, 1)`
- **Exit / Dismissal Transitions**: `150ms – 200ms cubic-bezier(0.7, 0, 0.84, 0)`

### B. Layout Stability & Zero Cumulative Layout Shift (CLS = 0)
- Always allocate fixed dimensions (`width`, `height`, or aspect ratio) to images, badges, charts, and icons.
- Use shimmer skeleton placeholders that exactly match the typography and bounding boxes of the incoming loaded content.

---

## 6. Publication-Grade Vector PDF & Document Standards

When rendering downloadable PDF documents (via `jsPDF` or canvas):
1. **Character Encoding Safety**:
   - PDF standard fonts (Helvetica, Times) use 8-bit `WinAnsiEncoding`.
   - **NEVER** write raw multi-byte Unicode glyphs (`₹`, `✓`, `•`) directly to text streams.
   - Use `Rs.` for currency, clean ASCII (`Covered`, `-`), and render checkmarks and status badges as crisp vector shapes (`doc.roundedRect`, `doc.circle`).
2. **Coordinate Grid & Minimum Widths**:
   - Enforce minimum column widths (`SKU: 30mm`, `Component Name: 75–95mm`, `Channel: 25mm`).
   - Text must be wrapped using `doc.splitTextToSize(text, colWidth - padding)`.
   - Ensure `colX + colWidth <= nextColX` with zero coordinate overlap.
3. **Landscape vs Portrait Dynamic Layouts**:
   - Multi-column master dispatch sheets (8+ columns) must render in **Landscape A4 (297mm × 210mm)** with 277mm usable width.
   - Simple checklists (5-6 columns) render in **Portrait A4 (210mm × 297mm)**.
4. **Official Finishing**:
   - Running header with corporate brand, Document Ref ID, and Code 128 barcode on every page.
   - Running footer: "Page X of Y", confidentiality notice, and ISO 9001 / 21 CFR verification block.

---

## 7. Quality Checklist for Every Screen & Component

Before declaring any UI task complete, verify against these 8 gates:
1. [ ] **Dual-Theme Fidelity**: Does it look stunning in both Dark Mode (`#070b14`) and Light Mode (`#f8fafc`)?
2. [ ] **Contrast Verification**: Does all text pass WCAG AAA (7:1 for headings, 4.5:1 for body)?
3. [ ] **Mobile Ergonomics**: Are all touch targets $\ge 44\text{px}$? Does the layout reflow cleanly on screens $< 768\text{px}$?
4. [ ] **Tabular Numerics**: Are all currency, quantities, and numeric metrics using monospace/tabular numerals?
5. [ ] **Zero Overlap**: Are all table columns, badges, and headers free from collisions or truncated ellipsis clipping?
6. [ ] **Immediate Feedback**: Do buttons, inputs, and toggles provide active feedback (`active:scale-95`, toast alert, spin state)?
7. [ ] **Empty & Error States**: Are there helpful empty states with icons and 1-click action buttons instead of blank voids?
8. [ ] **Safe-Area Insets**: Are bottom bars and drawers offset by `env(safe-area-inset-bottom)`?
