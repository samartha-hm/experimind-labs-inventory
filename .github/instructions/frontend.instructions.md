---
applyTo:
  - "src/**/*.tsx"
  - "src/components/**"
  - "src/features/**"
  - "src/index.css"
---

# Frontend conventions (React 19 + Tailwind 4)

## Components
- Write React function components with hooks only — no class components.
- Keep components focused; put reusable UI in `src/components/` and feature screens in `src/features/`.
- Type all props explicitly; never use `any`.

## Styling & design tokens
- Use Tailwind 4 utilities plus the CSS custom-property design tokens defined in `src/index.css` (spacing scale, radii, shadows, transition presets, `--touch-min: 44px`, safe-area insets).
- Dark mode works via the `.dark` class variant; don't hardcode colors when a token or utility class exists.

## Responsive & accessible
- Design from 375px mobile up to 4K desktop; verify layouts at both ends.
- Respect `--touch-min` (44px) for interactive targets; use semantic HTML, label every input, keep keyboard navigation working, and maintain contrast in both light and dark themes.

## Data & state
- Global state lives in contexts (`AuthContext`, `DataContext`); don't duplicate server state into local state.
- Handle loading with skeleton components and missing data with empty-state components — follow the existing patterns in `src/components/`.

## PWA
- This is a vite-plugin-pwa installable app: don't break the offline shell behavior, and avoid heavy synchronous work on the main thread.
