---
name: ui-ux-pro-max
description: Design intelligence skill providing modern color palettes, typography, glassmorphism tokens, and responsive layout guidelines for professional web applications. Use whenever designing interfaces, HTML/CSS layouts, or user components.
---

# UI/UX Pro Max Design Intelligence

Apply this design system framework when constructing modern user interfaces:

## 1. Color Palette Tokens
```css
:root {
  /* Slate & Indigo Dark Theme Baseline */
  --bg-primary: #0b0f19;
  --bg-surface: #111827;
  --bg-surface-elevated: #1f2937;
  --border-subtle: rgba(255, 255, 255, 0.08);
  --border-focus: #6366f1;
  
  --text-primary: #f9fafb;
  --text-secondary: #9ca3af;
  --text-muted: #6b7280;

  --accent-primary: #6366f1;
  --accent-primary-hover: #4f46e5;
  --accent-success: #10b981;
  --accent-warning: #f59e0b;
  --accent-danger: #ef4444;

  /* Glassmorphism */
  --glass-bg: rgba(17, 24, 39, 0.7);
  --glass-border: rgba(255, 255, 255, 0.12);
  --glass-blur: blur(16px);
}
```

## 2. Dynamic Micro-Interactions
- Use smooth easing curves for interactive elements:
  ```css
  .btn, .card {
    transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1),
                box-shadow 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  }
  .btn:hover, .card:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);
  }
  ```

## 3. Typography & Rhythm
- Scale font sizes proportionally: 12px (subtext), 14px (body-small), 16px (body), 20px (h3), 28px (h2), 36px+ (h1).
- Maintain 1.5 to 1.6 line height for prose readability.
