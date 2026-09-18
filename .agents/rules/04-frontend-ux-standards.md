# Modern Frontend UI/UX Standards & World Top 0.1% Framework

All frontend and mobile engineering in this workspace must strictly adhere to the standards codified in `.agents/skills/world-class-ui-ux-design/SKILL.md`.

## 1. Visual Excellence & Aesthetic Hierarchy (60-30-10 Rule)
- **Design Tokens**: Centralize colors, spacing, and typography using CSS custom properties (`--color-primary`, `--spacing-md`).
- **Luminance Calibration**: Dark mode must use tinted slate-950 (`#070b14` canvas, `#0f172a` cards, `#1e293b` surfaces). Light mode must use crisp alabaster (`#f8fafc`).
- **High-Contrast Text**: Primary text must exceed 7:1 contrast ratio (WCAG AAA); secondary metadata must exceed 4.5:1.
- **Tabular Numerals**: Monetary amounts, stock numbers, and percentages must enable `tabular-nums` / `font-variant-numeric: tabular-nums`.

## 2. Dual-Platform Ergonomics (Desktop vs Mobile)
- **Desktop High-Density**: Sticky headers with blur underlay, pinned action columns, live filtering, and zero horizontal page scrollbar jitter.
- **Mobile Touch-First**: All interactive targets must be $\ge 44\times44\text{px}$ (`min-h-[44px] min-w-[44px]`). Tables reflow to swipeable adaptive cards on $< 768\text{px}$.
- **Safe-Area Insets**: Compensate for notched devices and home gesture bars with `env(safe-area-inset-bottom)`.

## 3. Micro-Animations & Dynamic Feedback
- **Spring Physics**: Fast interactions must use `150ms cubic-bezier(0.16, 1, 0.3, 1)`. Tap states must trigger `active:scale-[0.97]`.
- **Skeleton Loaders**: Zero Cumulative Layout Shift (CLS = 0) with shimmer skeletons matching exact typography and height.

## 4. Publication-Grade Documents & PDF Generation
- **WinAnsi Safety**: Never write raw multi-byte Unicode (`₹`, `✓`, `•`) to standard PDF font streams. Use `Rs.` and vector shapes (`doc.roundedRect`).
- **Landscape/Portrait Switching**: Master multi-column tables use Landscape A4 (277mm usable width); simple checklists use Portrait A4.
