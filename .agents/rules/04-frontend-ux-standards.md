# Modern Frontend UI/UX Standards

## 1. Visual Excellence & Aesthetic Hierarchy
- **Design Tokens**: Centralize colors, spacing, and typography using CSS custom properties (`--color-primary`, `--spacing-md`).
- **Harmonious Palettes**: Avoid harsh, raw primary colors. Use refined HSL tailored palettes with accessible contrast ratios (WCAG AA compliant).
- **Modern Typography**: Use clean, legible system font stacks or modern Google Fonts (Inter, Outfit, Roboto).

## 2. Interactive Dynamics
- **Micro-Animations**: Add subtle transitions on interactive elements (`transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1)`).
- **Active & Hover States**: Every button, link, and card must provide visual feedback upon hover and focus.
- **Glassmorphism & Depth**: Utilize subtle borders, layered box shadows, and frosted-glass backdrops (`backdrop-filter: blur(12px)`) for modern, sleek cards.

## 3. Production Readiness
- **No Broken Placeholders**: Never render broken image tags or placeholder URLs. Use generated SVG illustrations or verified functional assets.
- **Responsive Design**: Ensure layouts fluidly adapt across mobile, tablet, and desktop screens using CSS Grid and Flexbox.
