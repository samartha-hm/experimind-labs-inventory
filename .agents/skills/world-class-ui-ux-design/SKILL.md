---
name: world-class-ui-ux-design
description: Enterprise-grade World Top 1% UI/UX Design System framework for web, desktop, and mobile applications. Enforces rigorous standards for typography, color theory, layout density, fluid animations, touch targets, and publication-grade document generation.
---

# World Top 1% UI/UX Design System Framework

This skill establishes the universal design intelligence, visual hierarchy, ergonomics, and engineering standards for enterprise web, desktop, tablet, and mobile platforms.

---

## 1. Core Visual Hierarchy & Color Theory (The 60-30-10 Rule)

### A. Dominant Canvas (60%)
- **Dark Mode**: Deep midnight foundation (`#070b14` canvas, `#0f172a` cards, `#1e293b` elevated surfaces). Never use flat `#000000` except for OLED modal backdrops.
- **Light Mode**: Crisp, warm alabaster (`#f8fafc` canvas, `#ffffff` cards, `#f1f5f9` subtle borders).

### B. Structural Contrast & Typography (30%)
- **Primary Text**: High-contrast, clean slate (`#f8fafc` dark / `#0f172a` light).
- **Secondary Text**: Supporting metadata (`#94a3b8` dark / `#64748b` light).
- **Muted / Borders**: Hairline structural guides (`rgba(255, 255, 255, 0.08)` / `#e2e8f0`).

### C. Semantic Accent Tokens (10%)
- **Indigo / Violet (Primary Action)**: `#6366f1` / `#4f46e5`
- **Emerald (Success / In-Stock / Safe)**: `#10b981` / `#059669`
- **Sky (Informational / Local Sourcing)**: `#0ea5e9` / `#0284c7`
- **Amber (Warning / In-House Workshop / Lead Times)**: `#f59e0b` / `#d97706`
- **Rose (Deficit / Critical Shortage / Action Needed)**: `#f43f5e` / `#e11d48`

---

## 2. Typography & Spatial Rhythm

1. **Font Hierarchy**:
   - `Display / Page Title`: 20px – 24px, Bold/Black, letter-spacing `-0.025em`
   - `Section Header / Modal Title`: 16px – 18px, Bold, letter-spacing `-0.02em`
   - `Card Header / Metric Value`: 14px – 16px, Semi-Bold / Extra-Bold Mono
   - `Body / Standard Text`: 12px – 13px, Regular, line-height `1.5`
   - `Badges / SKU / Micro-labels`: 10px – 11px, Bold / Mono uppercase, tracking `+0.05em`

2. **Spacing Grid**:
   - Standard 4px / 8px incremental scale (`p-2`, `p-3`, `p-4`, `p-6`).
   - Generous cell padding: table rows minimum 36px – 44px height for touch/click ergonomics.

---

## 3. Responsive Dual-Platform Mastery (Desktop vs Mobile)

### Desktop / Laptop Ergonomics
- **Information Density**: High-throughput multi-column tables with fixed sticky headers, column sorting indicators, instant fuzzy search, and keyboard navigation.
- **Modal Viewports**: Wide modal overlays (max-width `7xl` or `95vw`), bounded vertical height (`90vh` – `95vh`) with dedicated internal scroll areas to prevent outer page scrollbar jitter.
- **Multi-Tab Architecture**: Seamless switching between Overview, High-Density Data Grid, Live Document Preview, and Filtered Checklists.

### Mobile & Tablet Ergonomics
- **Touch Target Minimum**: Every interactive element (button, checkbox, toggle) must have at least `44x44px` touch bounding box.
- **Adaptive Card Views**: On mobile screens (`< 768px`), dense data tables must automatically transform into touch-friendly cards with expandable action drawers.
- **Bottom Action Drawers**: Primary actions pinned to fixed bottom sheets within thumb zone reach.

---

## 4. Publication-Grade Document & Vector PDF Standards

When generating downloadable PDFs (via `jsPDF` or canvas):

1. **Character Encoding Safety**:
   - Standard 14 PDF fonts (Helvetica, Times, Courier) use `WinAnsiEncoding`.
   - **NEVER** print raw multi-byte Unicode characters (e.g. `₹` or `✓`) into standard text streams; they cause character collision and corruption (`~`, `1`, `[']`).
   - Use `Rs.` or `INR` for currency, and clean ASCII (`[X]`, `Covered`) or draw vector shapes (`doc.rect`, `doc.circle`, `doc.line`) for checkmarks and status pills.
2. **Column Width & Collision Prevention**:
   - Calculate absolute column coordinates (`xOffsets`) explicitly.
   - Set minimum widths: SKU column minimum 28mm, Component name minimum 60mm.
   - Text must be clipped or wrapped using `doc.splitTextToSize(text, colWidth - padding)`.
   - Ensure `colX + colWidth <= nextColX` with zero coordinate overlap.
3. **Landscape vs Portrait Dynamic Layout**:
   - Provide Landscape A4 (297mm x 210mm, 273mm usable width) for dense multi-column reports (8+ columns) so data has generous breathing space.
   - Provide Portrait A4 for simple checklists (5-6 columns).
4. **Visual Polish**:
   - Running header with corporate brand, Document Ref ID, and 128 barcode on every page.
   - Running footer: "Page X of Y", confidential notice, and generation timestamp.
   - Alternating row background (`#f8fafc` / `#ffffff`) with hairline borders (`#e2e8f0`).
   - Official 4-tier signature blocks (Planner, Warehouse Dispatch, Quality Assurance, Management Approval).

---

## 5. Micro-Interactions & State Feedback

- **Instant Visual Feedback**: Every click, copy, or export must display immediate toast notifications or state transitions (`Copied!`, `Downloaded`).
- **Loading & Empty States**: Never leave blank tables; render informative empty states with actionable icons and reset buttons.
- **Zero Layout Shift (CLS)**: Always allocate fixed dimensions for images, icons, and dynamic metric badges.
